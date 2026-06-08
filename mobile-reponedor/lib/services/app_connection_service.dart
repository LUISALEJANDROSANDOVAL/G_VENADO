import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart'; // Para kIsWeb y kDebugMode
import 'package:workmanager/workmanager.dart';
import '../models/enums.dart';
import 'offline_sync_service.dart';
import 'supabase_service.dart';

const String kSyncTaskName = 'com.venado.reponedor.syncOfflineData';

@pragma('vm:entry-point')
void callbackDispatcher() {
  // Protección crítica: Workmanager NO debe ejecutarse en Web
  if (kIsWeb) return;

  Workmanager().executeTask((taskName, inputData) async {
    if (taskName == kSyncTaskName) {
      try {
        await AppConnectionService.instance.syncOfflineData();
        return true;
      } catch (e) {
        debugPrint('[Workmanager] Error en sync background: $e');
        return false;
      }
    }
    return true;
  });
}

class AppConnectionService extends ChangeNotifier {
  AppConnectionService._() {
    _init();
  }
  static final AppConnectionService instance = AppConnectionService._();

  ConnectionStatus _status = ConnectionStatus.online;
  int _pendingSyncItems = 0;
  bool _isSyncing = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  ConnectionStatus get status => _status;
  int get pendingSyncItems => _pendingSyncItems;
  bool get isSyncing => _isSyncing;
  bool get isOffline => _status == ConnectionStatus.offline;

  Future<void> _init() async {
    final results = await Connectivity().checkConnectivity();
    _applyConnectivityResults(results, firstCheck: true);

    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen(_applyConnectivityResults);
  }

  static Future<void> initializeWorkmanager() async {
    // Protección crítica para evitar MissingPluginException en Web
    if (kIsWeb) {
      debugPrint('[AppConnectionService] Workmanager omitido (Web)');
      return;
    }
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: kDebugMode,
    );
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _applyConnectivityResults(List<ConnectivityResult> results, {bool firstCheck = false}) {
    final hasConnection = results.any((r) => 
      r == ConnectivityResult.wifi || r == ConnectivityResult.mobile || r == ConnectivityResult.ethernet);

    if (hasConnection) {
      final wasOffline = _status == ConnectionStatus.offline;
      if (wasOffline || firstCheck) {
        _status = ConnectionStatus.online;
        notifyListeners();
        syncOfflineData();
        _scheduleBackgroundSync();
      }
    } else {
      if (_status != ConnectionStatus.offline) {
        _status = ConnectionStatus.offline;
        notifyListeners();
      }
    }
  }

  void _scheduleBackgroundSync() {
    if (kIsWeb) return; // Workmanager no funciona en Web
    Workmanager().registerOneOffTask(
      kSyncTaskName,
      kSyncTaskName,
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingWorkPolicy.replace,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );
  }
  /// Actualiza la cantidad de elementos pendientes de sincronización
  Future<void> refreshPendingCount() async {
    _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
    // Si hay items pendientes y tenemos conexión, marcamos estado de pendiente
    if (_pendingSyncItems > 0 && _status == ConnectionStatus.online) {
      _status = ConnectionStatus.pendingSync;
    }
    notifyListeners();
  }

  Future<void> syncOfflineData() async {
    final count = await OfflineSyncService.instance.getPendingCount();
    if (_isSyncing || count == 0) return;

    _isSyncing = true;
    _status = ConnectionStatus.pendingSync;
    notifyListeners();

    try {
      await _syncPendingEvidences();
      await _syncPendingTaskLogs();
      _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
      _status = _pendingSyncItems > 0 ? ConnectionStatus.pendingSync : ConnectionStatus.online;
    } catch (e) {
      debugPrint('[AppConnectionService] Error sync: $e');
      _status = ConnectionStatus.offline;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> _syncPendingTaskLogs() async {
    final pendingLogs = await OfflineSyncService.instance.getPendingTaskLogs();

    for (final log in pendingLogs) {
      final logId = log['id'] as int;
      try {
        String? photoUrl = log['photo_url'] as String?;
        final localPhotoPath = log['local_photo_path'] as String?;
        
        // Protección: Solo intentar procesar fotos si no es Web
        if (!kIsWeb && localPhotoPath != null && localPhotoPath.isNotEmpty) {
          photoUrl = await _retryUploadPhoto(localPhotoPath, log) ?? photoUrl;
        }

        await SupabaseService.client.from('task_logs').insert({
          'route_plan_id': log['route_plan_id'],
          'pos_id': log['pos_id'],
          'task_id': log['task_id'],
          'start_time': log['start_time'],
          'end_time': log['end_time'],
          'duration_seconds': log['duration_seconds'],
          'photo_url': photoUrl,
          'is_offline': true,
        });

        await OfflineSyncService.instance.markTaskSynced(logId);
      } catch (e) {
        await OfflineSyncService.instance.markTaskRetry(logId);
      }
    }
  }

  Future<void> _syncPendingEvidences() async {
    if (kIsWeb) return; // Evidencias locales no aplican en Web de la misma forma
    final pendingEvidences = await OfflineSyncService.instance.getPendingEvidences();

    for (final evidence in pendingEvidences) {
      final evidenceId = evidence['id'] as int;
      final localPath = evidence['local_path'] as String;
      final remotePath = evidence['remote_path'] as String;

      try {
        final bytes = await _readLocalFile(localPath);
        if (bytes == null) {
          await OfflineSyncService.instance.markEvidenceSynced(evidenceId);
          continue;
        }
        await SupabaseService.client.storage.from('task-evidences').uploadBinary(remotePath, bytes);
        await OfflineSyncService.instance.markEvidenceSynced(evidenceId);
      } catch (e) {
        await OfflineSyncService.instance.markEvidenceRetry(evidenceId);
      }
    }
  }

  Future<String?> _retryUploadPhoto(String localPath, Map<String, dynamic> log) async {
    if (kIsWeb) return null;
    try {
      final bytes = await _readLocalFile(localPath);
      if (bytes == null) return null;

      final userId = log['user_id'] as String? ?? 'unknown';
      final planId = log['route_plan_id'] as String? ?? 'unknown';
      final fileName = localPath.split(Platform.pathSeparator).last;
      final path = '$userId/$planId/$fileName';

      await SupabaseService.client.storage.from('task-evidences').uploadBinary(path, bytes);
      return SupabaseService.client.storage.from('task-evidences').getPublicUrl(path);
    } catch (e) {
      return null;
    }
  }

  Future<Uint8List?> _readLocalFile(String path) async {
    if (kIsWeb) return null;
    try {
      final file = File(path);
      if (await file.exists()) return await file.readAsBytes();
    } catch (_) {}
    return null;
  }

  Future<void> manualSync() => syncOfflineData();
}
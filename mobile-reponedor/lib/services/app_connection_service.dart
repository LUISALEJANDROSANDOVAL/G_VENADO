import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../models/enums.dart';
import 'offline_sync_service.dart';
import 'supabase_service.dart';

/// Servicio de conectividad real (RF-10).
///
/// Escucha cambios de red del SO mediante [connectivity_plus] y actualiza
/// el estado interno automáticamente:
///   - WiFi / datos móviles activos → [ConnectionStatus.online]
///   - Sin red                      → [ConnectionStatus.offline]
///   - Online con cola pendiente    → [ConnectionStatus.pendingSync]
///
/// Al recuperar la conexión, lanza [syncOfflineData] automáticamente.
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

  // ── Inicialización ─────────────────────────────────────────────────────

  Future<void> _init() async {
    // Estado inicial de red al arrancar
    final results = await Connectivity().checkConnectivity();
    _applyConnectivityResults(results, firstCheck: true);

    // Escuchar cambios en tiempo real (WiFi se cae, datos móviles, etc.)
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen(_applyConnectivityResults);
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _applyConnectivityResults(
    List<ConnectivityResult> results, {
    bool firstCheck = false,
  }) {
    final hasConnection = results.any(
      (r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet,
    );

    if (hasConnection) {
      final wasOffline = _status == ConnectionStatus.offline;
      if (wasOffline || firstCheck) {
        _status = ConnectionStatus.online;
        notifyListeners();
        // Al recuperar señal, sincronizar automáticamente la cola pendiente
        syncOfflineData();
      }
    } else {
      if (_status != ConnectionStatus.offline) {
        _status = ConnectionStatus.offline;
        notifyListeners();
        // ignore: avoid_print
        print('[AppConnectionService] Sin conexión — modo offline activado.');
      }
    }
  }

  // ── API pública ───────────────────────────────────────────────────────────

  Future<void> refreshPendingCount() async {
    _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
    if (_pendingSyncItems > 0 && _status == ConnectionStatus.online) {
      _status = ConnectionStatus.pendingSync;
    }
    notifyListeners();
  }

  /// Sincroniza la cola offline con Supabase.
  /// Reintenta subir fotos guardadas localmente antes de insertar el log.
  Future<void> syncOfflineData() async {
    final count = await OfflineSyncService.instance.getPendingCount();
    if (_isSyncing || count == 0) return;

    _isSyncing = true;
    _status = ConnectionStatus.pendingSync;
    notifyListeners();

    try {
      final pendingLogs = await OfflineSyncService.instance.getPendingTaskLogs();

      for (final log in pendingLogs) {
        // Si hay foto guardada localmente, re-subirla al Storage primero
        String? photoUrl = log['photo_url'] as String?;
        final localPhotoPath = log['local_photo_path'] as String?;
        if (localPhotoPath != null && localPhotoPath.isNotEmpty && !kIsWeb) {
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
      }

      await OfflineSyncService.instance.clearPendingTaskLogs();
      _pendingSyncItems = 0;
      _status = ConnectionStatus.online;
    } catch (e) {
      // ignore: avoid_print
      print('[AppConnectionService] Error sincronizando cola local: $e');
      _status = ConnectionStatus.offline;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Reintenta subir una foto guardada localmente a Supabase Storage.
  Future<String?> _retryUploadPhoto(
    String localPath,
    Map<String, dynamic> log,
  ) async {
    try {
      final bytes = await _readLocalFile(localPath);
      if (bytes == null) return null;

      final userId = log['user_id'] as String? ?? 'unknown';
      final planId = log['route_plan_id'] as String? ?? 'unknown';
      final fileName = localPath.split('/').last;
      final path = '$userId/$planId/$fileName';

      await SupabaseService.client.storage
          .from('task-evidences')
          .uploadBinary(path, bytes);

      return SupabaseService.client.storage
          .from('task-evidences')
          .getPublicUrl(path);
    } catch (e) {
      // ignore: avoid_print
      print('[AppConnectionService] No se pudo re-subir foto offline: $e');
      return null;
    }
  }

  Future<Uint8List?> _readLocalFile(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) return await file.readAsBytes();
    } catch (_) {}
    return null;
  }

  Future<void> manualSync() => syncOfflineData();
}

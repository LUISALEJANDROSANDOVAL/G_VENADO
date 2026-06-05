import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';
import '../models/enums.dart';
import 'offline_sync_service.dart';
import 'supabase_service.dart';

/// Nombre único para la tarea de sincronización en segundo plano.
const String kSyncTaskName = 'com.venado.reponedor.syncOfflineData';

/// Callback de nivel superior requerido por Workmanager.
/// Se ejecuta en un Isolate separado cuando el SO dispara la tarea.
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    if (taskName == kSyncTaskName) {
      try {
        await AppConnectionService.instance.syncOfflineData();
        return true;
      } catch (e) {
        // ignore: avoid_print
        print('[Workmanager] Error en sync background: $e');
        return false; // Workmanager reintentará según backoff policy
      }
    }
    return true;
  });
}

/// Servicio de conectividad Enterprise (RF-10).
///
/// Mejoras sobre la versión MVP:
///   - Integra [Workmanager] para sincronización en segundo plano real:
///     el SO ejecuta la tarea incluso si la app fue cerrada.
///   - Sincronización granular: cada registro se procesa individualmente
///     con control de reintentos (hasta 5 intentos por registro).
///   - Re-subida de fotos locales antes de insertar el log en Supabase.
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

  /// Inicializa Workmanager para tareas de sincronización en segundo plano.
  /// Debe llamarse UNA sola vez desde main.dart.
  static Future<void> initializeWorkmanager() async {
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
        // Al recuperar señal, sincronizar automáticamente
        syncOfflineData();
        // También programar una tarea del SO por si la app se cierra
        _scheduleBackgroundSync();
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

  /// Programa una tarea de sincronización con el SO para ejecutar
  /// incluso si la app está cerrada (OneOff = una sola vez).
  void _scheduleBackgroundSync() {
    Workmanager().registerOneOffTask(
      kSyncTaskName,
      kSyncTaskName,
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      existingWorkPolicy: ExistingWorkPolicy.replace,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );
  }

  // ── API pública ───────────────────────────────────────────────────────────

  Future<void> refreshPendingCount() async {
    _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
    if (_pendingSyncItems > 0 && _status == ConnectionStatus.online) {
      _status = ConnectionStatus.pendingSync;
    }
    notifyListeners();
  }

  /// Sincroniza la cola offline con Supabase — registro por registro.
  ///
  /// Flujo Enterprise:
  ///   1. Primero sube evidencias fotográficas pendientes al Storage.
  ///   2. Luego sube los logs de tareas a la tabla `task_logs`.
  ///   3. Cada registro se elimina individualmente tras éxito.
  ///   4. Si un registro falla, incrementa su `retry_count` y pasa al siguiente.
  Future<void> syncOfflineData() async {
    final count = await OfflineSyncService.instance.getPendingCount();
    if (_isSyncing || count == 0) return;

    _isSyncing = true;
    _status = ConnectionStatus.pendingSync;
    notifyListeners();

    try {
      // ── Fase 1: Subir evidencias fotográficas pendientes ──────────────
      await _syncPendingEvidences();

      // ── Fase 2: Subir logs de tareas pendientes ───────────────────────
      await _syncPendingTaskLogs();

      _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
      _status = _pendingSyncItems > 0
          ? ConnectionStatus.pendingSync
          : ConnectionStatus.online;
    } catch (e) {
      // ignore: avoid_print
      print('[AppConnectionService] Error general en sincronización: $e');
      _status = ConnectionStatus.offline;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Sincroniza cada log de tarea individualmente.
  Future<void> _syncPendingTaskLogs() async {
    final pendingLogs = await OfflineSyncService.instance.getPendingTaskLogs();

    for (final log in pendingLogs) {
      final logId = log['id'] as int;
      try {
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

        // Éxito: eliminar de la cola
        await OfflineSyncService.instance.markTaskSynced(logId);
        // ignore: avoid_print
        print('[AppConnectionService] Task log #$logId sincronizado ✓');
      } catch (e) {
        // Fallo: incrementar retry_count y continuar con el siguiente
        await OfflineSyncService.instance.markTaskRetry(logId);
        // ignore: avoid_print
        print('[AppConnectionService] Task log #$logId falló (retry incrementado): $e');
      }
    }
  }

  /// Sincroniza cada evidencia fotográfica individualmente.
  Future<void> _syncPendingEvidences() async {
    final pendingEvidences = await OfflineSyncService.instance.getPendingEvidences();

    for (final evidence in pendingEvidences) {
      final evidenceId = evidence['id'] as int;
      final localPath = evidence['local_path'] as String;
      final remotePath = evidence['remote_path'] as String;

      try {
        final bytes = await _readLocalFile(localPath);
        if (bytes == null) {
          // El archivo ya no existe, eliminar de la cola
          await OfflineSyncService.instance.markEvidenceSynced(evidenceId);
          continue;
        }

        await SupabaseService.client.storage
            .from('task-evidences')
            .uploadBinary(remotePath, bytes);

        // Éxito: eliminar de la cola
        await OfflineSyncService.instance.markEvidenceSynced(evidenceId);
        // ignore: avoid_print
        print('[AppConnectionService] Evidencia #$evidenceId subida ✓');
      } catch (e) {
        await OfflineSyncService.instance.markEvidenceRetry(evidenceId);
        // ignore: avoid_print
        print('[AppConnectionService] Evidencia #$evidenceId falló (retry): $e');
      }
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
      final fileName = localPath.split(Platform.pathSeparator).last;
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

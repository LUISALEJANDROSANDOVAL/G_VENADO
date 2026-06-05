import '../data/database_helper.dart';

/// Servicio de persistencia offline robusto (RF-10) — Arquitectura Enterprise.
///
/// Reemplaza la implementación anterior basada en SharedPreferences/JSON
/// por una basada en SQLite transaccional (ACID) que garantiza:
///   - No se pierden datos si la app crashea a mitad de escritura.
///   - Control individual de reintentos por registro (máx 5 intentos).
///   - Consultas eficientes sin cargar toda la cola en memoria.
class OfflineSyncService {
  OfflineSyncService._();
  static final OfflineSyncService instance = OfflineSyncService._();

  final DatabaseHelper _db = DatabaseHelper.instance;

  // ── Tareas pendientes ──────────────────────────────────────────────────

  /// Guarda un log de tarea en la cola SQLite persistente.
  Future<int> savePendingTaskLog(Map<String, dynamic> log) async {
    try {
      return await _db.insertPendingTask(log);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error insertando tarea en SQLite: $e');
      return -1;
    }
  }

  /// Recupera todos los logs de tareas pendientes de sincronización.
  /// Solo devuelve registros con menos de [maxRetries] intentos fallidos.
  Future<List<Map<String, dynamic>>> getPendingTaskLogs({int maxRetries = 5}) async {
    try {
      return await _db.getPendingTasks(maxRetries: maxRetries);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error consultando tareas pendientes: $e');
      return [];
    }
  }

  /// Marca una tarea como sincronizada exitosamente (la elimina de la cola).
  Future<void> markTaskSynced(int id) async {
    try {
      await _db.deletePendingTask(id);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error eliminando tarea sincronizada: $e');
    }
  }

  /// Registra un intento fallido para un registro específico.
  Future<void> markTaskRetry(int id) async {
    try {
      await _db.incrementRetryCount(id);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error incrementando retry_count: $e');
    }
  }

  /// Vacía la cola completa de tareas (tras sync total exitosa).
  Future<void> clearPendingTaskLogs() async {
    try {
      await _db.clearAllPendingTasks();
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error limpiando cola de tareas: $e');
    }
  }

  // ── Evidencias pendientes ──────────────────────────────────────────────

  /// Guarda una evidencia fotográfica en la cola de subida.
  Future<int> savePendingEvidence({
    required String localPath,
    required String remotePath,
    String mimeType = 'image/jpeg',
    int? taskLogId,
  }) async {
    try {
      return await _db.insertPendingEvidence(
        localPath: localPath,
        remotePath: remotePath,
        mimeType: mimeType,
        taskLogId: taskLogId,
      );
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error insertando evidencia en SQLite: $e');
      return -1;
    }
  }

  /// Recupera todas las evidencias pendientes de subir al Storage.
  Future<List<Map<String, dynamic>>> getPendingEvidences({int maxRetries = 5}) async {
    try {
      return await _db.getPendingEvidences(maxRetries: maxRetries);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error consultando evidencias pendientes: $e');
      return [];
    }
  }

  /// Marca una evidencia como subida exitosamente (la elimina de la cola).
  Future<void> markEvidenceSynced(int id) async {
    try {
      await _db.deletePendingEvidence(id);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error eliminando evidencia sincronizada: $e');
    }
  }

  /// Registra un intento fallido de subida para una evidencia.
  Future<void> markEvidenceRetry(int id) async {
    try {
      await _db.incrementEvidenceRetryCount(id);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error incrementando retry de evidencia: $e');
    }
  }

  // ── Contadores ─────────────────────────────────────────────────────────

  /// Obtiene la cantidad de tareas pendientes en la cola.
  Future<int> getPendingCount() async {
    try {
      return await _db.getTotalPendingCount();
    } catch (_) {
      return 0;
    }
  }
}

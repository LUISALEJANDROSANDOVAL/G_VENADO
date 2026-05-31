import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Servicio para persistir localmente las tareas completadas sin señal (RF-10).
class OfflineSyncService {
  OfflineSyncService._();
  static final OfflineSyncService instance = OfflineSyncService._();

  static const String _keyPendingLogs = 'pending_task_logs';

  /// Guarda un log de tarea en la cola local persistente.
  Future<void> savePendingTaskLog(Map<String, dynamic> log) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> currentList = prefs.getStringList(_keyPendingLogs) ?? [];
      
      currentList.add(jsonEncode(log));
      await prefs.setStringList(_keyPendingLogs, currentList);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error guardando log offline: $e');
    }
  }

  /// Recupera todos los logs de tareas pendientes.
  Future<List<Map<String, dynamic>>> getPendingTaskLogs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String>? currentList = prefs.getStringList(_keyPendingLogs);
      if (currentList == null || currentList.isEmpty) return [];

      return currentList
          .map((item) => jsonDecode(item) as Map<String, dynamic>)
          .toList();
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error recuperando logs offline: $e');
      return [];
    }
  }

  /// Vacía la cola local de logs.
  Future<void> clearPendingTaskLogs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyPendingLogs);
    } catch (e) {
      // ignore: avoid_print
      print('[OfflineSyncService] Error limpiando logs offline: $e');
    }
  }

  /// Obtiene la cantidad de logs pendientes en la cola local.
  Future<int> getPendingCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String>? currentList = prefs.getStringList(_keyPendingLogs);
      return currentList?.length ?? 0;
    } catch (_) {
      return 0;
    }
  }
}

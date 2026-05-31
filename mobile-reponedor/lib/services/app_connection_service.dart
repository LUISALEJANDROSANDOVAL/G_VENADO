import 'package:flutter/foundation.dart';
import '../models/enums.dart';
import 'offline_sync_service.dart';
import 'supabase_service.dart';

/// Estado de conexión real y demo UI offline-first (RF-10).
class AppConnectionService extends ChangeNotifier {
  AppConnectionService._() {
    refreshPendingCount();
  }
  static final AppConnectionService instance = AppConnectionService._();

  ConnectionStatus _status = ConnectionStatus.online;
  int _pendingSyncItems = 0;
  bool _isSyncing = false;

  ConnectionStatus get status => _status;
  int get pendingSyncItems => _pendingSyncItems;
  bool get isSyncing => _isSyncing;
  bool get isOffline => _status == ConnectionStatus.offline;

  Future<void> refreshPendingCount() async {
    _pendingSyncItems = await OfflineSyncService.instance.getPendingCount();
    if (_pendingSyncItems > 0 && _status == ConnectionStatus.online) {
      _status = ConnectionStatus.pendingSync;
    }
    notifyListeners();
  }

  void cycleStatusDemo() {
    _status = switch (_status) {
      ConnectionStatus.online => ConnectionStatus.offline,
      ConnectionStatus.offline => ConnectionStatus.pendingSync,
      ConnectionStatus.pendingSync => ConnectionStatus.online,
    };
    notifyListeners();
    if (_status == ConnectionStatus.online) {
      syncOfflineData();
    }
  }

  void setOnline() {
    if (_status == ConnectionStatus.online) return;
    _status = ConnectionStatus.online;
    notifyListeners();
    syncOfflineData();
  }

  void setOffline() {
    if (_status == ConnectionStatus.offline) return;
    _status = ConnectionStatus.offline;
    notifyListeners();
  }

  Future<void> syncOfflineData() async {
    final count = await OfflineSyncService.instance.getPendingCount();
    if (_isSyncing || count == 0) return;

    _isSyncing = true;
    _status = ConnectionStatus.pendingSync;
    notifyListeners();

    try {
      final pendingLogs = await OfflineSyncService.instance.getPendingTaskLogs();
      
      for (final log in pendingLogs) {
        await SupabaseService.client.from('task_logs').insert({
          'route_plan_id': log['route_plan_id'],
          'pos_id': log['pos_id'],
          'task_id': log['task_id'],
          'start_time': log['start_time'],
          'end_time': log['end_time'],
          'duration_seconds': log['duration_seconds'],
          'photo_url': log['photo_url'],
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

  Future<void> manualSync() => syncOfflineData();
}

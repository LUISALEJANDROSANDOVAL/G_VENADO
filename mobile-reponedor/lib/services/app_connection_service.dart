import 'package:flutter/foundation.dart';
import '../models/enums.dart';

/// Estado de conexión mock para demo UI offline-first.
/// TODO: Integrar con connectivity_plus y cola de sync real.
class AppConnectionService extends ChangeNotifier {
  AppConnectionService._();
  static final AppConnectionService instance = AppConnectionService._();

  ConnectionStatus _status = ConnectionStatus.online;
  int _pendingSyncItems = 1;
  bool _isSyncing = false;

  ConnectionStatus get status => _status;
  int get pendingSyncItems => _pendingSyncItems;
  bool get isSyncing => _isSyncing;
  bool get isOffline => _status == ConnectionStatus.offline;

  void cycleStatusDemo() {
    _status = switch (_status) {
      ConnectionStatus.online => ConnectionStatus.offline,
      ConnectionStatus.offline => ConnectionStatus.pendingSync,
      ConnectionStatus.pendingSync => ConnectionStatus.online,
    };
    notifyListeners();
  }

  void setOnline() {
    if (_status == ConnectionStatus.online) return;
    _status = ConnectionStatus.online;
    notifyListeners();
    if (_pendingSyncItems > 0) simulateBackgroundSync();
  }

  void addPendingSync([int count = 1]) {
    _pendingSyncItems += count;
    if (_status == ConnectionStatus.online) {
      _status = ConnectionStatus.pendingSync;
    }
    notifyListeners();
  }

  Future<void> simulateBackgroundSync() async {
    if (_isSyncing || _pendingSyncItems == 0) return;
    _isSyncing = true;
    _status = ConnectionStatus.pendingSync;
    notifyListeners();

    await Future<void>.delayed(const Duration(seconds: 2));

    _pendingSyncItems = 0;
    _isSyncing = false;
    _status = ConnectionStatus.online;
    notifyListeners();
  }

  Future<void> manualSync() => simulateBackgroundSync();
}

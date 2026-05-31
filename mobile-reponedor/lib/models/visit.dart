import 'enums.dart';
import 'evidence.dart';
import 'pdv.dart';
import 'task.dart';

/// Sesión de visita activa en un PDV.
/// TODO: Sincronizar con backend al finalizar visita.
class Visit {
  const Visit({
    required this.pdv,
    required this.arrivalTime,
    required this.tasks,
    required this.evidences,
    this.geofenceStatus = GeofenceStatus.fueraDelPdv,
    this.syncStatus = SyncStatus.pendiente,
    this.elapsedSeconds = 0,
  });

  final Pdv pdv;
  final DateTime arrivalTime;
  final List<Task> tasks;
  final List<Evidence> evidences;
  final GeofenceStatus geofenceStatus;
  final SyncStatus syncStatus;
  final int elapsedSeconds;

  Visit copyWith({
    Pdv? pdv,
    List<Task>? tasks,
    List<Evidence>? evidences,
    GeofenceStatus? geofenceStatus,
    SyncStatus? syncStatus,
    int? elapsedSeconds,
  }) {
    return Visit(
      pdv: pdv ?? this.pdv,
      arrivalTime: arrivalTime,
      tasks: tasks ?? this.tasks,
      evidences: evidences ?? this.evidences,
      geofenceStatus: geofenceStatus ?? this.geofenceStatus,
      syncStatus: syncStatus ?? this.syncStatus,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
    );
  }
}

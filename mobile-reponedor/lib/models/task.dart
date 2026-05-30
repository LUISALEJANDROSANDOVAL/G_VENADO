import 'enums.dart';

/// Micro-tarea ejecutada dentro de una visita al PDV.
/// TODO: Persistir tiempos reales en Supabase / almacenamiento local offline.
class Task {
  const Task({
    required this.id,
    required this.name,
    this.isCompleted = false,
    this.accumulatedSeconds = 0,
    this.timerState = TaskTimerState.idle,
    this.requiresPhoto = false,
  });

  final String id;
  final String name;
  final bool isCompleted;
  final int accumulatedSeconds;
  final TaskTimerState timerState;
  final bool requiresPhoto;

  Task copyWith({
    bool? isCompleted,
    int? accumulatedSeconds,
    TaskTimerState? timerState,
    bool? requiresPhoto,
  }) {
    return Task(
      id: id,
      name: name,
      isCompleted: isCompleted ?? this.isCompleted,
      accumulatedSeconds: accumulatedSeconds ?? this.accumulatedSeconds,
      timerState: timerState ?? this.timerState,
      requiresPhoto: requiresPhoto ?? this.requiresPhoto,
    );
  }
}

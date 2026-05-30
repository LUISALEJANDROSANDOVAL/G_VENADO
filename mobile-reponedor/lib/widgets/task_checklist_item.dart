import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../models/task.dart';
import '../theme/app_colors.dart';
import 'task_timer_button.dart';

String formatDuration(int totalSeconds) {
  final hours = totalSeconds ~/ 3600;
  final minutes = (totalSeconds % 3600) ~/ 60;
  final seconds = totalSeconds % 60;
  return '${hours.toString().padLeft(2, '0')}:'
      '${minutes.toString().padLeft(2, '0')}:'
      '${seconds.toString().padLeft(2, '0')}';
}

/// Fila de checklist con checkbox, cronómetro y bloqueo por geofence.
class TaskChecklistItem extends StatelessWidget {
  const TaskChecklistItem({
    super.key,
    required this.task,
    required this.onCheckedChanged,
    required this.onTimerAction,
    this.isLocked = false,
  });

  final Task task;
  final ValueChanged<bool?> onCheckedChanged;
  final VoidCallback onTimerAction;
  final bool isLocked;

  @override
  Widget build(BuildContext context) {
    final statusLabel = switch (task.timerState) {
      TaskTimerState.idle => 'Sin iniciar',
      TaskTimerState.running => 'En curso',
      TaskTimerState.paused => 'Pausada',
      TaskTimerState.finished => 'Finalizada',
    };

    final statusColor = switch (task.timerState) {
      TaskTimerState.idle => AppColors.secondaryText,
      TaskTimerState.running => AppColors.institutionalBlue,
      TaskTimerState.paused => AppColors.warning,
      TaskTimerState.finished => AppColors.success,
    };

    return Opacity(
      opacity: isLocked ? 0.45 : 1.0,
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: task.isCompleted ? AppColors.success.withValues(alpha: 0.3) : AppColors.inputBorder,
            width: task.isCompleted ? 1.5 : 1,
          ),
        ),
        child: InkWell(
          onTap: isLocked ? null : () => onCheckedChanged(!task.isCompleted),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Icono checkbox personalizado estilo iOS/Premium
                Icon(
                  task.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: task.isCompleted ? AppColors.success : AppColors.secondaryText,
                  size: 24,
                ),
                const SizedBox(width: 14),
                // Contenido y Metadatos de la tarea
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.name,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                          color: task.isCompleted ? AppColors.secondaryText : AppColors.primaryText,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.timer_outlined, size: 14, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            '$statusLabel · ',
                            style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            formatDuration(task.accumulatedSeconds),
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: task.timerState == TaskTimerState.running ? AppColors.institutionalBlue : AppColors.secondaryText,
                            ),
                          ),
                        ],
                      ),
                      if (task.requiresPhoto) ...[
                        const SizedBox(height: 4),
                        const Row(
                          children: [
                            Icon(Icons.camera_alt, size: 12, color: AppColors.institutionalBlue),
                            SizedBox(width: 4),
                            Text(
                              'Evidencia fotográfica requerida',
                              style: TextStyle(fontSize: 10, color: AppColors.institutionalBlue, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                // Botón del cronómetro (si no está bloqueado)
                if (!isLocked) ...[
                  const SizedBox(width: 10),
                  TaskTimerButton(
                    timerState: task.timerState,
                    onPressed: onTimerAction,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Resumen de tiempos por tarea al cierre de visita.
class TaskTimeSummary extends StatelessWidget {
  const TaskTimeSummary({super.key, required this.tasks, required this.totalSeconds});

  final List<Task> tasks;
  final int totalSeconds;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Resumen de tiempos', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              'Total visita: ${formatDuration(totalSeconds)}',
              style: const TextStyle(
                fontFamily: 'monospace',
                fontWeight: FontWeight.bold,
                color: AppColors.institutionalBlue,
              ),
            ),
            const Divider(height: 20),
            ...tasks.map(
              (t) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(t.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.secondaryText)),
                    ),
                    Text(
                      formatDuration(t.accumulatedSeconds),
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Barra de progreso de micro-tareas completadas.
class VisitTasksProgress extends StatelessWidget {
  const VisitTasksProgress({super.key, required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final completed = tasks.where((t) => t.isCompleted).length;
    final total = tasks.length;
    final progress = total > 0 ? completed / total : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Progreso de tareas', style: Theme.of(context).textTheme.bodySmall),
            Text('$completed / $total', style: Theme.of(context).textTheme.labelLarge),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 6,
            backgroundColor: AppColors.inputBorder,
            color: AppColors.success,
          ),
        ),
      ],
    );
  }
}

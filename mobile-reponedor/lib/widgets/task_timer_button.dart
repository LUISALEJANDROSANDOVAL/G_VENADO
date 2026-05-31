import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Botón de cronómetro por micro-tarea (Iniciar / Pausar / Finalizar).
class TaskTimerButton extends StatelessWidget {
  const TaskTimerButton({
    super.key,
    required this.timerState,
    required this.onPressed,
  });

  final TaskTimerState timerState;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final (label, icon, color) = switch (timerState) {
      TaskTimerState.idle => ('Iniciar', Icons.play_arrow, AppColors.darkTurquoise),
      TaskTimerState.running => ('Pausar', Icons.pause, AppColors.warning),
      TaskTimerState.paused => ('Finalizar', Icons.stop, AppColors.paretoRed),
      TaskTimerState.finished => ('Finalizada', Icons.check, AppColors.secondaryText),
    };

    return SizedBox(
      height: 48,
      child: FilledButton.icon(
        onPressed: timerState == TaskTimerState.finished ? null : onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: FilledButton.styleFrom(
          backgroundColor: color,
          disabledBackgroundColor: AppColors.inputBorder,
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
      ),
    );
  }
}

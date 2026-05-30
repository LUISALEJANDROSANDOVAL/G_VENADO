import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Badge de estado de visita (Pendiente / En proceso / Completada).
class VisitStatusBadge extends StatelessWidget {
  const VisitStatusBadge({super.key, required this.status});

  final VisitStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = switch (status) {
      VisitStatus.pendiente => (
          'Pendiente',
          AppColors.secondaryText,
          Icons.schedule,
        ),
      VisitStatus.enProceso => (
          'En proceso',
          AppColors.warning,
          Icons.play_circle_outline,
        ),
      VisitStatus.completada => (
          'Completada',
          AppColors.success,
          Icons.check_circle_outline,
        ),
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

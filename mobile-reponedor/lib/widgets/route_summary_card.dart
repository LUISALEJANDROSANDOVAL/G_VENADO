import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Tarjeta de resumen rápido para la ruta diaria.
class RouteSummaryCard extends StatelessWidget {
  const RouteSummaryCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 22,
                      color: color,
                    ),
              ),
              const SizedBox(height: 2),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

/// Fila de tarjetas de resumen con espaciado uniforme.
class RouteSummaryRow extends StatelessWidget {
  const RouteSummaryRow({
    super.key,
    required this.pending,
    required this.completed,
    required this.pendingSync,
  });

  final int pending;
  final int completed;
  final int pendingSync;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        RouteSummaryCard(
          label: 'Pendientes',
          value: '$pending',
          icon: Icons.pending_actions,
          color: AppColors.warning,
        ),
        const SizedBox(width: 10),
        RouteSummaryCard(
          label: 'Completadas',
          value: '$completed',
          icon: Icons.check_circle,
          color: AppColors.success,
        ),
        const SizedBox(width: 10),
        RouteSummaryCard(
          label: 'Por sync',
          value: '$pendingSync',
          icon: Icons.cloud_upload_outlined,
          color: AppColors.activeBlue,
        ),
      ],
    );
  }
}

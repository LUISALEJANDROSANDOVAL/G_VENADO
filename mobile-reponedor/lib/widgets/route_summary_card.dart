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
        color: color.withValues(alpha: 0.08),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: color.withValues(alpha: 0.3), width: 1.5),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 12),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: color,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: color.withValues(alpha: 0.8),
                      fontWeight: FontWeight.bold,
                    ),
              ),
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

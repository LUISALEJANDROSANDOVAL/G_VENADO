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
    this.progress,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final double? progress;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5), width: 1),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.12),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppColors.primaryText,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              label.toUpperCase(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.secondaryText,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                    letterSpacing: 0.5,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (progress != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 3,
                  backgroundColor: AppColors.inputBorder.withValues(alpha: 0.5),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
            ],
          ],
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
    required this.total,
  });

  final int pending;
  final int completed;
  final int pendingSync;
  final int total;

  @override
  Widget build(BuildContext context) {
    final double pendingProgress = total > 0 ? pending / total : 0;
    final double completedProgress = total > 0 ? completed / total : 0;
    
    return Row(
      children: [
        RouteSummaryCard(
          label: 'Pendientes',
          value: '$pending',
          icon: Icons.pending_actions,
          color: AppColors.warning,
          progress: pendingProgress,
        ),
        const SizedBox(width: 8),
        RouteSummaryCard(
          label: 'Completadas',
          value: '$completed',
          icon: Icons.check_circle,
          color: AppColors.success,
          progress: completedProgress,
        ),
        const SizedBox(width: 8),
        RouteSummaryCard(
          label: 'Por sync',
          value: '$pendingSync',
          icon: Icons.cloud_upload_outlined,
          color: AppColors.activeBlue,
          // Sync count doesn't have a direct total relative progress, maybe just 0 if 0 or full if >0 
          // or relative to total completed
          progress: completed > 0 ? pendingSync / completed : 0,
        ),
      ],
    );
  }
}

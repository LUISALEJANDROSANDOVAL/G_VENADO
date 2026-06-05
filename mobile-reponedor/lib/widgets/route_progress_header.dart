import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Header con nombre del reponedor, fecha y progreso diario.
class RouteProgressHeader extends StatelessWidget {
  const RouteProgressHeader({
    super.key,
    required this.reponedorName,
    required this.dateLabel,
    required this.completedVisits,
    required this.totalVisits,
  });

  final String reponedorName;
  final String dateLabel;
  final int completedVisits;
  final int totalVisits;

  @override
  Widget build(BuildContext context) {
    final progress = totalVisits > 0 ? completedVisits / totalVisits : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hola, $reponedorName',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 4),
        Text(dateLabel, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Stack(
                      alignment: Alignment.centerLeft,
                      children: [
                        Container(
                          height: 14,
                          decoration: BoxDecoration(
                            color: AppColors.inputBorder.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeOutCubic,
                          height: 14,
                          width: constraints.maxWidth * progress,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.institutionalBlue, AppColors.activeBlue],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.institutionalBlue.withValues(alpha: 0.3),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '$completedVisits de $totalVisits',
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '$completedVisits de $totalVisits visitas completadas',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

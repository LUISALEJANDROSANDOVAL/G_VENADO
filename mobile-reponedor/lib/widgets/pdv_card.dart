import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../theme/app_colors.dart';
import 'customer_type_badge.dart';
import 'visit_status_badge.dart';

/// Tarjeta de PDV en el listado de ruta diaria.
class PdvCard extends StatelessWidget {
  const PdvCard({
    super.key,
    required this.pdv,
    this.onTap,
    this.onNavigateTap,
  });

  final Pdv pdv;
  final VoidCallback? onTap;
  final VoidCallback? onNavigateTap;

  @override
  Widget build(BuildContext context) {
    final bool isCompleted = pdv.status == VisitStatus.completada;
    final bool isActive = pdv.status == VisitStatus.enProceso;

    Color borderColor = AppColors.inputBorder;
    Color bgColor = AppColors.cardBackground;
    double elevation = 0;
    Color shadowColor = Colors.transparent;

    if (isActive) {
      borderColor = AppColors.traceRed;
      bgColor = AppColors.traceRed.withValues(alpha: 0.03);
      elevation = 8;
      shadowColor = AppColors.traceRed.withValues(alpha: 0.2);
    } else if (isCompleted) {
      borderColor = AppColors.success.withValues(alpha: 0.5);
      bgColor = AppColors.success.withValues(alpha: 0.03);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: isActive ? 1.5 : 1),
        boxShadow: [
          if (elevation > 0)
            BoxShadow(
              color: shadowColor,
              blurRadius: elevation,
              offset: const Offset(0, 4),
            ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          splashColor: (isActive ? AppColors.traceRed : AppColors.inputBorder).withValues(alpha: 0.1),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              Hero(
                tag: 'pdv-number-${pdv.id}',
                child: Material(
                  color: Colors.transparent,
                  child: _VisitNumberBadge(
                    number: pdv.visitNumber, 
                    status: pdv.status,
                  ),
                ),
              ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              pdv.name,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                decoration: isCompleted ? TextDecoration.lineThrough : null,
                                color: isCompleted ? AppColors.dimGrayText : null,
                              ),
                            ),
                          ),
                          CustomerTypeBadge(type: pdv.customerType),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined,
                              size: 14, color: isCompleted ? AppColors.inputBorder : AppColors.secondaryText),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              pdv.address,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: isCompleted ? AppColors.dimGrayText : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.access_time,
                              size: 14, color: isCompleted ? AppColors.inputBorder : AppColors.secondaryText),
                          const SizedBox(width: 4),
                          Text(
                            pdv.estimatedTime,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: isCompleted ? AppColors.dimGrayText : null,
                              ),
                          ),
                          const SizedBox(width: 16),
                          Icon(Icons.straighten,
                              size: 14, color: isCompleted ? AppColors.inputBorder : AppColors.secondaryText),
                          const SizedBox(width: 4),
                          Text(
                            '${pdv.distanceKm.toStringAsFixed(1)} km',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: isCompleted ? AppColors.dimGrayText : null,
                              ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          VisitStatusBadge(status: pdv.status),
                          if (isActive) ...[
                            const SizedBox(width: 8),
                            _PulseLabel(text: 'EN CURSO', color: AppColors.traceRed),
                          ],
                          const Spacer(),
                          if (onNavigateTap != null)
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: onNavigateTap,
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.traceRed.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: AppColors.traceRed.withValues(alpha: 0.3)),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.directions, color: AppColors.traceRed, size: 14),
                                      SizedBox(width: 4),
                                      Text(
                                        'NAVEGAR',
                                        style: TextStyle(
                                          color: AppColors.traceRed,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (onTap != null && !isCompleted)
                  const Icon(Icons.chevron_right, color: AppColors.secondaryText),
                if (isCompleted)
                  const Icon(Icons.check_circle, color: AppColors.success),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PulseLabel extends StatefulWidget {
  final String text;
  final Color color;

  const _PulseLabel({required this.text, required this.color});

  @override
  State<_PulseLabel> createState() => _PulseLabelState();
}

class _PulseLabelState extends State<_PulseLabel> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.4, end: 1.0).animate(_controller),
      child: Text(
        widget.text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: widget.color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _VisitNumberBadge extends StatelessWidget {
  const _VisitNumberBadge({required this.number, required this.status});

  final int number;
  final VisitStatus status;

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor = Colors.white;

    switch (status) {
      case VisitStatus.completada:
        bgColor = AppColors.success;
        break;
      case VisitStatus.enProceso:
        bgColor = AppColors.traceRed;
        break;
      case VisitStatus.pendiente:
        bgColor = AppColors.inputBorder;
        textColor = AppColors.dimGrayText;
        break;
    }

    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        boxShadow: status == VisitStatus.enProceso
            ? [BoxShadow(color: AppColors.traceRed.withValues(alpha: 0.4), blurRadius: 8)]
            : null,
      ),
      child: status == VisitStatus.completada
          ? const Icon(Icons.check, color: Colors.white, size: 20)
          : Text(
              '$number',
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
    );
  }
}

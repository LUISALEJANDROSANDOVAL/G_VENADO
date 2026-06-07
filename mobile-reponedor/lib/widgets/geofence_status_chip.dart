import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Chip de estado de geofence con animación de radar/ping cuando busca GPS.
class GeofenceStatusChip extends StatefulWidget {
  const GeofenceStatusChip({
    super.key,
    required this.status,
    this.hasPdvCoordinates = false,
  });

  final GeofenceStatus status;
  final bool hasPdvCoordinates;

  @override
  State<GeofenceStatusChip> createState() => _GeofenceStatusChipState();
}

class _GeofenceStatusChipState extends State<GeofenceStatusChip>
    with TickerProviderStateMixin {
  // Controlador para el pulso tipo "radar"
  late AnimationController _pulseController;
  late Animation<double> _pulseScale;
  late Animation<double> _pulseOpacity;

  // Controlador para la transición entre estados
  late AnimationController _stateController;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    _pulseScale = Tween<double>(begin: 1.0, end: 2.5).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    _pulseOpacity = Tween<double>(begin: 0.6, end: 0.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    _stateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
      value: 1.0,
    );

    _updatePulse();
  }

  @override
  void didUpdateWidget(covariant GeofenceStatusChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.status != widget.status) {
      _updatePulse();
      // Vibración táctil al validar llegada
      if (widget.status == GeofenceStatus.visitaValidada) {
        HapticFeedback.mediumImpact();
      } else if (widget.status == GeofenceStatus.dentroDelRadio) {
        HapticFeedback.lightImpact();
      }
    }
  }

  void _updatePulse() {
    if (widget.status == GeofenceStatus.fueraDelPdv && widget.hasPdvCoordinates) {
      _pulseController.repeat();
    } else {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final (label, description, color, icon) = switch (widget.status) {
      GeofenceStatus.fueraDelPdv => (
          'Fuera del PDV',
          widget.hasPdvCoordinates
              ? 'Acércate al comercio — GPS detectará tu llegada'
              : 'Confirma tu llegada al comercio para habilitar el checklist',
          AppColors.error,
          Icons.location_off,
        ),
      GeofenceStatus.dentroDelRadio => (
          'Dentro del radio',
          'Checklist habilitado — puedes iniciar micro-tareas',
          AppColors.cornflowerBlue,
          Icons.my_location,
        ),
      GeofenceStatus.visitaValidada => (
          'Visita validada ✓',
          'Presencia confirmada en el punto de venta',
          AppColors.success,
          Icons.verified_outlined,
        ),
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
        boxShadow: widget.status == GeofenceStatus.visitaValidada
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.2),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : [],
      ),
      child: Row(
        children: [
          // Ícono con efecto de radar/ping cuando está buscando
          SizedBox(
            width: 52,
            height: 52,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Ondas de radar (solo cuando está fuera del PDV con coords reales)
                if (widget.status == GeofenceStatus.fueraDelPdv && widget.hasPdvCoordinates) ...[
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, _) => Transform.scale(
                      scale: _pulseScale.value,
                      child: Opacity(
                        opacity: _pulseOpacity.value,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: color, width: 2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
                // Ícono central
                TweenAnimationBuilder<double>(
                  key: ValueKey(widget.status),
                  tween: Tween(begin: 0.5, end: 1.0),
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.elasticOut,
                  builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'GEOFENCING',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: color.withValues(alpha: 0.7),
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 3),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.2),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  ),
                  child: Text(
                    key: ValueKey(label),
                    label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.secondaryText,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

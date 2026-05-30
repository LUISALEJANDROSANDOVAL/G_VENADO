import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Chip de geofence con acción para simular llegada (demo web).
/// TODO: Conectar con GpsService en producción.
class GeofenceStatusChip extends StatelessWidget {
  const GeofenceStatusChip({
    super.key,
    required this.status,
    this.onSimulateArrival,
    this.canSimulate = true,
  });

  final GeofenceStatus status;
  final VoidCallback? onSimulateArrival;
  final bool canSimulate;

  @override
  Widget build(BuildContext context) {
    final (label, description, color, icon) = switch (status) {
      GeofenceStatus.fueraDelPdv => (
          'Fuera del PDV',
          'Acércate al comercio para habilitar el checklist',
          AppColors.error,
          Icons.location_off,
        ),
      GeofenceStatus.dentroDelRadio => (
          'Dentro del radio permitido',
          'Checklist habilitado — puedes iniciar micro-tareas',
          AppColors.cornflowerBlue,
          Icons.my_location,
        ),
      GeofenceStatus.visitaValidada => (
          'Visita validada',
          'Presencia confirmada en el punto de venta',
          AppColors.success,
          Icons.verified_outlined,
        ),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GEOFENCING',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: color,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      label,
                      style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(description, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.secondaryText)),
                  ],
                ),
              ),
            ],
          ),
          if (status == GeofenceStatus.fueraDelPdv && canSimulate && onSimulateArrival != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: onSimulateArrival,
                icon: const Icon(Icons.near_me, size: 18),
                label: const Text('Simular llegada al PDV'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: color,
                  side: BorderSide(color: color, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}


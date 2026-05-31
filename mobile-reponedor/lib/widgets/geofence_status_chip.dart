import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Chip de estado de geofence — 100% GPS real.
/// 
/// - Si el PDV tiene lat/lng reales: muestra estado GPS y espera detección automática.
/// - Si el PDV no tiene coordenadas: el checklist ya fue habilitado desde [_startGeofenceCheck].
class GeofenceStatusChip extends StatelessWidget {
  const GeofenceStatusChip({
    super.key,
    required this.status,
    this.hasPdvCoordinates = false,
  });

  final GeofenceStatus status;

  /// Si es true, el PDV tiene lat/lng reales y el GPS automático gestiona el geofence.
  final bool hasPdvCoordinates;

  @override
  Widget build(BuildContext context) {
    final (label, description, color, icon) = switch (status) {
      GeofenceStatus.fueraDelPdv => (
          'Fuera del PDV',
          hasPdvCoordinates
              ? 'Acércate al comercio — el GPS detectará tu llegada automáticamente'
              : 'Confirma tu llegada al comercio para habilitar el checklist',
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

    // Si no tiene coordenadas GPS el checklist ya está habilitado automáticamente.
    // Este chip solo informa el estado actual.

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
              // Indicador de GPS automático activo
              if (hasPdvCoordinates && status == GeofenceStatus.fueraDelPdv)
                Tooltip(
                  message: 'GPS automático activo',
                  child: Icon(Icons.gps_fixed, color: color.withValues(alpha: 0.7), size: 18),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

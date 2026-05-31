import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Tarjeta visual de estado de sincronización.
/// TODO: Conectar con cola de sync offline (Supabase / SQLite local).
class SyncStatusCard extends StatelessWidget {
  const SyncStatusCard({super.key, required this.status});

  final SyncStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, description, color, icon) = switch (status) {
      SyncStatus.sincronizado => (
          'Sincronizado',
          'Todos los datos están en el servidor',
          AppColors.success,
          Icons.cloud_done,
        ),
      SyncStatus.pendiente => (
          'Pendiente',
          'Hay datos locales por enviar',
          AppColors.warning,
          Icons.cloud_queue,
        ),
      SyncStatus.enviando => (
          'Enviando',
          'Sincronizando datos con el servidor...',
          AppColors.activeBlue,
          Icons.cloud_upload,
        ),
      SyncStatus.error => (
          'Error',
          'No se pudo sincronizar. Reintentar más tarde',
          AppColors.paretoRed,
          Icons.cloud_off,
        ),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sincronización',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(description, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            if (status == SyncStatus.enviando)
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
      ),
    );
  }
}

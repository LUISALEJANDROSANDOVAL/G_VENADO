import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../services/app_connection_service.dart';
import '../theme/app_colors.dart';

/// Banner global de estado de conexión (RF-10 visual).
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppConnectionService.instance,
      builder: (context, _) {
        final service = AppConnectionService.instance;
        final status = service.status;

        if (status == ConnectionStatus.online && !service.isSyncing) {
          return const SizedBox.shrink();
        }

        final (label, color, icon) = switch (status) {
          ConnectionStatus.offline => (
              'Sin conexión — datos guardados localmente',
              AppColors.crimson,
              Icons.wifi_off,
            ),
          ConnectionStatus.pendingSync => (
              service.isSyncing
                  ? 'Sincronizando ${service.pendingSyncItems} elemento(s)...'
                  : '${service.pendingSyncItems} elemento(s) pendientes de sync',
              AppColors.cornflowerBlue,
              service.isSyncing ? Icons.sync : Icons.cloud_upload_outlined,
            ),
          ConnectionStatus.online => (
              'Sincronizando...',
              AppColors.darkTurquoise,
              Icons.sync,
            ),
        };

        return Material(
          color: color.withValues(alpha: 0.15),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: color.withValues(alpha: 0.5))),
            ),
            child: Row(
              children: [
                if (service.isSyncing)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: color),
                    ),
                  )
                else
                  Icon(icon, size: 18, color: color),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
                if (status == ConnectionStatus.pendingSync && !service.isSyncing)
                  TextButton(
                    onPressed: service.manualSync,
                    child: const Text('Sync'),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

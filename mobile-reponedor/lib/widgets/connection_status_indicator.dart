import 'package:flutter/material.dart';
import '../theme/trace_login_colors.dart';
import '../models/enums.dart';

/// Indicadores de conexión en el login (adaptado a tema claro TRACE V).
class ConnectionStatusIndicator extends StatelessWidget {
  const ConnectionStatusIndicator({super.key, required this.status});

  final ConnectionStatus status;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: ConnectionStatus.values.map((s) {
        final isActive = s == status;
        final (label, color, icon) = switch (s) {
          ConnectionStatus.online => ('Online', TraceLoginColors.primaryContainer, Icons.wifi),
          ConnectionStatus.offline => ('Offline', TraceLoginColors.secondary, Icons.wifi_off),
          ConnectionStatus.pendingSync => (
              'Pend. sync',
              TraceLoginColors.onSurfaceVariant,
              Icons.sync_problem,
            ),
        };

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Opacity(
            opacity: isActive ? 1.0 : 0.35,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isActive
                        ? color.withValues(alpha: 0.12)
                        : TraceLoginColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isActive ? color : TraceLoginColors.secondary.withValues(alpha: 0.4),
                      width: isActive ? 2 : 1,
                    ),
                  ),
                  child: Icon(
                    icon,
                    color: isActive ? color : TraceLoginColors.secondary,
                    size: 20,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    color: isActive ? color : TraceLoginColors.secondary,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

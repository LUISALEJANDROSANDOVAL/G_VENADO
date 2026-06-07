import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Tarjeta visual de estado de sincronización con animaciones premium.
class SyncStatusCard extends StatefulWidget {
  const SyncStatusCard({super.key, required this.status});

  final SyncStatus status;

  @override
  State<SyncStatusCard> createState() => _SyncStatusCardState();
}

class _SyncStatusCardState extends State<SyncStatusCard> with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    if (widget.status == SyncStatus.enviando) {
      _rotationController.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant SyncStatusCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.status == SyncStatus.enviando) {
      _rotationController.repeat();
    } else {
      _rotationController.stop();
      _rotationController.reset();
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final (label, description, color, icon) = switch (widget.status) {
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
          'Enviando...',
          'Sincronizando datos con el servidor',
          AppColors.activeBlue,
          Icons.sync,
        ),
      SyncStatus.error => (
          'Error de Sync',
          'No se pudo sincronizar. Se reintentará automáticamente',
          AppColors.paretoRed,
          Icons.cloud_off,
        ),
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.inputBorder.withValues(alpha: 0.5),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: widget.status == SyncStatus.sincronizado ? 0.12 : 0.06),
            blurRadius: widget.status == SyncStatus.sincronizado ? 12 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Icono animado con halo de color
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: widget.status == SyncStatus.enviando
                  ? RotationTransition(
                      turns: _rotationController,
                      child: Icon(icon, color: color, size: 26),
                    )
                  : TweenAnimationBuilder<double>(
                      key: ValueKey(widget.status),
                      tween: Tween(begin: 0.6, end: 1.0),
                      duration: const Duration(milliseconds: 400),
                      curve: Curves.elasticOut,
                      builder: (_, scale, child) => Transform.scale(
                        scale: scale,
                        child: child,
                      ),
                      child: Icon(icon, color: color, size: 26),
                    ),
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
                  const SizedBox(height: 2),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Text(
                      key: ValueKey(label),
                      label,
                      style: TextStyle(
                        color: AppColors.primaryText,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(description, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            // Indicador derecho según estado
            if (widget.status == SyncStatus.sincronizado)
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.0, end: 1.0),
                duration: const Duration(milliseconds: 500),
                curve: Curves.elasticOut,
                builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                child: Icon(Icons.check_circle, color: color, size: 22),
              )
            else if (widget.status == SyncStatus.error)
              Icon(Icons.warning_amber_rounded, color: color, size: 22),
          ],
        ),
      ),
    );
  }
}

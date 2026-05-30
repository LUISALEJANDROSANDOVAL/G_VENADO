import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../models/evidence.dart';
import '../theme/app_colors.dart';

/// Galería horizontal de evidencias con preview al tocar.
class EvidenceGallery extends StatelessWidget {
  const EvidenceGallery({
    super.key,
    required this.evidences,
    required this.requiredCount,
    this.onTapEvidence,
  });

  final List<Evidence> evidences;
  final int requiredCount;
  final void Function(Evidence evidence)? onTapEvidence;

  int get _capturedCount =>
      evidences.where((e) => e.status != EvidenceStatus.pendiente).length;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              '$_capturedCount de $requiredCount evidencias',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: _capturedCount >= requiredCount
                        ? AppColors.darkTurquoise
                        : AppColors.cornflowerBlue,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const Spacer(),
            if (_capturedCount < requiredCount)
              Text(
                'Faltan ${requiredCount - _capturedCount}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (evidences.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'Sin evidencias capturadas',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          )
        else
          SizedBox(
            height: 130,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: evidences.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final evidence = evidences[index];
                return _EvidenceThumbnail(
                  evidence: evidence,
                  onTap: onTapEvidence != null ? () => onTapEvidence!(evidence) : null,
                );
              },
            ),
          ),
      ],
    );
  }
}

class _EvidenceThumbnail extends StatelessWidget {
  const _EvidenceThumbnail({required this.evidence, this.onTap});

  final Evidence evidence;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (statusLabel, statusColor) = switch (evidence.status) {
      EvidenceStatus.pendiente => ('Pendiente', AppColors.secondaryText),
      EvidenceStatus.capturada => ('Capturada', AppColors.cornflowerBlue),
      EvidenceStatus.sincronizada => ('Sincronizada', AppColors.darkTurquoise),
    };

    final typeLabel = switch (evidence.type) {
      EvidenceType.antes => 'Antes',
      EvidenceType.despues => 'Después',
      EvidenceType.general => 'General',
    };

    return GestureDetector(
      onTap: evidence.status != EvidenceStatus.pendiente ? onTap : null,
      child: SizedBox(
        width: 100,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                width: 100,
                decoration: BoxDecoration(
                  color: evidence.status == EvidenceStatus.pendiente
                      ? AppColors.dimGray
                      : evidence.mockColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: evidence.status == EvidenceStatus.pendiente
                        ? AppColors.inputBorder
                        : statusColor,
                  ),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        evidence.status == EvidenceStatus.pendiente
                            ? Icons.add_a_photo_outlined
                            : Icons.image_outlined,
                        color: AppColors.primaryText.withValues(alpha: 0.5),
                        size: 32,
                      ),
                    ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.darkBackground.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          typeLabel,
                          style: const TextStyle(fontSize: 9, color: AppColors.snow),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              evidence.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
            ),
            Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

/// Preview fullscreen mock de evidencia.
void showEvidencePreview(BuildContext context, Evidence evidence) {
  showDialog<void>(
    context: context,
    builder: (context) => Dialog(
      backgroundColor: AppColors.cardBackground,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            height: 280,
            width: double.infinity,
            color: evidence.mockColor,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.photo, size: 64, color: AppColors.snow),
                const SizedBox(height: 12),
                Text(
                  evidence.label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Simulación — preview de evidencia',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cerrar'),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// Diálogo para elegir tipo de evidencia al capturar.
Future<EvidenceType?> showEvidenceCaptureDialog(BuildContext context) {
  return showModalBottomSheet<EvidenceType>(
    context: context,
    backgroundColor: AppColors.cardBackground,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Tomar evidencia',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Selecciona el tipo de fotografía',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            _CaptureOption(
              icon: Icons.photo_camera_back_outlined,
              label: 'Antes',
              onTap: () => Navigator.pop(context, EvidenceType.antes),
            ),
            const SizedBox(height: 10),
            _CaptureOption(
              icon: Icons.photo_camera_front_outlined,
              label: 'Después',
              onTap: () => Navigator.pop(context, EvidenceType.despues),
            ),
            const SizedBox(height: 10),
            _CaptureOption(
              icon: Icons.camera_alt_outlined,
              label: 'General',
              onTap: () => Navigator.pop(context, EvidenceType.general),
            ),
          ],
        ),
      ),
    ),
  );
}

class _CaptureOption extends StatelessWidget {
  const _CaptureOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.darkBackground,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Icon(icon, color: AppColors.activeBlue),
              const SizedBox(width: 14),
              Text(label, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
      ),
    );
  }
}

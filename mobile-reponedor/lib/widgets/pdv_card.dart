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
  });

  final Pdv pdv;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isActive = pdv.status == VisitStatus.enProceso;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isActive
            ? const BorderSide(color: AppColors.institutionalBlue, width: 2)
            : const BorderSide(color: AppColors.inputBorder, width: 1),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _VisitNumberBadge(number: pdv.visitNumber, isActive: isActive),
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
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        CustomerTypeBadge(type: pdv.customerType),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 14, color: AppColors.secondaryText),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            pdv.address,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.access_time,
                            size: 14, color: AppColors.secondaryText),
                        const SizedBox(width: 4),
                        Text(
                          pdv.estimatedTime,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(width: 16),
                        const Icon(Icons.straighten,
                            size: 14, color: AppColors.secondaryText),
                        const SizedBox(width: 4),
                        Text(
                          '${pdv.distanceKm.toStringAsFixed(1)} km',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    VisitStatusBadge(status: pdv.status),
                  ],
                ),
              ),
              if (onTap != null)
                const Icon(Icons.chevron_right, color: AppColors.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisitNumberBadge extends StatelessWidget {
  const _VisitNumberBadge({required this.number, required this.isActive});

  final int number;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isActive ? AppColors.institutionalBlue : AppColors.secondaryText,
        shape: BoxShape.circle,
      ),
      child: Text(
        '$number',
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }
}

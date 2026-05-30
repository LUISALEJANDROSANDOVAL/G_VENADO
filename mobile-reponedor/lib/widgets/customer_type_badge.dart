import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../theme/app_colors.dart';

/// Badge de clasificación comercial del cliente (Pareto / Mayorista / Detallista).
class CustomerTypeBadge extends StatelessWidget {
  const CustomerTypeBadge({super.key, required this.type});

  final CustomerType type;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (type) {
      CustomerType.pareto => ('Pareto', AppColors.paretoRed),
      CustomerType.mayorista => ('Mayorista', AppColors.wholesaleBlue),
      CustomerType.detallista => ('Detallista', AppColors.detallistaGray),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class MapFullscreenView extends StatelessWidget {
  const MapFullscreenView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mapa de Ruta', style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.cardBackground,
        elevation: 0,
      ),
      body: const Center(
        child: Text('Vista de Mapa a Pantalla Completa\n(En construcción)', textAlign: TextAlign.center),
      ),
    );
  }
}

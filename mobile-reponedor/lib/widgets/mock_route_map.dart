import 'package:flutter/material.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../theme/app_colors.dart';

/// Mapa simulado de alta fidelidad con parques, río, cuadrícula de calles y ruta vectorial.
class MockRouteMap extends StatelessWidget {
  const MockRouteMap({super.key, required this.pdvs, this.activePdvId});

  final List<Pdv> pdvs;
  final String? activePdvId;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.inputBorder, width: 1),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final mapWidth = constraints.maxWidth;
          const mapHeight = 220.0;

          return SizedBox(
            height: mapHeight,
            child: Stack(
              children: [
                // Fondo y detalles vectoriales del mapa
                Container(
                  color: const Color(0xFFF2F2F7), // Fondo tipo Google Maps claro
                ),
                CustomPaint(
                  size: Size(mapWidth, mapHeight),
                  painter: _RouteLinePainter(pdvs),
                ),
                // Marcadores sobre el mapa
                ...pdvs.map((pdv) {
                  // Mapear coordenadas relativas a las dimensiones del contenedor
                  final x = (pdv.mapX ?? 0.5) * (mapWidth - 48) + 10;
                  final y = (pdv.mapY ?? 0.5) * (mapHeight - 64) + 16;
                  final isCompleted = pdv.status == VisitStatus.completada;
                  final isActive = pdv.id == activePdvId || pdv.status == VisitStatus.enProceso;

                  return Positioned(
                    left: x,
                    top: y,
                    child: _MapMarker(
                      number: pdv.visitNumber,
                      isCompleted: isCompleted,
                      isActive: isActive,
                    ),
                  );
                }),
                // Badge indicador
                Positioned(
                  left: 12,
                  top: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(color: AppColors.inputBorder),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.route_outlined, size: 14, color: AppColors.institutionalBlue),
                        SizedBox(width: 6),
                        Text(
                          'Mapa de Ruta TRACE V',
                          style: TextStyle(fontSize: 11, color: AppColors.primaryText, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({
    required this.number,
    required this.isCompleted,
    required this.isActive,
  });

  final int number;
  final bool isCompleted;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final color = isCompleted
        ? AppColors.success
        : isActive
            ? AppColors.institutionalBlue
            : AppColors.secondaryText;

    return Container(
      width: 26,
      height: 26,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
          if (isActive)
            BoxShadow(
              color: AppColors.institutionalBlue.withValues(alpha: 0.4),
              blurRadius: 10,
              spreadRadius: 3,
            ),
        ],
      ),
      child: Text(
        '$number',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _RouteLinePainter extends CustomPainter {
  _RouteLinePainter(this.pdvs);

  final List<Pdv> pdvs;

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Pintar calles/avenidas vectoriales de fondo
    final streetPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 7.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final streetBorderPaint = Paint()
      ..color = const Color(0xFFE5E5EA)
      ..strokeWidth = 9.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Dibujar algunas calles de fondo (grillas horizontales y verticales)
    final streets = [
      [Offset(0, size.height * 0.25), Offset(size.width, size.height * 0.25)],
      [Offset(0, size.height * 0.65), Offset(size.width, size.height * 0.65)],
      [Offset(size.width * 0.2, 0), Offset(size.width * 0.2, size.height)],
      [Offset(size.width * 0.5, 0), Offset(size.width * 0.5, size.height)],
      [Offset(size.width * 0.8, 0), Offset(size.width * 0.8, size.height)],
    ];

    // Primero pintar el borde gris de las calles
    for (final street in streets) {
      canvas.drawLine(street[0], street[1], streetBorderPaint);
    }
    // Luego pintar el relleno blanco
    for (final street in streets) {
      canvas.drawLine(street[0], street[1], streetPaint);
    }

    // 2. Pintar parques (Zonas verdes)
    final parkPaint = Paint()
      ..color = const Color(0xFFE2F0D9)
      ..style = PaintingStyle.fill;
    
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(size.width * 0.05, size.height * 0.35, 60, 40), const Radius.circular(8)), parkPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(size.width * 0.55, size.height * 0.1, 80, 30), const Radius.circular(8)), parkPaint);

    // 3. Pintar río (Cuerpo de agua)
    final waterPaint = Paint()
      ..color = const Color(0xFFC9E2F3)
      ..strokeWidth = 12.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final riverPath = Path()
      ..moveTo(size.width * 0.9, 0)
      ..cubicTo(size.width * 0.8, size.height * 0.4, size.width * 0.4, size.height * 0.5, size.width * 0.35, size.height);
    canvas.drawPath(riverPath, waterPaint);

    // 4. Pintar la línea de la ruta que une las paradas
    if (pdvs.length < 2) return;

    final routePaint = Paint()
      ..color = AppColors.institutionalBlue.withValues(alpha: 0.6)
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    for (var i = 0; i < pdvs.length; i++) {
      final pdv = pdvs[i];
      final x = (pdv.mapX ?? 0.5) * (size.width - 48) + 23;
      final y = (pdv.mapY ?? 0.5) * (size.height - 64) + 29;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, routePaint);
  }

  @override
  bool shouldRepaint(covariant _RouteLinePainter oldDelegate) =>
      oldDelegate.pdvs != pdvs;
}


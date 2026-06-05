import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../theme/app_colors.dart';

/// Mapa interactivo real usando flutter_map y los tiles de Mapbox.
class MapboxRouteMap extends StatefulWidget {
  const MapboxRouteMap({
    super.key,
    required this.pdvs,
    this.activePdvId,
  });

  final List<Pdv> pdvs;
  final String? activePdvId;

  @override
  State<MapboxRouteMap> createState() => _MapboxRouteMapState();
}

class _MapboxRouteMapState extends State<MapboxRouteMap> {
  final MapController _mapController = MapController();
  late String _mapboxToken;
  

  @override
  void initState() {
    super.initState();
    _mapboxToken = dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? '';
  }

  @override
  Widget build(BuildContext context) {
    if (_mapboxToken.isEmpty) {
      return _buildErrorCard('Token de Mapbox no configurado en .env');
    }

    final validPdvs = widget.pdvs.where((p) => p.latitude != null && p.longitude != null).toList();

    if (validPdvs.isEmpty) {
      return _buildDemoPlaceholder();
    }

    final markers = validPdvs.map((pdv) {
      final isCompleted = pdv.status == VisitStatus.completada;
      final isActive = pdv.id == widget.activePdvId || pdv.status == VisitStatus.enProceso;
      
      return Marker(
        point: LatLng(pdv.latitude!, pdv.longitude!),
        width: isActive ? 40 : 32,
        height: isActive ? 40 : 32,
        child: _MapMarker(
          number: pdv.visitNumber,
          isCompleted: isCompleted,
          isActive: isActive,
        ),
      );
    }).toList();

    final points = validPdvs.map((p) => LatLng(p.latitude!, p.longitude!)).toList();

    // Calcular bounds para centrar la cámara
    final bounds = LatLngBounds.fromPoints(points);

    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.inputBorder, width: 1),
      ),
      child: SizedBox(
        height: 240,
        child: Stack(
          children: [
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCameraFit: CameraFit.bounds(
                  bounds: bounds,
                  padding: const EdgeInsets.all(32),
                ),
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}',
                  additionalOptions: {
                    'accessToken': _mapboxToken,
                  },
                  maxZoom: 19,
                ),
                if (points.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: points,
                        color: AppColors.institutionalBlue.withValues(alpha: 0.8),
                        strokeWidth: 4.0,
                        borderStrokeWidth: 2.0,
                        borderColor: Colors.white,
                      ),
                    ],
                  ),
                MarkerLayer(markers: markers),
              ],
            ),
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
                      'Ruta Mapbox Live',
                      style: TextStyle(fontSize: 11, color: AppColors.primaryText, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDemoPlaceholder() {
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.inputBorder, width: 1),
      ),
      child: Container(
        height: 240,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFFF2F2F7),
          image: const DecorationImage(
            image: AssetImage('assets/images/map_placeholder.png'), // Se asume que existe o fallará limpiamente
            fit: BoxFit.cover,
            opacity: 0.3,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: const Icon(Icons.location_off, size: 32, color: AppColors.secondaryText),
            ),
            const SizedBox(height: 16),
            Text(
              'Modo Demo: Sin coordenadas reales',
              style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryText),
            ),
            const SizedBox(height: 4),
            Text(
              'Las paradas de prueba no tienen lat/lng.',
              style: TextStyle(fontSize: 12, color: AppColors.secondaryText),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(String error) {
    return Card(
      color: AppColors.error.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.error, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.error),
            const SizedBox(width: 12),
            Expanded(child: Text(error, style: const TextStyle(color: AppColors.error))),
          ],
        ),
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

    return AnimatedScale(
      scale: isActive ? 1.1 : 1.0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutBack,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
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
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

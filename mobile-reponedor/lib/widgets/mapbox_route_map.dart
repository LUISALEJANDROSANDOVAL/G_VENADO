import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../services/gps_service.dart';
import '../services/mapbox_directions_service.dart';
import '../theme/app_colors.dart';

/// Mapa interactivo real usando flutter_map y los tiles de Mapbox.
class MapboxRouteMap extends StatefulWidget {
  const MapboxRouteMap({
    super.key,
    required this.pdvs,
    this.activePdvId,
<<<<<<< Updated upstream
    this.isFullscreen = false,
=======
    this.initialCenter, // Parámetro opcional para forzar centro
>>>>>>> Stashed changes
  });

  final List<Pdv> pdvs;
  final String? activePdvId;
<<<<<<< Updated upstream
  final bool isFullscreen;
=======
  final LatLng? initialCenter;
>>>>>>> Stashed changes

  @override
  State<MapboxRouteMap> createState() => _MapboxRouteMapState();
}

class _MapboxRouteMapState extends State<MapboxRouteMap> {
  final MapController _mapController = MapController();
  late String _mapboxToken;
  List<LatLng> _routePoints = [];
  bool _isRouteLoading = false;
  bool _hasFittedRoute = false;
  String? _routeError;

  LatLng? get _currentLocation => GpsService.instance.currentPosition;

  @override
  void initState() {
    super.initState();
    _mapboxToken = dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? dotenv.env['NEXT_PUBLIC_MAPBOX_TOKEN'] ?? '';
    if (_mapboxToken.isEmpty) {
      debugPrint('[MapboxRouteMap] No se encontró MAPBOX_ACCESS_TOKEN ni NEXT_PUBLIC_MAPBOX_TOKEN en .env');
    }
    GpsService.instance.addListener(_onGpsUpdate);
    _loadRoute();
  }

  @override
  void dispose() {
    GpsService.instance.removeListener(_onGpsUpdate);
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant MapboxRouteMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pdvs != widget.pdvs || oldWidget.activePdvId != widget.activePdvId) {
      _loadRoute();
    }
  }

  void _onGpsUpdate() {
    if (mounted) {
      _loadRoute();
    }
  }

  Future<void> _loadRoute() async {
    final pointsToRoute = <LatLng>[];
    final validPdvs = widget.pdvs.where((p) {
      return p.latitude != null && p.longitude != null &&
          p.latitude!.isFinite && p.longitude!.isFinite &&
          p.latitude! >= -90 && p.latitude! <= 90 &&
          p.longitude! >= -180 && p.longitude! <= 180;
    }).toList();

    final activeIndex = widget.activePdvId != null
        ? validPdvs.indexWhere((p) => p.id == widget.activePdvId)
        : -1;
    final orderedPdvs = activeIndex >= 0
        ? validPdvs.sublist(activeIndex)
        : validPdvs;

    if (_currentLocation != null) {
      final current = _currentLocation!;
      final firstRoutePoint = orderedPdvs.isNotEmpty
          ? LatLng(orderedPdvs.first.latitude!, orderedPdvs.first.longitude!)
          : null;
      if (firstRoutePoint == null || current != firstRoutePoint) {
        pointsToRoute.add(current);
      }
    }
    pointsToRoute.addAll(orderedPdvs.map((p) => LatLng(p.latitude!, p.longitude!)));

    if (_mapboxToken.isEmpty || pointsToRoute.length < 2) {
      setState(() {
        _routePoints = [];
        _routeError = null;
      });
      return;
    }

    setState(() {
      _isRouteLoading = true;
      _routeError = null;
    });

    try {
      final fetchedRoutePoints = await MapboxDirectionsService.fetchRoutePoints(
        accessToken: _mapboxToken,
        points: pointsToRoute,
      );
      if (!mounted) return;

      final sanitizedFetched = _sanitizeRoutePoints(fetchedRoutePoints);
      if (sanitizedFetched.length > 1) {
        setState(() {
          _routePoints = sanitizedFetched;
          _routeError = null;
          _hasFittedRoute = false;
        });
      } else {
        debugPrint('[MapboxRouteMap] Mapbox no devolvió ruta, usando fallback directo.');
        final fallbackPoints = _sanitizeRoutePoints(pointsToRoute);
        setState(() {
          _routePoints = fallbackPoints.length > 1 ? fallbackPoints : [];
          _routeError = null;
          _hasFittedRoute = false;
        });
      }
    } catch (e) {
      if (mounted) {
        debugPrint('[MapboxRouteMap] Error cargando ruta de Mapbox: $e');
        final fallbackPoints = _sanitizeRoutePoints(pointsToRoute);
        setState(() {
          _routePoints = fallbackPoints.length > 1 ? fallbackPoints : [];
          _routeError = null;
          _hasFittedRoute = false;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRouteLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_mapboxToken.isEmpty) {
      return _buildErrorCard('Token de Mapbox no configurado en .env');
    }

    // Filtrar los PDVs válidos y, si hay un PDV activo, comenzar por él.
    final validPdvs = widget.pdvs.where((p) {
      return p.latitude != null && p.longitude != null &&
             p.latitude!.isFinite && p.longitude!.isFinite &&
             p.latitude! >= -90 && p.latitude! <= 90 &&
             p.longitude! >= -180 && p.longitude! <= 180;
    }).toList();

    final activeIndex = widget.activePdvId != null
        ? validPdvs.indexWhere((p) => p.id == widget.activePdvId)
        : -1;
    final orderedPdvs = activeIndex >= 0
        ? validPdvs.sublist(activeIndex)
        : validPdvs;

    final safeInitialCenter = widget.initialCenter != null &&
      widget.initialCenter!.latitude.isFinite &&
      widget.initialCenter!.longitude.isFinite &&
      widget.initialCenter!.latitude >= -90 &&
      widget.initialCenter!.latitude <= 90 &&
      widget.initialCenter!.longitude >= -180 &&
      widget.initialCenter!.longitude <= 180
        ? widget.initialCenter
        : null;

    final LatLng center = safeInitialCenter ??
      (_currentLocation ?? (orderedPdvs.isNotEmpty
        ? LatLng(orderedPdvs.first.latitude!, orderedPdvs.first.longitude!)
        : const LatLng(-17.7833, -63.1821)));

    // Lógica de marcadores
    final pdvMarkers = validPdvs.map((pdv) {
      final isCompleted = pdv.status == VisitStatus.completada;
      final isActive = pdv.id == widget.activePdvId || pdv.status == VisitStatus.enProceso;
      
      return Marker(
        point: LatLng(pdv.latitude!, pdv.longitude!),
        width: isActive ? 40 : 32,
        height: isActive ? 40 : 32,
        child: _MapMarker(number: pdv.visitNumber, isCompleted: isCompleted, isActive: isActive),
      );
    }).toList();

    final locationMarker = _currentLocation != null
        ? Marker(
            point: _currentLocation!,
            width: 28,
            height: 28,
            child: const _CurrentLocationMarker(),
          )
        : null;

    final allMarkers = <Marker>[
      ...?(locationMarker != null ? [locationMarker] : null),
      ...pdvMarkers,
    ];

    final validRoutePoints = _routePoints.isNotEmpty ? _sanitizeRoutePoints(_routePoints) : <LatLng>[];
    final routePoints = validRoutePoints.length > 1 ? validRoutePoints : <LatLng>[];
    final LatLngBounds? routeBounds = routePoints.length > 1 ? _tryBuildBounds(routePoints) : null;
    if (routeBounds != null) {
      _fitRouteIfNeeded(routeBounds);
    }

<<<<<<< Updated upstream
    final mapStack = Stack(
      children: [
        FlutterMap(
=======
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.inputBorder, width: 1),
      ),
      child: SizedBox(
        height: 240,
        child: Stack(
          children: [
            FlutterMap(
>>>>>>> Stashed changes
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: 13.0,
                // Si hay varios puntos, ajustamos la cámara a ellos.
                // Con un solo punto, no hay bounds válidos para calcular zoom.
                initialCameraFit: routeBounds != null
                    ? CameraFit.bounds(bounds: routeBounds, padding: const EdgeInsets.all(32))
                    : null,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}',
                  additionalOptions: {'accessToken': _mapboxToken},
                ),
                if (routePoints.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: routePoints,
                        color: AppColors.primary.withValues(alpha: 0.85),
                        strokeWidth: 4.0,
                      ),
                    ],
                  ),
                MarkerLayer(markers: allMarkers),
              ],
            ),
<<<<<<< Updated upstream
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
=======
            if (_isRouteLoading)
              Positioned.fill(
                child: Container(
                  color: Colors.black26,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      CircularProgressIndicator(),
                      SizedBox(height: 8),
                      Text('Calculando ruta...', style: TextStyle(color: Colors.white)),
                    ],
                  ),
                ),
              ),
            if (_routeError != null)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Material(
                  color: AppColors.error.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Text(
                      'No se pudo obtener la ruta: $_routeError',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ),
          ],
>>>>>>> Stashed changes
        ),
      ],
    );

    if (widget.isFullscreen) {
      return mapStack;
    }

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
        child: mapStack,
      ),
    );
  }

  List<LatLng> _sanitizeRoutePoints(List<LatLng> points) {
    return points.where((point) {
      return point.latitude.isFinite && point.longitude.isFinite &&
        point.latitude >= -90 && point.latitude <= 90 &&
        point.longitude >= -180 && point.longitude <= 180;
    }).toList();
  }

  LatLngBounds? _tryBuildBounds(List<LatLng> points) {
    try {
      return LatLngBounds.fromPoints(points);
    } catch (_) {
      return null;
    }
  }

  void _fitRouteIfNeeded(LatLngBounds bounds) {
    if (_hasFittedRoute || !mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      try {
        _mapController.fitBounds(bounds, options: const FitBoundsOptions(padding: EdgeInsets.all(32)));
        _hasFittedRoute = true;
      } catch (_) {
        // Ignorar si el controlador no está listo aún.
      }
    });
  }

  Widget _buildErrorCard(String error) {
    return Card(
      color: AppColors.error.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [const Icon(Icons.error_outline, color: AppColors.error), const SizedBox(width: 12), Expanded(child: Text(error))]),
      ),
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({required this.number, required this.isCompleted, required this.isActive});
  final int number;
  final bool isCompleted;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final color = isCompleted ? AppColors.success : (isActive ? AppColors.primary : AppColors.secondaryText);
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
      child: Text('$number', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }
}

class _CurrentLocationMarker extends StatelessWidget {
  const _CurrentLocationMarker();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.primary,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: const Icon(Icons.my_location, color: Colors.white, size: 16),
    );
  }
}
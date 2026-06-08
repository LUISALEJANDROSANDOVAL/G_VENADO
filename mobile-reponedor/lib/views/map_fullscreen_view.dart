import 'package:flutter/material.dart';
import '../models/pdv.dart';
import '../services/route_repository.dart';
import '../services/session_service.dart';
import '../theme/app_colors.dart';
import '../widgets/mapbox_route_map.dart';

class MapFullscreenView extends StatefulWidget {
  const MapFullscreenView({super.key});

  @override
  State<MapFullscreenView> createState() => _MapFullscreenViewState();
}

class _MapFullscreenViewState extends State<MapFullscreenView> {
  List<Pdv> _pdvs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final userId = SessionService.instance.currentUserId;
    final pdvs = await RouteRepository.instance.fetchDailyRoute(userId: userId);
    if (mounted) {
      setState(() {
        _pdvs = pdvs;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mapa de Ruta', style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.cardBackground,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.traceRed))
          : MapboxRouteMap(pdvs: _pdvs, isFullscreen: true),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import '../data/mock_data.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../models/visit.dart';
import '../services/app_connection_service.dart';
import '../services/gps_service.dart';
import '../services/route_repository.dart';
import '../services/session_service.dart';
import '../theme/app_colors.dart';
import '../widgets/mapbox_route_map.dart';
import '../widgets/offline_banner.dart';
import '../widgets/pdv_card.dart';
import '../widgets/route_progress_header.dart';
import '../widgets/route_summary_card.dart';
import 'login_view.dart';
import 'visit_execution_view.dart';

/// Pantalla principal: ruta de jornada del reponedor.
class RouteView extends StatefulWidget {
  const RouteView({super.key});

  @override
  State<RouteView> createState() => _RouteViewState();
}

class _RouteViewState extends State<RouteView> {
  List<Pdv> _pdvs = [];
  bool _isRefreshing = false;
  bool _isLoadingRoute = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadRoute();
    // El GPS se inicia dentro de _loadRoute() una vez que se
    // confirma la sesión del usuario, para garantizar que
    // SessionService.currentUserId no sea null al primer ciclo.
  }

  /// Carga la ruta desde Supabase (RF-06/RF-07) con fallback a MockData.
  /// Inicia el GPS en cuanto el userId está disponible (RF-08).
  Future<void> _loadRoute() async {
    setState(() {
      _isLoadingRoute = true;
      _loadError = null;
    });
    try {
      // Obtiene el userId autenticado si hay sesión activa
      final userId = SessionService.instance.currentUserId;
      final pdvs = await RouteRepository.instance.fetchDailyRoute(userId: userId);
      if (mounted) {
        setState(() {
          _pdvs = pdvs;
          _isLoadingRoute = false;
        });
      }
      // Iniciar GPS DESPUÉS de confirmar la sesión, así userId no es null
      if (userId != null && userId.isNotEmpty) {
        unawaited(GpsService.instance.startLiveTracking());
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _pdvs = List.from(MockData.dailyRoute);
          _isLoadingRoute = false;
          _loadError = e.toString();
        });
      }
      // Intentar iniciar GPS igualmente si hay sesión
      final userId = SessionService.instance.currentUserId;
      if (userId != null && userId.isNotEmpty) {
        unawaited(GpsService.instance.startLiveTracking());
      }
    }
  }

  String get _dateLabel {
    final now = DateTime.now();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return '${now.day} de ${months[now.month - 1]} de ${now.year}';
  }

  int get _completed => MockData.completedVisits(_pdvs);
  int get _pending => _pdvs.where((p) => p.status == VisitStatus.pendiente).length;
  int get _pendingSync => MockData.pendingSyncCount(_pdvs);
  bool get _journeyComplete => MockData.isJourneyComplete(_pdvs);

  Pdv? get _activePdv => MockData.nextPendingPdv(_pdvs);

  Future<void> _refreshRoute() async {
    setState(() => _isRefreshing = true);
    // Invalida caché para forzar recarga desde Supabase
    RouteRepository.instance.invalidateCache();
    try {
      final userId = SessionService.instance.currentUserId;
      final pdvs = await RouteRepository.instance.fetchDailyRoute(userId: userId);
      if (mounted) setState(() => _pdvs = pdvs);
    } catch (_) {
      // Mantiene datos actuales si falla el refresh
    }
    if (mounted) setState(() => _isRefreshing = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Ruta sincronizada con Supabase'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _logout() async {
    // Detener el GPS y limpiar caché antes de cerrar sesión
    GpsService.instance.stopTracking();
    RouteRepository.instance.invalidateCache();
    await SessionService.instance.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(builder: (_) => const LoginView()),
      (_) => false,
    );
  }

  void _openNavigation() {
    final target = _activePdv;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Abrir navegación',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                if (target != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Destino: ${target.name}',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                  Text(
                    target.address,
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  Text(
                    'Visita #${target.visitNumber} · ${target.distanceKm.toStringAsFixed(1)} km',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 20),
                _NavOptionTile(
                  icon: Icons.map,
                  label: 'Google Maps',
                  color: AppColors.success,
                  onTap: () {
                    Navigator.pop(context);
                    _showNavSnackbar('Google Maps');
                  },
                ),
                const SizedBox(height: 10),
                _NavOptionTile(
                  icon: Icons.navigation,
                  label: 'Waze',
                  color: AppColors.activeBlue,
                  onTap: () {
                    Navigator.pop(context);
                    _showNavSnackbar('Waze');
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNavSnackbar(String app) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Simulación: abriendo $app hacia ${_activePdv?.name ?? "PDV"}'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _markPdvCompleted(String pdvId) {
    setState(() {
      final index = _pdvs.indexWhere((p) => p.id == pdvId);
      if (index != -1) {
        _pdvs[index] = _pdvs[index].copyWith(status: VisitStatus.completada);
      }
    });

    // Actualizar el estado del plan de ruta en Supabase
    if (_journeyComplete) {
      RouteRepository.instance.updateRoutePlanStatus('COMPLETADA');
    } else {
      RouteRepository.instance.updateRoutePlanStatus('EN_PROCESO');
    }
  }

  void _markPdvInProgress(String pdvId) {
    setState(() {
      for (var i = 0; i < _pdvs.length; i++) {
        if (_pdvs[i].status == VisitStatus.enProceso && _pdvs[i].id != pdvId) {
          _pdvs[i] = _pdvs[i].copyWith(status: VisitStatus.pendiente);
        }
      }
      final index = _pdvs.indexWhere((p) => p.id == pdvId);
      if (index != -1) {
        _pdvs[index] = _pdvs[index].copyWith(status: VisitStatus.enProceso);
      }
    });

    RouteRepository.instance.updateRoutePlanStatus('EN_PROCESO');
  }

  void _openVisit(Pdv pdv) {
    if (pdv.status == VisitStatus.completada) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Esta visita ya fue completada'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    _markPdvInProgress(pdv.id);

    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => VisitExecutionView(
          initialVisit: MockData.visitForPdv(pdv),
          allPdvs: _pdvs,
          onVisitCompleted: (Visit completed) {
            _markPdvCompleted(completed.pdv.id);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final active = _activePdv;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Ruta'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sincronizar',
            onPressed: () => AppConnectionService.instance.manualSync(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: _logout,
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Banner informativo si los datos vienen del modo demo
          if (_loadError != null && !_isLoadingRoute)
            _SourceBanner(isDemo: true, message: 'Modo Demo — Supabase sin ruta asignada hoy'),
          if (_loadError == null && !_isLoadingRoute && _pdvs.isNotEmpty)
            _SourceBanner(isDemo: false, message: 'Ruta cargada desde Supabase ✓'),
          Expanded(
            child: _isLoadingRoute
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text(
                          'Cargando ruta desde Supabase...',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshRoute,
                    color: AppColors.institutionalBlue,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      children: [
                        RouteProgressHeader(
                          reponedorName: SessionService.instance.currentUserName ?? 'Reponedor',
                          dateLabel: _dateLabel,
                          completedVisits: _completed,
                          totalVisits: _pdvs.length,
                        ),
                        const SizedBox(height: 20),
                        RouteSummaryRow(
                          pending: _pending,
                          completed: _completed,
                          pendingSync: _pendingSync,
                        ),
                        if (_journeyComplete) ...[
                          const SizedBox(height: 16),
                          _JourneyCompleteCard(total: _pdvs.length),
                        ],
                        if (active != null && !_journeyComplete) ...[
                          const SizedBox(height: 16),
                          _ActivePdvBanner(pdv: active, onOpen: () => _openVisit(active)),
                        ],
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Text('Mapa de ruta', style: Theme.of(context).textTheme.titleMedium),
                            const Spacer(),
                            if (_isRefreshing)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        MapboxRouteMap(pdvs: _pdvs, activePdvId: active?.id),
                        const SizedBox(height: 8),
                        _GpsTrackingHint(isActive: !_journeyComplete),
                        const SizedBox(height: 20),
                        Text('Puntos de venta', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        ...List.generate(_pdvs.length, (index) {
                          final pdv = _pdvs[index];
                          // Staggered delay (simulado con curvo y duration ligeramente más largos para elementos posteriores)
                          return TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0.0, end: 1.0),
                            duration: Duration(milliseconds: 400 + (index * 50)),
                            curve: Curves.easeOutCubic,
                            builder: (context, value, child) {
                              return Transform.translate(
                                offset: Offset(0, 30 * (1 - value)),
                                child: Opacity(
                                  opacity: value,
                                  child: child,
                                ),
                              );
                            },
                            child: PdvCard(pdv: pdv, onTap: () => _openVisit(pdv)),
                          );
                        }),
                      ],
                    ),
                  ),
          ),
          if (!_isLoadingRoute && !_journeyComplete) _buildBottomAction(context),

        ],
      ),
    );
  }

  Widget _buildBottomAction(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.cardBackground,
        border: Border(top: BorderSide(color: AppColors.inputBorder)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: ElevatedButton.icon(
            onPressed: _activePdv != null ? _openNavigation : null,
            icon: const Icon(Icons.navigation),
            label: const Text('Abrir Navegación'),
          ),
        ),
      ),
    );
  }
}

class _JourneyCompleteCard extends StatelessWidget {
  const _JourneyCompleteCard({required this.total});

  final int total;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.success.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.success, width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.emoji_events, color: AppColors.success, size: 32),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Jornada completada', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.success)),
                  Text(
                    '$total de $total visitas realizadas',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.success.withValues(alpha: 0.8)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivePdvBanner extends StatelessWidget {
  const _ActivePdvBanner({required this.pdv, required this.onOpen});

  final Pdv pdv;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.institutionalBlue.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.institutionalBlue, width: 1.5),
      ),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: AppColors.institutionalBlue,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '${pdv.visitNumber}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Siguiente visita'.toUpperCase(),
                      style: TextStyle(
                            fontSize: 10,
                            color: AppColors.institutionalBlue,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(pdv.name, style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward, color: AppColors.institutionalBlue),
            ],
          ),
        ),
      ),
    );
  }
}

class _GpsTrackingHint extends StatelessWidget {
  const _GpsTrackingHint({required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    if (!isActive) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(Icons.gps_fixed, size: 14, color: AppColors.success.withValues(alpha: 0.8)),
        const SizedBox(width: 6),
        Text(
          'Rastreo GPS activo — posición enviada cada 30 s',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
      ],
    );
  }
}

class _NavOptionTile extends StatelessWidget {
  const _NavOptionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
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
              Icon(icon, color: color),
              const SizedBox(width: 14),
              Text(label, style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              const Icon(Icons.open_in_new, size: 18, color: AppColors.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}

/// Banner compacto que indica si los datos vienen de Supabase o del Modo Demo.
class _SourceBanner extends StatelessWidget {
  const _SourceBanner({required this.isDemo, required this.message});

  final bool isDemo;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: isDemo
          ? const Color(0xFFFFF3CD) // Amarillo suave demo
          : const Color(0xFFD4EDDA), // Verde suave Supabase
      child: Row(
        children: [
          Icon(
            isDemo ? Icons.info_outline : Icons.cloud_done_outlined,
            size: 16,
            color: isDemo ? const Color(0xFF856404) : const Color(0xFF155724),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDemo ? const Color(0xFF856404) : const Color(0xFF155724),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

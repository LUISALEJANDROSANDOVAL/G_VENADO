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
import '../widgets/skeleton_pdv_card.dart';
import 'login_view.dart';
<<<<<<< Updated upstream
import 'main_shell.dart';
=======
import 'profile_view.dart';
import 'route_history_view.dart';
>>>>>>> Stashed changes
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

  String get _greetingName {
    final name = SessionService.instance.currentUserName;
    if (name == null || name.isEmpty) return 'Reponedor';
    return name.split(' ').first;
  }

  String get _userInitials {
    final name = SessionService.instance.currentUserName ?? 'R';
    final parts = name.split(' ');
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

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

<<<<<<< Updated upstream
  void _openNavigation(Pdv target) {
=======
  void _openProfile() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const ProfileView()),
    );
  }

  void _openHistory() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const RouteHistoryView()),
    );
  }

  void _openNavigation() {
    final target = _activePdv;
>>>>>>> Stashed changes
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
                if (true) ...[
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
                    _showNavSnackbar('Google Maps', target);
                  },
                ),
                const SizedBox(height: 10),
                _NavOptionTile(
                  icon: Icons.navigation,
                  label: 'Waze',
                  color: AppColors.activeBlue,
                  onTap: () {
                    Navigator.pop(context);
                    _showNavSnackbar('Waze', target);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNavSnackbar(String app, Pdv target) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Simulación: abriendo $app hacia ${target.name}'),
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
      PageRouteBuilder<void>(
        pageBuilder: (context, animation, secondaryAnimation) => VisitExecutionView(
          initialVisit: MockData.visitForPdv(pdv),
          allPdvs: _pdvs,
          onVisitCompleted: (Visit completed) {
            _markPdvCompleted(completed.pdv.id);
          },
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(1.0, 0.0);
          const end = Offset.zero;
          const curve = Curves.easeInOutCubic;
          var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
          return SlideTransition(position: animation.drive(tween), child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final active = _activePdv;

    return Scaffold(
<<<<<<< Updated upstream
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFF9ECEC), AppColors.background],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            centerTitle: false,
            title: const Text('Dashboard de Ruta', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.traceRed)),
            actions: [
              IconButton(
                icon: const Icon(Icons.sync, color: AppColors.traceRed),
                tooltip: 'Sincronizar',
                onPressed: () => AppConnectionService.instance.manualSync(),
              ),
              IconButton(
                icon: const Icon(Icons.logout, color: AppColors.traceRed),
                tooltip: 'Cerrar sesión',
                onPressed: _logout,
              ),
=======
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        centerTitle: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hola, $_greetingName', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text('Tu ruta diaria', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sincronizar',
            onPressed: () => AppConnectionService.instance.manualSync(),
          ),
          PopupMenuButton<String>(
            tooltip: 'Perfil y menú',
            icon: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.whiteSurface,
              child: Text(
                _userInitials,
                style: const TextStyle(color: AppColors.primaryText, fontWeight: FontWeight.bold),
              ),
            ),
            onSelected: (value) {
              switch (value) {
                case 'profile':
                  _openProfile();
                  break;
                case 'history':
                  _openHistory();
                  break;
                case 'logout':
                  _logout();
                  break;
                default:
                  break;
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'profile', child: ListTile(leading: Icon(Icons.person), title: Text('Mi perfil'))),
              PopupMenuItem(value: 'history', child: ListTile(leading: Icon(Icons.history), title: Text('Historial de rutas'))),
              PopupMenuItem(value: 'logout', child: ListTile(leading: Icon(Icons.logout), title: Text('Cerrar sesión'))),
>>>>>>> Stashed changes
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Banner informativo si los datos vienen del modo demo
          if (_loadError != null && !_isLoadingRoute)
            const _SourceBanner(isDemo: true, message: 'Modo Demo — Supabase sin ruta asignada hoy'),
          if (_loadError == null && !_isLoadingRoute && _pdvs.isNotEmpty)
            const _SourceBanner(isDemo: false, message: 'Ruta cargada desde Supabase ✓'),
          Expanded(
            child: _isLoadingRoute
                ? ListView(
                    padding: const EdgeInsets.all(16),
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      Container(height: 100, decoration: BoxDecoration(color: AppColors.cardBackground, borderRadius: BorderRadius.circular(16))),
                      const SizedBox(height: 20),
                      Container(height: 120, decoration: BoxDecoration(color: AppColors.cardBackground, borderRadius: BorderRadius.circular(16))),
                      const SizedBox(height: 30),
                      ...List.generate(4, (_) => const SkeletonPdvCard()),
                    ],
                  )
                : RefreshIndicator(
                    onRefresh: _refreshRoute,
                    color: AppColors.institutionalBlue,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      children: [
                        _buildSectionHeader('Resumen de la jornada', 'Controla tu avance y los próximos pasos.'),
                  const SizedBox(height: 14),
                  RouteProgressHeader(
                    reponedorName: SessionService.instance.currentUserName ?? 'Reponedor',
                    dateLabel: _dateLabel,
                    completedVisits: _completed,
                    totalVisits: _pdvs.length,
                  ),
                  const SizedBox(height: 18),
                  if (active != null && !_journeyComplete) ...[
                    _buildFocusCard(context, active),
                    const SizedBox(height: 18),
                  ],
                  RouteSummaryRow(
                    pending: _pending,
                    completed: _completed,
                    pendingSync: _pendingSync,
                  ),
                  const SizedBox(height: 16),
                  _buildStatusSummary(context),
                  if (_journeyComplete) ...[
                    const SizedBox(height: 16),
                    _JourneyCompleteCard(total: _pdvs.length),
                  ],
                  const SizedBox(height: 20),
                  _buildSectionHeader('Mapa de la ruta', 'Sigue el recorrido actual desde el mapa.'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text('Vista interactiva', style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      if (_isRefreshing)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
<<<<<<< Updated upstream
                        const SizedBox(height: 20),
                        RouteSummaryRow(
                          pending: _pending,
                          completed: _completed,
                          pendingSync: _pendingSync,
                          total: _pdvs.length,
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
                        Stack(
                          alignment: Alignment.topRight,
                          children: [
                            MapboxRouteMap(pdvs: _pdvs, activePdvId: active?.id),
                            // Capa transparente que intercepta los toques
                            Positioned.fill(
                              child: GestureDetector(
                                onTap: () {
                                  MainShell.instance?.setTab(1);
                                },
                                behavior: HitTestBehavior.opaque,
                                child: Container(),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.95),
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Text('Toca para ampliar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.traceRed)),
                                    SizedBox(width: 4),
                                    Icon(Icons.open_in_full, size: 14, color: AppColors.traceRed),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _GpsTrackingHint(isActive: !_journeyComplete),
                        const SizedBox(height: 20),
                        Text('Puntos de venta', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        ...List.generate(_pdvs.length, (index) {
=======
                    ],
                  ),
                  const SizedBox(height: 10),
                  MapboxRouteMap(pdvs: _pdvs, activePdvId: active?.id),
                  const SizedBox(height: 8),
                  _GpsTrackingHint(isActive: !_journeyComplete),
                  const SizedBox(height: 20),
                  _buildSectionHeader('Puntos de venta', 'Inicia cada ruta con un toque en el botón.'),
                  const SizedBox(height: 10),
                  ...List.generate(_pdvs.length, (index) {
>>>>>>> Stashed changes
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
                            child: PdvCard(
<<<<<<< Updated upstream
                              pdv: pdv, 
                              onTap: () => _openVisit(pdv),
                              onNavigateTap: pdv.status == VisitStatus.enProceso ? () => _openNavigation(pdv) : null,
=======
                              pdv: pdv,
                              onTap: pdv.status == VisitStatus.completada ? null : () => _openVisit(pdv),
                              actionLabel: pdv.status == VisitStatus.completada ? 'Ruta terminada' : 'Iniciar ruta',
                              onActionPressed: pdv.status == VisitStatus.completada ? null : () => _openVisit(pdv),
>>>>>>> Stashed changes
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
<<<<<<< Updated upstream
=======

  Widget _buildStatusSummary(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _StatusChip(label: 'Pendientes', value: '$_pending', color: AppColors.warning.withValues(alpha: 0.14), icon: Icons.schedule),
        _StatusChip(label: 'Completadas', value: '$_completed', color: AppColors.success.withValues(alpha: 0.14), icon: Icons.check_circle),
        _StatusChip(label: 'Sincronizar', value: '$_pendingSync', color: AppColors.institutionalBlue.withValues(alpha: 0.14), icon: Icons.cloud_upload),
      ],
    );
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.secondaryText)),
      ],
    );
  }

  Widget _buildFocusCard(BuildContext context, Pdv pdv) {
    return Card(
      color: AppColors.institutionalBlue.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.rocket_launch, color: AppColors.institutionalBlue),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Siguiente ruta',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(pdv.name, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(pdv.address, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.secondaryText)),
            const SizedBox(height: 14),
            Row(
              children: [
                _FocusBadge(icon: Icons.location_on, label: '${pdv.distanceKm.toStringAsFixed(1)} km'),
                const SizedBox(width: 10),
                _FocusBadge(icon: Icons.access_time, label: pdv.estimatedTime),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openVisit(pdv),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Iniciar ruta'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
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
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
      ),
    );
  }
>>>>>>> Stashed changes
}

class _FocusBadge extends StatelessWidget {
  const _FocusBadge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.whiteSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.institutionalBlue),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.value, required this.color, required this.icon});

  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color.computeLuminance() > 0.5 ? Colors.black87 : Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold)),
                  Text(value, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ],
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: isDemo ? Colors.orange.shade50 : Colors.green.shade50,
      child: Row(
        children: [
          Icon(
            isDemo ? Icons.cloud_off : Icons.cloud_done,
            size: 14,
            color: isDemo ? Colors.orange.shade800 : Colors.green.shade800,
          ),
          const SizedBox(width: 8),
          Text(
            message,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDemo ? Colors.orange.shade800 : Colors.green.shade800,
            ),
          ),
        ],
      ),
    );
  }
}

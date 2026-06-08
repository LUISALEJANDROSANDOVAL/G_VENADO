import 'package:flutter/material.dart';
import '../models/route_history_item.dart';
import '../services/route_repository.dart';
import '../services/session_service.dart';
import '../theme/app_colors.dart';

class RouteHistoryView extends StatefulWidget {
  const RouteHistoryView({super.key});

  @override
  State<RouteHistoryView> createState() => _RouteHistoryViewState();
}

class _RouteHistoryViewState extends State<RouteHistoryView> {
  late final Future<List<RouteHistoryItem>> _historyFuture;

  @override
  void initState() {
    super.initState();
    _historyFuture = RouteRepository.instance.fetchRouteHistory(
      userId: SessionService.instance.currentUserId,
      limit: 10,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial de rutas'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.whiteSurface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Últimas rutas', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  SizedBox(height: 10),
                  Text('Revisa recorridos anteriores por día y consulta el progreso de cada jornada.', style: TextStyle(color: AppColors.secondaryText)),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Expanded(
              child: FutureBuilder<List<RouteHistoryItem>>(
                future: _historyFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('No se pudo cargar el historial: ${snapshot.error}'));
                  }

                  final historyItems = snapshot.data ?? [];
                  if (historyItems.isEmpty) {
                    return const Center(
                      child: Text('No hay historial de rutas disponibles todavía.'),
                    );
                  }

                  return ListView.separated(
                    itemCount: historyItems.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = historyItems[index];
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.cardBackground,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: AppColors.institutionalBlue.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '${index + 1}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.institutionalBlue),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.dateLabel, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text(item.completionLabel, style: const TextStyle(color: AppColors.secondaryText)),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: item.status == 'Completada'
                                    ? AppColors.success.withValues(alpha: 0.14)
                                    : AppColors.warning.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                item.status,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: item.status == 'Completada' ? AppColors.success : AppColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

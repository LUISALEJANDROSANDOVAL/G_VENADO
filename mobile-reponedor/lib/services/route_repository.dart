import 'dart:convert';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/mock_data.dart';
import '../models/enums.dart';
import '../models/pdv.dart';
import '../models/route_history_item.dart';
import '../models/task.dart';
import 'app_connection_service.dart';
import 'offline_sync_service.dart';
import 'session_service.dart';
import 'supabase_service.dart';

/// Repositorio de Rutas y PDVs.
///
/// Intenta cargar datos reales desde Supabase. Si la conexión falla o
/// las tablas aún no están creadas, cae con gracia a los datos de demo
/// ([MockData]) para garantizar que la app siempre sea funcional.
///
/// Tablas esperadas en Supabase (RF-06 y RF-07):
///   • `route_stops`  — paradas de ruta diaria por reponedor
///   • `pdvs`         — catálogo maestro de puntos de venta
///   • `route_tasks`  — micro-tareas por tipo de cliente (opcional)
class RouteRepository {
  RouteRepository._();
  static final RouteRepository instance = RouteRepository._();

  // ── Caché en memoria para la sesión actual ────────────────────────────────
  List<Pdv>? _cachedRoute;
  String? _cachedUserId;
  String? _cachedRoutePlanId;

  /// Retorna el ID del plan de ruta actual de la sesión.
  String? get currentRoutePlanId => _cachedRoutePlanId;

  // ── API Pública ───────────────────────────────────────────────────────────

  /// Carga la ruta diaria del [userId] autenticado desde las tablas reales:
  /// `daily_routes_plan` y `points_of_sale` (RF-06 y RF-07).
  ///
  /// Flujo de decisión:
  ///   1. Si Supabase está inicializado → consulta el plan de hoy en `daily_routes_plan`.
  ///   2. Obtiene la secuencia `optimized_pos_sequence` y consulta `points_of_sale`.
  ///   3. Compara contra `task_logs` para marcar el estado completado/pendiente de cada PDV.
  ///   4. Si la consulta falla o devuelve vacío → usa [MockData.dailyRoute].
  ///   5. Guarda el resultado y el id del plan en caché para esta sesión.
  Future<List<Pdv>> fetchDailyRoute({String? userId}) async {
    // Retorna caché si ya se cargó para el mismo usuario
    if (_cachedRoute != null && _cachedUserId == userId) {
      return _cachedRoute!;
    }

    try {
      final client = SupabaseService.client;
      final today = _todayIso();

      // ── 1. Consultar el plan de ruta diario ────────────────────────────────
      var planQuery = client
          .from('daily_routes_plan')
          .select()
          .eq('date', today);

      if (userId != null && userId.isNotEmpty) {
        planQuery = planQuery.eq('reponedor_id', userId);
      }

      var plans = await planQuery;
      if (plans.isEmpty && userId != null && userId.isNotEmpty) {
        // Si no hay ruta para hoy, buscar el último plan disponible del usuario.
        // Esto evita mostrar una ruta vacía cuando el servidor no ha creado un plan hoy.
        plans = await client
            .from('daily_routes_plan')
            .select()
            .eq('reponedor_id', userId)
            .order('date', ascending: false)
            .limit(1);
      }

      if (plans.isEmpty) {
        return _fallback(reason: 'Sin plan de ruta asignado para hoy en Supabase');
      }

      final plan = plans.first;
      final planId = plan['id']?.toString();
      final sequenceRaw = plan['optimized_pos_sequence'];
      final sequence = _parseSequence(sequenceRaw);

      if (sequence == null || sequence.isEmpty) {
        final allPdvs = await _loadAllPointsOfSale(client);
        if (allPdvs.isNotEmpty) {
          return _buildPdvsFromRows(allPdvs, planId: planId, userId: userId);
        }
        return _fallback(reason: 'El plan de hoy no tiene secuencia de PDVs');
      }

      // ── 2. Consultar los PDVs detallados en base a la secuencia ────────────
      final pdvRows = await client
          .from('points_of_sale')
          .select()
          .inFilter('id', sequence);

      if (pdvRows.isEmpty) {
        return _fallback(reason: 'No se encontraron detalles de los PDVs en points_of_sale');
      }

      // Ordenar los PDVs según la secuencia del plan (el IN de postgres no garantiza orden)
      final pdvMap = {
        for (var row in pdvRows) row['id'].toString(): row
      };
      
      final sortedPdvRows = <Map<String, dynamic>>[];
      for (final id in sequence) {
        final row = pdvMap[id];
        if (row != null) {
          sortedPdvRows.add(row);
        }
      }

      // ── 3. Consultar logs de tareas completadas para saber el estado de cada PDV ─
      Set<String> visitedPdvIds = {};
      if (planId != null) {
        final logs = await client
            .from('task_logs')
            .select('pos_id')
            .filter('route_plan_id', 'eq', planId);
        visitedPdvIds = logs.map((l) => l['pos_id'].toString()).toSet();
      }

      // ── 4. Construir la lista de PDVs mapeando al modelo ────────────────────
      final pdvs = sortedPdvRows.asMap().entries.map((e) {
        final row = Map<String, dynamic>.from(e.value);
        // Si tiene algún log registrado en task_logs, marcamos como completada
        row['status'] = visitedPdvIds.contains(row['id']) ? 'completada' : 'pendiente';
        return Pdv.fromJson(row, visitNumber: e.key + 1);
      }).toList();

      _cachedRoute = pdvs;
      _cachedUserId = userId;
      _cachedRoutePlanId = planId;
      return pdvs;
    } catch (e) {
      // Supabase no está listo o error de red
      return _fallback(reason: 'Error Supabase: $e');
    }
  }

  /// Carga las micro-tareas para un [pdvId] específico desde `micro_tasks`.
  /// Filtra en base al tipo de cliente de forma dinámica.
  ///
  /// Fallback: genera las tareas desde [MockData.tasksForCustomerType].
  Future<List<RouteHistoryItem>> fetchRouteHistory({String? userId, int limit = 7}) async {
    try {
      final client = SupabaseService.client;
      var planQuery = client
          .from('daily_routes_plan')
          .select()
          .order('date', ascending: false)
          .limit(limit);

      if (userId != null && userId.isNotEmpty) {
        planQuery = planQuery.filter('reponedor_id', 'eq', userId);
      }

      final plans = await planQuery;
      if ((plans as List).isEmpty) {
        return [];
      }

      final planIds = plans.map((row) => row['id']?.toString()).whereType<String>().toList();
      final logs = await client
          .from('task_logs')
          .select('route_plan_id,pos_id')
          .inFilter('route_plan_id', planIds);

      final visitedByPlan = <String, Set<String>>{};
      for (final row in (logs as List)) {
        final planId = row['route_plan_id']?.toString();
        final posId = row['pos_id']?.toString();
        if (planId == null || posId == null) continue;
        visitedByPlan.putIfAbsent(planId, () => <String>{}).add(posId);
      }

      return plans.map<RouteHistoryItem>((row) {
        final planId = row['id']?.toString() ?? 'unknown';
        final dateRaw = row['date']?.toString() ?? '';
        final date = DateTime.tryParse(dateRaw) ?? DateTime.now();
        final sequenceRaw = row['optimized_pos_sequence'];
        final sequence = _parseSequence(sequenceRaw);
        final totalStops = sequence?.length ?? 0;
        final completedStops = visitedByPlan[planId]?.length ?? 0;
        final statusString = row['status']?.toString().toUpperCase() ?? '';
        final status = statusString == 'COMPLETADA' || completedStops >= totalStops && totalStops > 0
            ? 'Completada'
            : 'En proceso';

        return RouteHistoryItem(
          planId: planId,
          date: date,
          totalStops: totalStops,
          completedStops: completedStops,
          status: status,
        );
      }).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<Task>> fetchTasksForPdv(String pdvId, CustomerType customerType) async {
    try {
      final rows = await SupabaseService.client
          .from('micro_tasks')
          .select()
          .filter('is_active', 'eq', true);

      if ((rows as List).isEmpty) {
        return MockData.tasksForCustomerType(customerType);
      }

      final dbCategory = switch (customerType) {
        CustomerType.pareto => 'PARETO',
        CustomerType.mayorista => 'MAYORISTA',
        CustomerType.detallista => 'DETALLISTA',
      };

      // Filtrar según reglas operativas
      final filteredRows = rows.where((r) {
        final cat = (r['client_category'] as String? ?? '').toUpperCase();
        return cat == 'TODOS' || 
               cat == dbCategory || 
               (dbCategory == 'DETALLISTA' && cat == 'MINORISTA');
      }).toList();

      return filteredRows
          .map((r) {
            final name = r['task_name'] as String? ?? 'Tarea';
            final nameLower = name.toLowerCase();
            // Determinar dinámicamente si requiere foto basándonos en palabras clave
            final requiresPhoto = nameLower.contains('foto') || 
                                  nameLower.contains('pop') || 
                                  nameLower.contains('bandeo') || 
                                  nameLower.contains('limpieza');

            return Task(
              id: r['id']?.toString() ?? '',
              name: name,
              requiresPhoto: requiresPhoto,
            );
          })
          .toList();
    } catch (_) {
      return MockData.tasksForCustomerType(customerType);
    }
  }

  /// Registra el log de una tarea en la tabla `task_logs` de Supabase, o en la
  /// cola local offline si no hay conexión (RF-10).
  ///
  /// [localPhotoPath] es la ruta del archivo de foto en el dispositivo.
  /// Si el dispositivo está offline, se incluye en el payload para que
  /// [AppConnectionService.syncOfflineData] pueda re-subirla al recuperar señal.
  Future<void> saveTaskLog({
    required String posId,
    required int taskId,
    required DateTime startTime,
    required DateTime endTime,
    required int durationSeconds,
    String? photoUrl,
    String? localPhotoPath,
    bool isOffline = false,
  }) async {
    final planId = _cachedRoutePlanId ?? 'demo_plan';
    if (planId == 'demo_plan') {
      // ignore: avoid_print
      print('[RouteRepository] Modo Demo: sin inserción en BD para evitar error UUID.');
      return;
    }

    final isCurrentlyOffline = isOffline || AppConnectionService.instance.isOffline;

    // Payload completo para la cola offline (incluye ruta local de foto)
    final offlinePayload = <String, dynamic>{
      'route_plan_id': planId,
      'pos_id': posId,
      'task_id': taskId,
      'start_time': startTime.toUtc().toIso8601String(),
      'end_time': endTime.toUtc().toIso8601String(),
      'duration_seconds': durationSeconds,
      'photo_url': photoUrl,
      'local_photo_path': localPhotoPath,
      'user_id': SessionService.instance.currentUserId,
      'is_offline': isCurrentlyOffline,
    };

    // Payload limpio para Supabase (solo columnas de la tabla)
    final supabasePayload = <String, dynamic>{
      'route_plan_id': planId,
      'pos_id': posId,
      'task_id': taskId,
      'start_time': startTime.toUtc().toIso8601String(),
      'end_time': endTime.toUtc().toIso8601String(),
      'duration_seconds': durationSeconds,
      'photo_url': photoUrl,
      'is_offline': isCurrentlyOffline,
    };

    try {
      if (AppConnectionService.instance.isOffline) {
        await OfflineSyncService.instance.savePendingTaskLog(offlinePayload);
        await AppConnectionService.instance.refreshPendingCount();
        return;
      }

      await SupabaseService.client.from('task_logs').insert(supabasePayload);
    } catch (e) {
      // ignore: avoid_print
      print('[RouteRepository] Error guardando log de tarea (online/offline): $e');
      await OfflineSyncService.instance.savePendingTaskLog(offlinePayload);
      await AppConnectionService.instance.refreshPendingCount();
    }
  }

  /// Sube un archivo binario al Storage de Supabase en el bucket `evidencias`.
  /// Retorna la URL pública de la imagen o null si falla.
  Future<String?> uploadEvidence({
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
  }) async {
    try {
      final client = SupabaseService.client;
      final userId = SessionService.instance.currentUserId ?? 'demo_user';
      final planId = _cachedRoutePlanId ?? 'demo_plan';
      final path = '$userId/$planId/$fileName';

      await client.storage.from('task-evidences').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: mimeType),
          );

      final publicUrl = client.storage.from('task-evidences').getPublicUrl(path);
      return publicUrl;
    } catch (e) {
      // ignore: avoid_print
      print('[RouteRepository] Error subiendo evidencia a Supabase Storage: $e');
      return null;
    }
  }

  /// Actualiza el estado de la ruta diaria en la tabla `daily_routes_plan` de Supabase.
  Future<void> updateRoutePlanStatus(String status) async {
    try {
      final planId = _cachedRoutePlanId;
      if (planId == null) return;

      await SupabaseService.client
          .from('daily_routes_plan')
          .update({'status': status})
          .filter('id', 'eq', planId);
    } catch (e) {
      // ignore: avoid_print
      print('[RouteRepository] Error actualizando estado de la ruta: $e');
    }
  }

  /// Invalida la caché (útil al hacer pull-to-refresh o logout).
  void invalidateCache() {
    _cachedRoute = null;
    _cachedUserId = null;
    _cachedRoutePlanId = null;
  }

  Future<List<Map<String, dynamic>>> _loadAllPointsOfSale(SupabaseClient client) async {
    final rows = await client.from('points_of_sale').select();
    return (rows as List).cast<Map<String, dynamic>>();
  }

  List<String>? _parseSequence(dynamic sequenceRaw) {
    if (sequenceRaw == null) return null;
    if (sequenceRaw is List) {
      return sequenceRaw.map((e) => e.toString()).toList();
    }
    if (sequenceRaw is String) {
      final trimmed = sequenceRaw.trim();
      if (trimmed.isEmpty) return null;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          final decoded = jsonDecode(trimmed);
          if (decoded is List) {
            return decoded.map((e) => e.toString()).toList();
          }
        } catch (_) {
          // ignore
        }
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        final inside = trimmed.substring(1, trimmed.length - 1);
        final parts = inside
            .split(',')
            .map((part) => part.trim())
            .where((part) => part.isNotEmpty)
            .toList();
        return parts.map((part) => part.replaceAll(RegExp(r'^"|"$'), '')).toList();
      }
      return trimmed
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    return null;
  }

  List<Pdv> _buildPdvsFromRows(List<Map<String, dynamic>> rows, {String? planId, String? userId}) {
    final pdvs = rows.asMap().entries.map((e) {
      final row = Map<String, dynamic>.from(e.value);
      row['status'] = 'pendiente';
      return Pdv.fromJson(row, visitNumber: e.key + 1);
    }).toList();

    _cachedRoute = pdvs;
    _cachedUserId = userId;
    _cachedRoutePlanId = planId;
    return pdvs;
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  List<Pdv> _fallback({required String reason}) {
    // ignore: avoid_print
    print('[RouteRepository] Usando datos demo. Motivo: $reason');
    return List.from(MockData.dailyRoute);
  }

  String _todayIso() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }
}

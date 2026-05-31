import '../models/enums.dart';
import '../models/evidence.dart';
import '../models/pdv.dart';
import '../models/task.dart';
import '../models/user.dart';
import '../models/visit.dart';
import '../theme/app_colors.dart';

/// Datos de prueba para desarrollo UI sin backend.
/// TODO: Reemplazar por repositorio con Supabase + caché offline.
class MockData {
  MockData._();

  static const mockUser = User(
    id: 'usr-001',
    name: 'Carlos Mendoza',
    username: 'cmendoza',
  );

  static List<Pdv> dailyRoute = [
    const Pdv(
      id: 'pdv-001',
      visitNumber: 1,
      name: 'Supermercado El Ahorro',
      address: 'Av. Central 245, Col. Centro',
      estimatedTime: '08:30',
      distanceKm: 1.2,
      customerType: CustomerType.pareto,
      status: VisitStatus.completada,
      mapX: 0.15,
      mapY: 0.70,
    ),
    const Pdv(
      id: 'pdv-002',
      visitNumber: 2,
      name: 'Abarrotes La Esquina',
      address: 'Calle 5 de Mayo 112',
      estimatedTime: '09:15',
      distanceKm: 0.8,
      customerType: CustomerType.detallista,
      status: VisitStatus.completada,
      mapX: 0.28,
      mapY: 0.55,
    ),
    const Pdv(
      id: 'pdv-003',
      visitNumber: 3,
      name: 'Distribuidora Norte',
      address: 'Blvd. Industrial 890',
      estimatedTime: '10:00',
      distanceKm: 2.4,
      customerType: CustomerType.mayorista,
      status: VisitStatus.enProceso,
      mapX: 0.42,
      mapY: 0.40,
    ),
    const Pdv(
      id: 'pdv-004',
      visitNumber: 4,
      name: 'Mini Super San José',
      address: 'Fracc. San José Mz. 4 Lt. 12',
      estimatedTime: '10:45',
      distanceKm: 1.5,
      customerType: CustomerType.detallista,
      status: VisitStatus.pendiente,
      mapX: 0.55,
      mapY: 0.48,
    ),
    const Pdv(
      id: 'pdv-005',
      visitNumber: 5,
      name: 'Comercial Venado Express',
      address: 'Carretera Nacional Km 12',
      estimatedTime: '11:30',
      distanceKm: 3.1,
      customerType: CustomerType.pareto,
      status: VisitStatus.pendiente,
      mapX: 0.62,
      mapY: 0.30,
    ),
    const Pdv(
      id: 'pdv-006',
      visitNumber: 6,
      name: 'Tienda Don Pepe',
      address: 'Calle Hidalgo 78',
      estimatedTime: '12:15',
      distanceKm: 0.6,
      customerType: CustomerType.detallista,
      status: VisitStatus.pendiente,
      mapX: 0.72,
      mapY: 0.42,
    ),
    const Pdv(
      id: 'pdv-007',
      visitNumber: 7,
      name: 'Mayorista del Valle',
      address: 'Zona Industrial Parque Sur',
      estimatedTime: '13:00',
      distanceKm: 4.2,
      customerType: CustomerType.mayorista,
      status: VisitStatus.pendiente,
      mapX: 0.82,
      mapY: 0.25,
    ),
    const Pdv(
      id: 'pdv-008',
      visitNumber: 8,
      name: 'Super Abarrotes 2000',
      address: 'Av. Revolución 1500',
      estimatedTime: '14:00',
      distanceKm: 2.0,
      customerType: CustomerType.pareto,
      status: VisitStatus.pendiente,
      mapX: 0.90,
      mapY: 0.60,
    ),
  ];

  static String checklistLabel(CustomerType type) => switch (type) {
        CustomerType.pareto => 'Checklist Pareto — alta prioridad',
        CustomerType.mayorista => 'Checklist Mayorista — bandeo masivo',
        CustomerType.detallista => 'Checklist Detallista — ejecución rápida',
      };

  /// Micro-tareas configuradas según perfil del comercio (RF-06).
  static List<Task> tasksForCustomerType(CustomerType type) => switch (type) {
        CustomerType.pareto => const [
            Task(id: 'p1', name: 'Limpieza de góndolas', requiresPhoto: true),
            Task(id: 'p2', name: 'Colocación material POP', requiresPhoto: true),
            Task(id: 'p3', name: 'Reposición productos premium'),
            Task(id: 'p4', name: 'Verificación exhibidor principal'),
            Task(id: 'p5', name: 'Fotografía antes/después', requiresPhoto: true),
          ],
        CustomerType.mayorista => const [
            Task(id: 'm1', name: 'Bandeo masivo salsas Kris', requiresPhoto: true),
            Task(id: 'm2', name: 'Verificación stock bodega'),
            Task(id: 'm3', name: 'Reposición pallet completo'),
            Task(id: 'm4', name: 'Rotación de fechas'),
            Task(id: 'm5', name: 'Limpieza área de ventas'),
          ],
        CustomerType.detallista => const [
            Task(id: 'd1', name: 'Reposición rápida de anaquel'),
            Task(id: 'd2', name: 'Verificación de precios'),
            Task(id: 'd3', name: 'Limpieza frente de tienda'),
            Task(id: 'd4', name: 'Control inventario básico'),
          ],
      };

  static int requiredEvidenceCount(CustomerType type) => switch (type) {
        CustomerType.pareto => 3,
        CustomerType.mayorista => 2,
        CustomerType.detallista => 1,
      };

  static List<Evidence> initialEvidences(CustomerType type) {
    return switch (type) {
      CustomerType.pareto => const [
          Evidence(
            id: 'e-antes',
            label: 'Antes — Góndola',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.antes,
            mockColor: AppColors.dimGrayBorder,
          ),
          Evidence(
            id: 'e-despues',
            label: 'Después — Góndola',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.despues,
            mockColor: AppColors.dimGrayBorder,
          ),
          Evidence(
            id: 'e-pop',
            label: 'Material POP',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.general,
            mockColor: AppColors.dimGrayBorder,
          ),
        ],
      CustomerType.mayorista => const [
          Evidence(
            id: 'e-antes',
            label: 'Antes — Bandeo',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.antes,
            mockColor: AppColors.dimGrayBorder,
          ),
          Evidence(
            id: 'e-despues',
            label: 'Después — Bandeo',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.despues,
            mockColor: AppColors.dimGrayBorder,
          ),
        ],
      CustomerType.detallista => const [
          Evidence(
            id: 'e-anaquel',
            label: 'Anaquel repuesto',
            status: EvidenceStatus.pendiente,
            type: EvidenceType.general,
            mockColor: AppColors.dimGrayBorder,
          ),
        ],
    };
  }

  static Visit visitForPdv(Pdv pdv) {
    return Visit(
      pdv: pdv,
      arrivalTime: DateTime.now(),
      tasks: tasksForCustomerType(pdv.customerType),
      evidences: initialEvidences(pdv.customerType),
      geofenceStatus: GeofenceStatus.fueraDelPdv,
      syncStatus: SyncStatus.pendiente,
      elapsedSeconds: 0,
    );
  }

  static int completedVisits(List<Pdv> pdvs) =>
      pdvs.where((p) => p.status == VisitStatus.completada).length;

  static int pendingSyncCount(List<Pdv> pdvs) =>
      pdvs.where((p) => p.status == VisitStatus.completada).length;

  static Pdv? nextPendingPdv(List<Pdv> pdvs, {String? afterPdvId}) {
    final sorted = List<Pdv>.from(pdvs)
      ..sort((a, b) => a.visitNumber.compareTo(b.visitNumber));

    if (afterPdvId != null) {
      final currentIndex = sorted.indexWhere((p) => p.id == afterPdvId);
      for (var i = currentIndex + 1; i < sorted.length; i++) {
        if (sorted[i].status != VisitStatus.completada) return sorted[i];
      }
      return null;
    }

    for (final pdv in sorted) {
      if (pdv.status == VisitStatus.enProceso) return pdv;
    }
    for (final pdv in sorted) {
      if (pdv.status == VisitStatus.pendiente) return pdv;
    }
    return null;
  }

  static bool isJourneyComplete(List<Pdv> pdvs) =>
      pdvs.every((p) => p.status == VisitStatus.completada);
}

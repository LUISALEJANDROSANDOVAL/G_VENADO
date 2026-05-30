import 'enums.dart';

/// Punto de venta asignado en la ruta diaria.
/// TODO: Mapear desde tabla `pdvs` / `route_stops` en Supabase.
class Pdv {
  const Pdv({
    required this.id,
    required this.visitNumber,
    required this.name,
    required this.address,
    required this.estimatedTime,
    required this.distanceKm,
    required this.customerType,
    required this.status,
    this.mapX,
    this.mapY,
  });

  final String id;
  final int visitNumber;
  final String name;
  final String address;
  final String estimatedTime;
  final double distanceKm;
  final CustomerType customerType;
  final VisitStatus status;

  /// Posición relativa en el mapa mock (0.0 – 1.0).
  final double? mapX;
  final double? mapY;

  Pdv copyWith({VisitStatus? status}) {
    return Pdv(
      id: id,
      visitNumber: visitNumber,
      name: name,
      address: address,
      estimatedTime: estimatedTime,
      distanceKm: distanceKm,
      customerType: customerType,
      status: status ?? this.status,
      mapX: mapX,
      mapY: mapY,
    );
  }
}

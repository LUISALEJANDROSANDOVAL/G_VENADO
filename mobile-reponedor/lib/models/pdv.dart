import 'enums.dart';

/// Punto de venta asignado en la ruta diaria.
/// Mapeado desde la tabla `route_stops` de Supabase (RF-07).
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
    this.latitude,
    this.longitude,
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

  /// Coordenadas GPS reales desde Supabase / PostGIS.
  final double? latitude;
  final double? longitude;

  /// Crea un [Pdv] desde una fila de Supabase (`route_stops` o `pdvs`).
  /// Convierte los tipos de la BD al dominio del modelo.
  factory Pdv.fromJson(Map<String, dynamic> json, {int visitNumber = 0}) {
    // Mapea el string de tipo de cliente a enum
    final customerTypeRaw = (json['customer_type'] as String? ?? json['category'] as String? ?? 'detallista').toLowerCase();
    final customerType = switch (customerTypeRaw) {
      'pareto' => CustomerType.pareto,
      'mayorista' => CustomerType.mayorista,
      _ => CustomerType.detallista,
    };

    // Mapea el estado de la visita
    final statusRaw = (json['status'] as String? ?? 'pendiente').toLowerCase();
    final status = switch (statusRaw) {
      'en_proceso' || 'en proceso' => VisitStatus.enProceso,
      'completada' || 'completed' => VisitStatus.completada,
      _ => VisitStatus.pendiente,
    };

    // Coordenadas: pueden venir como double o como PostGIS geometry JSON
    final lat = _parseDouble(json['latitude'] ?? json['lat']);
    final lng = _parseDouble(json['longitude'] ?? json['lng']);

    return Pdv(
      id: json['id']?.toString() ?? '',
      visitNumber: (json['visit_order'] as num?)?.toInt() ?? visitNumber,
      name: json['name'] as String? ?? json['store_name'] as String? ?? 'PDV Sin Nombre',
      address: json['address'] as String? ?? json['market'] as String? ?? json['direccion'] as String? ?? '',
      estimatedTime: json['estimated_time'] as String? ?? json['hora_estimada'] as String? ?? '--:--',
      distanceKm: _parseDouble(json['distance_km'] ?? json['distancia_km']) ?? 0.0,
      customerType: customerType,
      status: status,
      mapX: _parseDouble(json['map_x']),
      mapY: _parseDouble(json['map_y']),
      latitude: lat,
      longitude: lng,
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

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
      latitude: latitude,
      longitude: longitude,
    );
  }
}

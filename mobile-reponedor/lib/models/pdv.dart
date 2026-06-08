import 'dart:typed_data';

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

    // Coordenadas: pueden venir como double, lat/lng, o como geometría PostGIS.
    final lat = _parseDouble(json['latitude'] ?? json['lat']);
    final lng = _parseDouble(json['longitude'] ?? json['lng']);
    final geomCoords = _parseGeom(json['geom'] ?? json['geometry']);
    final hasValidGeom = geomCoords != null && _isValidLatitude(geomCoords[0]) && _isValidLongitude(geomCoords[1]);

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
      latitude: lat ?? (hasValidGeom ? geomCoords[0] : null),
      longitude: lng ?? (hasValidGeom ? geomCoords[1] : null),
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value.isFinite ? value : null;
    if (value is int) return value.toDouble();
<<<<<<< Updated upstream
    if (value is num) return value.toDouble(); // PostgreSQL numeric/decimal
    if (value is String) return double.tryParse(value);
=======
    if (value is String) {
      final parsed = double.tryParse(value);
      return (parsed != null && parsed.isFinite) ? parsed : null;
    }
>>>>>>> Stashed changes
    return null;
  }

  static bool _isValidLatitude(double? latitude) {
    return latitude != null && latitude.isFinite && latitude >= -90 && latitude <= 90;
  }

  static bool _isValidLongitude(double? longitude) {
    return longitude != null && longitude.isFinite && longitude >= -180 && longitude <= 180;
  }

  static List<double>? _parseGeom(dynamic value) {
    if (value == null) return null;
    if (value is String) {
      final text = value.trim();
      if (text.isEmpty) return null;
      if (text.startsWith('0101') || text.startsWith('0001')) {
        try {
          final bytes = _hexToBytes(text);
          final byteData = ByteData.sublistView(bytes);
          final littleEndian = bytes[0] == 1;
          final endian = littleEndian ? Endian.little : Endian.big;
          var offset = 1;
          final type = byteData.getUint32(offset, endian);
          offset += 4;
          final hasSrid = type & 0x20000000 != 0;
          if (hasSrid) {
            offset += 4;
          }
          final x = byteData.getFloat64(offset, endian);
          final y = byteData.getFloat64(offset + 8, endian);
          return [y, x];
        } catch (_) {
          return null;
        }
      }
      if (text.toUpperCase().startsWith('SRID=')) {
        final parts = text.split(';');
        if (parts.length == 2) {
          return _parseGeom(parts[1]);
        }
      }
    }
    return null;
  }

  static Uint8List _hexToBytes(String hex) {
    final normalized = hex.replaceAll(' ', '').toLowerCase();
    final bytes = Uint8List(normalized.length ~/ 2);
    for (var i = 0; i < normalized.length; i += 2) {
      bytes[i ~/ 2] = int.parse(normalized.substring(i, i + 2), radix: 16);
    }
    return bytes;
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

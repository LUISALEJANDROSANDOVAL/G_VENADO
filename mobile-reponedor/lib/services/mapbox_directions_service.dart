import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class MapboxDirectionsService {
  static const int _maxPointsPerRequest = 25;

  static Future<List<LatLng>> fetchRoutePoints({
    required String accessToken,
    required List<LatLng> points,
  }) async {
    if (accessToken.isEmpty) return [];
    if (points.length < 2) return [];

    if (points.length <= _maxPointsPerRequest) {
      return await _fetchPoints(accessToken: accessToken, points: points);
    }

    final routePoints = <LatLng>[];
    final chunks = _chunkPoints(points, _maxPointsPerRequest);
    for (final chunk in chunks) {
      final segmentPoints = await _fetchPoints(accessToken: accessToken, points: chunk);
      if (segmentPoints.isEmpty) continue;

      if (routePoints.isEmpty) {
        routePoints.addAll(segmentPoints);
      } else {
        routePoints.addAll(segmentPoints.skip(1));
      }
    }
    return routePoints;
  }

  static Future<List<LatLng>> _fetchPoints({
    required String accessToken,
    required List<LatLng> points,
  }) async {
    final coordinates = points.map((p) => '${p.longitude},${p.latitude}').join(';');
    final geoJsonUri = Uri.https(
      'api.mapbox.com',
      '/directions/v5/mapbox/driving/$coordinates',
      {
        'geometries': 'geojson',
        'overview': 'full',
        'steps': 'false',
        'access_token': accessToken,
      },
    );

    try {
      final response = await http.get(geoJsonUri);
      if (response.statusCode == 200) {
        final pointsFromGeoJson = _parseGeoJsonRoute(response.body);
        if (pointsFromGeoJson.isNotEmpty) {
          return pointsFromGeoJson;
        }
      }
    } catch (_) {
      // Continuar al fallback si geojson falla.
    }

    final polylineUri = Uri.https(
      'api.mapbox.com',
      '/directions/v5/mapbox/driving/$coordinates',
      {
        'geometries': 'polyline6',
        'overview': 'full',
        'steps': 'false',
        'access_token': accessToken,
      },
    );

    final polylineResponse = await http.get(polylineUri);
    if (polylineResponse.statusCode != 200) {
      throw Exception('Error Mapbox Directions ${polylineResponse.statusCode}: ${polylineResponse.body}');
    }

    final parsed = jsonDecode(polylineResponse.body) as Map<String, dynamic>;
    final routes = parsed['routes'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) return [];

    final polyline = routes.first['geometry'] as String?;
    if (polyline == null || polyline.isEmpty) return [];

    return _decodePolyline(polyline, precision: 1e6.toInt());
  }

  static List<LatLng> _parseGeoJsonRoute(String body) {
    final data = jsonDecode(body) as Map<String, dynamic>;
    final routes = data['routes'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) return [];

    final geometry = routes.first['geometry'] as Map<String, dynamic>?;
    if (geometry == null || geometry['type'] != 'LineString') return [];

    final coords = geometry['coordinates'] as List<dynamic>?;
    if (coords == null || coords.isEmpty) return [];

    return coords.map((coord) {
      final pair = coord as List<dynamic>;
      return LatLng((pair[1] as num).toDouble(), (pair[0] as num).toDouble());
    }).toList();
  }

  static List<LatLng> _decodePolyline(String encoded, {required int precision}) {
    final List<LatLng> coordinates = [];
    int index = 0;
    final int length = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < length) {
      int shift = 0;
      int result = 0;
      int byte;
      do {
        byte = encoded.codeUnitAt(index++) - 63;
        result |= (byte & 0x1F) << shift;
        shift += 5;
      } while (byte >= 0x20);
      final deltaLat = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lat += deltaLat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.codeUnitAt(index++) - 63;
        result |= (byte & 0x1F) << shift;
        shift += 5;
      } while (byte >= 0x20);
      final deltaLng = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lng += deltaLng;

      coordinates.add(LatLng(lat / precision, lng / precision));
    }

    return coordinates;
  }

  static List<List<LatLng>> _chunkPoints(List<LatLng> points, int maxPoints) {
    final chunks = <List<LatLng>>[];
    int start = 0;
    while (start < points.length) {
      final end = min(points.length, start + maxPoints);
      final chunk = points.sublist(start, end);
      if (chunks.isNotEmpty && chunk.isNotEmpty) {
        if (chunk.first != chunks.last.last) {
          chunk.insert(0, chunks.last.last);
        }
      }
      chunks.add(chunk);
      start = end - 1; // overlap the last point so segments connect seamlessly
    }
    return chunks;
  }
}

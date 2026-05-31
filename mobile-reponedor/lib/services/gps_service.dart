import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'session_service.dart';
import 'supabase_service.dart';

/// Servicio de rastreo GPS en tiempo real (RF-08).
///
/// Cada [_intervalSeconds] segundos obtiene la posición real del dispositivo
/// y hace un UPSERT en la tabla `reponedor_locations` de Supabase.
/// El supervisor web recibe las actualizaciones al instante gracias a
/// Supabase Realtime (WebSockets).
///
/// En Flutter Web (Chrome) el paquete geolocator solicita el permiso de
/// ubicación nativo del navegador. Para simular coordenadas distintas
/// usa DevTools → Sensors → Geolocation.
class GpsService {
  GpsService._();
  static final GpsService instance = GpsService._();

  // ── Constantes ────────────────────────────────────────────────────────────
  static const int _intervalSeconds = 30;
  static const double _geofenceRadiusMeters = 50.0;

  // ── Estado interno ────────────────────────────────────────────────────────
  Timer? _trackingTimer;
  Position? _lastPosition;
  bool _isTracking = false;

  /// Última posición conocida del dispositivo.
  Position? get lastPosition => _lastPosition;

  /// Indica si el rastreo está activo actualmente.
  bool get isTracking => _isTracking;

  // ── API Pública ───────────────────────────────────────────────────────────

  /// Inicia el rastreo GPS periódico y comienza a escribir en Supabase.
  ///
  /// Solicita permiso al usuario si aún no fue concedido.
  /// Si el permiso es denegado permanentemente, retorna sin activar el rastreo.
  Future<void> startLiveTracking() async {
    if (_isTracking) return; // ya está activo

    final permissionGranted = await _requestPermission();
    if (!permissionGranted) {
      // ignore: avoid_print
      print('[GpsService] Permiso de ubicación denegado. Rastreo no iniciado.');
      return;
    }

    _isTracking = true;

    // Primera lectura inmediata para que el supervisor vea al reponedor
    // en el momento que inicia la sesión, sin esperar 30 segundos.
    await _captureAndUpload();

    // Timer periódico cada 30 segundos
    _trackingTimer = Timer.periodic(
      const Duration(seconds: _intervalSeconds),
      (_) => _captureAndUpload(),
    );

    // ignore: avoid_print
    print('[GpsService] Rastreo GPS iniciado — actualización cada $_intervalSeconds s.');
  }

  /// Detiene el rastreo GPS y libera el timer.
  ///
  /// Llamar al hacer logout o al finalizar la jornada para ahorrar batería
  /// y respetar la privacidad del reponedor fuera del horario laboral.
  void stopTracking() {
    _trackingTimer?.cancel();
    _trackingTimer = null;
    _isTracking = false;
    _lastPosition = null;
    // ignore: avoid_print
    print('[GpsService] Rastreo GPS detenido.');
  }

  /// Comprueba si el reponedor está dentro del radio del PDV (geofencing).
  ///
  /// Retorna `true` si la distancia entre la posición actual y las
  /// coordenadas del PDV es menor o igual a [_geofenceRadiusMeters] (50 m).
  /// Si no hay posición conocida todavía, retorna `false`.
  bool isInsidePdv({required double pdvLat, required double pdvLng}) {
    if (_lastPosition == null) return false;

    final distanceMeters = Geolocator.distanceBetween(
      _lastPosition!.latitude,
      _lastPosition!.longitude,
      pdvLat,
      pdvLng,
    );

    return distanceMeters <= _geofenceRadiusMeters;
  }

  /// Retorna la distancia en metros entre la última posición conocida y el PDV.
  /// Retorna `null` si aún no hay posición disponible.
  double? distanceToPdv({required double pdvLat, required double pdvLng}) {
    if (_lastPosition == null) return null;
    return Geolocator.distanceBetween(
      _lastPosition!.latitude,
      _lastPosition!.longitude,
      pdvLat,
      pdvLng,
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /// Obtiene la posición actual del GPS y la sube a Supabase.
  Future<void> _captureAndUpload() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      _lastPosition = position;
      await _uploadToSupabase(position.latitude, position.longitude);
    } catch (e) {
      // ignore: avoid_print
      print('[GpsService] Error capturando GPS: $e');
    }
  }

  /// Hace un UPSERT en la tabla `reponedor_locations` de Supabase.
  ///
  /// El campo `reponedor_id` actúa como clave primaria (PRIMARY KEY), por lo
  /// que si ya existe un registro para este usuario, se sobrescribe con la
  /// nueva coordenada. Nunca acumula filas históricas.
  Future<void> _uploadToSupabase(double latitude, double longitude) async {
    try {
      final userId = SessionService.instance.currentUserId;
      if (userId == null) {
        // Modo demo sin sesión — no hay nada que guardar
        return;
      }

      await SupabaseService.client.from('reponedor_locations').upsert({
        'reponedor_id': userId,
        'latitude': latitude,
        'longitude': longitude,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });

      // ignore: avoid_print
      print('[GpsService] Ubicación enviada a Supabase → ($latitude, $longitude)');
    } catch (e) {
      // ignore: avoid_print
      print('[GpsService] Error enviando ubicación a Supabase: $e');
    }
  }

  /// Solicita permiso de ubicación al usuario.
  /// Retorna `true` si el permiso fue concedido.
  Future<bool> _requestPermission() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // ignore: avoid_print
        print('[GpsService] El GPS del dispositivo está desactivado.');
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      return permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always;
    } catch (e) {
      // ignore: avoid_print
      print('[GpsService] Error solicitando permisos GPS: $e');
      return false;
    }
  }

  /// Obtiene la posición actual UNA sola vez (útil para verificaciones puntuales).
  static Future<Position?> getCurrentLocation() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
    } catch (e) {
      return null;
    }
  }

  /// Stream continuo de posición (útil para mapas en vivo en la app).
  static Stream<Position> getLocationStream() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Solo emite si el reponedor se movió más de 10 metros
    );
    return Geolocator.getPositionStream(locationSettings: locationSettings);
  }
}

import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';

import 'session_service.dart';
import 'supabase_service.dart';

/// Servicio de rastreo GPS en tiempo real (RF-08) — Arquitectura Enterprise.
///
/// Mejoras sobre la versión MVP:
///   - Integra [FlutterBackgroundService] para mantener el GPS activo
///     incluso con la pantalla bloqueada (Foreground Service en Android).
///   - Muestra una notificación persistente "Jornada en curso" que impide
///     que el SO Android (modo Doze) mate el proceso.
///   - Mantiene compatibilidad con la API existente (startLiveTracking, etc).
///
/// Cada [_intervalSeconds] segundos obtiene la posición real del dispositivo
/// y hace un UPSERT en la tabla `reponedor_locations` de Supabase.
class GpsService {
  GpsService._();
  static final GpsService instance = GpsService._();

  // ── Constantes ────────────────────────────────────────────────────────────
  static const int _intervalSeconds = 30;
  static const double _geofenceRadiusMeters = 50.0;

  // ── Notificación del Foreground Service ────────────────────────────────────
  static const String _notificationChannelId = 'gps_tracking_channel';
  static const String _notificationChannelName = 'Rastreo GPS';
  static const int _notificationId = 888;

  // ── Estado interno ────────────────────────────────────────────────────────
  Timer? _trackingTimer;
  Position? _lastPosition;
  bool _isTracking = false;
  final FlutterBackgroundService _backgroundService = FlutterBackgroundService();

  /// Última posición conocida del dispositivo.
  Position? get lastPosition => _lastPosition;

  /// Indica si el rastreo está activo actualmente.
  bool get isTracking => _isTracking;

  // ── Inicialización del servicio en segundo plano ──────────────────────────

  /// Configura el Foreground Service de Android.
  /// Debe llamarse UNA sola vez desde main.dart al arrancar la app.
  static Future<void> initializeBackgroundService() async {
    final service = FlutterBackgroundService();

    // Crear canal de notificación para Android
    final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    const androidChannel = AndroidNotificationChannel(
      _notificationChannelId,
      _notificationChannelName,
      description: 'Notificación del rastreo GPS del reponedor',
      importance: Importance.low, // No hace sonido, solo muestra la barra
    );

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    await service.configure(
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onServiceStart,
        onBackground: _onIosBackground,
      ),
      androidConfiguration: AndroidConfiguration(
        onStart: _onServiceStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: _notificationChannelId,
        foregroundServiceNotificationId: _notificationId,
        initialNotificationTitle: 'TRACE V — Reponedores',
        initialNotificationContent: 'Rastreo de jornada listo',
      ),
    );
  }

  /// Handler que se ejecuta cuando el servicio de fondo arranca.
  @pragma('vm:entry-point')
  static void _onServiceStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();
    
    if (service is AndroidServiceInstance) {
      service.on('setAsForeground').listen((_) {
        service.setAsForegroundService();
      });
      service.on('setAsBackground').listen((_) {
        service.setAsBackgroundService();
      });
    }

    service.on('stopService').listen((_) {
      service.stopSelf();
    });

    try {
      await dotenv.load(fileName: ".env");
    } catch (e) {
      // Si falla la carga del .env (ej. no existe), ignoramos.
    }

    final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
    final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

    if (supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty) {
      try {
        await Supabase.initialize(
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
        );
      } catch (e) {
        // Ya inicializado u otro error
      }
    }

    // Timer periódico que corre dentro del servicio de fondo (isolate separado)
    Timer.periodic(const Duration(seconds: _intervalSeconds), (_) async {
      if (service is AndroidServiceInstance) {
        if (await service.isForegroundService()) {
          service.setForegroundNotificationInfo(
            title: 'TRACE V — Jornada en curso',
            content: 'GPS activo · Última actualización: ${_formatTime(DateTime.now())}',
          );
        }
      }

      try {
        // Leer sesión directamente de SharedPreferences ya que SessionService no comparte memoria
        final prefs = await SharedPreferences.getInstance();
        final sessionJson = prefs.getString('user_session');
        if (sessionJson == null) return;
        
        final map = jsonDecode(sessionJson) as Map<String, dynamic>;
        final userId = map['id'] as String?;
        if (userId == null) return;

        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
          ),
        );

        if (Supabase.instance.client != null) {
          await Supabase.instance.client.from('reponedor_locations').upsert({
            'reponedor_id': userId,
            'latitude': position.latitude,
            'longitude': position.longitude,
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          });
        }
      } catch (e) {
        // Ignorar errores de red temporales
      }
    });
  }

  @pragma('vm:entry-point')
  static Future<bool> _onIosBackground(ServiceInstance service) async {
    return true;
  }

  static String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}';
  }

  // ── API Pública ───────────────────────────────────────────────────────────

  /// Inicia el rastreo GPS periódico y comienza a escribir en Supabase.
  ///
  /// En Android: activa el Foreground Service para que el SO no mate el GPS.
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

    // Pedir permiso de notificaciones para Android 13+ (necesario para Foreground Service)
    if (Platform.isAndroid) {
      final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    }

    // Iniciar el Foreground Service
    if (!kIsWeb) {
      try {
        await _backgroundService.startService();
      } catch (e) {
        // ignore: avoid_print
        print('[GpsService] Error iniciando Background Service: $e');
      }
    }

    // Primera lectura inmediata para que el supervisor vea al reponedor
    // en el momento que inicia la sesión, sin esperar 30 segundos.
    await _captureAndUpload();

    // Timer periódico cada 30 segundos en el hilo principal
    // (respaldo por si el servicio de fondo falla o en iOS)
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

    // Detener el Foreground Service
    if (!kIsWeb) {
      try {
        _backgroundService.invoke('stopService');
      } catch (e) {
        // ignore: avoid_print
        print('[GpsService] Error deteniendo Foreground Service: $e');
      }
    }

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

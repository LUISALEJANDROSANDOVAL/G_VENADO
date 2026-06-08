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
import 'package:latlong2/latlong.dart'; // Importante para el tipo LatLng

import 'session_service.dart';
import 'supabase_service.dart';

/// Servicio de rastreo GPS en tiempo real (RF-08) — Arquitectura Enterprise.
class GpsService extends ChangeNotifier {
  GpsService._();
  static final GpsService instance = GpsService._();

  // ── Constantes ────────────────────────────────────────────────────────────
  static const int _intervalSeconds = 30;
  static const double _geofenceRadiusMeters = 50.0;
  static const String _notificationChannelId = 'gps_tracking_channel';
  static const String _notificationChannelName = 'Rastreo GPS';
  static const int _notificationId = 888;

  // ── Estado interno ────────────────────────────────────────────────────────
  Timer? _trackingTimer;
  Position? _lastPosition;
  bool _isTracking = false;
  final FlutterBackgroundService _backgroundService = FlutterBackgroundService();

  /// Getter público que devuelve la posición en formato LatLng para el mapa
  LatLng? get currentPosition => _lastPosition != null 
      ? LatLng(_lastPosition!.latitude, _lastPosition!.longitude) 
      : null;

  /// Indica si el rastreo está activo actualmente.
  bool get isTracking => _isTracking;

  // ── Inicialización ────────────────────────────────────────────────────────

  static Future<void> initializeBackgroundService() async {
    final service = FlutterBackgroundService();

    final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    const androidChannel = AndroidNotificationChannel(
      _notificationChannelId,
      _notificationChannelName,
      description: 'Notificación del rastreo GPS del reponedor',
      importance: Importance.low,
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

  @pragma('vm:entry-point')
  static void _onServiceStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();
    
    if (service is AndroidServiceInstance) {
      service.on('setAsForeground').listen((_) => service.setAsForegroundService());
      service.on('setAsBackground').listen((_) => service.setAsBackgroundService());
    }
<<<<<<< Updated upstream

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
=======
    service.on('stopService').listen((_) => service.stopSelf());
>>>>>>> Stashed changes
  }

  @pragma('vm:entry-point')
  static Future<bool> _onIosBackground(ServiceInstance service) async => true;

  // ── API Pública ───────────────────────────────────────────────────────────

  Future<void> startLiveTracking() async {
    if (_isTracking) return;

    final permissionGranted = await _requestPermission();
    if (!permissionGranted) return;

    // Pedir permiso de notificaciones para Android 13+ (necesario para Foreground Service)
    if (Platform.isAndroid) {
      final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    }

<<<<<<< Updated upstream
    // Iniciar el Foreground Service
    if (!kIsWeb) {
      try {
        await _backgroundService.startService();
      } catch (e) {
        // ignore: avoid_print
        print('[GpsService] Error iniciando Background Service: $e');
=======
    if (!kIsWeb) {
      try {
        final isRunning = await _backgroundService.isRunning();
        if (!isRunning) await _backgroundService.startService();
      } catch (e) {
        debugPrint('[GpsService] Error Foreground: $e');
>>>>>>> Stashed changes
      }
    }

    await _captureAndUpload();
<<<<<<< Updated upstream

    // Timer periódico cada 30 segundos en el hilo principal
    // (respaldo por si el servicio de fondo falla o en iOS)
=======
>>>>>>> Stashed changes
    _trackingTimer = Timer.periodic(
      const Duration(seconds: _intervalSeconds),
      (_) => _captureAndUpload(),
    );
    notifyListeners();
  }

  void stopTracking() {
    _trackingTimer?.cancel();
    _trackingTimer = null;
    _isTracking = false;
    _lastPosition = null;

    if (!kIsWeb) _backgroundService.invoke('stopService');
    notifyListeners();
  }

  // ── Lógica de Geofencing ──────────────────────────────────────────────────

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

  // ── Internals ─────────────────────────────────────────────────────────────

  Future<void> _captureAndUpload() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      _lastPosition = position;
      notifyListeners(); // Avisa a los listeners (como RouteView) que la posición cambió
      
      await _uploadToSupabase(position.latitude, position.longitude);
    } catch (e) {
      debugPrint('[GpsService] Error capturando GPS: $e');
    }
  }

  Future<void> _uploadToSupabase(double latitude, double longitude) async {
    try {
      final userId = SessionService.instance.currentUserId;
      if (userId == null || !_isValidUuid(userId)) {
        debugPrint('[GpsService] Ignorando upload: reponedor_id inválido -> $userId');
        return;
      }

      await SupabaseService.client.from('reponedor_locations').upsert({
        'reponedor_id': userId,
        'latitude': latitude,
        'longitude': longitude,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (e) {
      debugPrint('[GpsService] Error Supabase: $e');
    }
  }

  bool _isValidUuid(String value) {
    final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
    return uuidRegex.hasMatch(value);
  }

  Future<bool> _requestPermission() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return false;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      return permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always;
    } catch (e) {
      return false;
    }
  }
}
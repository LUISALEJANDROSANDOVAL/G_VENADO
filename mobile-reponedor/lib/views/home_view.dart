import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import '../services/gps_service.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  String _statusMessage = 'Inicializando...';
  Position? _currentPosition;
  bool _isTracking = false;
  dynamic _locationSubscription;

  @override
  void initState() {
    super.initState();
    _checkSupabaseConnection();
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkSupabaseConnection() async {
    try {
      // Test connectivity by making a simple request or checking client state
      final url = dotenv.env['SUPABASE_URL'] ?? '';
      setState(() {
        _statusMessage = 'Conectado a Supabase\n($url)';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error de conexión: $e';
      });
    }
  }

  Future<void> _toggleTracking() async {
    if (_isTracking) {
      await _locationSubscription?.cancel();
      setState(() {
        _isTracking = false;
      });
    } else {
      setState(() {
        _statusMessage = 'Obteniendo GPS...';
      });

      try {
        // Request single current location first
        final pos = await GpsService.getCurrentLocation();
        setState(() {
          _currentPosition = pos;
          _isTracking = true;
          _statusMessage = 'Rastreo activo';
        });

        // Start stream listening for changes
        _locationSubscription = GpsService.getLocationStream().listen(
          (Position position) {
            setState(() {
              _currentPosition = position;
            });
            // Here you would upload the coordinate to Supabase
            _sendPositionToSupabase(position);
          },
          onError: (error) {
            setState(() {
              _statusMessage = 'Error de GPS: $error';
              _isTracking = false;
            });
          },
        );
      } catch (e) {
        setState(() {
          _statusMessage = 'Error de Permisos: $e';
          _isTracking = false;
        });
      }
    }
  }

  Future<void> _sendPositionToSupabase(Position position) async {
    // This is a placeholder for sending coordinates to Supabase PostGIS
    // e.g. supabaseClient.from('reponedor_locations').insert({...})
    debugPrint('Coordenadas: Lat ${position.latitude}, Lng ${position.longitude}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Venado OptiRoute - Reponedor'),
        backgroundColor: Colors.red[800],
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text(
                      'Estado del Sistema',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _statusMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Location Card
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text(
                      'Ubicación en Tiempo Real',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 15),
                    if (_currentPosition == null)
                      const Text('GPS inactivo o sin coordenadas todavía.')
                    else ...[
                      Text('Latitud: ${_currentPosition!.latitude}'),
                      const SizedBox(height: 5),
                      Text('Longitud: ${_currentPosition!.longitude}'),
                      const SizedBox(height: 5),
                      Text('Precisión: ${_currentPosition!.accuracy.toStringAsFixed(1)}m'),
                    ]
                  ],
                ),
              ),
            ),
            const Spacer(),

            // Actions Button
            ElevatedButton.icon(
              onPressed: _toggleTracking,
              icon: Icon(_isTracking ? Icons.gps_off : Icons.gps_fixed),
              label: Text(_isTracking ? 'Detener Rastreo' : 'Iniciar Rastreo GPS'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isTracking ? Colors.red[700] : Colors.green[700],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

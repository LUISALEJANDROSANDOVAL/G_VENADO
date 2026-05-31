import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/session_service.dart';
import 'services/supabase_service.dart';
import 'theme/app_theme.dart';
import 'views/login_view.dart';
import 'views/route_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Carga variables de entorno (.env real o .env.example como fallback)
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    try {
      await dotenv.load(fileName: '.env.example');
    } catch (e2) {
      debugPrint('Variables de entorno no cargadas: $e2');
    }
  }

  // Inicializar Supabase
  try {
    await SupabaseService.initialize();
  } catch (e) {
    debugPrint('Supabase no inicializado: $e');
  }

  // Inicializar sesión persistente
  try {
    await SessionService.instance.initSession();
  } catch (e) {
    debugPrint('Error inicializando sesión: $e');
  }

  runApp(const FieldOpsApp());
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class FieldOpsApp extends StatefulWidget {
  const FieldOpsApp({super.key});

  @override
  State<FieldOpsApp> createState() => _FieldOpsAppState();
}

class _FieldOpsAppState extends State<FieldOpsApp> {
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    // RF-06: Listener global de expiración/cierre de sesión.
    try {
      _authSubscription = SupabaseService.client.auth.onAuthStateChange.listen((data) {
        final event = data.event;
        if (event == AuthChangeEvent.signedOut || event == AuthChangeEvent.userDeleted) {
          SessionService.instance.clearSession();
          navigatorKey.currentState?.pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const LoginView()),
            (route) => false,
          );
        }
      });
    } catch (e) {
      debugPrint('No se pudo inicializar listener de AuthState: $e');
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'TRACE V — Reponedores',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: SessionService.instance.isLoggedIn
          ? const RouteView()
          : const LoginView(),
    );
  }
}

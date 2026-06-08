<<<<<<< Updated upstream
=======
import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb; // Importante para detectar Web
>>>>>>> Stashed changes
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'data/database_helper.dart';
import 'services/app_connection_service.dart';
import 'services/gps_service.dart';
import 'services/session_service.dart';
import 'services/supabase_service.dart';
import 'theme/app_theme.dart';
import 'views/login_view.dart';
import 'views/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Cargar variables de entorno
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Error cargando .env: $e');
  }

  // 2. Inicializar Supabase (Es necesario que las variables en .env no tengan prefijo)
  try {
    await SupabaseService.initialize();
    debugPrint('[main] Supabase inicializado.');
  } catch (e) {
    debugPrint('Error crítico en Supabase: $e');
  }

  // 3. Inicializar servicios NATIVOS (Solo si NO estamos en Web)
  if (!kIsWeb) {
    try {
      await DatabaseHelper.instance.database;
      debugPrint('[main] SQLite inicializado.');
    } catch (e) {
      debugPrint('[main] Error SQLite: $e');
    }

    try {
      await AppConnectionService.initializeWorkmanager();
      debugPrint('[main] Workmanager inicializado.');
    } catch (e) {
      debugPrint('[main] Error Workmanager: $e');
    }

    try {
      await GpsService.initializeBackgroundService();
      debugPrint('[main] GPS Background Service configurado.');
    } catch (e) {
      debugPrint('[main] Error GPS Service: $e');
    }
  } else {
    debugPrint('[main] Modo Web detectado: Saltando inicialización de servicios nativos.');
  }

  // 4. Inicializar sesión persistente
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
  @override
  void initState() {
    super.initState();
<<<<<<< Updated upstream
    // Nota: No usamos onAuthStateChange de Supabase Auth nativo porque
    // la autenticación se hace via RPC (verify_user_credentials) sobre
    // la tabla public.users con BCrypt. La sesión se gestiona con SessionService.
=======
    // Escuchar cambios de autenticación
    _authSubscription = SupabaseService.client.auth.onAuthStateChange.listen((data) {
      final event = data.event;
      if (event == AuthChangeEvent.signedOut) {
        SessionService.instance.clearSession();
        navigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginView()),
          (route) => false,
        );
      }
    });
>>>>>>> Stashed changes
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'TRACE V — Reponedores',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: SessionService.instance.isLoggedIn
          ? MainShell(key: mainShellKey)
          : const LoginView(),
    );
  }
}
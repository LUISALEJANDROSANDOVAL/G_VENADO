import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'services/supabase_service.dart';
import 'theme/app_theme.dart';
import 'views/login_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Carga variables de entorno (.env real o .env.example como fallback)
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    try {
      await dotenv.load(fileName: '.env.example');
    } catch (e2) {
      debugPrint('Variables de entorno no cargadas (modo mock UI): $e2');
    }
  }

  // TODO: Supabase se inicializará cuando se integre auth y sync real
  try {
    await SupabaseService.initialize();
  } catch (e) {
    debugPrint('Supabase no inicializado (modo mock UI): $e');
  }

  runApp(const FieldOpsApp());
}

class FieldOpsApp extends StatelessWidget {
  const FieldOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TRACE V — Reponedores',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const LoginView(),
    );
  }
}

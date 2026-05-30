import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'services/supabase_service.dart';
import 'views/home_view.dart';

void main() async {
  // Ensure Flutter engine is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables from .env asset
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Error cargando .env: $e');
  }

  // Initialize Supabase if variables are defined
  try {
    await SupabaseService.initialize();
  } catch (e) {
    debugPrint('Error inicializando Supabase: $e');
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Venado OptiRoute Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.red,
          primary: Colors.red[800],
        ),
        useMaterial3: true,
      ),
      home: const HomeView(),
    );
  }
}

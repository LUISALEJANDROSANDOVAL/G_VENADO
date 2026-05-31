import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

/// Servicio singleton para gestionar la sesión del usuario autenticado.
///
/// Permite mantener en memoria el perfil del usuario activo (`id`, `name`, `email` como `username`)
/// y persistirlo en `SharedPreferences` para que no sea necesario volver a loguearse
/// al reiniciar la aplicación.
class SessionService {
  SessionService._();
  static final SessionService instance = SessionService._();

  static const String _keyUserSession = 'user_session';
  User? _currentUser;

  /// Obtiene el usuario actual de la sesión.
  User? get currentUser => _currentUser;

  /// Obtiene el ID del usuario actual o null si no está autenticado.
  String? get currentUserId => _currentUser?.id;

  /// Obtiene el nombre real del usuario o null si no está autenticado.
  String? get currentUserName => _currentUser?.name;

  /// Retorna true si hay un usuario logueado en la sesión activa.
  bool get isLoggedIn => _currentUser != null;

  /// Inicializa la sesión recuperándola desde el almacenamiento local persistente.
  Future<void> initSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sessionJson = prefs.getString(_keyUserSession);
      if (sessionJson != null) {
        final Map<String, dynamic> map = jsonDecode(sessionJson) as Map<String, dynamic>;
        _currentUser = User.fromJson(map);
      }
    } catch (e) {
      // ignore: avoid_print
      print('[SessionService] Error recuperando sesión local: $e');
    }
  }

  /// Guarda y persiste la sesión del usuario en almacenamiento local.
  Future<void> saveSession(User user) async {
    _currentUser = user;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyUserSession, jsonEncode(user.toJson()));
    } catch (e) {
      // ignore: avoid_print
      print('[SessionService] Error persistiendo sesión local: $e');
    }
  }

  /// Limpia la sesión del usuario y borra la caché local persistente.
  Future<void> clearSession() async {
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyUserSession);
    } catch (e) {
      // ignore: avoid_print
      print('[SessionService] Error limpiando sesión local: $e');
    }
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/mock_data.dart';
import '../services/app_connection_service.dart';
import '../services/gps_service.dart';
import '../services/supabase_service.dart';
import '../theme/trace_login_colors.dart';
import '../widgets/connection_status_indicator.dart';
import '../widgets/trace_logo.dart';
import 'route_view.dart';

/// Pantalla de inicio de sesión — diseño TRACE V.
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController(text: MockData.mockUser.username);
  final _passwordController = TextEditingController(text: 'demo1234');
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    AppConnectionService.instance.addListener(_onConnectionChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(const AssetImage(TraceLogo.assetPath), context);
  }

  void _onConnectionChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AppConnectionService.instance.removeListener(_onConnectionChanged);
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final username = _userController.text.trim();
    final password = _passwordController.text;

    // Plan de contingencia / Modo Demostración Offline
    if (username == MockData.mockUser.username && password == 'demo1234') {
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (!mounted) return;
      setState(() => _isLoading = false);

      // Intentar GPS aunque sea demo (no bloquea el login si falla)
      unawaited(GpsService.instance.startLiveTracking());

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Iniciando sesión en Modo Demostración (Local Offline)'),
          backgroundColor: Colors.blueGrey,
          behavior: SnackBarBehavior.floating,
        ),
      );

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const RouteView()),
      );
      return;
    }

    // Autenticación Real con Supabase Auth
    try {
      final response = await SupabaseService.client.auth.signInWithPassword(
        email: username,
        password: password,
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (response.user != null) {
        // Iniciar rastreo GPS al autenticarse con Supabase
        unawaited(GpsService.instance.startLiveTracking());

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sesión iniciada con éxito en Supabase'),
            backgroundColor: Color(0xFF0F8C56), // Verde TRACE V
            behavior: SnackBarBehavior.floating,
          ),
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const RouteView()),
        );
      } else {
        throw Exception('No se pudo recuperar los datos del usuario autenticado.');
      }
    } on AuthException catch (authErr) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error de autenticación: ${authErr.message}'),
          backgroundColor: const Color(0xFFAA001B), // Rojo TRACE V
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al conectar con Supabase: $e'),
          backgroundColor: const Color(0xFFAA001B), // Rojo TRACE V
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TraceLoginColors.surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 28),
                      _buildBrandTitles(),
                      const SizedBox(height: 32),
                      _buildUnderlineField(
                        label: 'ID DE USUARIO O EMAIL',
                        controller: _userController,
                        icon: Icons.person_outline,
                        hint: 'ej. 12345678',
                        textInputAction: TextInputAction.next,
                        validator: (v) => v == null || v.trim().isEmpty
                            ? 'Ingresa tu usuario o email'
                            : null,
                      ),
                      const SizedBox(height: 24),
                      _buildUnderlineField(
                        label: 'CONTRASEÑA',
                        controller: _passwordController,
                        icon: Icons.lock_outline,
                        hint: '••••••••',
                        obscure: _obscurePassword,
                        suffix: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            color: TraceLoginColors.secondary,
                            size: 22,
                          ),
                          onPressed: () =>
                              setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _onLogin(),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Ingresa tu contraseña';
                          if (v.length < 4) return 'Mínimo 4 caracteres';
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),
                      _buildLoginButton(),
                      const SizedBox(height: 16),
                      Center(
                        child: TextButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Contacta al administrador para recuperar acceso',
                                ),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          child: const Text(
                            '¿HAS OLVIDADO TU CONTRASEÑA?',
                            style: TextStyle(
                              color: TraceLoginColors.secondary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      ConnectionStatusIndicator(
                        status: AppConnectionService.instance.status,
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  /// Logo centrado sin barra de fondo roja.
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: TraceLogo(width: 140, height: 140),
      ),
    );
  }

  /// Solo texto en zona clara — el PNG ya incluye TRACE V en el header.
  Widget _buildBrandTitles() {
    return const Column(
      children: [
        Text(
          'TRACE V',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: TraceLoginColors.primary,
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            height: 1.1,
          ),
        ),
        SizedBox(height: 6),
        Text(
          'OPERACIONES LOGÍSTICAS',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: TraceLoginColors.secondary,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 2.2,
          ),
        ),
      ],
    );
  }

  Widget _buildUnderlineField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    bool obscure = false,
    Widget? suffix,
    TextInputAction? textInputAction,
    void Function(String)? onSubmitted,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: TraceLoginColors.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscure,
          textInputAction: textInputAction,
          onFieldSubmitted: onSubmitted,
          validator: validator,
          style: const TextStyle(color: TraceLoginColors.onSurface, fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: TraceLoginColors.secondary.withValues(alpha: 0.4)),
            prefixIcon: Icon(icon, color: TraceLoginColors.secondary, size: 20),
            suffixIcon: suffix,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE5E5EA)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE5E5EA)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: TraceLoginColors.primary, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: TraceLoginColors.primaryContainer, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _onLogin,
        style: ElevatedButton.styleFrom(
          backgroundColor: TraceLoginColors.primaryContainer,
          foregroundColor: TraceLoginColors.onPrimary,
          disabledBackgroundColor: TraceLoginColors.primaryContainer.withValues(alpha: 0.6),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: TraceLoginColors.onPrimary,
                ),
              )
            : const Text(
                'INICIAR SESIÓN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.6,
                ),
              ),
      ),
    );
  }

  Widget _buildFooter() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, top: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 1, height: 40, color: TraceLoginColors.primary),
          const SizedBox(height: 8),
          Text(
            'PRECISION SYSTEM V4.0',
            style: TextStyle(
              color: TraceLoginColors.onSurfaceVariant.withValues(alpha: 0.6),
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 2.8,
            ),
          ),
        ],
      ),
    );
  }
}

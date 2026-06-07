import 'dart:async';
import 'package:flutter/material.dart';
import '../data/mock_data.dart';
import '../models/user.dart';
import '../services/app_connection_service.dart';
import '../services/gps_service.dart';
import '../services/session_service.dart';
import '../services/supabase_service.dart';
import '../theme/trace_login_colors.dart';
import '../widgets/connection_status_indicator.dart';
import '../widgets/trace_logo.dart';
import 'route_view.dart';

/// Pantalla de inicio de sesión — diseño premium TRACE V (inspirado en Tasker).
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController(text: MockData.mockUser.username);
  final _passwordController = TextEditingController(text: 'demo1234');
  bool _obscurePassword = true;
  bool _isLoading = false;

  // Controladores de animación escalonada
  late AnimationController _entryController;
  late List<Animation<double>> _fadeAnims;
  late List<Animation<Offset>> _slideAnims;

  // Fondo cálido crema (estilo Tasker adaptado a TRACE V)
  static const _warmBackground = Color(0xFFFDF5F5); // Crema con tinte rojo muy sutil
  static const _warmBackgroundEnd = Color(0xFFF9ECEC); // Ligeramente más cálido abajo

  @override
  void initState() {
    super.initState();
    AppConnectionService.instance.addListener(_onConnectionChanged);

    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );

    // 5 grupos de elementos con stagger
    _fadeAnims = List.generate(5, (i) {
      final start = i * 0.12;
      final end = (start + 0.45).clamp(0.0, 1.0);
      return CurvedAnimation(
        parent: _entryController,
        curve: Interval(start, end, curve: Curves.easeOut),
      );
    });

    _slideAnims = List.generate(5, (i) {
      final start = i * 0.12;
      final end = (start + 0.45).clamp(0.0, 1.0);
      return Tween<Offset>(begin: const Offset(0, 0.25), end: Offset.zero).animate(
        CurvedAnimation(
          parent: _entryController,
          curve: Interval(start, end, curve: Curves.easeOutCubic),
        ),
      );
    });

    _entryController.forward();
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
    _entryController.dispose();
    super.dispose();
  }

  // Helper para envolver cada bloque con su animación
  Widget _animated(int index, Widget child) {
    return FadeTransition(
      opacity: _fadeAnims[index],
      child: SlideTransition(position: _slideAnims[index], child: child),
    );
  }

  Future<void> _onLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    final username = _userController.text.trim();
    final password = _passwordController.text;

    // Modo demo offline
    if (username == MockData.mockUser.username && password == 'demo1234') {
      await Future<void>.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;
      await SessionService.instance.saveSession(MockData.mockUser);
      if (!mounted) return;
      setState(() => _isLoading = false);
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

    // Autenticación real con Supabase
    try {
      final userRow = await SupabaseService.client
          .from('users')
          .select()
          .eq('email', username)
          .eq('password', password)
          .maybeSingle();

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (userRow != null) {
        final user = User.fromJson(userRow);
        await SessionService.instance.saveSession(user);
        if (!mounted) return;
        unawaited(GpsService.instance.startLiveTracking());
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sesión iniciada con éxito'),
            backgroundColor: Color(0xFF0F8C56),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const RouteView()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email o contraseña incorrectos'),
            backgroundColor: TraceLoginColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al conectar: $e'),
          backgroundColor: TraceLoginColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [_warmBackground, _warmBackgroundEnd],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 52),

                  // 1. Logo con filtro rojo TRACE V (sin círculo)
                  _animated(
                    0,
                    Center(
                      child: ColorFiltered(
                        colorFilter: const ColorFilter.mode(
                          Color(0xFFAA001B), // Rojo corporativo TRACE V
                          BlendMode.srcIn,
                        ),
                        child: TraceLogo(width: 120, height: 120),
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // 2. Texto de bienvenida (estilo Tasker)
                  _animated(
                    1,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Bienvenido\nde vuelta',
                          style: TextStyle(
                            fontSize: 34,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1A1C1C),
                            height: 1.15,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Ingresa tus credenciales para continuar',
                          style: TextStyle(
                            fontSize: 15,
                            color: const Color(0xFF1A1C1C).withValues(alpha: 0.45),
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // 3. Campo de usuario
                  _animated(2, _buildPillField(
                    label: 'Usuario o Email',
                    controller: _userController,
                    icon: Icons.person_outline_rounded,
                    hint: 'Ingresa tu usuario',
                    textInputAction: TextInputAction.next,
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Ingresa tu usuario o email'
                        : null,
                  )),

                  const SizedBox(height: 16),

                  // 4. Campo de contraseña
                  _animated(3, _buildPillField(
                    label: 'Contraseña',
                    controller: _passwordController,
                    icon: Icons.lock_outline_rounded,
                    hint: 'Ingresa tu contraseña',
                    obscure: _obscurePassword,
                    suffix: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: const Color(0xFF1A1C1C).withValues(alpha: 0.35),
                        size: 20,
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
                  )),

                  const SizedBox(height: 32),

                  // 5. Botón y footer
                  _animated(
                    4,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Botón pill estilo Tasker con color TRACE V
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: _isLoading
                                ? []
                                : [
                                    BoxShadow(
                                      color: TraceLoginColors.primaryContainer
                                          .withValues(alpha: 0.45),
                                      blurRadius: 20,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                          ),
                          child: SizedBox(
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _onLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: TraceLoginColors.primaryContainer,
                                foregroundColor: TraceLoginColors.onPrimary,
                                disabledBackgroundColor: TraceLoginColors.primaryContainer
                                    .withValues(alpha: 0.55),
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                              child: AnimatedSwitcher(
                                duration: const Duration(milliseconds: 200),
                                child: _isLoading
                                    ? const SizedBox(
                                        key: ValueKey('loading'),
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text(
                                        key: ValueKey('label'),
                                        'Iniciar Sesión',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // ¿Olvidaste contraseña?
                        Center(
                          child: TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                      'Contacta al administrador para recuperar acceso'),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: RichText(
                              text: TextSpan(
                                text: '¿Olvidaste tu contraseña? ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: const Color(0xFF1A1C1C).withValues(alpha: 0.45),
                                ),
                                children: const [
                                  TextSpan(
                                    text: 'Contactar',
                                    style: TextStyle(
                                      color: TraceLoginColors.primaryContainer,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Indicador de conexión
                        ConnectionStatusIndicator(
                          status: AppConnectionService.instance.status,
                        ),

                        const SizedBox(height: 32),

                        // Footer
                        Column(
                          children: [
                            Container(
                              height: 1,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.transparent,
                                    TraceLoginColors.primary.withValues(alpha: 0.15),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'PRECISION SYSTEM V4.0',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: const Color(0xFF1A1C1C).withValues(alpha: 0.3),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 2.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Campo en forma de pastilla (pill) — estilo Tasker con paleta TRACE V
  Widget _buildPillField({
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
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF1A1C1C).withValues(alpha: 0.6),
              letterSpacing: 0.2,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: TextFormField(
            controller: controller,
            obscureText: obscure,
            textInputAction: textInputAction,
            onFieldSubmitted: onSubmitted,
            validator: validator,
            style: const TextStyle(
              color: Color(0xFF1A1C1C),
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(
                color: const Color(0xFF1A1C1C).withValues(alpha: 0.3),
                fontSize: 15,
              ),
              prefixIcon: Icon(icon,
                  color: const Color(0xFF1A1C1C).withValues(alpha: 0.35), size: 20),
              suffixIcon: suffix,
              filled: true,
              fillColor: Colors.transparent,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(28),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(28),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(28),
                borderSide: const BorderSide(
                    color: TraceLoginColors.primary, width: 1.5),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(28),
                borderSide: const BorderSide(
                    color: TraceLoginColors.primaryContainer, width: 1.5),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(28),
                borderSide: const BorderSide(
                    color: TraceLoginColors.primaryContainer, width: 1.5),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}

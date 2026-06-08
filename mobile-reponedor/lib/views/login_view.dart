<<<<<<< Updated upstream
import 'dart:async';
=======
>>>>>>> Stashed changes
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../models/user.dart';
import '../services/app_connection_service.dart';
import '../services/session_service.dart';
import '../services/supabase_service.dart';
import '../theme/trace_login_colors.dart';
import '../widgets/connection_status_indicator.dart';
<<<<<<< Updated upstream
import '../widgets/trace_logo.dart';
import 'main_shell.dart';

/// Pantalla de inicio de sesión — diseño premium TRACE V (inspirado en Tasker).
=======
import 'route_view.dart';

>>>>>>> Stashed changes
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

<<<<<<< Updated upstream
class _LoginViewState extends State<LoginView> with TickerProviderStateMixin {
=======
class _LoginViewState extends State<LoginView>
    with SingleTickerProviderStateMixin {
>>>>>>> Stashed changes
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  late AnimationController _animController;
  late Animation<double> _scaleAnim;

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
<<<<<<< Updated upstream
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
=======
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.96).animate(_animController);
>>>>>>> Stashed changes
  }

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
<<<<<<< Updated upstream
    _entryController.dispose();
=======
    _animController.dispose();
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

    _animController.forward().then((_) => _animController.reverse());
>>>>>>> Stashed changes
    setState(() => _isLoading = true);

<<<<<<< Updated upstream
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
        MaterialPageRoute<void>(builder: (_) => MainShell(key: mainShellKey)),
      );
      return;
    }

    // Autenticación real con Supabase (RPC verify_user_credentials)
    try {
      final response = await SupabaseService.client.rpc(
        'verify_user_credentials',
        params: {
          'p_email': username,
          'p_password': password,
        },
      ) as List<dynamic>?;
=======
    try {
      final identifier = _userController.text.trim();
      final password = _passwordController.text;
>>>>>>> Stashed changes

      if (password.isEmpty) {
        throw Exception('Ingresa tu contraseña para iniciar sesión.');
      }

<<<<<<< Updated upstream
      if (response != null && response.isNotEmpty) {
        final userRow = response.first as Map<String, dynamic>;
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
          MaterialPageRoute<void>(builder: (_) => MainShell(key: mainShellKey)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email o contraseña incorrectos'),
            backgroundColor: TraceLoginColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
=======
      final authEmail = await _resolveEmailForLogin(identifier);
      if (authEmail == null) {
        throw Exception(
          'No se encontró un usuario con ese nombre, email o id. Usa tu email o id correcto.',
>>>>>>> Stashed changes
        );
      }

      final normalizedEmail = authEmail.trim().toLowerCase();
      debugPrint('[LoginView] authEmail resuelto: $normalizedEmail');

      dynamic authResponse;
      try {
        authResponse = await SupabaseService.client.auth.signInWithPassword(
          email: normalizedEmail,
          password: password,
        );
      } on supabase.AuthApiException catch (error) {
        debugPrint('[LoginView] Supabase auth failed: ${error.message}');
        final customUser = await _authenticateCustomUser(identifier, password);
        if (customUser != null) {
          await SessionService.instance.saveSession(customUser);
          if (!mounted) return;
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const RouteView()));
          return;
        }
        rethrow;
      }

      final authUser = authResponse.user ?? SupabaseService.client.auth.currentUser;
      if (authUser == null) {
        final customUser = await _authenticateCustomUser(identifier, password);
        if (customUser != null) {
          await SessionService.instance.saveSession(customUser);
          if (!mounted) return;
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const RouteView()));
          return;
        }
        throw Exception('No se pudo autenticar. Revisa tus credenciales.');
      }

      final profile = await SupabaseService.client
          .from('users')
          .select('id,name,email')
          .eq('id', authUser.id)
          .maybeSingle();

      if (profile == null) {
        throw Exception('No se pudo cargar perfil de usuario.');
      }

      final Map<String, dynamic> profileMap = profile;

      final emailValue = profileMap['email'];
      final nameValue = profileMap['name'];

      final user = User(
        id: authUser.id,
        name: nameValue is String && nameValue.isNotEmpty
            ? nameValue
            : _buildDisplayName(authEmail),
        username: emailValue is String && emailValue.isNotEmpty
            ? emailValue
            : authEmail,
      );

      await SessionService.instance.saveSession(user);

      if (!mounted) return;
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const RouteView()));
    } catch (error) {
      debugPrint('[LoginView] Error login: $error');
      String message;
      if (error is supabase.AuthApiException) {
        message = error.message;
      } else if (error is supabase.PostgrestException) {
        message = error.message;
      } else {
        message = error.toString();
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
<<<<<<< Updated upstream
          content: Text('Error al conectar: $e'),
          backgroundColor: TraceLoginColors.primary,
          behavior: SnackBarBehavior.floating,
=======
          content: Text(message),
>>>>>>> Stashed changes
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
<<<<<<< Updated upstream
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
=======
      backgroundColor: TraceLoginColors.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 450),
              child: Column(
                children: [
                  Image.asset('assets/images/trace_v_logo1.png', width: 160),
                  const SizedBox(height: 48),

                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(
                        color: TraceLoginColors.primary.withValues(alpha: 0.1),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: TraceLoginColors.primary.withValues(
                            alpha: 0.06,
                          ),
                          blurRadius: 40,
                          offset: const Offset(0, 20),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          _buildField(
                            'USUARIO',
                            _userController,
                            Icons.person_outline,
                          ),
                          const SizedBox(height: 24),
                          _buildField(
                            'CONTRASEÑA',
                            _passwordController,
                            Icons.lock_outline,
                            isPass: true,
                          ),
                          const SizedBox(height: 24),
                          ScaleTransition(
                            scale: _scaleAnim,
                            child: _buildLoginButton(),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                  const Text(
                    'Usa tu nombre, Gmail o id de usuario y tu contraseña para iniciar sesión.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                  ),

                  const SizedBox(height: 24),
                  ConnectionStatusIndicator(
                    status: AppConnectionService.instance.status,
                  ),
>>>>>>> Stashed changes
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

<<<<<<< Updated upstream
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
=======
  Widget _buildField(
    String label,
    TextEditingController controller,
    IconData icon, {
    bool isPass = false,
>>>>>>> Stashed changes
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
<<<<<<< Updated upstream
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
=======
        Text(
          label == 'USUARIO' ? 'Usuario, gmail o id' : 'CONTRASEÑA',
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: TraceLoginColors.secondary,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: isPass && _obscurePassword,
          keyboardType: label == 'USUARIO' ? TextInputType.emailAddress : TextInputType.text,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return label == 'USUARIO'
                  ? 'Ingresa tu usuario, email o id'
                  : 'Ingresa tu contraseña';
            }
            return null;
          },
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: TraceLoginColors.primary),
            suffixIcon: isPass
                ? IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: TraceLoginColors.secondary,
                    ),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  )
                : null,
            filled: true,
            fillColor: TraceLoginColors.primaryLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(18),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(18),
              borderSide: const BorderSide(
                color: TraceLoginColors.primary,
                width: 2,
              ),
            ),
>>>>>>> Stashed changes
          ),
        ),
      ],
    );
  }
<<<<<<< Updated upstream
=======

  String _buildDisplayName(String raw) {
    if (raw.isEmpty) return 'Reponedor';
    if (raw.contains('@')) {
      final parts = raw.split('@').first.split(RegExp('[._-]'));
      return parts
          .map(
            (part) => part.isEmpty
                ? ''
                : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
          )
          .join(' ');
    }
    return raw
        .split(' ')
        .map(
          (part) => part.isEmpty
              ? ''
              : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
        )
        .join(' ');
  }

  Future<Map<String, dynamic>?> _findUserProfileByLogin(
    String identifier,
  ) async {
    if (identifier.isEmpty) return null;

    final isEmail = RegExp(r'^\S+@\S+\.\S+$').hasMatch(identifier);
    final isUuid = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    ).hasMatch(identifier);

    final client = SupabaseService.client;

    if (isEmail) {
      final result = await client.from('users').select('id,name,email,password').ilike('email', identifier).maybeSingle();
      if (result is Map<String, dynamic>) return result;
      return null;
    }

    if (isUuid) {
      final result = await client.from('users').select('id,name,email,password').eq('id', identifier).maybeSingle();
      if (result is Map<String, dynamic>) return result;
      return null;
    }

    // Name search: can return multiple rows. Use exact or first match if only one exists.
    final results = await client.from('users').select('id,name,email,password').ilike('name', '%$identifier%').limit(5);
    if (results.isNotEmpty) {
      if (results.length == 1) {
        return Map<String, dynamic>.from(results.first as Map);
      }
      throw Exception('Se encontraron varios usuarios con ese nombre. Usa tu email o id para iniciar sesión.');
    }

    return null;
  }

  Future<String?> _resolveEmailForLogin(String identifier) async {
    if (identifier.isEmpty) return null;
    final isEmail = RegExp(r'^\S+@\S+\.\S+$').hasMatch(identifier);
    if (isEmail) return identifier.trim().toLowerCase();

    final profile = await _findUserProfileByLogin(identifier);
    return profile?['email'] as String?;
  }

  Future<User?> _authenticateCustomUser(String identifier, String password) async {
    final profile = await _findUserProfileByLogin(identifier);
    if (profile == null) return null;

    final storedPassword = profile['password'];
    if (storedPassword is String && storedPassword == password) {
      final userId = profile['id']?.toString();
      final email = profile['email']?.toString() ?? '';
      final name = profile['name']?.toString() ?? _buildDisplayName(email);
      if (userId == null || userId.isEmpty) return null;

      return User(
        id: userId,
        name: name,
        username: email.isNotEmpty ? email : identifier,
      );
    }

    return null;
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _onLogin,
        style: ElevatedButton.styleFrom(
          backgroundColor: TraceLoginColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          elevation: 5,
          shadowColor: TraceLoginColors.primary.withValues(alpha: 0.5),
        ),
        child: _isLoading
            ? const CircularProgressIndicator(color: Colors.white)
            : const Text(
                'INGRESAR',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  letterSpacing: 2,
                ),
              ),
      ),
    );
  }
>>>>>>> Stashed changes
}

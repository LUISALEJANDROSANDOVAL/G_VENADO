import 'package:flutter/material.dart';
<<<<<<< Updated upstream
import '../theme/app_colors.dart';
import '../services/session_service.dart';
import 'login_view.dart';
=======
import '../services/session_service.dart';
import '../theme/app_colors.dart';
import 'route_history_view.dart';
>>>>>>> Stashed changes

class ProfileView extends StatelessWidget {
  const ProfileView({super.key});

<<<<<<< Updated upstream
  void _logout(BuildContext context) async {
    await SessionService.instance.clearSession();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(builder: (_) => const LoginView()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final userName = SessionService.instance.currentUserName ?? 'Reponedor';
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mi Perfil', style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: AppColors.cardBackground,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.traceRed.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.traceRed, width: 2),
              ),
              alignment: Alignment.center,
              child: Text(
                userName.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: AppColors.traceRed),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            userName,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Reponedor Senior',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.dimGrayText, fontSize: 14),
          ),
          const SizedBox(height: 32),
          
          Text('Estadísticas Semanales', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatCard(label: 'Completadas', value: '42', icon: Icons.storefront, color: AppColors.institutionalBlue),
              const SizedBox(width: 12),
              _StatCard(label: 'Efectividad', value: '96%', icon: Icons.pie_chart, color: AppColors.success),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StatCard(label: 'Tiempo Promedio', value: '18m', icon: Icons.timer, color: AppColors.warning),
              const SizedBox(width: 12),
              _StatCard(label: 'Evidencias', value: '124', icon: Icons.camera_alt, color: AppColors.traceRed),
            ],
          ),
          
          const SizedBox(height: 48),
          ElevatedButton.icon(
            onPressed: () => _logout(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.cardBackground,
              foregroundColor: AppColors.traceRed,
              side: const BorderSide(color: AppColors.traceRed),
              padding: const EdgeInsets.symmetric(vertical: 16),
              elevation: 0,
            ),
            icon: const Icon(Icons.logout),
            label: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.inputBorder.withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 12),
            Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.dimGrayText, fontWeight: FontWeight.bold)),
=======
  @override
  Widget build(BuildContext context) {
    final user = SessionService.instance.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi perfil'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
              decoration: BoxDecoration(
                color: AppColors.whiteSurface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  CircleAvatar(
                    radius: 34,
                    backgroundColor: AppColors.institutionalBlue,
                    child: Text(
                      _avatarLetters(user?.name ?? 'R'),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    user?.name ?? 'Reponedor',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    user?.username ?? 'usuario@demo.com',
                    style: const TextStyle(color: AppColors.secondaryText),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aquí puedes ver tus datos y acceder al historial de jornadas anteriores. Mantén tu perfil actualizado para identificar tu trabajo con facilidad.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.secondaryText),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Información del perfil', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildInfoTile('Nombre', user?.name ?? 'Reponedor', Icons.person_outline),
            _buildInfoTile('Usuario', user?.username ?? 'demo@correo.com', Icons.alternate_email),
            _buildInfoTile('ID de usuario', user?.id ?? 'demo-000', Icons.perm_identity),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const RouteHistoryView()),
                );
              },
              icon: const Icon(Icons.history),
              label: const Text('Ver historial de rutas'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.institutionalBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
>>>>>>> Stashed changes
          ],
        ),
      ),
    );
  }
<<<<<<< Updated upstream
=======

  static String _avatarLetters(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return 'R';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(
          backgroundColor: AppColors.lightBackground,
          child: Icon(icon, color: AppColors.institutionalBlue),
        ),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(value, style: const TextStyle(color: AppColors.secondaryText)),
      ),
    );
  }
>>>>>>> Stashed changes
}

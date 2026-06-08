import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  final String userId = '21e2dd9c-1e79-4eeb-942b-d0c812331902';
  
  // Future para traer nombre y ruta al mismo tiempo
  Future<Map<String, dynamic>> fetchDashboardData() async {
    final user = await Supabase.instance.client
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
        
    final route = await Supabase.instance.client
        .from('daily_routes_plan')
        .select('optimized_pos_sequence')
        .eq('reponedor_id', userId)
        .eq('date', DateTime.now().toString().split(' ')[0])
        .maybeSingle();
        
    return {'name': user['name'], 'route': route};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F4F7), // Gris muy claro elegante
      body: FutureBuilder<Map<String, dynamic>>(
        future: fetchDashboardData(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          
          final userName = snapshot.data!['name'];
          final routeData = snapshot.data!['route'];
          final int count = routeData != null ? (routeData['optimized_pos_sequence'] as List).length : 0;

          return CustomScrollView(
            slivers: [
              // Header tipo perfil elegante
              SliverAppBar(
                expandedHeight: 180,
                backgroundColor: const Color(0xFF0056D2),
                flexibleSpace: FlexibleSpaceBar(
                  background: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Bienvenido,", style: TextStyle(color: Colors.white70, fontSize: 16)),
                        Text(userName, style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              // Cuerpo con distribución mejorada
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    children: [
                      // Tarjeta de Ruta Principal (más grande y destacada)
                      _buildFeaturedCard("Tu Ruta de Hoy", "$count paradas programadas", Icons.map_outlined),
                      const SizedBox(height: 20),
                      // Grid de utilidades
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        children: [
                          _buildSmallCard("Historial", Icons.history, Colors.orange),
                          _buildSmallCard("Configuración", Icons.settings, Colors.grey),
                        ],
                      ),
                    ],
                  ),
                ),
              )
            ],
          );
        },
      ),
    );
  }

  Widget _buildFeaturedCard(String title, String subtitle, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
      child: Row(
        children: [
          Icon(icon, size: 40, color: const Color(0xFF0056D2)),
          const SizedBox(width: 20),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text(subtitle, style: TextStyle(color: Colors.grey[600])),
          ])
        ],
      ),
    );
  }

  Widget _buildSmallCard(String title, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(icon, size: 30, color: color), const SizedBox(height: 10), Text(title)]),
    );
  }
}
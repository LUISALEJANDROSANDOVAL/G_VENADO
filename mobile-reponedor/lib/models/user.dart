/// Modelo de usuario reponedor.
/// TODO: Integrar con Supabase Auth en futuras iteraciones.
class User {
  const User({
    required this.id,
    required this.name,
    required this.username,
  });

  final String id;
  final String name;
  final String username;
}

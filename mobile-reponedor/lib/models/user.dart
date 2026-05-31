/// Modelo de usuario reponedor.
class User {
  const User({
    required this.id,
    required this.name,
    required this.username,
  });

  final String id;
  final String name;
  final String username;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      name: json['name'] as String,
      username: (json['email'] ?? json['username'] ?? '') as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
    };
  }
}

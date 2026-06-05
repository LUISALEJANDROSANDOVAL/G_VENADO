import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

/// Helper centralizado de SQLite para persistencia offline robusta.
///
/// Gestiona dos tablas principales:
///   • `pending_tasks`     — logs de tareas completadas pendientes de sincronizar.
///   • `pending_evidences` — rutas locales de fotos pendientes de subir a Storage.
///
/// Ventajas sobre SharedPreferences:
///   - Transacciones ACID: si la app crashea a mitad de escritura, la BD no se corrompe.
///   - Control de reintentos (`retry_count`) por registro individual.
///   - Consultas SQL eficientes sin cargar todo en memoria.
class DatabaseHelper {
  DatabaseHelper._();
  static final DatabaseHelper instance = DatabaseHelper._();

  static const String _dbName = 'reponedor_offline.db';
  static const int _dbVersion = 1;

  Database? _database;

  /// Obtiene la instancia de la base de datos, creándola si no existe.
  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final path = join(documentsDir.path, _dbName);

    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  /// Crea las tablas en la primera instalación.
  Future<void> _onCreate(Database db, int version) async {
    // Tabla de tareas pendientes de sincronizar con Supabase
    await db.execute('''
      CREATE TABLE pending_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_plan_id TEXT NOT NULL,
        pos_id TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        photo_url TEXT,
        local_photo_path TEXT,
        user_id TEXT,
        is_offline INTEGER NOT NULL DEFAULT 1,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_retry_at TEXT
      )
    ''');

    // Tabla de evidencias fotográficas pendientes de subir al bucket
    await db.execute('''
      CREATE TABLE pending_evidences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_path TEXT NOT NULL,
        remote_path TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
        task_log_id INTEGER,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_retry_at TEXT,
        FOREIGN KEY (task_log_id) REFERENCES pending_tasks(id) ON DELETE CASCADE
      )
    ''');

    // Índices para consultas rápidas
    await db.execute(
      'CREATE INDEX idx_pending_tasks_retry ON pending_tasks(retry_count)',
    );
    await db.execute(
      'CREATE INDEX idx_pending_evidences_retry ON pending_evidences(retry_count)',
    );
  }

  /// Maneja migraciones futuras de esquema.
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Futuras migraciones se agregan aquí de forma incremental.
    // Ejemplo: if (oldVersion < 2) { ... }
  }

  // ── CRUD: Pending Tasks ──────────────────────────────────────────────────

  /// Inserta un log de tarea en la cola offline.
  /// Retorna el ID del registro insertado.
  Future<int> insertPendingTask(Map<String, dynamic> taskLog) async {
    final db = await database;
    return await db.insert('pending_tasks', {
      'route_plan_id': taskLog['route_plan_id'],
      'pos_id': taskLog['pos_id'],
      'task_id': taskLog['task_id'],
      'start_time': taskLog['start_time'],
      'end_time': taskLog['end_time'],
      'duration_seconds': taskLog['duration_seconds'],
      'photo_url': taskLog['photo_url'],
      'local_photo_path': taskLog['local_photo_path'],
      'user_id': taskLog['user_id'],
      'is_offline': 1,
      'retry_count': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  /// Obtiene todos los logs pendientes, ordenados por antigüedad.
  /// Limita los reintentos a un máximo de [maxRetries] para evitar loops infinitos.
  Future<List<Map<String, dynamic>>> getPendingTasks({int maxRetries = 5}) async {
    final db = await database;
    return await db.query(
      'pending_tasks',
      where: 'retry_count < ?',
      whereArgs: [maxRetries],
      orderBy: 'created_at ASC',
    );
  }

  /// Elimina un log pendiente tras sincronización exitosa.
  Future<int> deletePendingTask(int id) async {
    final db = await database;
    return await db.delete('pending_tasks', where: 'id = ?', whereArgs: [id]);
  }

  /// Incrementa el contador de reintentos de un registro fallido.
  Future<void> incrementRetryCount(int id) async {
    final db = await database;
    await db.rawUpdate(
      '''UPDATE pending_tasks 
         SET retry_count = retry_count + 1, last_retry_at = ? 
         WHERE id = ?''',
      [DateTime.now().toUtc().toIso8601String(), id],
    );
  }

  /// Obtiene la cantidad total de tareas pendientes sincronizables.
  Future<int> getPendingTaskCount({int maxRetries = 5}) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM pending_tasks WHERE retry_count < ?',
      [maxRetries],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Elimina TODAS las tareas pendientes (usado tras sync exitosa completa).
  Future<int> clearAllPendingTasks() async {
    final db = await database;
    return await db.delete('pending_tasks');
  }

  // ── CRUD: Pending Evidences ──────────────────────────────────────────────

  /// Inserta una evidencia fotográfica en la cola de subida.
  Future<int> insertPendingEvidence({
    required String localPath,
    required String remotePath,
    String mimeType = 'image/jpeg',
    int? taskLogId,
  }) async {
    final db = await database;
    return await db.insert('pending_evidences', {
      'local_path': localPath,
      'remote_path': remotePath,
      'mime_type': mimeType,
      'task_log_id': taskLogId,
      'retry_count': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  /// Obtiene todas las evidencias pendientes de subir.
  Future<List<Map<String, dynamic>>> getPendingEvidences({int maxRetries = 5}) async {
    final db = await database;
    return await db.query(
      'pending_evidences',
      where: 'retry_count < ?',
      whereArgs: [maxRetries],
      orderBy: 'created_at ASC',
    );
  }

  /// Elimina una evidencia tras subida exitosa.
  Future<int> deletePendingEvidence(int id) async {
    final db = await database;
    return await db.delete('pending_evidences', where: 'id = ?', whereArgs: [id]);
  }

  /// Incrementa el contador de reintentos de una evidencia fallida.
  Future<void> incrementEvidenceRetryCount(int id) async {
    final db = await database;
    await db.rawUpdate(
      '''UPDATE pending_evidences 
         SET retry_count = retry_count + 1, last_retry_at = ? 
         WHERE id = ?''',
      [DateTime.now().toUtc().toIso8601String(), id],
    );
  }

  /// Obtiene la cantidad total de evidencias pendientes.
  Future<int> getPendingEvidenceCount({int maxRetries = 5}) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM pending_evidences WHERE retry_count < ?',
      [maxRetries],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  /// Retorna el total combinado de items pendientes (tareas + evidencias).
  Future<int> getTotalPendingCount() async {
    final tasks = await getPendingTaskCount();
    final evidences = await getPendingEvidenceCount();
    return tasks + evidences;
  }

  /// Cierra la conexión a la base de datos.
  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
      _database = null;
    }
  }
}

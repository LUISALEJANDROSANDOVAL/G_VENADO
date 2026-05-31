/// Tipos de cliente según clasificación comercial.
enum CustomerType { pareto, mayorista, detallista }

/// Estado de una visita dentro de la ruta diaria.
enum VisitStatus { pendiente, enProceso, completada }

/// Estado de conexión / sincronización del dispositivo.
enum ConnectionStatus { online, offline, pendingSync }

/// Estado del geofence (mock visual, sin GPS real).
enum GeofenceStatus { fueraDelPdv, dentroDelRadio, visitaValidada }

/// Estado del cronómetro por micro-tarea.
enum TaskTimerState { idle, running, paused, finished }

/// Estado de una evidencia fotográfica.
enum EvidenceStatus { pendiente, capturada, sincronizada }

/// Tipo de evidencia fotográfica (antes / después / general).
enum EvidenceType { antes, despues, general }

/// Estado global de sincronización de la visita.
enum SyncStatus { sincronizado, pendiente, enviando, error }

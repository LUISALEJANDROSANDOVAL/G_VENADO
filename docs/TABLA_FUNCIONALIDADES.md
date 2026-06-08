# Tabla Completa de Funcionalidades — Plataforma TRACE V

---

## A. APLICACIÓN MÓVIL — Flutter (mobile-reponedor)

| ID | Módulo | Funcionalidad | Descripción | Estado |
|:--:|--------|--------------|-------------|:------:|
| **F-01** | Autenticación | Login con credenciales | Inicio de sesión con username/password contra Supabase `public.users` | ✅ |
| **F-02** | Autenticación | Modo demo offline | Fallback con usuario `cmendoza`/`demo1234` cuando Supabase no responde | ✅ |
| **F-03** | Autenticación | Persistencia de sesión | SharedPreferences mantiene sesión entre reinicios de app | ✅ |
| **F-04** | Autenticación | Cierre de sesión | Logout manual + listener global de expiración de auth | ✅ |
| **F-05** | Autenticación | Indicador de conexión | Indicador visual del estado de conectividad en pantalla de login | ✅ |
| **F-06** | Rutas | Carga de ruta diaria | Obtiene `daily_routes_plan` + `points_of_sale` desde Supabase | ✅ |
| **F-07** | Rutas | Fallback a datos mock | 8 PDVs mock cuando Supabase no está disponible | ✅ |
| **F-08** | Rutas | Secuencia optimizada de PDVs | Muestra PDVs en el orden de `optimized_pos_sequence` | ✅ |
| **F-09** | Rutas | Pull-to-refresh | Recarga de ruta deslizando hacia abajo | ✅ |
| **F-10** | Rutas | Actualización de estado de ruta | Cambio automático de `ASIGNADA` → `EN_PROCESO` → `COMPLETADA` | ✅ |
| **F-11** | Visitas | Geocerca (geofencing) | Detección automática de llegada al PDV (radio 50m, Haversine cada 10s) | ✅ |
| **F-12** | Visitas | Bloqueo/desbloqueo de checklist | Checklist bloqueado fuera del radio, desbloqueado al llegar | ✅ |
| **F-13** | Visitas | Checklist dinámico por tipo de cliente | Tareas diferentes para Pareto, Mayorista, Detallista | ✅ |
| **F-14** | Visitas | Cronómetro individual por tarea | Start → Pause → Finish con segundos acumulados por tarea | ✅ |
| **F-15** | Visitas | Cronómetro global de visita | Anillo circular con progreso, animación pulsante en sobretiempo | ✅ |
| **F-16** | Visitas | Barra de progreso de tareas | Indicador visual de completitud del checklist | ✅ |
| **F-17** | Visitas | Captura de evidencia fotográfica | Cámara integrada con selección de tipo (Antes/Después/General) | ✅ |
| **F-18** | Visitas | Compresión de imágenes | Redimensiona a 1080px máx, calidad 75%, ~95% reducción | ✅ |
| **F-19** | Visitas | Subida a Supabase Storage | Almacenamiento en bucket `task-evidences` | ✅ |
| **F-20** | Visitas | Almacenamiento local de fotos | Guarda en `documents/evidences/` para respaldo offline | ✅ |
| **F-21** | Visitas | Vista previa de foto | Diálogo de pantalla completa para revisar evidencia | ✅ |
| **F-22** | Visitas | Resumen post-visita | Desglose de tiempos, conteo de evidencias, estado de sincronización | ✅ |
| **F-23** | Visitas | Sugerencia de siguiente PDV | Botón para navegar al siguiente punto en ruta | ✅ |
| **F-24** | Navegación | Mapa interactivo | flutter_map con tiles Mapbox Streets v12 | ✅ |
| **F-25** | Navegación | Marcadores de PDV con estado | Colores según completado/activo/pendiente | ✅ |
| **F-26** | Navegación | Polilínea de ruta | Línea conectando PDVs en orden de visita | ✅ |
| **F-27** | Navegación | Lanzar navegación externa | Bottom sheet con opciones Google Maps / Waze | ✅ |
| **F-28** | Navegación | Mapa mock de respaldo | CustomPaint simulado cuando no hay coordenadas reales | ✅ |
| **F-29** | GPS | Tracking cada 30 segundos | Captura periódica de coordenadas GPS durante la jornada | ✅ |
| **F-30** | GPS | Servicio en primer plano | Notificación persistente "TRACE V — Jornada en curso" (Android) | ✅ |
| **F-31** | GPS | Inicio/parada automática | GPS comienza al login, se detiene al logout | ✅ |
| **F-32** | GPS | Actualización en Supabase | UPSERT a `reponedor_locations` en cada ciclo | ✅ |
| **F-33** | GPS | Manejo de permisos | Solicitud de permiso de ubicación, verificación de GPS activo | ✅ |
| **F-34** | GPS | Primera lectura inmediata | Sin esperar 30s para la primera coordenada | ✅ |
| **F-35** | Offline | Base de datos SQLite local | `reponedor_offline.db` con tablas `pending_tasks` y `pending_evidences` | ✅ |
| **F-36** | Offline | Cola de tareas pendientes | Tareas guardadas localmente con reintentos (máx 5) | ✅ |
| **F-37** | Offline | Cola de evidencias pendientes | Fotos pendientes de subir con referencia a tarea | ✅ |
| **F-38** | Offline | Sincronización en background | Workmanager ejecuta sincronización incluso con app cerrada | ✅ |
| **F-39** | Offline | Backoff exponencial | Reintentos: 30s → 60s → 120s... | ✅ |
| **F-40** | Offline | Banner de estado offline | Barra roja cuando offline, azul cuando sincronizando | ✅ |
| **F-41** | Offline | Botón manual de sincronización | Sync forzado desde barra de herramientas | ✅ |
| **F-42** | Offline | Validación de conectividad | Monitor de red WiFi/móvil con `connectivity_plus` | ✅ |
| **F-43** | UI/UX | Tema claro premium | TRACE V Light optimizado para visibilidad exterior | ✅ |
| **F-44** | UI/UX | Material 3 + Google Fonts Inter | Diseño moderno con tipografía corporativa | ✅ |
| **F-45** | UI/UX | Paleta corporativa | Rojo Venado (#AA001B), azul institucional, semánticos verde/naranja/rojo | ✅ |
| **F-46** | UI/UX | Micro-animaciones | Entrada escalonada, resumen elástico, cronómetro animado | ✅ |
| **F-47** | UI/UX | Badges de tipo de cliente | Pareto (rojo), Mayorista (azul), Detallista (gris) | ✅ |
| **F-48** | UI/UX | Badges de estado de visita | Pendiente, En Proceso, Completada | ✅ |
| **F-49** | UI/UX | Indicador de fuente de datos | Banner "Supabase" vs "Demo" según origen | ✅ |
| **F-50** | UI/UX | Tarjeta de estado de sincronización | Muestra estado actual de datos pendientes | ✅ |

---

## B. DASHBOARD WEB — Next.js (web-supervisor)

| ID | Módulo | Funcionalidad | Descripción | Estado |
|:--:|--------|--------------|-------------|:------:|
| **F-51** | Autenticación Web | Login de supervisor | Pantalla de inicio de sesión para supervisores | ✅ |
| **F-52** | Autenticación Web | Sesión persistente | Sesión guardada en localStorage | ✅ |
| **F-53** | Autenticación Web | Redirección por rol | ADMIN → `/admin`, SUPERVISOR → dashboard | ✅ |
| **F-54** | Dashboard | Resumen ejecutivo | KPIs globales de la operación del día | ✅ |
| **F-55** | Dashboard | Galería de evidencias | Fotos Antes/Después agrupadas por PDV+tarea | ✅ |
| **F-56** | Dashboard | Lista de reponedores en campo | Vista rápida con estado actual de cada uno | ✅ |
| **F-57** | Dashboard | Alertas críticas | Reponedores retrasados resaltados visualmente | ✅ |
| **F-58** | Mapa | Mapa en vivo con Mapbox | Ubicación GPS de reponedores en tiempo real (RF-03) | ✅ |
| **F-59** | Mapa | Marcadores de PDV | PDVs visitados vs pendientes en mapa | ✅ |
| **F-60** | Mapa | Selección de reponedor | Centrar mapa en un reponedor específico | ✅ |
| **F-61** | Mapa | Actualización en tiempo real | WebSockets vía Supabase Realtime para ubicaciones | ✅ |
| **F-62** | Mapa | Skeleton loader animado | Estado de carga mientras el mapa se inicializa | ✅ |
| **F-63** | Analytics | Tasa de cobertura | % de rutas completadas vs total (RF-05) | ✅ |
| **F-64** | Analytics | Desviación de tiempo | Minutos de desviación planificado vs real (RF-05) | ✅ |
| **F-65** | Analytics | Trabajadores activos | Conteo de reponedores en jornada activa | ✅ |
| **F-66** | Analytics | Alertas críticas | Número de reponedores con retraso significativo | ✅ |
| **F-67** | Analytics | Minutos efectivos por micro-tarea | Gráfico: Limpieza/Bandeo/POP por tipo de cliente | ✅ |
| **F-68** | Analytics | Cumplimiento de ruta por hora | Línea temporal onTime vs delayed durante el día | ✅ |
| **F-69** | Analytics | Filtro por rango de fechas | Hoy, Ayer, 7/30 días, Mayo 2026, Personalizado | ✅ |
| **F-70** | Analytics | Filtro por ciudad | Santa Cruz, La Paz, Cochabamba, Todas | ✅ |
| **F-71** | Analytics | Filtro por zona | Zona Norte, Central, Sur, El Alto, etc. | ✅ |
| **F-72** | Analytics | Filtro por supervisor | Selección de supervisor específico | ✅ |
| **F-73** | Analytics | Exportación a PDF | Descarga de reporte en formato PDF | ✅ |
| **F-74** | Analytics | Exportación a CSV/Excel | Descarga de base de datos para BI | ✅ |
| **F-75** | Analytics | Consulta a BD histórica | `fetchRealAnalytics()` con rango de fechas desde Supabase | ✅ |
| **F-76** | Rutas | Motor de optimización TSP | Nearest-Neighbor con doble criterio (distancia 40% + duración 60%) | ✅ |
| **F-77** | Rutas | Interleaving estratégico | 25% descuento a candidatos simples tras PDV complejo | ✅ |
| **F-78** | Rutas | K-Means clustering geográfico | Agrupación de PDVs por ciudad y asignación a reponedores | ✅ |
| **F-79** | Rutas | Reasignación dinámica de PDVs | Mover PDVs entre reponedores en caliente (RF-04) | ✅ |
| **F-80** | Rutas | Agregar PDV a ruta existente | Asignar PDV a reponedor en fecha específica | ✅ |
| **F-81** | Rutas | Remover PDV de ruta | Quitar PDV de la secuencia de un reponedor | ✅ |
| **F-82** | Rutas | Feedback Loop de ajustes | Sugerencia de `base_duration_minutes` basada en tiempos reales | ✅ |
| **F-83** | Rutas | Aprobación de ajustes logísticos | Botón para actualizar duración base sugerida | ✅ |
| **F-84** | Rutas | Planificación para mañana | Generar y publicar rutas del día siguiente | ✅ |
| **F-85** | Rutas | Publicación de plan de rutas | Guardar rutas generadas en Supabase | ✅ |
| **F-86** | Rutas | Historial de rutas | Seguimiento de rutas completadas por fecha | ✅ |
| **F-87** | Admin PDV | CRUD de Puntos de Venta | Crear, editar, eliminar PDVs (RF-01) | ✅ |
| **F-88** | Admin PDV | Tabla maestra de PDVs | Listado completo con búsqueda y filtros | ✅ |
| **F-89** | Admin PDV | Carga masiva de PDVs | Subir múltiples PDVs desde array/interfaz | ✅ |
| **F-90** | Admin PDV | Visualización en mapa | Ubicación de PDVs en mapa interactivo | ✅ |
| **F-91** | Admin Reponedores | CRUD de trabajadores | Crear, editar, desactivar reponedores | ✅ |
| **F-92** | Admin Reponedores | Lista de trabajadores | Nómina con estado, ruta asignada, ciudad | ✅ |
| **F-93** | Admin Reponedores | Gestión de roles | Asignación de rol (SUPERVISOR, REPONEDOR, ADMIN) | ✅ |
| **F-94** | Admin | Seeder de base de datos | Poblado inicial de Supabase con datos de ejemplo | ✅ |
| **F-95** | Admin | Verificación de BD vacía | `checkDatabaseEmpty()` al cargar dashboard | ✅ |
| **F-96** | Admin | Panel de administración | Vista separada para administradores (`/admin`) | ✅ |
| **F-97** | Tiempo Real | Suscripción a task_logs | Refresco automático al recibir nuevos registros | ✅ |
| **F-98** | Tiempo Real | Suscripción a daily_routes_plan | Refresco al cambiar planes de ruta | ✅ |
| **F-99** | Tiempo Real | Suscripción a reponedor_locations | Actualización de ubicación en vivo en mapa | ✅ |
| **F-100** | Infra | Fallback a datos mock | Datos locales cuando Supabase no responde | ✅ |
| **F-101** | Infra | Notificaciones toast | Sistema de notificaciones con `use-toast` | ✅ |
| **F-102** | Infra | Tema oscuro/claro | Theme provider con shadcn/ui | ✅ |
| **F-103** | Infra | Responsive design | Sidebar colapsable, layout adaptativo | ✅ |
| **F-104** | Infra | DatePicker | Selector de fechas para filtros personalizados | ✅ |

---

## C. INFRAESTRUCTURA COMPARTIDA

| ID | Componente | Funcionalidad | Descripción | Estado |
|:--:|------------|--------------|-------------|:------:|
| **F-105** | Supabase DB | Tabla `users` | Cuentas con rol (SUPERVISOR, REPONEDOR, ADMIN) y estado activo | ✅ |
| **F-106** | Supabase DB | Tabla `points_of_sale` | Catálogo de PDVs con coordenadas, clasificación, duración base | ✅ |
| **F-107** | Supabase DB | Tabla `daily_routes_plan` | Rutas diarias con secuencia optimizada y estado | ✅ |
| **F-108** | Supabase DB | Tabla `micro_tasks` | Definiciones de tareas por tipo de cliente | ✅ |
| **F-109** | Supabase DB | Tabla `task_logs` | Registro de ejecución granular de micro-tareas | ✅ |
| **F-110** | Supabase DB | Tabla `reponedor_locations` | Ubicación GPS en vivo (1 fila por reponedor) | ✅ |
| **F-111** | Supabase DB | Tabla `reponedor_routes_history` | Historial de rutas con tiempo/distancia | ✅ |
| **F-112** | Supabase Storage | Bucket `task-evidences` | Almacenamiento de fotos de evidencia | ✅ |
| **F-113** | Supabase Realtime | WebSockets | Suscripciones a cambios en tablas clave | ✅ |
| **F-114** | SQLite Local | Tabla `pending_tasks` | Cola offline de tareas pendientes | ✅ |
| **F-115** | SQLite Local | Tabla `pending_evidences` | Cola offline de fotos pendientes | ✅ |
| **F-116** | Mapbox | Tiles de mapa | Mapbox Streets v12 para mapas web y móvil | ✅ |

# Funcionalidades del Sistema: Ecosistema FieldOps (Grupo Venado)

Este documento detalla exhaustivamente las características, herramientas y reglas de negocio del software de gestión de campo, dividido en sus dos pilares fundamentales: La **Torre de Control Web** (para oficina) y la **Aplicación Móvil** (para trabajadores en campo).

---

## 1. 🌐 Torre de Control Web (Panel de Administración y Supervisión)

Aplicación web desarrollada en **Next.js** y **React**, diseñada para ofrecer control total, visibilidad en tiempo real y optimización matemática de las operaciones logísticas. Está conectada directamente a la base de datos PostgreSQL de **Supabase**.

### 1.1. Seguridad y Control de Accesos Jerárquicos
- **Autenticación JWT:** Sistema de login ultra seguro respaldado por Supabase Auth.
- **Roles Estrictos:** Separación absoluta entre `ADMIN` (acceso a auditorías de seguridad, métricas globales y bases de datos maestras) y `SUPERVISOR` (acceso únicamente a control operativo, mapas y aprobación de calidad).
- **Protección de Rutas:** El panel detecta automáticamente el rol del usuario y lo redirige, bloqueando accesos no autorizados a páginas sensibles.

### 1.2. Inteligencia Artificial y Algoritmo de Ruteo
- **Integración con Mapbox Matrix:** Calcula tiempos reales de viaje (tráfico y distancia vial) entre cientos de supermercados de forma simultánea.
- **Optimización Matemática (TSP / Nearest Neighbor):** Genera la secuencia exacta y óptima en la que un reponedor debe visitar sus tiendas para ahorrar tiempo y combustible.
- **Reasignación Dinámica "En Caliente":** Si un reponedor se retrasa, el sistema sugiere reasignar Puntos de Venta (PDVs) prioritarios al trabajador más cercano.
- **Detección de "Riesgo de Visita":** Identifica proactivamente qué supermercados corren el riesgo de no ser visitados antes del cierre de jornada.

### 1.3. Live Tracking (Mapa en Vivo)
- **Monitoreo Satelital:** Mapa interactivo a pantalla completa que renderiza las posiciones GPS de todos los trabajadores en campo en tiempo real.
- **Trazado de Rutas Completadas vs Pendientes:** Visualización gráfica de los caminos recorridos y las tiendas que faltan por visitar.
- **WebSockets (Realtime):** Los marcadores del mapa y las barras de progreso se mueven y actualizan automáticamente sin necesidad de recargar la página.

### 1.4. Centro de Calidad (Media QA)
- **Bandeja de Entrada de Evidencias:** Pantalla exclusiva para el Supervisor donde aterrizan todas las fotografías tomadas por los reponedores en los supermercados.
- **Flujo de Aprobación:** Interfaz para marcar fotos como "Aprobado" o "Rechazado", con actualizaciones optimistas para una experiencia hiper-rápida.
- **Conexión a Base de Datos:** Los cambios impactan directamente la tabla de registros operativos (`task_logs`).

### 1.5. Bitácora de Auditoría y Seguridad Inmutable
- **Trazabilidad 100% (PostgreSQL Triggers):** Cualquier modificación a rutas o asignaciones queda registrada para siempre en la base de datos.
- **Monitoreo de Sesiones:** El administrador puede ver cuántas personas de su equipo están conectadas al sistema en las últimas 12 horas.
- **Panel de Prevención de Fraude:** Métricas automáticas de intentos de login fallidos y alteraciones manuales del sistema.

---

## 2. 📱 Aplicación Móvil de Campo (App de Reponedores)

Aplicación construida (o por construirse) en **Flutter**, diseñada para ser una herramienta robusta, recolectora de datos implacable y resistente a las condiciones adversas de la calle (sin internet, batería baja, etc.).

### 2.1. Modo Offline-First (Resiliencia Extrema)
- **Base de Datos Local (SQLite):** El trabajador puede usar la aplicación aunque esté dentro del sótano de un supermercado sin señal 4G.
- **Sincronización Inteligente:** La app guarda temporalmente el progreso de tareas, tiempos y fotografías en la memoria del celular. Apenas detecta conexión a internet, dispara automáticamente un proceso en segundo plano que sube todo a la nube.
- **Flag de Auditoría:** Toda data recolectada sin internet se marca con una etiqueta (`is_offline = true`) para que el Supervisor web sepa bajo qué condiciones se ejecutó la tarea.

### 2.2. Tracking GPS en Segundo Plano Constante
- **Servicio Aislado (Isolate):** A diferencia del GPS común que se apaga al minimizar la app, este sistema utiliza `flutter_background_service`.
- **Telemetría Autónoma:** Despierta el sensor GPS cada 30 segundos y envía latitud y longitud a Supabase, incluso si el celular está bloqueado en el bolsillo del reponedor o si la app se deslizó y se cerró de la lista de recientes.
- **Prevención de Abandono:** Si el trabajador desactiva intencionalmente el GPS de su teléfono, el sistema bloquea sus tareas y alerta al supervisor.

### 2.3. Cámara Sellada y Anti-Fraude de Fotografía
- **Bloqueo de Galería:** Es imposible que el reponedor suba una foto "vieja" o descargada de internet. La app obliga a abrir la cámara en vivo desde la aplicación.
- **Marcas de Agua (Watermarking):** Antes de enviar la foto, la aplicación "quema" directamente sobre los píxeles de la imagen un texto incrustado e inmodificable con la Fecha, Hora exacta y Coordenadas GPS actuales.

### 2.4. Geocercas y "Hard Check-In"
- **Validación Matemática de Proximidad:** Cuando el reponedor presiona "Empezar Visita" en un PDV, el teléfono calcula la distancia lineal entre su posición actual y las coordenadas teóricas del supermercado.
- **Bloqueo Estricto:** Si la distancia es mayor a 50 metros (configurable), el botón se bloquea por completo y no le permite hacer el check-in, enviando una alerta de intento fallido a la base de datos de auditoría.

### 2.5. Ejecución de Tareas Dinámicas y Control de Tiempo
- **Cronómetro Interno:** Mide los segundos exactos que el trabajador demora en realizar micro-tareas (Ej: "Limpieza de Góndolas", "Bandeo de Productos", "Instalación de Publicidad POP").
- **Cierre de Ciclo:** Cada Punto de Venta exige una "Foto de Antes" y una "Foto de Después" para ser marcado como completado y permitirle al trabajador viajar a su siguiente destino en la ruta óptima descargada al iniciar su jornada.

---
*Este documento consolida la arquitectura operativa completa, desde la planificación en las oficinas centrales mediante inteligencia artificial, hasta la ejecución y auditoría a prueba de fraudes en el campo de batalla.*

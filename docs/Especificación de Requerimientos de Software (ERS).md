# Especificación de Requerimientos de Software (ERS)

**Plataforma TRACE V — Venado OptiRoute**
*Sistema de Optimización Inteligente de Rutas y Cobertura de Reponedores*

---

| Campo | Detalle |
|:------|:--------|
| **Documento** | ERS-TRACEV-2026-001 |
| **Versión** | 1.0 |
| **Fecha de Emisión** | 8 de junio de 2026 |
| **Estándar de Referencia** | IEEE 830-1998 / ISO/IEC/IEEE 29148:2018 |
| **Clasificación** | Confidencial — Uso exclusivo del cliente |
| **Elaborado por** | Luis Alejandro Sandoval Rodriguez |
| **Cliente** | Industrias Venado S.A. |

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Descripción General del Sistema](#2-descripción-general-del-sistema)
3. [Requerimientos Funcionales](#3-requerimientos-funcionales)
4. [Requerimientos No Funcionales](#4-requerimientos-no-funcionales)
5. [Restricciones de Diseño y Tecnología](#5-restricciones-de-diseño-y-tecnología)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Glosario de Términos](#7-glosario-de-términos)
8. [Historial de Revisiones](#8-historial-de-revisiones)

---

## 1. Introducción

### 1.1. Propósito

El presente documento constituye la Especificación de Requerimientos de Software (ERS) de la plataforma **TRACE V — Venado OptiRoute**, un ecosistema de software compuesto por un Dashboard Web de supervisión operativa y una Aplicación Móvil de campo. Su propósito es definir de manera formal, completa y verificable los requerimientos funcionales y no funcionales que rigen el comportamiento, la arquitectura y las restricciones técnicas del sistema.

Este documento está dirigido al equipo de desarrollo de ingeniería, al área de operaciones logísticas de Industrias Venado S.A. y a cualquier parte interesada que requiera comprender el alcance técnico completo de la solución.

### 1.2. Alcance del Producto

**TRACE V** es una plataforma de optimización de operaciones de campo en tiempo real, diseñada para resolver los siguientes problemas operativos críticos de Industrias Venado S.A.:

| Problema Identificado | Solución Propuesta por TRACE V |
|:-----------------------|:-------------------------------|
| Planificación de rutas basada en intuición y "tiempos promedio" teóricos. | Motor de ruteo inteligente con algoritmo TSP/Nearest Neighbor que cruza tiempos reales históricos con distancias geográficas vía Mapbox Matrix API. |
| Nula visibilidad de la ubicación y progreso de los reponedores en campo. | Mapa interactivo con Live Tracking GPS cada 30 segundos y WebSockets de Supabase Realtime. |
| Imposibilidad de reaccionar ante contingencias operativas durante la jornada. | Reasignación dinámica de Puntos de Venta (PDVs) entre reponedores "en caliente", con actualización instantánea en la app móvil. |
| Falta de trazabilidad y evidencia de la ejecución de micro-tareas en el punto de venta. | Cronómetros individuales por tarea, captura fotográfica obligatoria con metadatos GPS y marcas de agua inviolables, y sincronización offline-first. |
| Ausencia de datos estructurados para Business Intelligence. | Dashboard analítico con KPIs en tiempo real, exportación a PDF/CSV y Feedback Loop que retroalimenta automáticamente la planificación de rutas futuras. |

El ecosistema se compone de dos módulos principales:

1. **Torre de Control Web (web-supervisor):** Panel administrativo y de supervisión desarrollado en Next.js, React y Tailwind CSS.
2. **Aplicación Móvil de Campo (mobile-reponedor):** Aplicación nativa desarrollada en Flutter para dispositivos Android.

### 1.3. Definiciones y Acrónimos

| Acrónimo / Término | Definición |
|:--------------------|:-----------|
| **PDV** | Punto de Venta — comercio del Canal Tradicional visitado por el reponedor. |
| **TSP** | Travelling Salesman Problem — problema del vendedor viajero. |
| **RLS** | Row Level Security — seguridad a nivel de fila en PostgreSQL. |
| **JWT** | JSON Web Token — estándar de autenticación segura. |
| **Geofence** | Perímetro virtual geográfico delimitado por coordenadas GPS. |
| **Check-in** | Registro validado de llegada del reponedor a un PDV dentro del radio de geocerca. |
| **Micro-tarea** | Actividad individual ejecutada dentro de un PDV (limpieza de góndolas, bandeo de productos, instalación de material POP). |
| **Feedback Loop** | Ciclo de retroalimentación continua que utiliza datos históricos para optimizar decisiones futuras. |
| **Pareto** | Clasificación de cliente de alta prioridad según análisis ABC de Industrias Venado. |

### 1.4. Referencias

- IEEE 830-1998: *Recommended Practice for Software Requirements Specifications*.
- ISO/IEC/IEEE 29148:2018: *Systems and software engineering — Life cycle processes — Requirements engineering*.
- Documento de Especificación Operativa y Técnica: "The Control Tower" (Venado OptiRoute).
- Ficha Técnica — Industrias Venado S.A.
- Archivo maestro de datos: "INFORMACION DE DATOS TRADICIONAL LA PAZ rev..xlsx".

### 1.5. Visión General del Documento

La Sección 2 describe la perspectiva general del sistema, los usuarios y las dependencias externas. La Sección 3 presenta la tabla exhaustiva de requerimientos funcionales con códigos de rastreo (RF-XX). La Sección 4 detalla los requerimientos no funcionales categorizados por seguridad, rendimiento y usabilidad. Las Secciones 5, 6 y 7 cubren las restricciones tecnológicas, el modelo de datos y el glosario, respectivamente.

---

## 2. Descripción General del Sistema

### 2.1. Perspectiva del Producto

TRACE V opera como una plataforma cliente-servidor híbrida con capacidades offline-first. La arquitectura se estructura en tres capas:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                            │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐   │
│  │  Torre de Control Web   │   │   App Móvil Flutter          │   │
│  │  Next.js + React        │   │   Android (Offline-First)    │   │
│  │  Tailwind CSS + shadcn  │   │   SQLite + Background GPS    │   │
│  │  Mapbox GL JS           │   │   flutter_map + Mapbox       │   │
│  └────────────┬────────────┘   └──────────────┬───────────────┘   │
│               │                                │                   │
├───────────────┼────────────────────────────────┼───────────────────┤
│               │    CAPA DE SERVICIOS           │                   │
│               └────────────┬───────────────────┘                   │
│                            ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Supabase (BaaS)                                │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Auth JWT │ │ Realtime  │ │ Storage  │ │ Edge Funcs   │  │   │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         ▼                                          │
├─────────────────────────────────────────────────────────────────────┤
│                    CAPA DE DATOS                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         PostgreSQL + PostGIS                                │   │
│  │  users · points_of_sale · daily_routes_plan · task_logs     │   │
│  │  micro_tasks · reponedor_locations · audit_logs             │   │
│  │  reponedor_routes_history · route_execution_proofs          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ Mapbox Matrix API      │  │ Mapbox Tiles (Streets v12)     │   │
│  │ Tiempos reales/tráfico │  │ Renderizado cartográfico       │   │
│  └────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Usuarios del Sistema

| Rol | Descripción | Módulo de Acceso |
|:----|:------------|:-----------------|
| **ADMIN** | Administrador general con acceso completo a auditorías de seguridad, métricas globales, gestión de usuarios, configuración de base de datos maestra y panel de prevención de fraude. | Torre de Control Web (`/admin`) |
| **SUPERVISOR** | Coordinador de operaciones con acceso a planificación de rutas, mapa en vivo, centro de calidad fotográfica, reasignación dinámica de PDVs y analytics operativos. | Torre de Control Web (Dashboard) |
| **REPONEDOR** | Trabajador de campo que ejecuta la ruta diaria asignada, registra micro-tareas con cronómetros, captura evidencia fotográfica y transmite GPS en segundo plano. | Aplicación Móvil Flutter |

### 2.3. Dependencias y Servicios Externos

| Servicio | Propósito | Criticidad |
|:---------|:----------|:-----------|
| **Supabase** | BaaS: Autenticación JWT, base de datos PostgreSQL, Realtime WebSockets, Storage de evidencias. | Alta — componente central. |
| **Mapbox Matrix API** | Cálculo de tiempos de viaje reales entre PDVs considerando tráfico y distancia vial. | Alta — motor de ruteo. |
| **Mapbox Tiles v12** | Renderizado cartográfico para mapas web y móvil. | Media — degradación graceful disponible. |
| **Google Maps / Waze** | Navegación turn-by-turn externa lanzada desde la app móvil. | Baja — funcionalidad auxiliar. |

### 2.4. Restricciones Operativas

- La aplicación móvil debe operar en regiones con conectividad intermitente (sótanos de supermercados, zonas periféricas de Santa Cruz y La Paz).
- El sistema debe soportar operaciones concurrentes de un mínimo de 50 reponedores activos simultáneos sin degradación perceptible.
- Las evidencias fotográficas deben almacenarse de forma comprimida (máximo 300 KB por imagen tras compresión al 75% de calidad, redimensionada a 1080 px de ancho máximo).

---

## 3. Requerimientos Funcionales

### 3.1. Módulo Web — Autenticación y Control de Acceso

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-01** | Autenticación JWT de supervisores | El sistema debe autenticar a los usuarios web mediante Supabase Auth con tokens JWT, validando credenciales contra la tabla `public.users`. | El token se genera en ≤ 2 segundos; se almacena en sesión persistente del navegador. | Alta |
| **RF-02** | Segregación de acceso por rol | El sistema debe redirigir automáticamente al usuario según su rol: ADMIN → `/admin`, SUPERVISOR → dashboard operativo. Las rutas restringidas deben bloquear el acceso y redirigir a la página de login. | Intentos de acceso no autorizado registran un evento en `audit_logs` con severidad `high`. | Alta |
| **RF-03** | Persistencia de sesión web | El sistema debe mantener la sesión del usuario activa entre recargas del navegador mediante almacenamiento en `localStorage`. | La sesión persiste hasta cierre explícito o expiración del token JWT. | Media |

### 3.2. Módulo Web — Motor de Ruteo Inteligente

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-04** | Ingesta de catálogo maestro de PDVs | El sistema debe permitir la carga, creación, edición y eliminación de Puntos de Venta, incluyendo nombre, mercado, clasificación (Pareto/Mayorista/Detallista), coordenadas geográficas y duración base estimada en minutos. | CRUD completo operativo; carga masiva de múltiples PDVs soportada. | Alta |
| **RF-05** | Cálculo de rutas con algoritmo TSP | El sistema debe generar la secuencia óptima de visita para cada reponedor utilizando el algoritmo Nearest Neighbor con doble criterio ponderado: distancia geográfica (40%) y duración estimada en PDV (60%). | La ruta generada minimiza el tiempo total de jornada respecto a una asignación secuencial no optimizada en ≥ 15%. | Alta |
| **RF-06** | Interleaving estratégico de carga | El sistema debe aplicar un descuento del 25% al peso de candidatos de ejecución simple (Detallistas) cuando el PDV anterior es de alta complejidad (Pareto), distribuyendo equilibradamente la carga operativa a lo largo de la jornada. | No se asignan más de 2 clientes Pareto consecutivos en una misma ruta. | Alta |
| **RF-07** | Clustering geográfico K-Means | El sistema debe agrupar los PDVs geográficamente por ciudad mediante el algoritmo K-Means, asignando clusters a reponedores disponibles para minimizar desplazamientos inter-zona. | Cada cluster resultante mantiene una dispersión geográfica ≤ 15 km de radio. | Alta |
| **RF-08** | Integración con Mapbox Matrix API | El sistema debe consultar la API de Mapbox Matrix para obtener tiempos de viaje reales (considerando tráfico y distancia vial) entre todos los pares de PDVs asignados a un reponedor. | Las respuestas de la API se procesan en ≤ 5 segundos para matrices de hasta 25 PDVs. | Alta |
| **RF-09** | Planificación de rutas para el día siguiente | El sistema debe permitir al supervisor generar, revisar y publicar las hojas de ruta del día siguiente, almacenándolas en la tabla `daily_routes_plan` con estado `ASIGNADA`. | Las rutas publicadas son descargadas automáticamente por la app móvil al inicio de la jornada del reponedor. | Alta |
| **RF-10** | Historial de rutas completadas | El sistema debe mantener un registro histórico de todas las rutas ejecutadas, incluyendo tiempo total de viaje, distancia recorrida y polígono de cobertura. | Datos accesibles por rango de fechas y filtros de ciudad/supervisor. | Media |

### 3.3. Módulo Web — Reasignación Dinámica "En Caliente"

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-11** | Detección de riesgo de visita | El sistema debe identificar proactivamente qué PDVs corren el riesgo de no ser visitados antes del cierre de jornada, basándose en el progreso actual del reponedor y los tiempos estimados restantes. | Alerta visual generada cuando la probabilidad de incumplimiento supera el 70%. | Alta |
| **RF-12** | Reasignación de PDVs entre reponedores | El sistema debe permitir al supervisor remover PDVs pendientes de un reponedor retrasado y asignarlos a otro reponedor cercano con capacidad disponible, actualizando ambas hojas de ruta en tiempo real. | La reasignación se refleja en la app móvil del reponedor receptor en ≤ 3 segundos vía WebSocket. | Alta |
| **RF-13** | Agregar PDV a ruta existente | El sistema debe permitir la adición de un PDV no planificado a la ruta activa de un reponedor en una fecha específica. | El PDV agregado se inserta en la posición óptima de la secuencia existente. | Media |
| **RF-14** | Remover PDV de ruta activa | El sistema debe permitir la eliminación de un PDV de la secuencia de visita de un reponedor, recalculando la ruta restante. | La secuencia se actualiza sin interrumpir la navegación del reponedor en campo. | Media |

### 3.4. Módulo Web — Live Tracking (Mapa en Vivo)

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-15** | Monitoreo GPS en tiempo real | El sistema debe renderizar un mapa interactivo a pantalla completa que muestre la posición GPS de todos los reponedores activos en campo, actualizada cada 30 segundos. | Los marcadores se actualizan en el mapa sin necesidad de recargar la página. | Alta |
| **RF-16** | Trazado de rutas completadas vs. pendientes | El sistema debe visualizar gráficamente los caminos recorridos (polilíneas) y los PDVs que faltan por visitar, con diferenciación cromática por estado (completado/activo/pendiente). | Colores consistentes: verde = completado, azul = activo, gris = pendiente. | Alta |
| **RF-17** | Actualización vía WebSockets | El sistema debe suscribirse a los canales de Supabase Realtime para las tablas `reponedor_locations`, `task_logs` y `daily_routes_plan`, reflejando cambios instantáneamente. | Latencia de actualización ≤ 2 segundos desde la emisión del evento. | Alta |
| **RF-18** | Selección y seguimiento de reponedor | El sistema debe permitir seleccionar un reponedor específico para centrar el mapa en su posición y visualizar exclusivamente su ruta y progreso. | Transición animada al centrar el mapa en ≤ 500 ms. | Media |

### 3.5. Módulo Web — Centro de Calidad (Media QA)

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-19** | Bandeja de evidencias fotográficas | El sistema debe presentar al supervisor una vista exclusiva donde aterricen todas las fotografías capturadas por los reponedores, agrupadas por PDV y tipo de tarea (Antes/Después/General). | Las fotos se cargan con paginación y lazy loading; miniatura visible sin descarga completa. | Alta |
| **RF-20** | Flujo de aprobación/rechazo | El sistema debe proporcionar una interfaz para que el supervisor marque cada evidencia como "Aprobado" o "Rechazado", con actualización optimista de la UI y persistencia en la tabla `task_logs`. | El cambio de estado se refleja en la interfaz en ≤ 300 ms (actualización optimista). | Alta |

### 3.6. Módulo Web — Analytics y Business Intelligence

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-21** | Dashboard de KPIs ejecutivos | El sistema debe presentar un panel con indicadores clave: tasa de cobertura (% rutas completadas vs. total), desviación de tiempo (planificado vs. real en minutos), trabajadores activos y alertas críticas. | Los KPIs se calculan y renderizan en ≤ 3 segundos desde la carga de la página. | Alta |
| **RF-22** | Gráfico de minutos efectivos por micro-tarea | El sistema debe generar visualizaciones gráficas del tiempo invertido en cada tipo de micro-tarea (Limpieza, Bandeo, POP), segmentado por clasificación de cliente. | Datos derivados de `task_logs` con agrupación por `micro_tasks.task_name` y `points_of_sale.category`. | Alta |
| **RF-23** | Cumplimiento de ruta por hora | El sistema debe presentar una línea temporal que compare el avance planificado contra el avance real durante la jornada, identificando tramos de retraso (`delayed`) y tramos en tiempo (`onTime`). | Granularidad horaria; actualización en tiempo real durante la jornada activa. | Media |
| **RF-24** | Filtros multidimensionales | El sistema debe permitir filtrar los analytics por: rango de fechas (Hoy, Ayer, 7 días, 30 días, mes específico, personalizado), ciudad (Santa Cruz, La Paz, Cochabamba), zona (Norte, Central, Sur, El Alto) y supervisor asignado. | Los filtros se aplican sin recarga de página; resultado renderizado en ≤ 2 segundos. | Alta |
| **RF-25** | Exportación a PDF | El sistema debe generar un reporte en formato PDF descargable que consolide los KPIs, gráficos y tablas del período seleccionado. | El PDF se genera en ≤ 10 segundos y mantiene fidelidad visual respecto al dashboard. | Media |
| **RF-26** | Exportación a CSV/Excel | El sistema debe permitir la descarga de la base de datos analítica en formato CSV, lista para importación directa en herramientas de Business Intelligence. | El archivo incluye todas las columnas del dataset filtrado con codificación UTF-8. | Media |
| **RF-27** | Feedback Loop de ajuste logístico | El sistema debe calcular automáticamente la sugerencia de `base_duration_minutes` para cada PDV basándose en el promedio ponderado de los tiempos reales históricos registrados, y presentar un botón de aprobación al supervisor para actualizar el valor. | La sugerencia se recalcula tras cada jornada completada; el supervisor debe aprobar explícitamente. | Alta |

### 3.7. Módulo Web — Auditoría y Seguridad

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-28** | Bitácora de auditoría inmutable | El sistema debe registrar automáticamente toda modificación a rutas, asignaciones, estados de tareas y gestión de usuarios mediante triggers de PostgreSQL en la tabla `audit_logs`, la cual no admite operaciones `UPDATE` ni `DELETE`. | Políticas RLS activas; ningún usuario puede alterar ni eliminar registros de auditoría. | Alta |
| **RF-29** | Monitoreo de sesiones activas | El sistema debe permitir al administrador visualizar el número de usuarios conectados al sistema en las últimas 12 horas. | Dato actualizado cada 60 segundos. | Media |
| **RF-30** | Panel de prevención de fraude | El sistema debe presentar métricas automáticas de intentos de login fallidos, detecciones de GPS Spoofing (`is_mocked = true`), desfases de reloj de hardware (diferencia > 5 minutos entre `device_timestamp` y `created_at`) y tareas completadas en tiempo irreal (< 120 segundos). | Cada anomalía genera un registro en `audit_logs` con severidad `medium` o `high`. | Alta |

### 3.8. Módulo Web — Administración de Entidades

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-31** | CRUD de Puntos de Venta | El sistema debe permitir crear, leer, actualizar y eliminar registros de la tabla `points_of_sale`, con validación de coordenadas geográficas y clasificación obligatoria. | Tabla maestra con búsqueda, filtros y visualización en mapa interactivo. | Alta |
| **RF-32** | CRUD de Reponedores | El sistema debe permitir crear, editar y desactivar trabajadores en la tabla `users`, incluyendo asignación de rol (`SUPERVISOR`, `REPONEDOR`, `ADMIN`), departamento y estado activo. | Listado con estado actual, ruta asignada y ciudad. | Alta |
| **RF-33** | Carga masiva de PDVs | El sistema debe soportar la carga simultánea de múltiples PDVs desde una interfaz de ingesta, validando la integridad de los datos antes de la inserción. | Validación de coordenadas, nombre no vacío y categoría válida. | Media |
| **RF-34** | Seeder de base de datos | El sistema debe proporcionar una funcionalidad de poblado inicial de la base de datos con datos de ejemplo para entornos de desarrollo y demostración. | Detección automática de BD vacía mediante `checkDatabaseEmpty()`. | Baja |

### 3.9. Módulo Móvil — Autenticación y Sesión

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-35** | Login con credenciales | El sistema debe autenticar al reponedor con username/password contra la tabla `public.users` de Supabase. | Autenticación exitosa en ≤ 3 segundos con conexión estable. | Alta |
| **RF-36** | Modo demo offline | El sistema debe proporcionar un fallback con credenciales locales (`cmendoza`/`demo1234`) cuando Supabase no responde, permitiendo demostración y pruebas sin conectividad. | Indicador visual "Demo" visible en la interfaz. | Media |
| **RF-37** | Persistencia de sesión | El sistema debe mantener la sesión del reponedor activa entre reinicios de la aplicación mediante `SharedPreferences`. | La sesión persiste hasta cierre explícito (logout). | Alta |
| **RF-38** | Indicador de conectividad | El sistema debe mostrar un indicador visual del estado de conexión a internet en la pantalla de login y durante toda la jornada. | Colores: verde = conectado, rojo = sin conexión, azul = sincronizando. | Media |

### 3.10. Módulo Móvil — Gestión de Rutas

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-39** | Descarga de ruta diaria | El sistema debe obtener la ruta asignada al reponedor desde `daily_routes_plan` junto con los datos de los `points_of_sale` correspondientes al iniciar la jornada. | Ruta cargada con todos los PDVs y sus coordenadas en ≤ 5 segundos. | Alta |
| **RF-40** | Secuencia optimizada de visita | El sistema debe presentar los PDVs en el orden exacto de la secuencia `optimized_pos_sequence` generada por el motor de ruteo. | La secuencia no puede ser alterada manualmente por el reponedor. | Alta |
| **RF-41** | Actualización automática de estado de ruta | El sistema debe cambiar automáticamente el estado de la ruta: `ASIGNADA` → `EN_PROCESO` (al iniciar primera visita) → `COMPLETADA` (al finalizar último PDV). | Cambios de estado persistidos en Supabase con timestamp exacto. | Alta |
| **RF-42** | Pull-to-refresh | El sistema debe permitir al reponedor recargar los datos de su ruta mediante gesto de deslizamiento vertical descendente. | Actualización completa en ≤ 3 segundos. | Baja |
| **RF-43** | Datos mock de respaldo | El sistema debe cargar 8 PDVs de ejemplo cuando Supabase no está disponible, permitiendo funcionamiento de demostración. | Los datos mock son claramente identificados con banner "Demo". | Baja |

### 3.11. Módulo Móvil — Visitas y Ejecución de Tareas

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-44** | Geocerca (Geofencing) con Haversine | El sistema debe validar la proximidad del reponedor al PDV calculando la distancia lineal mediante la fórmula de Haversine cada 10 segundos. Si la distancia es ≤ 50 metros (configurable), se habilita el check-in. | Si la distancia > 50 metros, el botón de check-in se bloquea completamente y se registra un intento fallido en la base de datos de auditoría. | Alta |
| **RF-45** | Checklist dinámico por tipo de cliente | El sistema debe cargar automáticamente las micro-tareas correspondientes al perfil del comercio: Pareto (checklist completo), Mayorista (checklist intermedio), Detallista (checklist reducido). | Tareas cargadas desde `micro_tasks` filtradas por `client_category`. | Alta |
| **RF-46** | Cronómetro individual por micro-tarea | El sistema debe proporcionar un cronómetro preciso (Start → Pause → Finish) para cada micro-tarea, acumulando los segundos invertidos. | Precisión de ±1 segundo; datos persistidos en `task_logs.duration_seconds`. | Alta |
| **RF-47** | Cronómetro global de visita | El sistema debe mostrar un anillo circular con progreso de la visita completa al PDV, con animación pulsante al exceder el `base_duration_minutes` estimado. | Animación de sobretiempo activada automáticamente. | Media |
| **RF-48** | Captura fotográfica obligatoria | El sistema debe obligar la captura de evidencia fotográfica desde la cámara en vivo del dispositivo (sin acceso a galería), con selección de tipo: Antes, Después o General. | Bloqueo total de acceso a la galería del dispositivo. | Alta |
| **RF-49** | Compresión de imágenes | El sistema debe comprimir cada fotografía a un máximo de 1080 px de ancho, calidad del 75%, logrando una reducción de tamaño de aproximadamente 95% respecto al original. | Tamaño resultante ≤ 300 KB por imagen. | Alta |
| **RF-50** | Almacenamiento dual de evidencias | El sistema debe almacenar las fotografías en el bucket `task-evidences` de Supabase Storage y simultáneamente en el directorio local `documents/evidences/` como respaldo offline. | Ambas copias deben existir tras la captura exitosa. | Alta |
| **RF-51** | Vista previa de evidencia | El sistema debe proporcionar un diálogo de pantalla completa para que el reponedor revise la fotografía capturada antes de confirmar su envío. | Opción de recaptura disponible desde la vista previa. | Media |
| **RF-52** | Resumen post-visita | Al completar todas las micro-tareas de un PDV, el sistema debe mostrar un resumen detallado: desglose de tiempos por tarea, conteo de evidencias capturadas y estado de sincronización. | El resumen incluye sugerencia de siguiente PDV con botón de navegación. | Media |

### 3.12. Módulo Móvil — Navegación y Mapa

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-53** | Mapa interactivo con tiles Mapbox | El sistema debe renderizar un mapa interactivo con tiles Mapbox Streets v12 mediante `flutter_map`, mostrando la posición del reponedor y los PDVs asignados. | Carga del mapa en ≤ 3 segundos con conexión estable. | Alta |
| **RF-54** | Marcadores de PDV con estado cromático | El sistema debe representar cada PDV con un marcador cuyo color indica su estado: verde = completado, azul = activo, gris = pendiente. | Colores actualizados en tiempo real al cambiar el estado de la visita. | Alta |
| **RF-55** | Polilínea de ruta | El sistema debe trazar una polilínea que conecte los PDVs en el orden de visita optimizado. | Polilínea renderizada sobre los tiles del mapa con grosor visible. | Media |
| **RF-56** | Lanzamiento de navegación externa | El sistema debe proporcionar un bottom sheet con opciones para lanzar navegación turn-by-turn en Google Maps o Waze hacia el siguiente PDV. | Deep links funcionales a ambas aplicaciones. | Media |

### 3.13. Módulo Móvil — Tracking GPS en Segundo Plano

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-57** | Captura GPS cada 30 segundos | El sistema debe capturar las coordenadas GPS del reponedor cada 30 segundos durante toda la jornada laboral, incluso con la aplicación minimizada o el dispositivo bloqueado. | Implementado con `flutter_background_service` en Isolate independiente. | Alta |
| **RF-58** | Notificación persistente de jornada | El sistema debe mantener una notificación persistente en Android ("TRACE V — Jornada en curso") para evitar que el sistema operativo finalice el servicio de tracking. | Notificación visible durante toda la jornada activa. | Alta |
| **RF-59** | UPSERT de ubicación en Supabase | El sistema debe enviar cada lectura GPS a la tabla `reponedor_locations` mediante operación UPSERT (una fila por reponedor, actualizada constantemente). | Latencia de escritura ≤ 2 segundos con conexión estable. | Alta |
| **RF-60** | Inicio/parada automática del GPS | El servicio de tracking debe iniciarse automáticamente al hacer login y detenerse al hacer logout. | Sin intervención manual del reponedor. | Alta |
| **RF-61** | Bloqueo por desactivación de GPS | Si el reponedor desactiva intencionalmente el sensor GPS del dispositivo, el sistema debe bloquear la ejecución de tareas y generar una alerta al supervisor. | Bloqueo inmediato; alerta registrada en `audit_logs` con severidad `high`. | Alta |
| **RF-62** | Primera lectura GPS inmediata | El sistema debe obtener la primera coordenada GPS de forma inmediata al iniciar la jornada, sin esperar el ciclo de 30 segundos. | Primera lectura disponible en ≤ 5 segundos tras login. | Media |

### 3.14. Módulo Móvil — Sincronización Offline-First

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-63** | Base de datos local SQLite | El sistema debe mantener una base de datos SQLite local (`reponedor_offline.db`) con tablas `pending_tasks` y `pending_evidences` para almacenar datos de ejecución cuando no haya conectividad. | BD creada automáticamente al primer inicio de la aplicación. | Alta |
| **RF-64** | Cola de tareas pendientes | El sistema debe encolar localmente las tareas completadas sin conexión, con un máximo de 5 reintentos de sincronización por tarea. | Cada tarea encolada incluye timestamp, datos de ejecución y flag `is_offline = true`. | Alta |
| **RF-65** | Cola de evidencias pendientes | El sistema debe encolar localmente las fotografías capturadas sin conexión, asociadas a su tarea correspondiente. | Las fotos se almacenan en el sistema de archivos local con referencia en SQLite. | Alta |
| **RF-66** | Sincronización automática en background | El sistema debe ejecutar la sincronización de datos pendientes en segundo plano mediante `Workmanager`, incluso con la aplicación cerrada. | Sincronización disparada automáticamente al detectar conectividad. | Alta |
| **RF-67** | Backoff exponencial de reintentos | El sistema debe implementar un esquema de reintentos con backoff exponencial: 30s → 60s → 120s → 240s → 480s (máximo 5 reintentos). | Tras 5 reintentos fallidos, la tarea se marca como `FAILED` y se alerta al supervisor. | Alta |
| **RF-68** | Banner de estado de sincronización | El sistema debe mostrar un banner visual que indique el estado de conectividad: barra roja = offline, barra azul = sincronizando, oculto = sincronizado. | Transiciones animadas entre estados. | Media |
| **RF-69** | Sincronización manual forzada | El sistema debe proporcionar un botón en la barra de herramientas para forzar la sincronización inmediata de todos los datos pendientes. | Botón deshabilitado si no hay datos pendientes. | Media |

### 3.15. Módulo Móvil — Interfaz de Usuario

| Código | Requerimiento | Descripción | Criterio de Aceptación | Prioridad |
|:------:|:-------------|:------------|:----------------------|:---------:|
| **RF-70** | Tema claro premium con paleta corporativa | El sistema debe implementar el tema TRACE V Light optimizado para visibilidad exterior, con la paleta corporativa: Rojo Venado (`#AA001B`), azul institucional y colores semánticos (verde/naranja/rojo). | Contraste WCAG AA cumplido en todos los elementos interactivos. | Alta |
| **RF-71** | Tipografía Material 3 con Google Fonts Inter | El sistema debe utilizar Material 3 Design System con la fuente Inter como tipografía corporativa principal. | Fuente cargada localmente para operación offline. | Media |
| **RF-72** | Badges de tipo de cliente | El sistema debe mostrar badges de color diferenciado por clasificación: Pareto (rojo), Mayorista (azul), Detallista (gris). | Badges visibles en tarjetas de PDV y lista de rutas. | Media |
| **RF-73** | Micro-animaciones de interacción | El sistema debe implementar animaciones de entrada escalonada en listas, resumen elástico post-visita y animación pulsante en el cronómetro global al exceder el tiempo estimado. | Animaciones fluidas a 60 fps sin bloqueo del hilo principal. | Media |

---

## 4. Requerimientos No Funcionales

### 4.1. Seguridad (RNF-S)

| Código | Requerimiento | Métrica Objetivo |
|:------:|:-------------|:----------------|
| **RNF-S01** | Autenticación JWT con Supabase Auth | Tokens firmados con HS256; expiración configurable (por defecto: 1 hora con refresh token). |
| **RNF-S02** | Row Level Security (RLS) activa en todas las tablas | 100% de las tablas con políticas RLS habilitadas; consultas sin token autenticado retornan `0 filas`. |
| **RNF-S03** | Inmutabilidad de la tabla `audit_logs` | Políticas RLS impiden operaciones `UPDATE` y `DELETE`; solo `INSERT` permitido para usuarios autenticados; solo `SELECT` para rol ADMIN. |
| **RNF-S04** | Triggers de auditoría automáticos | Toda modificación a `users`, `daily_routes_plan`, `task_logs` y `route_execution_proofs` genera un registro inmutable en `audit_logs` con timestamp, acción, severidad y `record_id`. |
| **RNF-S05** | Detección de GPS Spoofing | El campo `is_mocked` se evalúa en cada inserción de `task_logs` y `route_execution_proofs`; detección positiva genera alerta de severidad `high`. |
| **RNF-S06** | Detección de desfase temporal (Time Travel) | Si la diferencia absoluta entre `device_timestamp` y `created_at` excede 300 segundos, el registro se marca como anomalía de severidad `medium`. |
| **RNF-S07** | Bloqueo de galería fotográfica | La app móvil no debe permitir la selección de imágenes desde la galería del dispositivo ni la carga de archivos externos; solo captura en vivo desde la cámara integrada. |
| **RNF-S08** | Marcas de agua inviolables | Cada fotografía capturada debe contener una marca de agua incrustada en los píxeles con fecha, hora exacta y coordenadas GPS, no removible mediante edición de metadatos EXIF. |
| **RNF-S09** | Protección de rutas web | Intentos de acceso a rutas restringidas por rol generan redirección automática a login y registro en `audit_logs`. |
| **RNF-S10** | Funciones SQL con `SECURITY DEFINER` | Todas las funciones de trigger se ejecutan con privilegios del definer, no del invocador, previniendo escalación de privilegios. |

### 4.2. Rendimiento (RNF-P)

| Código | Requerimiento | Métrica Objetivo |
|:------:|:-------------|:----------------|
| **RNF-P01** | Tiempo de carga del Dashboard Web | ≤ 3 segundos para renderizado completo del First Contentful Paint (FCP) en conexión de 10 Mbps. |
| **RNF-P02** | Tiempo de respuesta de la API de ruteo | ≤ 5 segundos para el cálculo completo de una ruta con hasta 25 PDVs, incluyendo consulta a Mapbox Matrix. |
| **RNF-P03** | Latencia de WebSocket (Realtime) | ≤ 2 segundos desde la emisión del evento en la base de datos hasta su reflejo en la interfaz web. |
| **RNF-P04** | Tiempo de generación de reportes PDF | ≤ 10 segundos para un reporte que consolide datos de hasta 30 días de operación. |
| **RNF-P05** | Concurrencia de reponedores simultáneos | El sistema debe soportar un mínimo de 50 reponedores transmitiendo GPS simultáneamente sin degradación perceptible (< 5% incremento en latencia). |
| **RNF-P06** | Compresión de evidencias fotográficas | Reducción ≥ 95% del tamaño original; imagen resultante ≤ 300 KB; procesamiento en ≤ 500 ms en dispositivos con procesador Snapdragon 600 series o equivalente. |
| **RNF-P07** | Tiempo de inicio de la app móvil | ≤ 4 segundos desde el tap en el ícono hasta la pantalla de login completamente renderizada (cold start). |
| **RNF-P08** | Frecuencia de captura GPS en background | Cada 30 segundos ± 5 segundos de tolerancia, mantenida durante un mínimo de 10 horas continuas sin degradación de batería superior al 15%. |
| **RNF-P09** | Renderizado de mapa con marcadores | El mapa web debe renderizar hasta 200 marcadores de PDV concurrentes sin caer por debajo de 30 fps. |
| **RNF-P10** | Sincronización offline → online | Toda la cola de datos pendientes (hasta 50 tareas + 50 evidencias) debe sincronizarse en ≤ 60 segundos tras restaurar conectividad. |

### 4.3. Usabilidad (RNF-U)

| Código | Requerimiento | Métrica Objetivo |
|:------:|:-------------|:----------------|
| **RNF-U01** | Curva de aprendizaje para reponedores | Un reponedor sin experiencia previa con el sistema debe ser capaz de completar una jornada completa de forma autónoma tras un máximo de 30 minutos de inducción guiada. |
| **RNF-U02** | Operación con guantes o manos húmedas | Los elementos táctiles de la app móvil (botones de cronómetro, check-in, cámara) deben tener un tamaño mínimo de 48×48 dp según las guías de Material Design. |
| **RNF-U03** | Visibilidad en exteriores | El tema claro de la app móvil debe mantener legibilidad bajo luz solar directa, con contraste mínimo de ratio 4.5:1 (WCAG AA) en todos los textos. |
| **RNF-U04** | Feedback visual de acciones críticas | Toda acción destructiva o irreversible (reasignación de PDV, eliminación de registros) debe solicitar confirmación explícita mediante diálogo modal. |
| **RNF-U05** | Sistema de notificaciones toast | Acciones completadas exitosamente, errores y advertencias deben comunicarse mediante notificaciones toast con duración de 3 segundos y diferenciación cromática por tipo. |
| **RNF-U06** | Responsive design del dashboard web | El panel web debe adaptarse correctamente a resoluciones desde 1024×768 (tablet landscape) hasta 2560×1440 (monitor QHD), con sidebar colapsable. |
| **RNF-U07** | Soporte de tema oscuro/claro en web | El dashboard web debe ofrecer alternancia entre modo oscuro y modo claro mediante Theme Provider de shadcn/ui, respetando la preferencia del sistema operativo. |
| **RNF-U08** | Skeleton loaders | Todas las vistas que dependan de carga asíncrona de datos deben mostrar skeleton loaders animados durante la espera, evitando pantallas en blanco. |

### 4.4. Disponibilidad y Resiliencia (RNF-D)

| Código | Requerimiento | Métrica Objetivo |
|:------:|:-------------|:----------------|
| **RNF-D01** | Disponibilidad del servicio Supabase | Objetivo de uptime ≥ 99.5% mensual, sujeto al SLA del proveedor Supabase. |
| **RNF-D02** | Operación offline de la app móvil | La app debe ser 100% funcional (ejecución de tareas, captura fotográfica, cronómetros) sin conexión a internet durante un período indefinido. |
| **RNF-D03** | Fallback a datos mock | Tanto la app móvil como el dashboard web deben degradarse gracefully a datos de ejemplo cuando Supabase no responde, sin errores fatales en la interfaz. |
| **RNF-D04** | Recuperación automática de conexión | Tras una pérdida temporal de conectividad, el sistema debe restablecer las suscripciones WebSocket y reiniciar la sincronización automáticamente, sin intervención del usuario. |

---

## 5. Restricciones de Diseño y Tecnología

| Componente | Tecnología | Versión | Justificación |
|:-----------|:-----------|:--------|:-------------|
| Dashboard Web | Next.js (App Router) | 14.x+ | SSR, file-based routing, optimización de bundling. |
| UI Web | React + Tailwind CSS + shadcn/ui | React 18+ | Ecosistema de componentes accesibles y personalizables. |
| Mapas Web | Mapbox GL JS | 3.x | Renderizado vectorial de alto rendimiento. |
| App Móvil | Flutter (Dart) | 3.x | Compilación nativa Android; single codebase. |
| Mapas Móvil | flutter_map + Mapbox Tiles v12 | Latest | Compatibilidad con tiles rasterizados. |
| Backend/BaaS | Supabase | Cloud | Auth, DB, Realtime, Storage integrados. |
| Base de Datos | PostgreSQL + PostGIS | 15+ | Geoprocesamiento nativo; extensión PostGIS. |
| DB Offline | SQLite (sqflite) | Latest | Almacenamiento local estructurado en móvil. |
| Background Service | flutter_background_service | Latest | GPS tracking con app minimizada/cerrada. |
| Workmanager | workmanager (Flutter) | Latest | Sincronización periódica en background. |
| Conectividad | connectivity_plus | Latest | Monitoreo de estado de red WiFi/móvil. |

---

## 6. Modelo de Datos

### 6.1. Diagrama Entidad-Relación (Simplificado)

```
┌──────────┐       ┌──────────────────┐       ┌──────────────┐
│   role   │◄──────│      users       │───────►│ reponedor_   │
│          │       │ (id, name, email, │       │ locations    │
│ (id,name)│       │  role, is_active) │       │ (lat, lng,   │
└──────────┘       └────────┬─────────┘       │  geom)       │
                            │                  └──────────────┘
                            │ 1:N
                            ▼
                   ┌──────────────────┐
                   │ daily_routes_plan│
                   │ (optimized_pos_  │       ┌──────────────┐
                   │  sequence,       │───────►│ reponedor_   │
                   │  status, date)   │       │ routes_      │
                   └────────┬─────────┘       │ history      │
                            │ 1:N             └──────────────┘
                            ▼
                   ┌──────────────────┐       ┌──────────────┐
                   │    task_logs     │◄──────│ micro_tasks  │
                   │ (duration_secs, │       │ (task_name,  │
                   │  photo_url,     │       │  category)   │
                   │  is_offline)    │       └──────────────┘
                   └────────┬─────────┘
                            │ N:1
                            ▼
                   ┌──────────────────┐       ┌──────────────┐
                   │ points_of_sale  │       │  audit_logs  │
                   │ (name, market,  │       │ (action,     │
                   │  category,      │       │  severity,   │
                   │  lat, lng, geom)│       │  immutable)  │
                   └──────────────────┘       └──────────────┘
```

### 6.2. Tablas Principales

| Tabla | Propósito | Relaciones Clave |
|:------|:----------|:----------------|
| `users` | Cuentas de usuario con rol y estado activo. | FK → `role`; referenciada por `daily_routes_plan`, `reponedor_locations`. |
| `points_of_sale` | Catálogo maestro de PDVs con coordenadas y clasificación. | Referenciada por `task_logs`, `route_execution_proofs`. |
| `daily_routes_plan` | Rutas diarias con secuencia optimizada y estado. | FK → `users`; referenciada por `task_logs`, `reponedor_routes_history`. |
| `micro_tasks` | Definiciones de micro-tareas por tipo de cliente. | Referenciada por `task_logs`. |
| `task_logs` | Registro granular de ejecución de cada micro-tarea. | FK → `daily_routes_plan`, `points_of_sale`, `micro_tasks`. |
| `reponedor_locations` | Ubicación GPS en vivo (1 fila por reponedor, UPSERT). | FK → `users`. |
| `reponedor_routes_history` | Historial de rutas con tiempo y distancia. | FK → `daily_routes_plan`. |
| `route_execution_proofs` | Pruebas de ejecución con detección de desviaciones. | FK → `daily_routes_plan`, `points_of_sale`. |
| `audit_logs` | Bitácora inmutable de auditoría y seguridad. | Sin FK de integridad; referencia por `record_id`. |

---

## 7. Glosario de Términos

| Término | Definición |
|:--------|:-----------|
| **Bandeo** | Actividad de colocación y agrupación de productos de una misma marca en la góndola del supermercado, maximizando la visibilidad y el facing. |
| **Material POP** | Material publicitario en el Punto de Venta (Point of Purchase): afiches, colgantes, stoppers, etc. |
| **Canal Tradicional** | Red de distribución compuesta por tiendas de barrio, mercados y comercios minoristas, diferenciada del canal moderno (supermercados). |
| **Facing** | Número de unidades de un producto visibles en la primera fila de la góndola. |
| **Quiebre de stock** | Situación en la que un producto no está disponible en el punto de venta para el consumidor final. |
| **Hoja de ruta / Hoja de trabajo** | Lista secuencial de PDVs asignados a un reponedor para una jornada específica. |
| **UPSERT** | Operación que inserta un registro si no existe, o lo actualiza si ya existe (INSERT ON CONFLICT UPDATE). |
| **Degradación graceful** | Capacidad del sistema de continuar operando con funcionalidad reducida ante la falla de un componente externo. |

---

## 8. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio |
|:--------|:------|:------|:----------------------|
| 1.0 | 8 de junio de 2026 | Luis Alejandro Sandoval Rodriguez | Versión inicial del documento ERS. |

---

*Documento generado por Antigraviti — Consultoría de Ingeniería de Software.*
*Todos los requerimientos son rastreables mediante sus códigos (RF-XX, RNF-XX) para validación en pruebas de aceptación.*

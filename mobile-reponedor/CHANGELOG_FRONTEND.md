# FieldOps Reponedores — Registro de cambios Frontend (Flutter)

**Proyecto:** `mobile-reponedor`  
**Alcance:** Solo aplicación móvil Flutter. No se modificó `web_supervisor` ni otros módulos del monorepo.  
**Referencia:** `documento.md` — *Plataforma de Optimización Inteligente de Rutas y Cobertura de Reponedores*  
**Fecha de elaboración:** Mayo 2026

---

## 1. Propósito general

Industrias Venado necesita demostrar ante el jurado un ecosistema donde el reponedor en campo capture datos granulares (micro-tareas, tiempos, evidencias) sin fricción, incluso con conectividad inestable en Santa Cruz. El documento define esto bajo el **Enfoque B: "FieldOps Reponedores"** y los requisitos **RF-06 a RF-10**.

El fin de todo el trabajo realizado en este repositorio fue:

1. **Construir un frontend Flutter completo y demostrable** alineado con la arquitectura funcional del documento.
2. **Simular el flujo operativo real** (login → ruta → visita → evidencias → sync) usando datos mock, sin depender aún de backend.
3. **Dejar la estructura preparada** (`models/`, `widgets/`, `services/`, comentarios `TODO`) para integraciones futuras con Supabase, GPS, cámara y almacenamiento offline.
4. **Cumplir la identidad visual** definida en la paleta corporativa del documento.

> **Principio rector:** Primero la experiencia de usuario y el pitch; la lógica de negocio real se conecta en una fase posterior sin reescribir la UI.

---

## 2. Marco del documento — qué pide el móvil

### Enfoque B (extracto relevante)

| Capacidad del documento | Descripción |
|---|---|
| Secuenciación por tipo de cliente | Ruta ordenada + checklist según Pareto / Mayorista / Detallista |
| Geofencing de validación | Detectar llegada al PDV y habilitar tareas |
| Cronómetro de micro-tareas | Inicio/fin por actividad, eliminando tiempos promedio |
| Modo Offline-First | Guardar localmente y sincronizar al recuperar señal |

### Requisitos funcionales Flutter

| Código | Requisito |
|---|---|
| **RF-06** | Autenticación + ruta + checklist dinámico por tipo de cliente |
| **RF-07** | Mapa con orden óptimo + navegación externa (Google Maps / Waze) |
| **RF-08** | Rastreo GPS en traslados (cada 30 s) |
| **RF-09** | Registro granular de tareas + evidencia fotográfica |
| **RF-10** | Sincronización autónoma offline |

### Casos de estudio que el frontend debe soportar visualmente

- **Caso 1:** Registrar exceso de tiempo en cliente Pareto (4to Anillo) y cerrar visita con datos estructurados.
- **Caso 3:** Geofence valida llegada → checklist → fotos antes/después → consolidación para BI.

---

## 3. Fases de implementación

El trabajo se realizó en **cuatro fases** coherentes con el documento:

```
Fase 1 → Esqueleto UI (pantallas, tema, widgets, mocks)
Fase 2 → Corrección entorno (.env) para ejecutar en web
Fase 3 → Alineación paleta corporativa (documento.md)
Fase 4 → Cierre gaps frontend (checklist, geofence, offline, resumen)
```

---

## 4. Fase 1 — Esqueleto UI FieldOps Reponedores

### Qué se hizo

| Área | Archivos creados / modificados |
|---|---|
| **Entrada** | `lib/main.dart` — app con tema dark, home en login |
| **Tema** | `lib/theme/app_colors.dart`, `lib/theme/app_theme.dart` |
| **Modelos** | `lib/models/` — User, Pdv, Task, Visit, Evidence, enums |
| **Datos mock** | `lib/data/mock_data.dart` — 8 PDVs de ruta diaria |
| **Pantallas** | `login_view.dart`, `route_view.dart`, `visit_execution_view.dart` |
| **Widgets** | PdvCard, badges, mapa mock, geofence, checklist, evidencias, sync |

### Por qué

El documento exige una app optimizada para **uso rápido en PDV con una mano** (Material 3, dark theme, acciones inferiores, targets ≥ 48 px). Sin pantallas base no es posible demostrar RF-06 a RF-09 ante el jurado.

### Fin

Tener un **MVP visual navegable** que muestre el flujo completo del reponedor, aunque con datos simulados.

### Mapeo al documento

| Elemento UI | RF / Enfoque |
|---|---|
| Login + Iniciar Jornada | RF-06 (auth visual) |
| Ruta con PDVs ordenados y badges Pareto/Mayorista/Detallista | RF-06, RF-07, Caso 2 |
| Mapa mock + Abrir Navegación | RF-07 |
| Checklist + cronómetros + evidencias + sync | RF-09, Caso 1 y 3 |
| Indicadores online/offline en login | RF-10 (visual inicial) |

---

## 5. Fase 2 — Corrección entorno de ejecución

### Qué se hizo

| Cambio | Motivo |
|---|---|
| `.env` vacío causaba error 500 en Flutter Web | Bloqueaba `flutter run -d chrome` |
| Creado `.env.example` con placeholders | Asset empaquetable sin secretos reales |
| `pubspec.yaml` → asset `.env.example` | Build estable en web |
| `main.dart` carga `.env.example` | Modo mock funcional sin credenciales |

### Por qué

Sin poder ejecutar la app, ningún requisito del documento es demostrable. Supabase se inicializa con placeholders; los errores se capturan para no bloquear la UI mock.

### Fin

**Desbloquear desarrollo y demo** en Chrome/dispositivo sin configurar backend.

---

## 6. Fase 3 — Paleta corporativa (documento.md)

### Problema detectado

La primera versión del tema usaba colores **ajenos a la paleta Venado** para estados semánticos:

| Color anterior | Hex | Problema |
|---|---|---|
| success | `#22C55E` | Verde Tailwind — no está en documento |
| warning | `#F59E0B` | Ámbar Tailwind — no está en documento |
| error | `#EF4444` | Rojo genérico — documento usa Crimson |
| detallistaGray | `#9CA3AF` | Gris genérico — documento usa `#999999` |

### Qué se hizo

Reescritura de `lib/theme/app_colors.dart` con **todos los tonos del documento** (Royal Blue, Dark Turquoise, Dark Slate Blue, Steel Blue, Dodger Blue, escala de grises, Crimson, Snow, etc.) y alias semánticos:

| Uso semántico | Color documento |
|---|---|
| Éxito / completado / sync OK | Dark Turquoise `#19D5EE` |
| Atención / pendiente / pausa | Cornflower Blue `#5FA1DE` |
| Error / alerta crítica | Crimson Alt `#F23036` |
| Badge Detallista | Dark Gray `#999999` |
| Primario / botones | Royal Blue `#0C71C3` |
| Secundario / focus | Dodger Blue `#3BA8ED` |
| Fondo / cards | `#333333` / `#4C4C4C` |
| Pareto | Crimson `#E33231` |

También se corrigieron gradientes del mapa mock y colores hardcodeados en `home_view.dart` y evidencias mock.

### Por qué

El documento y el pitch ante Industrias Venado requieren **identidad visual corporativa coherente** entre móvil y futuro dashboard web. Colores genéricos debilitan la percepción de producto propio.

### Fin

**Coherencia de marca Venado** al 100% en la capa visual, alineada con la paleta del final de `documento.md`.

---

## 7. Fase 4 — Cierre de gaps frontend

Tras comparar la implementación con `documento.md`, se identificó cumplimiento ~75% en UI. Esta fase llevó el frontend a ~90–95% para demo.

### 7.1 Checklist dinámico por tipo de cliente (RF-06)

**Archivo:** `lib/data/mock_data.dart`

| Tipo | Micro-tareas (ejemplo) |
|---|---|
| **Pareto** | Limpieza góndolas, Material POP, Reposición premium, Exhibidor, Foto antes/después |
| **Mayorista** | Bandeo masivo salsas Kris, Stock bodega, Reposición pallet, Rotación fechas, Limpieza área |
| **Detallista** | Reposición rápida, Verificación precios, Limpieza frente, Control inventario |

**Por qué:** El documento dice explícitamente que el checklist se configura **según el perfil del comercio**. Un checklist único para todos contradice RF-06 y el Caso 2 (balance de carga por tipo).

**Fin:** Demostrar que la app "entiende" la clasificación Pareto / Mayorista / Detallista.

---

### 7.2 Geofence interactivo con bloqueo de checklist (Enfoque B, Caso 3)

**Archivos:** `geofence_status_chip.dart`, `visit_execution_view.dart`

| Estado | Comportamiento UI |
|---|---|
| Fuera del PDV | Checklist bloqueado + botón "Simular llegada al PDV" |
| Dentro del radio | Checklist habilitado |
| Visita validada | Al finalizar visita |

**Por qué:** Caso 3 — *"el Geofencing valida su presencia y la app le permite iniciar el checklist"*. Sin bloqueo/desbloqueo el flujo no es creíble en demo.

**Fin:** Simular RF de geofence en web (sin GPS real) manteniendo UX fiel al documento.

> **Nota:** `lib/services/gps_service.dart` existe del proyecto original pero no se integró aún; queda para fase de integración real (RF-08).

---

### 7.3 Evidencias fotográficas mejoradas (RF-09, Caso 3)

**Archivos:** `evidence_gallery.dart`, `models/evidence.dart`, `models/enums.dart` (EvidenceType)

| Funcionalidad | Detalle |
|---|---|
| Tipos | Antes / Después / General |
| Contador | "X de Y evidencias" según tipo de cliente |
| Captura | Bottom sheet para elegir tipo |
| Preview | Diálogo fullscreen al tocar miniatura |
| Tareas | Badge "Requiere evidencia fotográfica" en micro-tareas |

**Por qué:** Caso 3 exige *"fotografías del antes y después como respaldo digital inviolable"*. RF-09 pide captura fotográfica asociada a la ejecución.

**Fin:** Flujo de evidencia demostrable en pitch sin cámara real aún.

---

### 7.4 Cronómetros y resumen de tiempos (RF-09, Caso 1)

**Archivos:** `task_checklist_item.dart`, `visit_summary_view.dart`

- Cronómetro general de visita (formato `HH:MM:SS`).
- Cronómetro por micro-tarea (Iniciar → Pausar → Finalizar).
- Barra de progreso de tareas completadas.
- Pantalla **Resumen de visita** con desglose de tiempos por tarea.

**Por qué:** Caso 1 — registrar con precisión el exceso de tiempo en cliente Pareto (1 h 15 min vs 20 min estimados). El documento busca eliminar "tiempos promedio" con datos granulares.

**Fin:** Mostrar el **Feedback Loop** de tiempos reales que alimentará BI y reoptimización (aunque el motor viva en web/backend).

---

### 7.5 Modo Offline-First visible (RF-10)

**Archivos:** `app_connection_service.dart`, `offline_banner.dart`, `route_view.dart`, `login_view.dart`

| Elemento | Función |
|---|---|
| `AppConnectionService` | Singleton mock: online / offline / pendingSync |
| `OfflineBanner` | Banner global en ruta y visita |
| Toggle wifi en AppBar | Cicla estados para demo |
| Cola sync simulada | "N elementos pendientes" + botón Sync |
| Login | Indicadores conectados al servicio |

**Por qué:** RF-10 y Enfoque B enfatizan operación en mercados cerrados y zonas periféricas de Santa Cruz con señal inestable. El usuario debe **ver** que la app funciona offline.

**Fin:** Demostrar offline-first en UI; la persistencia real (Hive/SQLite + cola) queda como `TODO`.

---

### 7.6 Ruta de jornada pulida (RF-07)

**Archivo:** `route_view.dart`, `mock_route_map.dart`

| Mejora | Detalle |
|---|---|
| Banner "Siguiente visita" | PDV activo destacado |
| Mapa | Resalta PDV activo / en proceso |
| Navegación | Bottom sheet con nombre, dirección y distancia del destino |
| Pull-to-refresh | Simula actualización desde supervisor |
| Jornada completada | Tarjeta cuando 8/8 visitas hechas |
| Cerrar sesión | Vuelve a login |
| Hint GPS | "Rastreo cada 30 s (simulación RF-08)" |

**Por qué:** RF-07 pide orden óptimo visible y navegación asistida. Caso 2 requiere mostrar secuencia equilibrada de PDVs.

**Fin:** Pantalla principal del reponedor lista para pitch operativo.

---

### 7.7 Pantalla resumen post-visita

**Archivo:** `visit_summary_view.dart`

Flujo: Finalizar visita → Resumen (tiempos + evidencias + sync) → "Ir a siguiente visita" o "Volver a mi ruta".

**Por qué:** Cierra el ciclo operativo que el documento describe entre visita en campo y feedback al supervisor. Caso 1 requiere cierre de visita con datos estructurados.

**Fin:** Transición clara entre PDVs sin perder contexto de lo ejecutado.

---

## 8. Estructura final del proyecto

```
lib/
├── main.dart
├── data/
│   └── mock_data.dart          # Rutas, checklists por tipo, evidencias
├── models/
│   ├── enums.dart
│   ├── user.dart, pdv.dart, task.dart, visit.dart, evidence.dart
├── services/
│   ├── app_connection_service.dart   # Mock offline/sync
│   ├── gps_service.dart              # Existente, sin integrar aún
│   └── supabase_service.dart         # Existente, placeholder
├── theme/
│   ├── app_colors.dart         # Paleta documento.md
│   └── app_theme.dart          # Material 3 dark
├── views/
│   ├── login_view.dart
│   ├── route_view.dart
│   ├── visit_execution_view.dart
│   ├── visit_summary_view.dart
│   └── home_view.dart          # Legacy GPS test, fuera del flujo principal
└── widgets/
    ├── offline_banner.dart
    ├── pdv_card.dart, mock_route_map.dart
    ├── geofence_status_chip.dart
    ├── task_checklist_item.dart, task_timer_button.dart
    ├── evidence_gallery.dart, sync_status_card.dart
    └── ... (badges, headers, resumen)
```

**Convención:** No se creó arquitectura Clean nueva; se extendió la estructura `lib/` existente (`views/`, `services/`) según lo acordado.

---

## 9. Cumplimiento actual vs documento

### Frontend UI / Demo

| Requisito | Estado |
|---|---|
| RF-06 Auth + ruta + checklist por cliente | ✅ UI completa |
| RF-07 Mapa + navegación externa simulada | ✅ UI completa |
| RF-08 GPS cada 30 s | ⚠️ Hint visual; sin GPS real integrado |
| RF-09 Tareas granulares + evidencia | ✅ UI completa (mock) |
| RF-10 Offline + sync | ✅ UI demo; sin persistencia local real |
| Paleta corporativa | ✅ Alineada con documento.md |
| Caso 1 — tiempos Pareto | ✅ Demo posible |
| Caso 3 — geofence + evidencias | ✅ Demo posible |
| Caso 2 — motor de ruteo | ❌ Corresponde a web/backend |
| Reasignación en caliente (RF-04) | ❌ Corresponde a web supervisor |

### Integraciones pendientes (fase siguiente)

| Integración | Archivo / punto de extensión |
|---|---|
| Supabase Auth | `login_view.dart`, `supabase_service.dart` |
| Supabase Realtime (ruta reasignada) | `route_view.dart`, `mock_data.dart` |
| GPS + geofence real | `gps_service.dart`, `geofence_status_chip.dart` |
| Cámara + Storage | `evidence_gallery.dart`, `Evidence` model |
| Cola offline (Hive/SQLite) | `app_connection_service.dart`, `Visit` model |
| Mapbox / OSRM | `mock_route_map.dart` |

---

## 10. Archivos eliminados

| Archivo | Motivo |
|---|---|
| `fieldops_prompt.md` | Era el prompt de generación inicial; su contenido ya está implementado en código |

---

## 11. Cómo demostrar el flujo (guía pitch)

1. **Login** — credenciales demo `cmendoza` / `demo1234` → *Iniciar Jornada*.
2. **Mi Ruta** — mostrar 8 PDVs, mapa, progreso 2/8, clasificación por badges.
3. **Toggle wifi** (AppBar) — demostrar banner offline y cola de sync.
4. **Abrir visita Mayorista** (#3 Distribuidora Norte) — checklist de bandeo masivo.
5. **Simular llegada al PDV** — geofence habilita checklist.
6. **Cronometrar tarea** + **Tomar evidencia** (Antes/Después).
7. **Finalizar visita** — resumen con tiempos granulares.
8. **Abrir visita Pareto** (#5) — checklist distinto, 3 evidencias requeridas.
9. Narrar: *"Estos tiempos alimentan el Feedback Loop del supervisor web"* (Caso 1).

---

## 12. Conclusión

Todo el trabajo en `mobile-reponedor` persiguió un objetivo claro del documento: **ser "Los Ojos en el Punto de Venta"** — la capa móvil que captura la verdad operativa del canal tradicional en Santa Cruz.

- **Qué hicimos:** UI completa, coherente con RF-06–RF-10 y casos de estudio 1 y 3, con identidad Venado y flujos demostrables.
- **Por qué:** Porque el ecosistema del documento depende de datos granulares de campo para alimentar el motor de ruteo, el dashboard supervisor y el BI.
- **Cuál fue el fin:** Tener un **frontend listo para pitch y para integración progresiva**, sin bloquear al equipo web ni al backend.

La app no reemplaza aún la lógica de negocio real; la **anticipa visualmente** con la arquitectura y los `TODO` necesarios para conectar Supabase, GPS, cámara y sync offline en la siguiente iteración.

---

*Documento generado como registro técnico del trabajo de frontend Flutter en FieldOps Reponedores.*

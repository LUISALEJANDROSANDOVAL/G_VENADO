# Documentación Técnica: Migración a Arquitectura Enterprise
## Aplicación Móvil del Reponedor — TRACE V (Grupo Venado)

---

**Proyecto:** TRACE V — Sistema de Trazabilidad de Reponedores en Campo  
**Módulo:** `mobile-reponedor` (Aplicación Flutter)  
**Desarrollador responsable:** José Carlos Rojas (JOSECA — Rol: Data & State / Device Features)  
**Fecha de implementación:** 5 de junio de 2026  
**Versión:** 2.0.0 (Enterprise)

---

## 1. Introducción

### 1.1 Contexto del Proyecto

TRACE V es un sistema de trazabilidad diseñado para empresas de consumo masivo que necesitan monitorear en tiempo real las actividades de sus reponedores en puntos de venta (supermercados, tiendas, mayoristas). El sistema consta de dos componentes principales:

- **Web Supervisor (`web-supervisor`):** Panel web en Next.js para que los supervisores visualicen rutas, mapas en vivo y reportes de cumplimiento.
- **App Móvil Reponedor (`mobile-reponedor`):** Aplicación Flutter instalada en los teléfonos de los reponedores que registra visitas, captura evidencias fotográficas y transmite la ubicación GPS en tiempo real.

### 1.2 Objetivo de la Migración

La aplicación móvil fue desarrollada inicialmente como un **Producto Mínimo Viable (MVP)** funcional. Sin embargo, al pasar a una fase de **producto comercial real** destinado a clientes corporativos, se identificaron limitaciones arquitectónicas que podían causar:

- **Pérdida de datos** del trabajo diario de los reponedores.
- **Interrupción del rastreo GPS** cuando el teléfono entra en modo de ahorro de batería.
- **Eliminación involuntaria de evidencias fotográficas** por parte del sistema operativo.
- **Falta de sincronización** cuando la aplicación es cerrada por el usuario.

Este documento describe las mejoras implementadas para resolver cada una de estas limitaciones.

---

## 2. Diagnóstico de la Arquitectura MVP

### 2.1 Almacenamiento Offline (Problema Crítico)

**Implementación MVP:**  
Los registros de tareas completadas sin conexión a internet se almacenaban en `SharedPreferences`, un sistema diseñado por Google para guardar **configuraciones ligeras** (como preferencias de tema o idioma). Los datos se serializaban como una cadena JSON y se sobreescribían en cada operación.

**Riesgos identificados:**

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| Corrupción de datos | Si la aplicación se cierra inesperadamente durante la escritura del JSON, el archivo completo se corrompe y se pierde **toda** la cola de tareas pendientes. | **Crítica** |
| Desbordamiento de memoria | Un reponedor sin señal durante todo el día podría acumular decenas de registros con rutas de fotos. Cargar todo el JSON en memoria RAM para cada operación puede provocar un error de tipo `OutOfMemoryError`. | **Alta** |
| Sin control de reintentos | Si un registro específico fallaba al sincronizar, no existía forma de reintentarlo individualmente. El sistema intentaba sincronizar todo o nada. | **Media** |

### 2.2 Sincronización en Segundo Plano (Problema Crítico)

**Implementación MVP:**  
El servicio `AppConnectionService` utilizaba el paquete `connectivity_plus` para detectar cambios de red y sincronizar automáticamente. Sin embargo, esta lógica solo funcionaba **mientras la aplicación estuviera activa en pantalla o en memoria**.

**Riesgos identificados:**

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| App cerrada = sin sincronización | Si el reponedor cerraba la app (o el sistema operativo la mataba por falta de recursos), los datos offline nunca se sincronizaban hasta que el usuario volviera a abrir la aplicación manualmente. | **Crítica** |
| Dependencia del usuario | El flujo dependía de que el reponedor recordara abrir la app cuando recuperara señal. En un contexto operativo real, esto no es viable. | **Alta** |

### 2.3 Rastreo GPS (Problema Alto)

**Implementación MVP:**  
Se utilizaba un `Timer.periodic` de Dart (lenguaje de programación) que ejecutaba una lectura de GPS cada 30 segundos. Este timer funciona correctamente mientras la aplicación esté en primer plano.

**Riesgos identificados:**

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| Modo Doze de Android | A partir de Android 6.0, cuando el usuario apaga la pantalla y deja el teléfono quieto, el sistema operativo entra en modo **Doze** y suspende todos los timers de las aplicaciones para ahorrar batería. El GPS del reponedor simplemente dejará de reportar su ubicación. | **Alta** |
| Restricciones de iOS | Apple impone restricciones aún más estrictas para la ejecución de código en segundo plano. Sin un servicio nativo registrado, iOS matará el proceso en minutos. | **Media** |

### 2.4 Evidencias Fotográficas (Problema Medio)

**Implementación MVP:**  
Al capturar una foto con `image_picker`, el archivo se almacenaba en el directorio de **caché temporal** del sistema operativo. Si la foto no se subía inmediatamente a Supabase Storage, quedaba vulnerable.

**Riesgos identificados:**

| Riesgo | Descripción | Severidad |
|--------|-------------|-----------|
| Limpieza automática de caché | Android y iOS limpian periódicamente la carpeta de caché para liberar espacio. Las fotos de evidencia pendientes de subir pueden ser eliminadas sin previo aviso. | **Media** |
| Tamaño excesivo de archivos | Las cámaras de teléfonos modernos generan fotos de 5 MB a 15 MB en resolución 4K. Subir estos archivos sin comprimir consume excesivos datos móviles del plan del reponedor. | **Media** |

---

## 3. Soluciones Implementadas

### 3.1 Base de Datos Local SQLite (Reemplazo de SharedPreferences)

**Tecnología:** Paquete `sqflite` v2.3.0  
**Archivos modificados:**
- `lib/data/database_helper.dart` (archivo nuevo)
- `lib/services/offline_sync_service.dart` (reescrito completamente)

**Descripción de la solución:**

Se creó una base de datos SQLite local denominada `reponedor_offline.db` con dos tablas principales:

**Tabla `pending_tasks`:**
```sql
CREATE TABLE pending_tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    route_plan_id     TEXT NOT NULL,
    pos_id            TEXT NOT NULL,
    task_id           INTEGER NOT NULL,
    start_time        TEXT NOT NULL,
    end_time          TEXT NOT NULL,
    duration_seconds  INTEGER NOT NULL,
    photo_url         TEXT,
    local_photo_path  TEXT,
    user_id           TEXT,
    is_offline        INTEGER NOT NULL DEFAULT 1,
    retry_count       INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    last_retry_at     TEXT
);
```

**Tabla `pending_evidences`:**
```sql
CREATE TABLE pending_evidences (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    local_path    TEXT NOT NULL,
    remote_path   TEXT NOT NULL,
    mime_type     TEXT NOT NULL DEFAULT 'image/jpeg',
    task_log_id   INTEGER,
    retry_count   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_retry_at TEXT,
    FOREIGN KEY (task_log_id) REFERENCES pending_tasks(id) ON DELETE CASCADE
);
```

**Justificación técnica:**

1. **Transacciones ACID:** SQLite garantiza Atomicidad, Consistencia, Aislamiento y Durabilidad. Si la aplicación se cierra abruptamente durante una escritura, la base de datos no se corrompe porque SQLite utiliza un mecanismo de journaling que protege la integridad de los datos.

2. **Control de reintentos individual:** El campo `retry_count` permite rastrear cuántas veces se ha intentado sincronizar cada registro de forma independiente. Si un registro falla 5 veces consecutivas (posiblemente por datos corruptos), se excluye de futuros intentos para no bloquear la cola completa.

3. **Eficiencia de memoria:** A diferencia de SharedPreferences que cargaba toda la cola en memoria como un string JSON, SQLite permite consultas paginadas y filtradas directamente desde el disco, consumiendo memoria mínima.

---

### 3.2 Sincronización en Segundo Plano con Workmanager

**Tecnología:** Paquete `workmanager` v0.5.2  
**Archivos modificados:**
- `lib/services/app_connection_service.dart` (reescrito completamente)
- `lib/main.dart` (inicialización agregada)

**Descripción de la solución:**

Se integró el paquete `workmanager` que permite registrar **tareas programadas a nivel del sistema operativo Android/iOS**. Esto significa que la sincronización ya no depende de que la aplicación esté abierta.

**Flujo de sincronización Enterprise:**

```
┌──────────────────────────────────────────────────┐
│  Reponedor completa visita sin internet          │
│  → Datos guardados en SQLite local               │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Reponedor cierra la aplicación                  │
│  → Workmanager registra tarea con el SO          │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  El teléfono detecta conexión WiFi/4G            │
│  → El SO despierta la tarea de Workmanager       │
│  → Sincroniza registros uno por uno con Supabase │
│  → Elimina de SQLite los registros exitosos      │
│  → Incrementa retry_count en los fallidos        │
└──────────────────────────────────────────────────┘
```

**Justificación técnica:**

Workmanager utiliza las APIs nativas de Android (`WorkManager API de Jetpack`) e iOS (`BGTaskScheduler`) para programar tareas que el sistema operativo ejecuta de forma inteligente, respetando las restricciones de batería pero garantizando que la tarea eventualmente se ejecutará.

La política de reintento configurada es **exponencial** (`BackoffPolicy.exponential`) con un delay inicial de 30 segundos, lo que significa que si el primer intento falla, esperará 30s, luego 60s, luego 120s, etc., evitando saturar la red del dispositivo.

---

### 3.3 GPS Ininterrumpido con Foreground Service

**Tecnología:** Paquetes `flutter_background_service` v5.0.0 y `flutter_local_notifications` v18.0.0  
**Archivos modificados:**
- `lib/services/gps_service.dart` (reescrito completamente)
- `lib/main.dart` (inicialización agregada)
- `android/app/src/main/AndroidManifest.xml` (permisos agregados)

**Descripción de la solución:**

Se implementó un **Foreground Service** de Android que muestra una notificación persistente en la barra de estado del teléfono mientras el reponedor está en jornada laboral. Esta notificación indica:

> **"TRACE V — Jornada en curso"**  
> GPS activo · Última actualización: 14:32:05

**¿Por qué una notificación persistente?**

En Android, un **Foreground Service** es la única forma legítima y aprobada por Google de mantener un proceso ejecutándose de forma continua sin que el sistema operativo lo mate. La notificación visible es un requisito obligatorio del sistema operativo (política de transparencia de Google) para que el usuario sepa que la aplicación está usando recursos en segundo plano.

**Permisos agregados al AndroidManifest.xml:**

| Permiso | Propósito |
|---------|-----------|
| `ACCESS_BACKGROUND_LOCATION` | Permite obtener coordenadas GPS con la pantalla apagada |
| `FOREGROUND_SERVICE` | Permite crear un servicio persistente en primer plano |
| `FOREGROUND_SERVICE_LOCATION` | Declara que el servicio de primer plano usa ubicación |
| `RECEIVE_BOOT_COMPLETED` | Permite reiniciar Workmanager después de un reinicio del teléfono |
| `WAKE_LOCK` | Evita que la CPU entre en modo sleep durante la sincronización |
| `CAMERA` | Permite acceso directo a la cámara para captura de evidencias |

**Justificación técnica:**

Sin el Foreground Service, el modo Doze de Android (introducido en Android 6.0 Marshmallow) suspende todos los `Timer.periodic` de Dart aproximadamente 15 minutos después de que el usuario apaga la pantalla. Esto hacía que el supervisor web perdiera la señal del reponedor, generando reportes falsos de inactividad.

---

### 3.4 Almacenamiento Seguro de Evidencias Fotográficas

**Tecnología:** Paquetes `path_provider` v2.1.3 y `flutter_image_compress` v2.3.0  
**Archivos modificados:**
- `lib/views/visit_execution_view.dart` (método `_saveToPermStorage` agregado)

**Descripción de la solución:**

Se implementó un flujo de dos pasos para el manejo seguro de las fotografías de evidencia:

**Paso 1 — Almacenamiento permanente:**  
Inmediatamente después de que el reponedor toma la foto con la cámara, el archivo se mueve desde el directorio de caché temporal (`/data/data/app/cache/`) hacia el directorio de documentos permanentes de la aplicación (`/data/data/app/documents/evidences/`). Este directorio **no es limpiado automáticamente** por el sistema operativo.

**Paso 2 — Compresión inteligente:**  
Antes de guardar, la imagen se procesa con `flutter_image_compress`:
- **Resolución:** Se redimensiona de resolución original (hasta 4K: 4032×3024) a un máximo de 1080×1080 píxeles.
- **Calidad:** Se comprime al 75% de calidad JPEG, que es visualmente indistinguible del original pero ocupa significativamente menos espacio.

**Comparativa de tamaño:**

| Métrica | Antes (MVP) | Después (Enterprise) | Ahorro |
|---------|-------------|---------------------|--------|
| Tamaño promedio por foto | ~8 MB | ~350 KB | **95.6%** |
| 50 fotos/día (un reponedor) | ~400 MB | ~17.5 MB | **382.5 MB/día** |
| 30 reponedores × 22 días/mes | ~264 GB/mes | ~11.55 GB/mes | **252.45 GB/mes** |

**Justificación técnica:**

El ahorro en datos móviles es fundamental para la viabilidad comercial del producto. Los planes de datos corporativos en Latinoamérica suelen tener límites de 5 GB a 15 GB mensuales. Sin compresión, un solo reponedor podría agotar su plan de datos en pocos días solo con las evidencias fotográficas.

Además, la implementación incluye un mecanismo de **fallback**: si la compresión falla por cualquier motivo (archivo corrupto, formato no soportado), el sistema copia el archivo original sin comprimir, garantizando que la evidencia nunca se pierde.

---

## 4. Resumen de Archivos Modificados

| Archivo | Tipo de cambio | Descripción |
|---------|---------------|-------------|
| `pubspec.yaml` | Modificado | Se agregaron 7 dependencias Enterprise |
| `lib/data/database_helper.dart` | **Nuevo** | Motor de base de datos SQLite con tablas y CRUD |
| `lib/services/offline_sync_service.dart` | Reescrito | Migración de SharedPreferences a SQLite |
| `lib/services/app_connection_service.dart` | Reescrito | Integración de Workmanager para sync en segundo plano |
| `lib/services/gps_service.dart` | Reescrito | Foreground Service para GPS ininterrumpido |
| `lib/views/visit_execution_view.dart` | Modificado | Almacenamiento permanente y compresión de fotos |
| `lib/main.dart` | Modificado | Inicialización de SQLite, Workmanager y GPS Service |
| `android/app/src/main/AndroidManifest.xml` | Modificado | 6 permisos Android añadidos |

---

## 5. Dependencias Agregadas

| Paquete | Versión | Propósito | Licencia |
|---------|---------|-----------|----------|
| `sqflite` | ^2.3.0 | Base de datos SQLite para almacenamiento local robusto | BSD-2 |
| `path` | ^1.9.0 | Manipulación multiplataforma de rutas de archivos | BSD-3 |
| `path_provider` | ^2.1.3 | Acceso a directorios del sistema (documentos, caché) | BSD-3 |
| `workmanager` | ^0.5.2 | Tareas en segundo plano gestionadas por el SO | MIT |
| `flutter_background_service` | ^5.0.0 | Foreground Service para ejecución continua | MIT |
| `flutter_local_notifications` | ^18.0.0 | Notificaciones locales para el Foreground Service | BSD-3 |
| `flutter_image_compress` | ^2.3.0 | Compresión y redimensionamiento de imágenes | MIT |

---

## 6. Plan de Verificación

### 6.1 Prueba de Integridad Offline
1. Poner el dispositivo Android en **modo avión**.
2. Realizar 5 visitas completas con checklist y captura de evidencias fotográficas.
3. Cerrar completamente la aplicación (forzar detención).
4. Desactivar el modo avión.
5. **Resultado esperado:** Los 5 registros y sus fotos deben aparecer automáticamente en el dashboard web del supervisor sin que el reponedor haya abierto la aplicación.

### 6.2 Prueba de GPS Continuo
1. Iniciar el rastreo GPS desde la aplicación.
2. Bloquear la pantalla del teléfono.
3. Caminar durante 15 minutos.
4. **Resultado esperado:** La tabla `reponedor_locations` de Supabase debe mostrar registros cada 30 segundos de forma ininterrumpida durante los 15 minutos.

### 6.3 Prueba de Persistencia de Evidencias
1. Capturar 3 evidencias fotográficas en modo offline.
2. Ejecutar un limpiador de caché del sistema operativo o usar la opción "Liberar espacio" de Android.
3. Abrir la aplicación y verificar que las fotos siguen disponibles.
4. Activar la conexión a internet.
5. **Resultado esperado:** Las 3 fotos deben subirse exitosamente a Supabase Storage sin pérdida.

---

## 7. Diagrama de Arquitectura Enterprise

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO DEL REPONEDOR                    │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Cámara      │    │  GPS         │    │  Connectivity    │   │
│  │  (image      │    │  (geolocator)│    │  (connectivity   │   │
│  │   picker)    │    │              │    │   plus)          │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                     │             │
│         ▼                   ▼                     ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Compresión   │    │ Foreground   │    │ Workmanager      │   │
│  │ (flutter     │    │ Service      │    │ (Sync en         │   │
│  │  image       │    │ (background  │    │  segundo plano)  │   │
│  │  compress)   │    │  service)    │    │                  │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                     │             │
│         ▼                   │                     │             │
│  ┌──────────────┐           │                     │             │
│  │ path_provider│           │                     │             │
│  │ (almacenam.  │           │                     │             │
│  │  permanente) │           │                     │             │
│  └──────┬───────┘           │                     │             │
│         │                   │                     │             │
│         ▼                   │                     │             │
│  ┌──────────────────────────┴─────────────────────┘             │
│  │                    SQLite (sqflite)                          │
│  │  ┌─────────────────┐  ┌──────────────────────┐              │
│  │  │ pending_tasks   │  │ pending_evidences    │              │
│  │  │ (retry_count)   │  │ (retry_count)        │              │
│  │  └─────────────────┘  └──────────────────────┘              │
│  └──────────────────────────┬──────────────────────             │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ Internet (WiFi / 4G)
                              ▼
                 ┌────────────────────────────┐
                 │      SUPABASE (Nube)       │
                 │  ┌──────────────────────┐  │
                 │  │ task_logs (tabla)     │  │
                 │  │ reponedor_locations   │  │
                 │  │ task-evidences (bucket)│  │
                 │  └──────────────────────┘  │
                 └────────────────────────────┘
```

---

*Documento generado como parte del desarrollo del proyecto TRACE V — Grupo Venado.*  
*Todos los cambios fueron implementados sobre la rama `feature/FlutterJoseca` del repositorio.*

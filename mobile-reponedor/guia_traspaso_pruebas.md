# Bitácora de Proyecto y Guía de Traspaso: TRACE V (mobile-reponedor)

Este documento centraliza todo el historial de desarrollo, decisiones de arquitectura, requerimientos funcionales mapeados, integraciones de código realizadas desde el principio, plan de pruebas detallado y tareas pendientes en la aplicación móvil Flutter `mobile-reponedor` para Industrias Venado.

---

## 1. HISTORIAL DE TRABAJO Y DECISIONES (Desde el Inicio)

La aplicación `mobile-reponedor` nació como un prototipo frontend estático. El objetivo de este proyecto ha sido implementar la lógica real del negocio conectándola al backend de **Supabase (PostgreSQL)** y al hardware del dispositivo (GPS).

A continuación se detallan las decisiones y desarrollos realizados desde el principio:

### A. Autenticación Integrada (RF-06)
* **El Problema Inicial:** El inicio de sesión utilizaba credenciales mockeadas en código sin validar nada contra la base de datos real.
* **La Solución Realizada:**
  * Se integró el cliente de autenticación de Supabase (`Supabase.instance.client.auth`).
  * Se configuró para que intente iniciar sesión en el backend real mediante correo y contraseña.
  * **Manejo de Fallback (Modo Demo):** Se mantuvo de forma intencional el usuario demo (`cmendoza` con contraseña `demo1234`) para que la aplicación cargue datos mock localmente si no hay conexión a internet o la base de datos de Supabase no está disponible, garantizando que el pitch o demo al cliente Venado nunca falle por un problema de conectividad externa.

### B. Carga de Rutas Reales (RF-06 / RF-07)
* **El Problema Inicial:** La app leía una tabla de prueba llamada `route_stops` que no existía en el esquema definitivo de Venado.
* **La Solución Realizada:**
  * Se reescribió por completo la lógica en un nuevo servicio repositorio [route_repository.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/services/route_repository.dart) conectado a las tablas reales:
    1. Consulta `daily_routes_plan` filtrando por el ID del reponedor autenticado y la fecha de hoy.
    2. Extrae el arreglo `optimized_pos_sequence` (lista ordenada de IDs de PDVs).
    3. Consulta `points_of_sale` con el operador `.inFilter('id', sequence)`.
    4. Re-ordena los PDVs recibidos en Dart para asegurar que coincidan exactamente con la secuencia sugerida por el motor de optimización, ya que SQL no garantiza el orden de inserción de un filtro `IN`.
    5. Consulta `task_logs` para verificar qué PDVs ya se marcaron como visitados hoy y reflejar su estado en la pantalla principal.
    6. Consulta `micro_tasks` y filtra en la aplicación las tareas en base a la categoría del punto de venta (`category`).

### C. GPS Tracking en Tiempo Real (RF-08)
* **El Problema Inicial:** No había ningún tipo de recolección geográfica en segundo plano.
* **Fase de Análisis de Alternativas:**
  * *Opción A (Ubicación en Vivo - ELEGIDA):* Hacer un UPSERT de un solo registro de ubicación actual por reponedor en la tabla `reponedor_locations` cada 30 segundos.
  * *Opción B (Historial de Ruta):* Almacenar un histórico fila por fila en `reponedor_routes_history`. Se descartó temporalmente para evitar saturar la base de datos con millones de registros y optimizar el rendimiento de Supabase.
* **La Solución Realizada:**
  * Se construyó un servicio singleton [gps_service.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/services/gps_service.dart).
  * Al hacer login (real o demo), inicia el rastreo del GPS nativo.
  * Realiza la llamada de actualización de ubicación en `reponedor_locations` de forma automatizada cada 30 segundos en segundo plano.
  * Al hacer logout, el servicio se detiene inmediatamente.
  * Se creó la tabla `reponedor_locations` en Supabase para soportar esta característica.

### D. Geofencing y validación automática de llegada
* **El Problema Inicial:** El reponedor dependía puramente de presionar un botón manual de simulación para poder iniciar sus tareas.
* **La Solución Realizada:**
  * Al abrir la pantalla de tareas de un PDV, un timer analiza la ubicación cada 10 segundos.
  * Si el reponedor se encuentra a **menos de 50 metros** del PDV (calculado matemáticamente mediante la fórmula de Haversine), la aplicación lo notifica con un banner verde y desbloquea el checklist de micro-tareas de inmediato.
  * Si el PDV no tiene coordenadas asignadas en Supabase (Latitud/Longitud nulos), la app habilita automáticamente el botón manual de simulación para evitar que la aplicación quede bloqueada.

---

## 2. MAQUEO DE REQUISITOS FUNCIONALES (RF)

| Código | Requisito Funcional | Estado Actual | Componente en Código |
| --- | --- | --- | --- |
| **RF-06** | Autenticación y Perfil de Checklist | **Completado** | [login_view.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/views/login_view.dart) & [route_repository.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/services/route_repository.dart) |
| **RF-07** | Navegación Secuencial Asistida | **Completado** | [route_view.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/views/route_view.dart) (Secuencia desde optimized_pos_sequence) |
| **RF-08** | Captura de Trayecto en Segundo Plano | **Completado** | [gps_service.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/services/gps_service.dart) (Sincronización a `reponedor_locations` cada 30s) |
| **RF-09** | Registro Granular de Tareas y Evidencia | **Parcial** | [visit_execution_view.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/views/visit_execution_view.dart) (Checklist interactivo y escritura en `task_logs`, falta subir foto física al Storage) |
| **RF-10** | Sincronización Autónoma Offline | **Pendiente** | Se planea guardar en cache SQLite/SharedPreferences cuando no haya internet. |

---

## 3. GUÍA DE PRUEBAS (Cómo probar en Chrome)

Como la app se está ejecutando actualmente en el navegador (`flutter run -d chrome`), las pruebas se realizan simulando los componentes del dispositivo con Chrome DevTools:

### Prueba 1: Carga de Rutas desde Supabase
1. Ingresa a la consola de **Supabase** -> **Authentication** -> Copia el UUID de tu reponedor de pruebas (ej: `carlos@venado.com`).
2. Verifica en la tabla `daily_routes_plan` que exista un plan activo para hoy asignado a ese UUID.
3. Inicia sesión con esas credenciales en la app.
4. **Resultado esperado:** Deberás visualizar la ruta y un banner verde arriba que indica: `"Ruta cargada desde Supabase ✓"`.

### Prueba 2: Tracking GPS Activo (Envío cada 30s)
1. Con la app abierta en Chrome, presiona **F12** -> Clic en el menú de 3 puntos en las herramientas de desarrollo -> **More tools** -> **Sensors**.
2. En **Location**, selecciona **Custom location** e introduce coordenadas de prueba (ej: Lat `-17.7863`, Lng `-63.1812`).
3. Inicia sesión en la aplicación. Asegúrate de dar permisos de ubicación a la pestaña en Chrome.
4. Consulta la tabla `reponedor_locations` en Supabase.
5. **Resultado esperado:** Verás aparecer una fila con el UUID del usuario y las coordenadas simuladas. Cambia la ubicación en Sensors y comprueba que se actualice sola antes de 30 segundos en Supabase.

### Prueba 3: Geofencing y Desbloqueo Automático de checklist
1. Obtén la Lat/Lng de un PDV que tengas asignado hoy en la tabla `points_of_sale`.
2. En las DevTools de Chrome (**Sensors**), configura tu ubicación simulada exactamente con esas coordenadas del PDV.
3. En la aplicación, ingresa a ver los detalles de ese PDV.
4. **Resultado esperado:** En un lapso de 10 segundos, la app mostrará un mensaje verde: `"GPS: Llegada al PDV detectada ✓"` y el checklist de micro-tareas se desbloqueará de forma automática.

---

## 4. TAREAS PENDIENTES (Siguientes Pasos para tu Compañero)

1. **Subida de fotos de evidencia a Supabase Storage (RF-09):**
   * Configurar un bucket de almacenamiento público llamado `evidencias` en Supabase.
   * Modificar el flujo de la cámara en [visit_execution_view.dart](file:///d:/GRUPO_V/G_VENADO/mobile-reponedor/lib/views/visit_execution_view.dart) para que al tomar la foto, el archivo binario se suba a Supabase Storage y la URL pública devuelta se guarde en la tabla `task_logs`.
2. **Listener de Expiración de Sesión:**
   * Agregar un stream listener para `Supabase.instance.client.auth.onAuthStateChange` que redirija al usuario al login inmediatamente si la sesión se invalida o expira.
3. **Mapeo Offline (RF-10):**
   * Implementar persistencia local para que las ubicaciones del GPS se guarden en caché cuando no haya internet y se sincronicen en ráfaga (batch) cuando se recupere la señal.

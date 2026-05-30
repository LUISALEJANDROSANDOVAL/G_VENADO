# Plataforma de Optimización Inteligente de Rutas y Cobertura de Reponedores

## 1. Enfoques de Solución (Arquitectura Funcional)

Para destacar ante el jurado de Industrias Venado, el ecosistema se estructurará como una **Plataforma de Optimización de Campo en Tiempo Real y Feedback Loop Continuo**. La arquitectura divide el sistema en dos módulos perfectamente conectados mediante tecnología híbrida, ideal para un MVP de alto impacto visual y técnico.

```
[Móvil: Flutter (Reponedor)] ---> (Supabase Realtime / PostGIS) ---> [Web: Next.js (Supervisor)]
         │                                                                   │
         └─ (Registro de Micro-tareas) -> [Feedback Loop BI] <── (Reasignación de Carga)

```

### Enfoque A: "The Control Tower" (Dashboard Web del Supervisor)

Un centro de mando analítico y geográfico diseñado con **Next.js** y **Tailwind CSS** para los coordinadores de operaciones en oficina.

* 
**Motor de Ruteo Inteligente y Distribución de Carga**: En lugar de usar itinerarios intuitivos o fijos, el sistema procesa el listado de Puntos de Venta (PDV) y distribuye dinámicamente la carga de trabajo diaria cruzando la clasificación del cliente (Pareto, Mayorista, Detallista) con la disponibilidad del equipo.


* 
**Reajuste Dinámico de Rutas en Caliente**Si un reponedor se retrasa debido a una alta carga operativa en un cliente Pareto, el supervisor puede reasignar los PDV restantes no visitados a otro reponedor cercano con un solo clic, enviando la actualización de inmediato a su dispositivo.


* 
**Métricas de Cobertura y Desviaciones en Vivo**: Gráficos interactivos en tiempo real que comparan el tiempo planificado versus el tiempo real invertido por micro-tarea, alertando proactivamente sobre posibles quiebres de stock o retrasos geográficos.



### Enfoque B: "FieldOps Reponedores" (Aplicación Móvil en Flutter)

La herramienta nativa en **Flutter** optimizada para el uso rápido y fluido del personal en el punto de venta, permitiendo capturar datos sin fricción técnica.

* 
**Secuenciación de Visitas por Tipo de Cliente**: La app muestra la secuencia exacta de los PDV a visitar, desplegando un checklist dinámico de micro-tareas (limpieza, bandeo, material POP) configurado específicamente según el perfil del comercio.


* 
**Geofencing de Validación**: Utiliza el GPS en segundo plano para detectar automáticamente el ingreso del reponedor al radio del PDV, registrando la hora exacta de llegada y habilitando el inicio de las tareas.


* 
**Cronómetro de Micro-tareas**: Permite marcar de forma precisa el inicio y fin de cada actividad individual, recolectando la información granular requerida para eliminar los "tiempos promedio".


* 
**Modo Offline-First**: Indispensable para mercados cerrados o zonas periféricas de Santa Cruz con conectividad inestable. La app almacena localmente los estados de las tareas, marcas de tiempo y fotografías de respaldo, sincronizándolos automáticamente al recuperar señal.



### Backend, Base de Datos y Sincronización

* 
**Backend & DB**: **Supabase** integrado con **PostgreSQL**. Provee mecanismos inmediatos de autenticación segura para los reponedores y almacenamiento (Storage) optimizado para las fotos de respaldo de la ejecución de micro-tareas.


* 
**Procesamiento Geográfico (PostGIS)**: Activación de la extensión **PostGIS** en PostgreSQL. Es la pieza clave para calcular la densidad geográfica de los puntos, distancias reales de traslado entre comercios del Canal Tradicional y procesar coordenadas nativamente.


* 
**Tiempo Real (Supabase Realtime)**: Conexión mediante WebSockets que refleja instantáneamente el avance del checklist del reponedor en el mapa del supervisor web, demostrando una ejecución transparente y reactiva.


* 
**APIs de Mapas y Ruteo**: Integración con **Mapbox Optimization API** u **OSRM** para resolver matemáticamente la distribución geográfica óptima a partir de la matriz de distancias entre PDVs.



---

## 2. Requisitos Funcionales (RF)

### A. Web Administrativa (El Cerebro Operativo)

| Código | Requisito Funcional | Descripción Detallada |
| --- | --- | --- |
| **RF-01** | Ingesta de Base de Datos de PDVs | El sistema debe permitir cargar el listado maestro de puntos de venta de Industrias Venado, incluyendo clasificación (Pareto, Mayorista, Detallista) y sus coordenadas geográficas fijas.

 |
| **RF-02** | Motor de Optimización con Feedback Loop | El sistema debe calcular las rutas diarias combinando de forma obligatoria dos variables: los **tiempos reales históricos por micro-tarea** (Criterio Primario) y las **distancias/tiempos de traslado entre PDVs** (Criterio Secundario).

 |
| **RF-03** | Monitoreo Geográfico en Tiempo Real | Renderizado de un mapa interactivo centralizado que muestre la ubicación en vivo de los reponedores y el estado actual de la visita de campo mediante WebSockets.

 |
| **RF-04** | Redireccionamiento Dinámico de Cobertura | El supervisor debe poder reasignar PDVs específicos entre hojas de trabajo activas en caliente ante imprevistos en campo, actualizando el dispositivo del reponedor inmediatamente.

 |
| **RF-05** | Dashboard Analytics & Exportación BI | Panel de control con KPIs clave: Desviación de Planificado vs Real, minutos efectivos por tipo de tarea, tasa de cobertura de la zona y base de datos exportable lista para herramientas de Business Intelligence.

 |

### B. Aplicación en Flutter (Los Ojos en el Punto de Venta)

| Código | Requisito Funcional | Descripción Detallada |
| --- | --- | --- |
| **RF-06** | Autenticación y Perfil de Checklist | El reponedor inicia sesión de forma segura y visualiza su ruta asignada. El sistema carga dinámicamente el checklist de micro-tareas correspondiente al tipo de cliente asignado.

 |
| **RF-07** | Navegación Secuencial Asistida | Visualización del orden óptimo de visita en un mapa interno con la opción de lanzar la navegación geográfica en herramientas externas (Google Maps/Waze).

 |
| **RF-08** | Captura de Trayecto en Segundo Plano | Rastreo automatizado de las coordenadas GPS del reponedor cada 30 segundos durante los traslados para calcular con exactitud los tiempos reales de viaje entre PDVs.

 |
| **RF-09** | Registro Granular de Tareas y Evidencia | Interfaz táctil para marcar individualmente el inicio y fin de cada micro-tarea (limpieza, bandeo, etc.), obligando o permitiendo la captura fotográfica como respaldo digital de la ejecución.

 |
| **RF-10** | Sincronización Autónoma Offline | En caso de pérdida de señal, la aplicación debe congelar los timestamps de las micro-tareas y almacenar las fotos localmente, ejecutando la sincronización en background al detectar red.

 |

---

## 3. Casos de Estudio (Escenarios de Simulación para el Pitch)

Durante el demo ante el jurado de Industrias Venado, estos tres escenarios reales validarán que el software resuelve directamente sus dolores operativos desplazando la intuición por datos matemáticos.

### Caso de Estudio 1: El Cuello de Botella Operativo en el 4to Anillo (Gestión de Tiempos Reales)

* 
**El Problema**: El Reponedor A está asignado a un cliente de categoría Pareto ubicado en la zona del 4to Anillo (un mercado mayorista de alta concurrencia en Santa Cruz). Debido al desorden de stock en el PDV, la micro-tarea de limpieza y colocación de material POP (que usualmente se estimaba de forma intuitiva en 20 minutos) le toma 1 hora y 15 minutos. Esto genera un retraso masivo que pone en riesgo la cobertura de los siguientes 4 puntos detallistas de la jornada.


* **La Solución del Ecosistema**:
1. El módulo de la App en Flutter registra con precisión exacta el exceso de tiempo consumido en las marcas del checklist del cliente Pareto.


2. Al cerrarse la visita, el **Feedback Loop** calcula que el Reponedor A no logrará cubrir su zona diaria. El Dashboard del Supervisor emite una alerta visual: *"Desviación Crítica de Cobertura en Zona 4to Anillo"*.


3. El administrador ejecuta la re-optimización en caliente. El sistema detecta mediante PostGIS que el Reponedor B está libre, a solo 8 minutos de distancia y con capacidad instalada disponible.


4. El motor remueve automáticamente los comercios detallistas en riesgo del Reponedor A y los inyecta en la app en Flutter del Reponedor B en tiempo real, garantizando la máxima cobertura del mercado y evitando quiebres de stock.





### Caso de Estudio 2: Equilibrio de Carga Eficiente (Matriz de Doble Criterio vs. Intuición)

* 
**El Problema**: Un reponedor de la vieja escuela organiza su ruta basándose únicamente en "cercanía geográfica" o intuición. Decide visitar de forma consecutiva 3 clientes Mayoristas grandes porque están en la misma avenida. Al llegar, se encuentra con que cada uno exige micro-tareas complejas de bandeo masivo de salsas Kris, saturando sus capacidades físicas y de tiempo, dejando desatendidos 10 puntos Detallistas pequeños aledaños durante el resto del día.


* **La Solución del Ecosistema**:
1. Al planificar las hojas de trabajo, el motor de ruteo inteligente de la plataforma cruza obligatoriamente los datos históricos granulares de la base de datos (Criterio Primario: minutos efectivos reales por micro-tarea según tipo de cliente) con la densidad geográfica (Criterio Secundario).


2. El algoritmo detecta matemáticamente que concentrar tres clientes Mayoristas en una sola ruta destruye la eficiencia de cobertura del día.


3. El sistema distribuye de forma equilibrada la carga de trabajo: asigna un balance óptimo de 1 cliente Mayorista complejo intercalado estratégicamente con puntos Detallistas de rápida ejecución en la app de Flutter, eliminando los saltos logísticos ineficientes y optimizando la productividad global del equipo.





### Caso de Estudio 3: Construcción de Inteligencia de Negocios (BI) y Evidencia en Campo

* 
**El Problema**: Tradicionalmente, la supervisión de Industrias Venado evalúa la productividad con base en reportes en papel o reportes de asistencia general, sin saber con exactitud si el tiempo en campo se invierte en limpiar góndolas, negociar espacios de bandeo o simplemente se pierde en el traslado. No hay trazabilidad ni feedback loop para mejorar las decisiones del negocio.


* **La Solución del Ecosistema**:
1. El reponedor llega al PDV, el Geofencing valida su presencia y la app le permite iniciar el checklist de micro-tareas.


2. Al ejecutar el bandeo y la limpieza, el reponedor utiliza la cámara integrada en la App de Flutter para capturar fotografías del antes y después como respaldo digital inviolable.


3. Al finalizar la jornada, todos estos datos estructurados de tiempos micro-granulares y archivos fotográficos se consolidan de forma limpia en la base de datos centralizada de Supabase.


4. Esta información alimenta de manera continua un feedback loop que automatiza la sugerencia de rutas futuras y genera un repositorio analítico de BI de alta confianza, permitiendo a la gerencia identificar qué micro-tareas específicas generan mayores cuellos de botella por tipo de cliente.

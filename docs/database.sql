-- =====================================================================
-- SCRIPT DE PRODUCCIÓN COMPLETO Y CORREGIDO (SUPABASE + POSTGIS NATIVO)
-- PROYECTO: OPTIMIZACIÓN LOGÍSTICA - INDUSTRIAS VENADO (BOLIVIA)
-- AUTOR: JORGE LUIS AYALA PANIAGUA & EQUIPO (INNOVAHACK 2026)
-- =====================================================================

-- 1. PREPARACIÓN DE EXTENSIONES Y DOMINIOS DE DATOS (ENUMS)
-- =====================================================================
-- Activamos PostGIS para el manejo de coordenadas planetarias, geocercas,
-- y cálculo de trayectorias reales/óptimas en formato geométrico nativo.
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

DO $$ 
BEGIN
    -- Roles de usuario admitidos en la plataforma (Next.js Web / Flutter Móvil)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('SUPERVISOR', 'REPONEDOR');
    END IF;
    
    -- Clasificación estratégica de clientes basada en volumen y canales tradicionales de Bolivia
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_tier') THEN
        CREATE TYPE public.client_tier AS ENUM ('PARETO', 'MAYORISTA', 'MINORISTA', 'DETALLISTA');
    END IF;
    
    -- Ciclo de vida logístico de la hoja de ruta de distribución diaria
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_status') THEN
        CREATE TYPE public.route_status AS ENUM ('ASIGNADA', 'EN_PROCESO', 'COMPLETADA', 'DESVIADA');
    END IF;
END $$;


-- 2. ESTRUCTURA DE TABLAS (Ordenado estrictamente por dependencias de llaves foráneas)
-- =====================================================================

-- TABLA: users
-- Controla las identidades del personal del proyecto. Sincronizable con Supabase Auth.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    email character varying NOT NULL UNIQUE,
    role public.user_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- TABLA: daily_routes_plan
-- La verdadera Torre de Control de la jornada. Mapea la planificación matemática matutina.
-- Contiene tanto el orden secuencial en texto como la línea geométrica óptima calculada por la IA.
CREATE TABLE IF NOT EXISTS public.daily_routes_plan (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    reponedor_id uuid,
    date date NOT NULL DEFAULT CURRENT_DATE,
    
    -- TRAZABILIDAD MATRICIAL EN TEXTO (Secuencias de IDs de puntos de venta)
    optimized_pos_sequence character varying[] NOT NULL,  -- Ruta óptima teórica (Ej: ['101', '102', '103'])
    sequence_executed_ids character varying[] DEFAULT '{}'::character varying[], -- Orden real de visitas ejecutadas
    
    -- GEOMETRÍA POSTGIS EN VIVO PARA LEAFLET (PRE-CALCULADA AL INICIAR EL DÍA)
    -- Contiene la traza o vector del camino ideal mapeado sobre las calles de Bolivia
    route_path_optimal public.geometry(LineString, 4326), 
    
    status public.route_status DEFAULT 'ASIGNADA'::public.route_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_routes_plan_pkey PRIMARY KEY (id),
    CONSTRAINT daily_routes_plan_reponedor_id_fkey FOREIGN KEY (reponedor_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT uq_reponedor_date_plan UNIQUE (reponedor_id, date)
);

-- TABLA: micro_tasks
-- Catálogo dinámico de las tareas obligatorias en góndola (Inventario, Limpieza, POP).
CREATE TABLE IF NOT EXISTS public.micro_tasks (
    id SERIAL,
    task_name character varying NOT NULL,
    -- Filtro de asignación automática de tareas según el tipo de cliente segmentado
    client_category character varying NOT NULL CHECK (client_category::text = ANY (ARRAY['PARETO'::character varying, 'MAYORISTA'::character varying, 'MINORISTA'::character varying, 'DETALLISTA'::character varying, 'TODOS'::character varying]::text[])),
    is_active boolean DEFAULT true,
    CONSTRAINT micro_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT uq_task_name_category UNIQUE (task_name, client_category) -- Evita duplicados en semillas
);

-- TABLA: points_of_sale (PDVs)
-- Almacena los puntos geográficos de los comercios. Adaptado para incluir Mercados Tradicionales.
CREATE TABLE IF NOT EXISTS public.points_of_sale (
    id character varying NOT NULL,                    -- Código único extraído del dataset corporativo (Ej: '111886')
    name character varying NOT NULL,                  -- Nombre/Código de cliente interno (Ej: 'GV001')
    market character varying NOT NULL,                -- MERCADO O ZONA TRADICIONAL DE BOLIVIA (Ej: 'MERCADO RODRIGUEZ', 'ABASTO')
    category public.client_tier NOT NULL,             -- Pareto, Mayorista o Detallista
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    geom public.geometry(Point, 4326),                -- Punto binario georreferenciado nativo (EPSG:4326 WGS84)
    base_duration_minutes integer NOT NULL,           -- Tiempo estimado base de auditoría en minutos
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT points_of_sale_pkey PRIMARY KEY (id)
);

-- TABLA: reponedor_routes_history
-- Historial de telemetría consolidado al cierre de la jornada. Alimenta el Feedback Loop.
CREATE TABLE IF NOT EXISTS public.reponedor_routes_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    route_plan_id uuid UNIQUE,                        -- Enlace 1-a-1 único para evitar duplicación del historial
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    travel_time_minutes integer,                      -- Tiempo real total consumido en traslados
    distance_meters numeric,                          -- Kilometraje total calculado métricamente por PostGIS
    
    -- GEOMETRÍAS COMPLEMENTARIAS PARA COMPARACIÓN EN LEAFLET
    route_path_executed public.geometry(LineString, 4326), -- El camino real que el reponedor caminó/condujo
    route_coverage_polygon public.geometry(Polygon, 4326),  -- Polígono de cobertura del mercado atendido (Convex Hull)
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reponedor_routes_history_pkey PRIMARY KEY (id),
    CONSTRAINT reponedor_routes_history_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id) ON DELETE CASCADE
);

-- TABLA: task_logs
-- Registro granular transaccional de marcas de tiempo por micro-tarea. Soporta Modo Offline.
CREATE TABLE IF NOT EXISTS public.task_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    route_plan_id uuid,
    pos_id character varying,
    task_id integer,
    start_time timestamp with time zone NOT NULL,     -- Marca "Iniciar" en Flutter
    end_time timestamp with time zone,               -- Marca "Completar" en Flutter
    duration_seconds integer,                         -- Autocalculado por Trigger para métricas de efectividad
    photo_url text,                                   -- Captura fotográfica de respaldo en Supabase Storage
    is_offline boolean DEFAULT false,                 -- Bandera de resiliencia para mercados sin cobertura de red
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_logs_pkey PRIMARY KEY (id),
    CONSTRAINT task_logs_pos_id_fkey FOREIGN KEY (pos_id) REFERENCES public.points_of_sale(id) ON DELETE RESTRICT,
    CONSTRAINT task_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.micro_tasks(id) ON DELETE RESTRICT,
    CONSTRAINT task_logs_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id) ON DELETE CASCADE,
    CONSTRAINT chk_task_log_times CHECK (end_time IS NULL OR end_time >= start_time) -- Validación horaria
);

-- TABLA INDEPENDIENTE: route_execution_proofs
-- Repositorio aislado de auditoría de desvíos de ruta, testigos e incidencias de cierres.
-- Mantiene las tablas operativas veloces y previene la degradación por strings pesados de fotos.
CREATE TABLE IF NOT EXISTS public.route_execution_proofs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    route_plan_id uuid NOT NULL,
    pos_id character varying NOT NULL,
    
    -- Control de secuencias matemáticas vs realidad en calle
    optimal_sequence_index integer NOT NULL,          -- Índice de orden asignado por la IA (Teórico)
    executed_sequence_index integer NOT NULL,         -- Índice de orden real en que se visitó (Ejecutado)
    
    is_deviation boolean DEFAULT false,               -- Alerta de alteración de ruta óptima
    is_closed_incidency boolean DEFAULT false,        -- Alerta de Punto de Venta cerrado al llegar (Corregido)
    
    deviation_justification text,                     -- Declaración humana escrita en la app
    incidency_photo_url text,                         -- Enlace de la fotografía de la persiana/tienda cerrada
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT route_execution_proofs_pkey PRIMARY KEY (id),
    CONSTRAINT route_execution_proofs_route_plan_id_fkey FOREIGN KEY (route_plan_id) REFERENCES public.daily_routes_plan(id) ON DELETE CASCADE,
    CONSTRAINT route_execution_proofs_pos_id_fkey FOREIGN KEY (pos_id) REFERENCES public.points_of_sale(id) ON DELETE RESTRICT,
    CONSTRAINT uq_route_pos_proof UNIQUE (route_plan_id, pos_id)
);


-- 3. ÍNDICES DE ALTA VELOCIDAD ESPACIALES Y ANALÍTICOS (GIST & B-TREE)
-- =====================================================================
-- Índices GIST: Permiten renderizados instantáneos de capas vectoriales masivas en Leaflet
CREATE INDEX IF NOT EXISTS idx_pos_geom ON public.points_of_sale USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_plan_path_opt ON public.daily_routes_plan USING gist (route_path_optimal);
CREATE INDEX IF NOT EXISTS idx_history_path_exe ON public.reponedor_routes_history USING gist (route_path_executed);
CREATE INDEX IF NOT EXISTS idx_history_polygon ON public.reponedor_routes_history USING gist (route_coverage_polygon);

-- Índices B-TREE ordinarios: Optimizan las queries de agregación y joins del Dashboard de Next.js
CREATE INDEX IF NOT EXISTS idx_task_logs_analysis ON public.task_logs (pos_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_route_plan_id ON public.task_logs (route_plan_id); -- Optimiza la carga del Dashboard
CREATE INDEX IF NOT EXISTS idx_proofs_lookup ON public.route_execution_proofs (route_plan_id, pos_id);


-- 4. FUNCIONES DE PROCESAMIENTO AUTOMÁTICO (TRIGGERS / PROCEDIMIENTOS)
-- =====================================================================

-- FUNCIÓN A: Construcción automática del objeto geométrico binario PostGIS (Point)
CREATE OR REPLACE FUNCTION public.generate_pos_geom()
RETURNS trigger AS $$
BEGIN
    NEW.geom := public.ST_SetSRID(public.ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN B: Cómputo matemático preciso en segundos de la duración de micro-tareas en góndola
CREATE OR REPLACE FUNCTION public.calculate_task_duration()
RETURNS trigger AS $$
BEGIN
    IF NEW.end_time IS NOT NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time));
    ELSE
        NEW.duration_seconds := NULL; -- Si se limpia el end_time, vaciamos los segundos
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5. ASIGNACIÓN DE DISPARADORES DE EVENTOS DE BASE DE DATOS
-- =====================================================================
CREATE OR REPLACE TRIGGER trg_generate_pos_geom
    BEFORE INSERT OR UPDATE ON public.points_of_sale
    FOR EACH ROW EXECUTE FUNCTION public.generate_pos_geom();

CREATE OR REPLACE TRIGGER trg_calculate_task_duration
    BEFORE INSERT OR UPDATE ON public.task_logs
    FOR EACH ROW EXECUTE FUNCTION public.calculate_task_duration();


-- 6. VISTA GEOMETRÍAS CONSOLIDADAS EN GEOJSON (LISTO PARA CONSUMO EN LEAFLET)
-- =====================================================================
DROP VIEW IF EXISTS public.v_leaflet_routes_delivery;

CREATE VIEW public.v_leaflet_routes_delivery AS
SELECT 
    drp.id AS plan_id,
    drp.reponedor_id,
    drp.date,
    drp.status AS estado_plan,
    rh.travel_time_minutes,
    rh.distance_meters,
    
    -- Telemetría e Indicadores Analíticos embebidos (Corregido con is_closed_incidency)
    (SELECT COUNT(*)::int FROM public.route_execution_proofs rep WHERE rep.route_plan_id = drp.id AND rep.is_deviation = true) AS total_desviaciones,
    (SELECT COUNT(*)::int FROM public.route_execution_proofs rep WHERE rep.route_plan_id = drp.id AND rep.is_closed_incidency = true) AS total_locales_cerrados,
    
    -- Transformación topológica nativa a JSON plano mapeable directamente en las capas de Leaflet
    public.ST_AsGeoJSON(drp.route_path_optimal)::json AS geojson_ruta_optima,
    public.ST_AsGeoJSON(rh.route_path_executed)::json AS geojson_ruta_realizada,
    public.ST_AsGeoJSON(rh.route_coverage_polygon)::json AS geojson_poligono_cobertura
FROM public.daily_routes_plan drp
LEFT JOIN public.reponedor_routes_history rh ON rh.route_plan_id = drp.id;


-- 7. POBLACIÓN INICIAL DEL CATÁLOGO DE MICRO-TAREAS (REQUERIMIENTOS PIZARRA DE CAMPAÑA)
-- =====================================================================
INSERT INTO public.micro_tasks (task_name, client_category) VALUES
('Inventario de Stock y Precios (Salsas Kris / Canasta Básica)', 'TODOS'),
('Limpieza profunda e higienización de góndolas', 'TODOS'),
('Generación y ordenación de estanterías (Estrategia de Capilaridad)', 'MINORISTA'),
('Instalación y Visibilidad de Material POP (Faldones Promocionales Kris)', 'PARETO'),
('Acomodo de Exhibidores Metálicos y Toldos de Marca (Bristar / Kris)', 'MAYORISTA'),
('Colocación de Gancheras de Pared y Colgantes de Caldos (Kriolla)', 'DETALLISTA'),
('Auditoría General de Material POP y Visibilidad de Marca', 'TODOS')
ON CONFLICT (task_name, client_category) DO NOTHING; -- Funciona correctamente gracias a la restricción UNIQUE

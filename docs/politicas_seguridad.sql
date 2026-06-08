-- ==============================================================================
-- SCRIPT DE SEGURIDAD Y AUDITORÍA EMPRESARIAL (ANTI-FRAUDE)
-- EJECUTAR ESTE SCRIPT EN EL EDITOR SQL DE SUPABASE
-- ==============================================================================

-- 1. CREACIÓN DE LA TABLA MAESTRA DE AUDITORÍA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    action character varying NOT NULL,
    description text NOT NULL,
    severity character varying NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    actor_email character varying DEFAULT 'sistema',
    source_table character varying NOT NULL,
    record_id character varying,
    ip_address character varying,
    device_info character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- 2. HABILITAR SEGURIDAD RLS (REGLA DE ORO DE INMUTABILIDAD)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo el sistema/autenticados pueden insertar. Nadie puede hacer UPDATE o DELETE.
CREATE POLICY "Permitir solo INSERT en auditoria" 
ON public.audit_logs FOR INSERT TO authenticated 
WITH CHECK (true);

-- Política: Solo Administradores pueden leer los logs.
CREATE POLICY "Permitir SELECT a administradores" 
ON public.audit_logs FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.email = auth.jwt()->>'email' AND users.role = 'ADMIN'
  )
);


-- 3. AGREGAR COLUMNAS ANTI-FRAUDE A TABLAS EXISTENTES
-- Soporte para GPS Spoofing, Viajes en el Tiempo y Anti-Tampering Fotográfico
DO $$ 
BEGIN
    -- Tabla: task_logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_logs' AND column_name='is_mocked') THEN
        ALTER TABLE public.task_logs ADD COLUMN is_mocked boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_logs' AND column_name='device_timestamp') THEN
        ALTER TABLE public.task_logs ADD COLUMN device_timestamp timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_logs' AND column_name='photo_metadata') THEN
        ALTER TABLE public.task_logs ADD COLUMN photo_metadata jsonb;
    END IF;

    -- Tabla: route_execution_proofs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='route_execution_proofs' AND column_name='is_mocked') THEN
        ALTER TABLE public.route_execution_proofs ADD COLUMN is_mocked boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='route_execution_proofs' AND column_name='device_timestamp') THEN
        ALTER TABLE public.route_execution_proofs ADD COLUMN device_timestamp timestamp with time zone;
    END IF;
END $$;


-- 4. FUNCIONES DISPARADORAS (TRIGGERS)

-- A. Trigger para Administración de Usuarios
CREATE OR REPLACE FUNCTION audit_users_changes() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Usuario Registrado', 'Se dio de alta el usuario: ' || NEW.email, 'low', 'users', NEW.id::text);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Usuario Modificado', 'Se alteraron datos o rol del usuario: ' || NEW.email, 'low', 'users', NEW.id::text);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Usuario Eliminado', 'Se eliminó el usuario: ' || OLD.email, 'high', 'users', OLD.id::text);
    END IF;
    RETURN NULL; -- AFTER trigger returns NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_users ON public.users;
CREATE TRIGGER trigger_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_users_changes();


-- B. Trigger para Planes de Rutas Diarias (Generación y Modificación "En Caliente")
CREATE OR REPLACE FUNCTION audit_daily_routes() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Generación de Hoja de Ruta', 'El algoritmo asignó un nuevo plan de rutas. Estado: ' || NEW.status, 'low', 'daily_routes_plan', NEW.id::text);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Modificación de Ruta "En Caliente"', 'Se alteró una ruta existente. Cambio de estado a: ' || NEW.status, 'medium', 'daily_routes_plan', NEW.id::text);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_routes ON public.daily_routes_plan;
CREATE TRIGGER trigger_audit_routes
    AFTER INSERT OR UPDATE ON public.daily_routes_plan
    FOR EACH ROW EXECUTE FUNCTION audit_daily_routes();


-- C. Trigger para Tareas Fraudulentas o Ejecución Correcta
CREATE OR REPLACE FUNCTION audit_task_logs() RETURNS TRIGGER AS $$
DECLARE
    is_fraudulent boolean := false;
    fraud_reason text := '';
    sev varchar := 'low';
    act varchar := 'Flujo de Ejecución Correcta';
BEGIN
    -- Detección de GPS Spoofing
    IF NEW.is_mocked = true THEN
        is_fraudulent := true;
        fraud_reason := fraud_reason || 'Ubicación GPS falsificada (Mocking). ';
        sev := 'high';
        act := 'Fraude por Suplantación de GPS';
    END IF;

    -- Detección de Viajes en el Tiempo (Desfase de Reloj de Hardware)
    IF NEW.device_timestamp IS NOT NULL AND abs(EXTRACT(EPOCH FROM (NEW.created_at - NEW.device_timestamp))) > 300 THEN
        is_fraudulent := true;
        fraud_reason := fraud_reason || 'Desfase severo del reloj de hardware (Time Travel). ';
        sev := 'medium';
        act := 'Desfase de Reloj de Hardware';
    END IF;

    -- Detección de Tarea Atípicamente Rápida o Prolongado Modo Offline
    IF NEW.duration_seconds < 120 THEN
        is_fraudulent := true;
        fraud_reason := fraud_reason || 'Tarea completada en tiempo irreal (< 2 mins). ';
        IF sev = 'low' THEN sev := 'medium'; act := 'Ejecución de Tarea Anómala'; END IF;
    END IF;

    IF NEW.is_offline = true THEN
        fraud_reason := fraud_reason || 'Sincronizado desde modo Offline. ';
    END IF;

    IF is_fraudulent THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES (act, 'Alerta en Tarea PDV ' || NEW.pos_id || ': ' || fraud_reason, sev, 'task_logs', NEW.id::text);
    ELSE
        -- Log silencioso e informativo (Línea Base BI)
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES (act, 'Tarea completada normalmente en PDV ' || NEW.pos_id || ' durante ' || NEW.duration_seconds || ' segs.', sev, 'task_logs', NEW.id::text);
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.task_logs;
CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT ON public.task_logs
    FOR EACH ROW EXECUTE FUNCTION audit_task_logs();


-- D. Trigger para Desviaciones de Rutas y Geocercas
CREATE OR REPLACE FUNCTION audit_route_deviations() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deviation = true THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Desviación de Ruta y Geocercas', 'Desviación detectada en PDV ' || NEW.pos_id || '. Justificación: ' || COALESCE(NEW.deviation_justification, 'N/A'), 'high', 'route_execution_proofs', NEW.id::text);
    END IF;

    -- Detección GPS Spoofing también aquí
    IF NEW.is_mocked = true THEN
        INSERT INTO public.audit_logs (action, description, severity, source_table, record_id)
        VALUES ('Fraude por Suplantación de GPS', 'Detección Mock Location en check-in del PDV ' || NEW.pos_id, 'high', 'route_execution_proofs', NEW.id::text);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_deviations ON public.route_execution_proofs;
CREATE TRIGGER trigger_audit_deviations
    AFTER INSERT ON public.route_execution_proofs
    FOR EACH ROW EXECUTE FUNCTION audit_route_deviations();

-- FIN DEL SCRIPT.

-- =====================================================================
-- SCRIPT DE INSERCIÓN DEFINITIVO - CONSOLIDACIÓN DE DATOS (TRACE V)
-- =====================================================================
-- Ejecuta este bloque completo para persistir los cambios y los datos.
-- =====================================================================

-- 1. Asegurar la existencia de la columna password en la tabla pública
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password text;

-- Iniciar la transacción real
START TRANSACTION;

DO $$
DECLARE
    reponedor_uuid uuid := 'f1e2d3c4-b5a6-9f8e-7d6c-5b4a3f2e1d0c'::uuid;
    today_date date := CURRENT_DATE;
BEGIN

    -- 2. Insertar o actualizar la reponedora (Sofía Rojas) con su contraseña
    INSERT INTO public.users (id, name, email, role, is_active, password)
    VALUES (
        reponedor_uuid,
        'Sofía Rojas',
        'sofia.rojas@venado.com',
        'REPONEDOR'::text::public.user_role, 
        true,
        'demo1234'
    )
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, 
        email = EXCLUDED.email,
        password = EXCLUDED.password;

    -- 3. Insertar Micro-tareas base para las pruebas
    INSERT INTO public.micro_tasks (id, task_name, client_category, is_active)
    VALUES 
        (1, 'Limpieza de Góndolas Kris', 'TODOS', true),
        (2, 'Bandeo de Salsas Venado', 'PARETO', true),
        (3, 'Colocación de Material POP', 'TODOS', true)
    ON CONFLICT (id) DO NOTHING;

    -- Sincronizar la secuencia del ID autoincremental
    PERFORM setval('micro_tasks_id_seq', (SELECT MAX(id) FROM public.micro_tasks));

    -- 4. Insertar Puntos de Venta (PDVs) en Santa Cruz de la Sierra
    INSERT INTO public.points_of_sale (id, name, market, category, latitude, longitude, base_duration_minutes)
    VALUES 
        ('PDV-0001', 'Hipermaxi Equipetrol', 'Santa Cruz', 'PARETO'::text::public.client_tier, -17.7689, -63.1834, 45),
        ('PDV-0002', 'Fidalga El Trompillo', 'Santa Cruz', 'MAYORISTA'::text::public.client_tier, -17.8105, -63.1804, 30),
        ('PDV-0003', 'Bodega Doña María', 'Santa Cruz', 'DETALLISTA'::text::public.client_tier, -17.7863, -63.1812, 15),
        ('PDV-0004', 'Supermercado IC Norte', 'Santa Cruz', 'PARETO'::text::public.client_tier, -17.7562, -63.1691, 45)
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, 
        category = EXCLUDED.category, 
        latitude = EXCLUDED.latitude, 
        longitude = EXCLUDED.longitude;

    -- 5. Insertar o actualizar el Plan de Ruta Optimizado Asignado para Hoy
    INSERT INTO public.daily_routes_plan (reponedor_id, date, optimized_pos_sequence, status)
    VALUES (
        reponedor_uuid,
        today_date,
        ARRAY['PDV-0001', 'PDV-0002', 'PDV-0003', 'PDV-0004'],
        'ASIGNADA'::text::public.route_status 
    )
    ON CONFLICT (reponedor_id, date) DO UPDATE 
    SET optimized_pos_sequence = EXCLUDED.optimized_pos_sequence,
        status = EXCLUDED.status;

    RAISE NOTICE 'Datos y estructura consolidados exitosamente en producción.';

END $$;

-- Confirmar y persistir la transacción en la base de datos
COMMIT;

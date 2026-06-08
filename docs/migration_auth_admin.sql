-- =====================================================================
-- MIGRACIÓN: AUTENTICACIÓN CON ROLES, PANEL ADMIN, CONTRASEÑAS
-- PROYECTO: INDUSTRIAS VENADO - TORRE DE CONTROL
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- =====================================================================

-- PASO 1: Añadir ADMIN al tipo ENUM de roles (si no existe ya)
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ADMIN' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'ADMIN';
        RAISE NOTICE 'ADMIN agregado al ENUM user_role exitosamente.';
    ELSE
        RAISE NOTICE 'ADMIN ya existe en el ENUM user_role.';
    END IF;
END $$;

-- PASO 2: Agregar columnas faltantes a la tabla users
-- =====================================================================
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS departamento CHARACTER VARYING DEFAULT NULL;

-- PASO 3: Instalar extensión pgcrypto para hashing seguro de contraseñas
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PASO 4: Crear o reemplazar la función RPC de autenticación
-- Esta función valida credenciales de manera segura sin exponer el hash
-- =====================================================================
CREATE OR REPLACE FUNCTION public.verify_user_credentials(
    p_email TEXT,
    p_password TEXT
)
RETURNS TABLE (
    id UUID,
    name CHARACTER VARYING,
    email CHARACTER VARYING,
    role_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role::TEXT AS role_name
    FROM public.users u
    WHERE 
        u.email = LOWER(p_email)
        AND u.is_active = TRUE
        AND u.password_hash IS NOT NULL
        AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

-- Hacer que la función sea accesible para el rol anon y authenticated
GRANT EXECUTE ON FUNCTION public.verify_user_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_user_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_credentials(TEXT, TEXT) TO service_role;

-- PASO 5: Crear o actualizar el usuario SUPERVISOR
-- Correo: supervisor@gmail.com | Contraseña: 12345678
-- =====================================================================
INSERT INTO public.users (name, email, role, is_active, password_hash)
VALUES (
    'Supervisor General',
    'supervisor@gmail.com',
    'SUPERVISOR',
    TRUE,
    crypt('12345678', gen_salt('bf'))
)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = TRUE,
    password_hash = crypt('12345678', gen_salt('bf')),
    name = EXCLUDED.name;

-- PASO 6: Crear o actualizar el usuario ADMINISTRADOR
-- Correo: administrador@gmail.com | Contraseña: 12345678
-- =====================================================================
INSERT INTO public.users (name, email, role, is_active, password_hash)
VALUES (
    'Administrador del Sistema',
    'administrador@gmail.com',
    'ADMIN',
    TRUE,
    crypt('12345678', gen_salt('bf'))
)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = TRUE,
    password_hash = crypt('12345678', gen_salt('bf')),
    name = EXCLUDED.name;

-- PASO 7: Actualizar el supervisor legacy (venado.com) si existe
-- =====================================================================
UPDATE public.users 
SET 
    password_hash = crypt('12345678', gen_salt('bf')),
    is_active = TRUE
WHERE email = 'supervisor@venado.com';

-- PASO 8: Verificación final - mostrar usuarios con roles de panel web
-- =====================================================================
SELECT 
    id,
    name,
    email,
    role,
    is_active,
    CASE WHEN password_hash IS NOT NULL THEN 'SET' ELSE 'NULL' END AS password_status,
    departamento,
    created_at
FROM public.users
WHERE role IN ('SUPERVISOR', 'ADMIN')
ORDER BY role, name;

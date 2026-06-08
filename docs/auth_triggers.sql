-- =====================================================================
-- Trigger para enlazar auth.users (Supabase Auth) con public.users
-- =====================================================================

-- Función que se ejecuta cada vez que se crea un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), -- Extrae el nombre o usa el prefix del correo
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'SUPERVISOR'), -- Por defecto SUPERVISOR, a menos que se mande otro rol al invitarlo
    true
  );
  RETURN NEW;
END;
$$;

-- Disparador que ejecuta la función después de INSERT en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================================
-- Migración de usuarios actuales:
-- =====================================================================
-- Para usar la nueva arquitectura, los usuarios antiguos en public.users 
-- deben ser creados en auth.users a través del Panel de Supabase o la app.

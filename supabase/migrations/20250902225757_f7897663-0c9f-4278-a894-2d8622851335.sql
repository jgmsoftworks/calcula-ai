-- Fix search path security issues for the functions
DROP FUNCTION IF EXISTS public.generate_codigo_interno(uuid);
DROP FUNCTION IF EXISTS public.auto_generate_codigo_interno();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_codigo_interno(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number integer;
    codigo_interno text;
BEGIN
    -- Get the next sequential number for this user
    SELECT COALESCE(MAX(
        CASE 
            WHEN codigo_interno ~ '^[A-Z]{3}[0-9]{4}$' 
            THEN CAST(RIGHT(codigo_interno, 4) AS integer)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM produtos 
    WHERE user_id = user_uuid;
    
    -- Format as PRD0001, PRD0002, etc.
    codigo_interno := 'PRD' || LPAD(next_number::text, 4, '0');
    
    RETURN codigo_interno;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_codigo_interno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.codigo_interno IS NULL OR NEW.codigo_interno = '' THEN
        NEW.codigo_interno := generate_codigo_interno(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_codigo_interno ON public.produtos;
CREATE TRIGGER trigger_auto_generate_codigo_interno
    BEFORE INSERT ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_codigo_interno();
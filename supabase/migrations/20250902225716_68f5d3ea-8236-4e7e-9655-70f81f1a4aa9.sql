-- Add new columns to produtos table for enhanced product management
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS marcas text[],
ADD COLUMN IF NOT EXISTS categorias text[],
ADD COLUMN IF NOT EXISTS codigo_interno text,
ADD COLUMN IF NOT EXISTS imagem_url text,
ADD COLUMN IF NOT EXISTS estoque_minimo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotulo_porcao text,
ADD COLUMN IF NOT EXISTS rotulo_kcal numeric,
ADD COLUMN IF NOT EXISTS rotulo_carb numeric,
ADD COLUMN IF NOT EXISTS rotulo_prot numeric,
ADD COLUMN IF NOT EXISTS rotulo_gord_total numeric,
ADD COLUMN IF NOT EXISTS rotulo_gord_sat numeric,
ADD COLUMN IF NOT EXISTS rotulo_gord_trans numeric,
ADD COLUMN IF NOT EXISTS rotulo_fibra numeric,
ADD COLUMN IF NOT EXISTS rotulo_sodio numeric;

-- Add unique constraint for codigo_interno per user
ALTER TABLE public.produtos 
ADD CONSTRAINT unique_codigo_interno_per_user 
UNIQUE (user_id, codigo_interno);

-- Create function to generate sequential codigo_interno
CREATE OR REPLACE FUNCTION public.generate_codigo_interno(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
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

-- Create trigger to auto-generate codigo_interno on insert if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_codigo_interno()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.codigo_interno IS NULL OR NEW.codigo_interno = '' THEN
        NEW.codigo_interno := generate_codigo_interno(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_codigo_interno
    BEFORE INSERT ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_codigo_interno();
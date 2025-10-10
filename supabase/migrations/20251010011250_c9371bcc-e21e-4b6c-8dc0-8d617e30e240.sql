-- Corrigir security issue: adicionar search_path na função de trigger
CREATE OR REPLACE FUNCTION update_promocoes_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
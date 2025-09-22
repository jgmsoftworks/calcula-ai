-- Função para incrementar contador de PDFs
CREATE OR REPLACE FUNCTION increment_pdf_count(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET pdf_exports_count = pdf_exports_count + 1
  WHERE user_id = user_uuid;
END;
$$;
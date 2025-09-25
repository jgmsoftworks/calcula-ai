-- Alterar a tabela produtos para armazenar múltiplos códigos de barras como array
-- Remover o campo codigo_barras_secundario e modificar codigo_barras para array
ALTER TABLE public.produtos 
DROP COLUMN IF EXISTS codigo_barras_secundario;

-- Alterar codigo_barras para ser um array de text
ALTER TABLE public.produtos 
ALTER COLUMN codigo_barras TYPE text[] USING CASE 
  WHEN codigo_barras IS NULL THEN NULL 
  ELSE ARRAY[codigo_barras] 
END;
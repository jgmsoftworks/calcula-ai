-- Criar função RPC para gerar número de comprovante
CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_comprovante(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 
  INTO proximo_numero
  FROM public.comprovantes 
  WHERE user_id = p_user_id;
  
  RETURN proximo_numero;
END;
$$;

-- Adicionar campos necessários na tabela movimentacoes
ALTER TABLE public.movimentacoes 
ADD COLUMN IF NOT EXISTS custo_aplicado numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS origem text DEFAULT 'mini-pdv';
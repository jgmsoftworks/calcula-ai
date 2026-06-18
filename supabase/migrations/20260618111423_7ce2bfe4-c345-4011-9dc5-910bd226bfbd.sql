-- Remover constraint/índice único antigo
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_user_id_codigo_interno_key;
DROP INDEX IF EXISTS public.produtos_user_id_codigo_interno_key;
DROP INDEX IF EXISTS public.produtos_user_id_codigo_interno_idx;

-- Criar índice único parcial: só vale para produtos ativos
CREATE UNIQUE INDEX produtos_user_codigo_ativo_unique
  ON public.produtos (user_id, codigo_interno)
  WHERE ativo = true;

-- Atualizar função para considerar apenas produtos ativos
CREATE OR REPLACE FUNCTION public.gerar_proximo_codigo_interno(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proximo_codigo INTEGER;
BEGIN
  SELECT COALESCE(MAX(codigo_interno), 0) + 1 
  INTO proximo_codigo
  FROM public.produtos 
  WHERE user_id = p_user_id
    AND ativo = true;
  
  RETURN proximo_codigo;
END;
$function$;
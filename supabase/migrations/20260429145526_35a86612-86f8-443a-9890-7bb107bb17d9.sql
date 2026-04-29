-- Remover ambas as versões existentes para evitar ambiguidade de overload
DROP FUNCTION IF EXISTS public.check_plan_limits(uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.check_plan_limits(uuid, text, integer);

-- Recriar uma única versão canônica que SEMPRE exclui sub_receita do limite de markups
CREATE OR REPLACE FUNCTION public.check_plan_limits(
  user_uuid uuid,
  feature_type text,
  feature_count integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_plan varchar(20);
  current_count integer;
  max_allowed integer;
  result jsonb;
BEGIN
  SELECT plan INTO user_plan FROM profiles WHERE user_id = user_uuid;

  IF user_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;

  CASE feature_type
    WHEN 'produtos' THEN
      SELECT COUNT(*) INTO current_count FROM produtos
        WHERE user_id = user_uuid AND ativo = true;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 30;
        WHEN 'professional' THEN max_allowed := -1;
        WHEN 'enterprise' THEN max_allowed := -1;
        ELSE max_allowed := 30;
      END CASE;

    WHEN 'receitas' THEN
      SELECT COUNT(*) INTO current_count FROM receitas
        WHERE user_id = user_uuid;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 5;
        WHEN 'professional' THEN max_allowed := 60;
        WHEN 'enterprise' THEN max_allowed := -1;
        ELSE max_allowed := 5;
      END CASE;

    WHEN 'markups' THEN
      -- Sub-receita NUNCA conta no limite (liberada para todos os planos)
      SELECT COUNT(*) INTO current_count FROM markups
        WHERE user_id = user_uuid
          AND ativo = true
          AND COALESCE(tipo, 'normal') IS DISTINCT FROM 'sub_receita';
      CASE user_plan
        WHEN 'free' THEN max_allowed := 1;
        WHEN 'professional' THEN max_allowed := 3;
        WHEN 'enterprise' THEN max_allowed := -1;
        ELSE max_allowed := 1;
      END CASE;

    WHEN 'movimentacoes' THEN
      CASE user_plan
        WHEN 'free' THEN max_allowed := 0;
        WHEN 'professional' THEN max_allowed := -1;
        WHEN 'enterprise' THEN max_allowed := -1;
        ELSE max_allowed := 0;
      END CASE;
      current_count := 0;

    WHEN 'pdf_exports' THEN
      PERFORM reset_monthly_pdf_counter();
      SELECT pdf_exports_count INTO current_count FROM profiles
        WHERE user_id = user_uuid;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 0;
        WHEN 'professional' THEN max_allowed := 80;
        WHEN 'enterprise' THEN max_allowed := -1;
        ELSE max_allowed := 0;
      END CASE;

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_feature_type');
  END CASE;

  IF max_allowed = -1 OR (COALESCE(current_count, 0) + feature_count) <= max_allowed THEN
    result := jsonb_build_object(
      'allowed', true,
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', user_plan
    );
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'limit_exceeded',
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', user_plan
    );
  END IF;

  RETURN result;
END;
$function$;

-- Normalizar registros: qualquer markup chamado "subreceita"/"sub_receita"/"sub-receita"
-- precisa estar marcado como tipo = 'sub_receita' para não consumir o limite.
UPDATE public.markups
SET tipo = 'sub_receita'
WHERE ativo = true
  AND tipo IS DISTINCT FROM 'sub_receita'
  AND lower(regexp_replace(coalesce(nome,''), '[\s_-]', '', 'g')) = 'subreceita';
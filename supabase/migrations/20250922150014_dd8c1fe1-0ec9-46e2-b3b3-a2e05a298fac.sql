-- Adicionar campo de plano na tabela profiles
ALTER TABLE profiles ADD COLUMN plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'professional', 'enterprise'));
ALTER TABLE profiles ADD COLUMN plan_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN pdf_exports_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN pdf_exports_reset_at TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', now());

-- Função para resetar contador de PDFs mensalmente
CREATE OR REPLACE FUNCTION reset_monthly_pdf_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET pdf_exports_count = 0,
      pdf_exports_reset_at = date_trunc('month', now())
  WHERE pdf_exports_reset_at <= date_trunc('month', now() - interval '1 month');
END;
$$;

-- Função para verificar limites do plano
CREATE OR REPLACE FUNCTION check_plan_limits(user_uuid uuid, feature_type text, feature_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_plan varchar(20);
  current_count integer;
  max_allowed integer;
  result jsonb;
BEGIN
  -- Buscar plano do usuário
  SELECT plan INTO user_plan FROM profiles WHERE user_id = user_uuid;
  
  -- Se não encontrou o usuário, retorna erro
  IF user_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;
  
  -- Definir limites baseado no plano e tipo de funcionalidade
  CASE feature_type
    WHEN 'produtos' THEN
      SELECT COUNT(*) INTO current_count FROM produtos WHERE user_id = user_uuid AND ativo = true;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 30;
        WHEN 'professional' THEN max_allowed := -1; -- ilimitado
        WHEN 'enterprise' THEN max_allowed := -1; -- ilimitado
      END CASE;
      
    WHEN 'receitas' THEN
      SELECT COUNT(*) INTO current_count FROM receitas WHERE user_id = user_uuid;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 5;
        WHEN 'professional' THEN max_allowed := 60;
        WHEN 'enterprise' THEN max_allowed := -1; -- ilimitado
      END CASE;
      
    WHEN 'markups' THEN
      SELECT COUNT(*) INTO current_count FROM markups WHERE user_id = user_uuid AND ativo = true;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 1;
        WHEN 'professional' THEN max_allowed := 3;
        WHEN 'enterprise' THEN max_allowed := -1; -- ilimitado
      END CASE;
      
    WHEN 'movimentacoes' THEN
      CASE user_plan
        WHEN 'free' THEN max_allowed := 0; -- bloqueado
        WHEN 'professional' THEN max_allowed := -1; -- ilimitado
        WHEN 'enterprise' THEN max_allowed := -1; -- ilimitado
      END CASE;
      current_count := 0;
      
    WHEN 'pdf_exports' THEN
      -- Resetar contador se necessário
      PERFORM reset_monthly_pdf_counter();
      SELECT pdf_exports_count INTO current_count FROM profiles WHERE user_id = user_uuid;
      CASE user_plan
        WHEN 'free' THEN max_allowed := 0; -- bloqueado
        WHEN 'professional' THEN max_allowed := 80;
        WHEN 'enterprise' THEN max_allowed := -1; -- ilimitado
      END CASE;
      
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_feature_type');
  END CASE;
  
  -- Verificar se está dentro do limite (-1 significa ilimitado)
  IF max_allowed = -1 OR (current_count + feature_count) <= max_allowed THEN
    result := jsonb_build_object(
      'allowed', true,
      'current_count', current_count,
      'max_allowed', max_allowed,
      'plan', user_plan
    );
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'limit_exceeded',
      'current_count', current_count,
      'max_allowed', max_allowed,
      'plan', user_plan
    );
  END IF;
  
  RETURN result;
END;
$$;
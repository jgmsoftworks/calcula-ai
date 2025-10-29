-- Corrigir search_path da função gerar_numero_comanda
CREATE OR REPLACE FUNCTION gerar_numero_comanda(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero INTEGER;
  v_comanda TEXT;
BEGIN
  -- Buscar o último número de comanda do usuário
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_comanda FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO v_numero
  FROM movimentacoes_pdv
  WHERE user_id = p_user_id
    AND numero_comanda ~ '^#[0-9]+$';
  
  -- Formatar como #0001, #0002, etc.
  v_comanda := '#' || LPAD(v_numero::TEXT, 4, '0');
  
  RETURN v_comanda;
END;
$$;
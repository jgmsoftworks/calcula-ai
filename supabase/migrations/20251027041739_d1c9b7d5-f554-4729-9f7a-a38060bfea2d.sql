-- Adicionar coluna numero_sequencial
ALTER TABLE receitas 
ADD COLUMN numero_sequencial INTEGER;

-- Criar índice para melhor performance
CREATE INDEX idx_receitas_user_numero 
ON receitas(user_id, numero_sequencial);

-- Popular receitas existentes com números sequenciais ordenados por data de criação
WITH numbered_receitas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY created_at ASC
    ) as num
  FROM receitas
)
UPDATE receitas
SET numero_sequencial = numbered_receitas.num
FROM numbered_receitas
WHERE receitas.id = numbered_receitas.id;

-- Tornar coluna obrigatória após popular
ALTER TABLE receitas 
ALTER COLUMN numero_sequencial SET NOT NULL;

-- Adicionar constraint de unicidade por usuário
ALTER TABLE receitas 
ADD CONSTRAINT unique_user_numero 
UNIQUE (user_id, numero_sequencial);

-- Função para renumerar receitas após deleção
CREATE OR REPLACE FUNCTION renumerar_receitas_apos_delecao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Renumerar todas as receitas do usuário
  WITH numbered AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_num
    FROM receitas
    WHERE user_id = OLD.user_id
  )
  UPDATE receitas
  SET numero_sequencial = numbered.new_num
  FROM numbered
  WHERE receitas.id = numbered.id;
  
  RETURN OLD;
END;
$$;

-- Criar trigger AFTER DELETE
CREATE TRIGGER trigger_renumerar_receitas
AFTER DELETE ON receitas
FOR EACH ROW
EXECUTE FUNCTION renumerar_receitas_apos_delecao();

-- Função para atribuir próximo número sequencial na criação
CREATE OR REPLACE FUNCTION atribuir_numero_sequencial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  proximo_numero INTEGER;
BEGIN
  -- Se já tem número, não mexe
  IF NEW.numero_sequencial IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o próximo número disponível para este usuário
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1
  INTO proximo_numero
  FROM receitas
  WHERE user_id = NEW.user_id;
  
  -- Atribuir o número
  NEW.numero_sequencial := proximo_numero;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT
CREATE TRIGGER trigger_atribuir_numero_sequencial
BEFORE INSERT ON receitas
FOR EACH ROW
EXECUTE FUNCTION atribuir_numero_sequencial();
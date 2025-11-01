-- Passo 1: Remover triggers que dependem das colunas
DROP TRIGGER IF EXISTS trigger_update_receitas_on_product_change ON produtos;
DROP TRIGGER IF EXISTS trigger_update_receitas_on_conversion_change ON produto_conversoes;

-- Passo 2: Remover defaults que dependem do enum
ALTER TABLE produtos 
  ALTER COLUMN unidade DROP DEFAULT;

-- Passo 3: Converter colunas de enum para TEXT temporariamente
ALTER TABLE produtos 
  ALTER COLUMN unidade TYPE text;

ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_uso_receitas TYPE text;

ALTER TABLE receita_ingredientes 
  ALTER COLUMN unidade TYPE text;

ALTER TABLE receita_embalagens 
  ALTER COLUMN unidade TYPE text;

-- Passo 4: Atualizar valores nos dados existentes
UPDATE produtos 
SET unidade = 'K' 
WHERE unidade = 'kg';

UPDATE produtos 
SET unidade = 'FD' 
WHERE unidade = 'fardo';

UPDATE produto_conversoes 
SET unidade_uso_receitas = 'K' 
WHERE unidade_uso_receitas = 'kg';

UPDATE produto_conversoes 
SET unidade_uso_receitas = 'FD' 
WHERE unidade_uso_receitas = 'fardo';

UPDATE receita_ingredientes 
SET unidade = 'K' 
WHERE unidade = 'kg';

UPDATE receita_ingredientes 
SET unidade = 'FD' 
WHERE unidade = 'fardo';

UPDATE receita_embalagens 
SET unidade = 'K' 
WHERE unidade = 'kg';

UPDATE receita_embalagens 
SET unidade = 'FD' 
WHERE unidade = 'fardo';

-- Passo 5: Remover enum antigo
DROP TYPE unidade_medida CASCADE;

-- Passo 6: Criar novo enum com valores corretos
CREATE TYPE unidade_medida AS ENUM (
  'g',
  'K',
  'ml',
  'L',
  'un',
  'cx',
  'pct',
  'l',
  'm',
  'cm',
  'FD'
);

-- Passo 7: Converter colunas de volta para o novo enum
ALTER TABLE produtos 
  ALTER COLUMN unidade TYPE unidade_medida 
  USING unidade::unidade_medida;

ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_uso_receitas TYPE unidade_medida 
  USING unidade_uso_receitas::unidade_medida;

ALTER TABLE receita_ingredientes 
  ALTER COLUMN unidade TYPE unidade_medida 
  USING unidade::unidade_medida;

ALTER TABLE receita_embalagens 
  ALTER COLUMN unidade TYPE unidade_medida 
  USING unidade::unidade_medida;

-- Passo 8: Restaurar default
ALTER TABLE produtos 
  ALTER COLUMN unidade SET DEFAULT 'g'::unidade_medida;

-- Passo 9: Recriar triggers
CREATE TRIGGER trigger_update_receitas_on_product_change
  AFTER UPDATE OF custo_unitario ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_receita_ingredientes_on_product_change();

CREATE TRIGGER trigger_update_receitas_on_conversion_change
  AFTER UPDATE OF custo_unitario_uso ON produto_conversoes
  FOR EACH ROW
  WHEN (NEW.ativo = true)
  EXECUTE FUNCTION update_receita_ingredientes_on_conversion_change();
-- ==========================================
-- CORREÇÃO COMPLETA DAS UNIDADES DE MEDIDA
-- ==========================================
-- Este script corrige o enum unidade_medida, alterando:
-- - 'kg' para 'k' (Quilo)
-- - 'fardo' para 'fd' (Fardo)
-- 
-- Afeta tabelas: produtos, produto_conversoes, receita_ingredientes, receita_embalagens
-- ==========================================

-- 1. Remover triggers que dependem das colunas
DROP TRIGGER IF EXISTS trigger_update_receitas_on_product_change ON produtos;
DROP TRIGGER IF EXISTS trigger_update_receitas_on_conversion_change ON produto_conversoes;

-- 2. Remover defaults das colunas
ALTER TABLE produtos ALTER COLUMN unidade DROP DEFAULT;

-- 3. Converter todas as colunas afetadas para TEXT temporariamente
ALTER TABLE produtos ALTER COLUMN unidade TYPE text;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_compra TYPE text;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_uso_receitas TYPE text;
ALTER TABLE receita_ingredientes ALTER COLUMN unidade TYPE text;
ALTER TABLE receita_embalagens ALTER COLUMN unidade TYPE text;

-- 4. Atualizar dados existentes (kg → k, fardo → fd)
UPDATE produtos SET unidade = 'k' WHERE unidade = 'kg';
UPDATE produtos SET unidade = 'fd' WHERE unidade = 'fardo';
UPDATE produto_conversoes SET unidade_compra = 'k' WHERE unidade_compra = 'kg';
UPDATE produto_conversoes SET unidade_compra = 'fd' WHERE unidade_compra = 'fardo';
UPDATE produto_conversoes SET unidade_uso_receitas = 'k' WHERE unidade_uso_receitas = 'kg';
UPDATE produto_conversoes SET unidade_uso_receitas = 'fd' WHERE unidade_uso_receitas = 'fardo';
UPDATE receita_ingredientes SET unidade = 'k' WHERE unidade = 'kg';
UPDATE receita_ingredientes SET unidade = 'fd' WHERE unidade = 'fardo';
UPDATE receita_embalagens SET unidade = 'k' WHERE unidade = 'kg';
UPDATE receita_embalagens SET unidade = 'fd' WHERE unidade = 'fardo';

-- 5. Dropar o enum antigo
DROP TYPE IF EXISTS unidade_medida CASCADE;

-- 6. Criar novo enum com valores corretos
CREATE TYPE unidade_medida AS ENUM ('g', 'k', 'ml', 'l', 'un', 'cx', 'pct', 'fd', 'm', 'cm');

-- 7. Reconverter todas as colunas para o novo tipo enum
ALTER TABLE produtos ALTER COLUMN unidade TYPE unidade_medida USING unidade::unidade_medida;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_compra TYPE unidade_medida USING unidade_compra::unidade_medida;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_uso_receitas TYPE unidade_medida USING unidade_uso_receitas::unidade_medida;
ALTER TABLE receita_ingredientes ALTER COLUMN unidade TYPE unidade_medida USING unidade::unidade_medida;
ALTER TABLE receita_embalagens ALTER COLUMN unidade TYPE unidade_medida USING unidade::unidade_medida;

-- 8. Restaurar default
ALTER TABLE produtos ALTER COLUMN unidade SET DEFAULT 'g'::unidade_medida;

-- 9. Recriar triggers removidos
CREATE TRIGGER trigger_update_receitas_on_product_change
  AFTER UPDATE OF custo_unitario ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_receita_ingredientes_on_product_change();

CREATE TRIGGER trigger_update_receitas_on_conversion_change
  AFTER UPDATE OF custo_unitario_uso ON produto_conversoes
  FOR EACH ROW
  WHEN (NEW.ativo = true)
  EXECUTE FUNCTION update_receita_ingredientes_on_conversion_change();

-- ==========================================
-- FIM DA MIGRAÇÃO
-- ==========================================
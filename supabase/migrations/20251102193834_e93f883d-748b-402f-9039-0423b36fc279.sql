-- Normalizar valores em todas as tabelas
UPDATE produtos SET unidade = 'L'::unidade_medida WHERE unidade::text = 'l';
UPDATE produtos SET unidade = 'K'::unidade_medida WHERE unidade::text = 'kg';
UPDATE produtos SET unidade = 'FD'::unidade_medida WHERE unidade::text = 'fardo';

UPDATE produto_conversoes SET unidade_compra = 'L'::unidade_medida WHERE unidade_compra::text = 'l';
UPDATE produto_conversoes SET unidade_compra = 'K'::unidade_medida WHERE unidade_compra::text = 'kg';
UPDATE produto_conversoes SET unidade_compra = 'FD'::unidade_medida WHERE unidade_compra::text = 'fardo';

UPDATE produto_conversoes SET unidade_uso_receitas = 'L'::unidade_medida WHERE unidade_uso_receitas::text = 'l';
UPDATE produto_conversoes SET unidade_uso_receitas = 'K'::unidade_medida WHERE unidade_uso_receitas::text = 'kg';
UPDATE produto_conversoes SET unidade_uso_receitas = 'FD'::unidade_medida WHERE unidade_uso_receitas::text = 'fardo';

UPDATE receita_ingredientes SET unidade = 'L'::unidade_medida WHERE unidade::text = 'l';
UPDATE receita_ingredientes SET unidade = 'K'::unidade_medida WHERE unidade::text = 'kg';
UPDATE receita_ingredientes SET unidade = 'FD'::unidade_medida WHERE unidade::text = 'fardo';

UPDATE receita_embalagens SET unidade = 'L'::unidade_medida WHERE unidade::text = 'l';
UPDATE receita_embalagens SET unidade = 'K'::unidade_medida WHERE unidade::text = 'kg';
UPDATE receita_embalagens SET unidade = 'FD'::unidade_medida WHERE unidade::text = 'fardo';

-- Criar função RPC para atualizar unidade com cast explícito
CREATE OR REPLACE FUNCTION update_produto_unidade(
  p_produto_id UUID,
  p_unidade TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE produtos 
  SET unidade = p_unidade::unidade_medida,
      updated_at = now()
  WHERE id = p_produto_id;
END;
$$;

-- Remover defaults temporariamente
ALTER TABLE produtos ALTER COLUMN unidade DROP DEFAULT;

-- Limpar o enum
ALTER TYPE unidade_medida RENAME TO unidade_medida_old;
CREATE TYPE unidade_medida AS ENUM ('g', 'K', 'ml', 'L', 'un', 'cx', 'pct', 'm', 'cm', 'FD');

-- Atualizar todas as colunas
ALTER TABLE produtos ALTER COLUMN unidade TYPE unidade_medida USING unidade::text::unidade_medida;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_compra TYPE unidade_medida USING unidade_compra::text::unidade_medida;
ALTER TABLE produto_conversoes ALTER COLUMN unidade_uso_receitas TYPE unidade_medida USING unidade_uso_receitas::text::unidade_medida;
ALTER TABLE receita_ingredientes ALTER COLUMN unidade TYPE unidade_medida USING unidade::text::unidade_medida;
ALTER TABLE receita_embalagens ALTER COLUMN unidade TYPE unidade_medida USING unidade::text::unidade_medida;

-- Remover enum antigo
DROP TYPE unidade_medida_old CASCADE;

-- Restaurar default
ALTER TABLE produtos ALTER COLUMN unidade SET DEFAULT 'g'::unidade_medida;
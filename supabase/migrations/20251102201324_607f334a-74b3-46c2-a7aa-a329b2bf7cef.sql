-- Reverter alterações - incluindo produto_conversoes
-- Passo 1: Remover a função RPC update_produto_unidade
DROP FUNCTION IF EXISTS update_produto_unidade(uuid, unidade_medida);

-- Passo 2: Remover o DEFAULT da coluna unidade em produtos
ALTER TABLE produtos ALTER COLUMN unidade DROP DEFAULT;

-- Passo 3: Criar novo enum com TODOS os valores possíveis (incluindo duplicatas em cases diferentes)
CREATE TYPE unidade_medida_new AS ENUM (
  'un', 'g', 'G', 'kg', 'K', 'ml', 'ML', 'l', 'L', 'cx', 'CX', 'pct', 'PCT', 'fardo', 'FD', 'm', 'M', 'cm', 'CM'
);

-- Passo 4: Alterar TODAS as colunas que usam o enum para usar o novo
ALTER TABLE produtos 
  ALTER COLUMN unidade TYPE unidade_medida_new 
  USING unidade::text::unidade_medida_new;

ALTER TABLE receita_ingredientes 
  ALTER COLUMN unidade TYPE unidade_medida_new 
  USING unidade::text::unidade_medida_new;

ALTER TABLE receita_embalagens 
  ALTER COLUMN unidade TYPE unidade_medida_new 
  USING unidade::text::unidade_medida_new;

-- Incluir produto_conversoes também
ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_uso_receitas TYPE unidade_medida_new 
  USING unidade_uso_receitas::text::unidade_medida_new;

ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_compra TYPE unidade_medida_new 
  USING unidade_compra::text::unidade_medida_new;

-- Passo 5: Dropar o enum antigo e renomear o novo
DROP TYPE unidade_medida;
ALTER TYPE unidade_medida_new RENAME TO unidade_medida;

-- Passo 6: Restaurar o DEFAULT para 'G' (como estava originalmente)
ALTER TABLE produtos ALTER COLUMN unidade SET DEFAULT 'G'::unidade_medida;

-- Passo 7: Reverter os valores normalizados para os originais
UPDATE produtos SET unidade = 'kg' WHERE unidade = 'K';
UPDATE produtos SET unidade = 'l' WHERE unidade = 'L';
UPDATE produtos SET unidade = 'fardo' WHERE unidade = 'FD';

UPDATE receita_ingredientes SET unidade = 'kg' WHERE unidade = 'K';
UPDATE receita_ingredientes SET unidade = 'l' WHERE unidade = 'L';
UPDATE receita_ingredientes SET unidade = 'fardo' WHERE unidade = 'FD';

UPDATE receita_embalagens SET unidade = 'kg' WHERE unidade = 'K';
UPDATE receita_embalagens SET unidade = 'l' WHERE unidade = 'L';
UPDATE receita_embalagens SET unidade = 'fardo' WHERE unidade = 'FD';

UPDATE produto_conversoes SET unidade_compra = 'kg' WHERE unidade_compra = 'K';
UPDATE produto_conversoes SET unidade_compra = 'l' WHERE unidade_compra = 'L';
UPDATE produto_conversoes SET unidade_compra = 'fardo' WHERE unidade_compra = 'FD';

UPDATE produto_conversoes SET unidade_uso_receitas = 'kg' WHERE unidade_uso_receitas = 'K';
UPDATE produto_conversoes SET unidade_uso_receitas = 'l' WHERE unidade_uso_receitas = 'L';
UPDATE produto_conversoes SET unidade_uso_receitas = 'fardo' WHERE unidade_uso_receitas = 'FD';
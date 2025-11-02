-- Passo 1: Normalizar todos os valores existentes para lowercase
UPDATE produtos 
SET unidade = CASE 
  WHEN unidade::text = 'G' THEN 'g'::unidade_medida
  WHEN unidade::text = 'K' THEN 'kg'::unidade_medida
  WHEN unidade::text = 'L' THEN 'l'::unidade_medida
  WHEN unidade::text = 'M' THEN 'm'::unidade_medida
  WHEN unidade::text = 'FD' THEN 'fardo'::unidade_medida
  WHEN unidade::text = 'PCT' THEN 'pct'::unidade_medida
  WHEN unidade::text = 'CX' THEN 'cx'::unidade_medida
  WHEN unidade::text = 'ML' THEN 'ml'::unidade_medida
  WHEN unidade::text = 'UN' THEN 'un'::unidade_medida
  WHEN unidade::text = 'CM' THEN 'cm'::unidade_medida
  ELSE unidade
END;

UPDATE receita_ingredientes 
SET unidade = CASE 
  WHEN unidade::text = 'G' THEN 'g'::unidade_medida
  WHEN unidade::text = 'K' THEN 'kg'::unidade_medida
  WHEN unidade::text = 'L' THEN 'l'::unidade_medida
  WHEN unidade::text = 'M' THEN 'm'::unidade_medida
  WHEN unidade::text = 'FD' THEN 'fardo'::unidade_medida
  WHEN unidade::text = 'PCT' THEN 'pct'::unidade_medida
  WHEN unidade::text = 'CX' THEN 'cx'::unidade_medida
  WHEN unidade::text = 'ML' THEN 'ml'::unidade_medida
  WHEN unidade::text = 'UN' THEN 'un'::unidade_medida
  WHEN unidade::text = 'CM' THEN 'cm'::unidade_medida
  ELSE unidade
END;

UPDATE receita_embalagens 
SET unidade = CASE 
  WHEN unidade::text = 'G' THEN 'g'::unidade_medida
  WHEN unidade::text = 'K' THEN 'kg'::unidade_medida
  WHEN unidade::text = 'L' THEN 'l'::unidade_medida
  WHEN unidade::text = 'M' THEN 'm'::unidade_medida
  WHEN unidade::text = 'FD' THEN 'fardo'::unidade_medida
  WHEN unidade::text = 'PCT' THEN 'pct'::unidade_medida
  WHEN unidade::text = 'CX' THEN 'cx'::unidade_medida
  WHEN unidade::text = 'ML' THEN 'ml'::unidade_medida
  WHEN unidade::text = 'UN' THEN 'un'::unidade_medida
  WHEN unidade::text = 'CM' THEN 'cm'::unidade_medida
  ELSE unidade
END;

UPDATE produto_conversoes 
SET unidade_uso_receitas = CASE 
  WHEN unidade_uso_receitas::text = 'G' THEN 'g'::unidade_medida
  WHEN unidade_uso_receitas::text = 'K' THEN 'kg'::unidade_medida
  WHEN unidade_uso_receitas::text = 'L' THEN 'l'::unidade_medida
  WHEN unidade_uso_receitas::text = 'M' THEN 'm'::unidade_medida
  WHEN unidade_uso_receitas::text = 'FD' THEN 'fardo'::unidade_medida
  WHEN unidade_uso_receitas::text = 'PCT' THEN 'pct'::unidade_medida
  WHEN unidade_uso_receitas::text = 'CX' THEN 'cx'::unidade_medida
  WHEN unidade_uso_receitas::text = 'ML' THEN 'ml'::unidade_medida
  WHEN unidade_uso_receitas::text = 'UN' THEN 'un'::unidade_medida
  WHEN unidade_uso_receitas::text = 'CM' THEN 'cm'::unidade_medida
  ELSE unidade_uso_receitas
END;

UPDATE produto_conversoes 
SET unidade_compra = CASE 
  WHEN unidade_compra::text = 'G' THEN 'g'::unidade_medida
  WHEN unidade_compra::text = 'K' THEN 'kg'::unidade_medida
  WHEN unidade_compra::text = 'L' THEN 'l'::unidade_medida
  WHEN unidade_compra::text = 'M' THEN 'm'::unidade_medida
  WHEN unidade_compra::text = 'FD' THEN 'fardo'::unidade_medida
  WHEN unidade_compra::text = 'PCT' THEN 'pct'::unidade_medida
  WHEN unidade_compra::text = 'CX' THEN 'cx'::unidade_medida
  WHEN unidade_compra::text = 'ML' THEN 'ml'::unidade_medida
  WHEN unidade_compra::text = 'UN' THEN 'un'::unidade_medida
  WHEN unidade_compra::text = 'CM' THEN 'cm'::unidade_medida
  ELSE unidade_compra
END;

-- Passo 2: Criar novo enum limpo
CREATE TYPE unidade_medida_clean AS ENUM (
  'un',
  'g',
  'kg',
  'ml',
  'l',
  'cx',
  'pct',
  'fardo',
  'm',
  'cm'
);

-- Passo 3: Remover DEFAULT
ALTER TABLE produtos ALTER COLUMN unidade DROP DEFAULT;

-- Passo 4: Converter colunas para novo enum
ALTER TABLE produtos 
  ALTER COLUMN unidade TYPE unidade_medida_clean 
  USING unidade::text::unidade_medida_clean;

ALTER TABLE receita_ingredientes 
  ALTER COLUMN unidade TYPE unidade_medida_clean 
  USING unidade::text::unidade_medida_clean;

ALTER TABLE receita_embalagens 
  ALTER COLUMN unidade TYPE unidade_medida_clean 
  USING unidade::text::unidade_medida_clean;

ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_uso_receitas TYPE unidade_medida_clean 
  USING unidade_uso_receitas::text::unidade_medida_clean;

ALTER TABLE produto_conversoes 
  ALTER COLUMN unidade_compra TYPE unidade_medida_clean 
  USING unidade_compra::text::unidade_medida_clean;

-- Passo 5: Remover enum antigo
DROP TYPE unidade_medida;

-- Passo 6: Renomear novo enum
ALTER TYPE unidade_medida_clean RENAME TO unidade_medida;

-- Passo 7: Restaurar DEFAULT
ALTER TABLE produtos ALTER COLUMN unidade SET DEFAULT 'g'::unidade_medida;
-- Remover "0" extra do final dos nomes de produtos
UPDATE produtos 
SET nome = REGEXP_REPLACE(nome, '\s*0+\s*$', '', 'g')
WHERE nome ~ '\s*0+\s*$';

-- Corrigir unidades de compra e uso para minúscula
UPDATE produtos 
SET unidade_compra = LOWER(unidade_compra),
    unidade_uso = LOWER(unidade_uso)
WHERE unidade_compra != LOWER(unidade_compra) 
   OR (unidade_uso IS NOT NULL AND unidade_uso != LOWER(unidade_uso));

-- Remover espaços duplos dos nomes (limpeza extra)
UPDATE produtos 
SET nome = REGEXP_REPLACE(nome, '\s+', ' ', 'g')
WHERE nome ~ '\s{2,}';
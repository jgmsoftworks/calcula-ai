-- Migrar valores antigos de unidade_medida para os novos valores do enum
-- Converter 'kg' para 'K'
UPDATE produtos 
SET unidade = 'K'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'kg';

-- Converter 'fardo' para 'FD'
UPDATE produtos 
SET unidade = 'FD'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'fardo';

-- Converter 'l' minúsculo para 'L' maiúsculo (litros) se existir
UPDATE produtos 
SET unidade = 'L'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'l' AND unidade::text != 'L';

-- Fazer o mesmo para receita_ingredientes
UPDATE receita_ingredientes
SET unidade = 'K'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'kg';

UPDATE receita_ingredientes
SET unidade = 'FD'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'fardo';

UPDATE receita_ingredientes
SET unidade = 'L'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'l' AND unidade::text != 'L';

-- Fazer o mesmo para receita_embalagens
UPDATE receita_embalagens
SET unidade = 'K'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'kg';

UPDATE receita_embalagens
SET unidade = 'FD'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'fardo';

UPDATE receita_embalagens
SET unidade = 'L'::unidade_medida,
    updated_at = now()
WHERE unidade::text = 'l' AND unidade::text != 'L';
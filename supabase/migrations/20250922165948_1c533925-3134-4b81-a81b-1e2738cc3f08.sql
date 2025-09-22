-- Adicionar novas unidades de medida ao enum existente
ALTER TYPE unidade_medida ADD VALUE IF NOT EXISTS 'cx';
ALTER TYPE unidade_medida ADD VALUE IF NOT EXISTS 'pct';
ALTER TYPE unidade_medida ADD VALUE IF NOT EXISTS 'l';
ALTER TYPE unidade_medida ADD VALUE IF NOT EXISTS 'm';
ALTER TYPE unidade_medida ADD VALUE IF NOT EXISTS 'cm';
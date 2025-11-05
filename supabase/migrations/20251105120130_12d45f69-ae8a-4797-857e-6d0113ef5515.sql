-- Adicionar coluna motivo à tabela movimentacoes
ALTER TABLE movimentacoes 
ADD COLUMN IF NOT EXISTS motivo text;
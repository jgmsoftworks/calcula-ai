-- Remover conceito de rascunho/finalizada: todas as receitas são finalizadas por padrão
ALTER TABLE receitas ALTER COLUMN status SET DEFAULT 'finalizada';

-- Atualizar todas as receitas existentes em rascunho para finalizada
UPDATE receitas SET status = 'finalizada' WHERE status = 'rascunho';

-- Adicionar comentário para documentar a mudança
COMMENT ON COLUMN receitas.status IS 'Status da receita - sempre finalizada por padrão. Campo mantido para compatibilidade mas não usado na UI.';
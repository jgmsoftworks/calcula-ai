-- Habilitar replica identity para capturar dados completos nas mudanças
ALTER TABLE movimentacoes REPLICA IDENTITY FULL;

-- Adicionar tabela movimentacoes à publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes;
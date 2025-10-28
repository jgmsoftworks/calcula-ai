-- Habilitar realtime para tabelas de receitas
-- Isso permite que as mudanças em produtos se propaguem automaticamente para a interface

-- Configurar REPLICA IDENTITY para capturar todos os dados nas mudanças
ALTER TABLE receita_ingredientes REPLICA IDENTITY FULL;
ALTER TABLE receita_embalagens REPLICA IDENTITY FULL;
ALTER TABLE receita_sub_receitas REPLICA IDENTITY FULL;
ALTER TABLE receita_mao_obra REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE receita_ingredientes;
ALTER PUBLICATION supabase_realtime ADD TABLE receita_embalagens;
ALTER PUBLICATION supabase_realtime ADD TABLE receita_sub_receitas;
ALTER PUBLICATION supabase_realtime ADD TABLE receita_mao_obra;
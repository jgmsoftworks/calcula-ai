-- Limpar registros de markups duplicados/inativos
DELETE FROM markups WHERE ativo = false;
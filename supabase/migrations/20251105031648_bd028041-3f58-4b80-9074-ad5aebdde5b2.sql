-- LIMPEZA COMPLETA DO SISTEMA ANTIGO DE ESTOQUE
-- Preservar APENAS sistema de fornecedores

-- Remover tabelas antigas de estoque (CASCADE remove dependências)
DROP TABLE IF EXISTS movimentacoes_pdv CASCADE;
DROP TABLE IF EXISTS movimentacoes CASCADE;
DROP TABLE IF EXISTS movimentacoes_receitas CASCADE;
DROP TABLE IF EXISTS produto_conversoes CASCADE;
DROP TABLE IF EXISTS estoque_receitas CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS marcas CASCADE;
DROP TABLE IF EXISTS tipos_produto CASCADE;

-- Remover funções relacionadas a produtos
DROP FUNCTION IF EXISTS update_produto_with_cast CASCADE;
DROP FUNCTION IF EXISTS update_produto_unidade CASCADE;
DROP FUNCTION IF EXISTS auto_generate_codigo_interno CASCADE;
DROP FUNCTION IF EXISTS generate_codigo_interno CASCADE;
DROP FUNCTION IF EXISTS update_receita_ingredientes_on_product_change CASCADE;
DROP FUNCTION IF EXISTS update_receita_ingredientes_on_conversion_change CASCADE;

-- Remover enums antigos
DROP TYPE IF EXISTS unidade_medida CASCADE;
DROP TYPE IF EXISTS tipo_movimentacao_receita CASCADE;
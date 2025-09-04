-- Verificar se a tabela produtos tem todas as colunas necessárias
-- Adicionando colunas que estão faltando para o formulário de cadastro

-- Adicionar coluna total_embalagem se não existir
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS total_embalagem numeric DEFAULT 1;

-- Adicionar coluna custo_total se não existir  
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_total numeric DEFAULT 0;

-- Adicionar coluna custo_unitario se não existir
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_unitario numeric DEFAULT 0;

-- Adicionar trigger para gerar código interno automaticamente se não existir
DROP TRIGGER IF EXISTS auto_generate_codigo_interno_trigger ON produtos;
CREATE TRIGGER auto_generate_codigo_interno_trigger
    BEFORE INSERT ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_codigo_interno();
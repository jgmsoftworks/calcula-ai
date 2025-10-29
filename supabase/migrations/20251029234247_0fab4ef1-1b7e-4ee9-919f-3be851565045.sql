-- Criar tabela unificada para movimentações PDV
CREATE TABLE IF NOT EXISTS movimentacoes_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Identificação
  numero_comanda TEXT,
  origem TEXT NOT NULL CHECK (origem IN ('estoque', 'vitrine')),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  
  -- Item
  produto_id UUID,
  receita_id UUID,
  nome_item TEXT NOT NULL,
  
  -- Quantidades e valores
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  
  -- Responsável e contexto
  funcionario_id UUID,
  funcionario_nome TEXT,
  motivo TEXT NOT NULL,
  observacao TEXT,
  
  -- Temporal
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Fornecedor (apenas entradas)
  fornecedor_id UUID,
  fornecedor_nome TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pdv_user ON movimentacoes_pdv(user_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pdv_origem ON movimentacoes_pdv(origem);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pdv_data ON movimentacoes_pdv(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pdv_comanda ON movimentacoes_pdv(numero_comanda);

-- Habilitar RLS
ALTER TABLE movimentacoes_pdv ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários veem suas próprias movimentações PDV"
  ON movimentacoes_pdv FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam suas próprias movimentações PDV"
  ON movimentacoes_pdv FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para gerar número de comanda sequencial por tenant
CREATE OR REPLACE FUNCTION gerar_numero_comanda(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_numero INTEGER;
  v_comanda TEXT;
BEGIN
  -- Buscar o último número de comanda do usuário
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_comanda FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO v_numero
  FROM movimentacoes_pdv
  WHERE user_id = p_user_id
    AND numero_comanda ~ '^#[0-9]+$';
  
  -- Formatar como #0001, #0002, etc.
  v_comanda := '#' || LPAD(v_numero::TEXT, 4, '0');
  
  RETURN v_comanda;
END;
$$;
-- ============================================
-- MARKETPLACE DE FORNECEDORES - MIGRAÇÃO
-- ============================================

-- 1. Adicionar campos de geolocalização e informações em fornecedores
ALTER TABLE fornecedores 
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS catalogo_url TEXT,
  ADD COLUMN IF NOT EXISTS horario_atendimento JSONB DEFAULT '{"segunda":"08:00-18:00","terca":"08:00-18:00","quarta":"08:00-18:00","quinta":"08:00-18:00","sexta":"08:00-18:00"}'::jsonb,
  ADD COLUMN IF NOT EXISTS formas_pagamento TEXT[] DEFAULT ARRAY['Dinheiro', 'PIX', 'Cartão'],
  ADD COLUMN IF NOT EXISTS entrega_disponivel BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS raio_entrega_km INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS eh_fornecedor BOOLEAN DEFAULT false;

-- 2. Criar tabela de promoções de fornecedores
CREATE TABLE IF NOT EXISTS promocoes_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  desconto_percentual NUMERIC(5,2),
  desconto_fixo NUMERIC(10,2),
  produtos_aplicaveis TEXT[], -- Array com nomes dos produtos
  codigo_promocional TEXT UNIQUE,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  ativa BOOLEAN DEFAULT true,
  max_uso INTEGER,
  usos_realizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_desconto CHECK (
    (desconto_percentual IS NOT NULL AND desconto_fixo IS NULL) OR
    (desconto_percentual IS NULL AND desconto_fixo IS NOT NULL)
  )
);

-- 3. Criar tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  produtos_solicitados JSONB NOT NULL, -- [{produto: "nome", quantidade: 10, unidade: "kg"}]
  mensagem TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'respondido', 'aceito', 'rejeitado')),
  resposta_fornecedor TEXT,
  valor_total NUMERIC(10,2),
  whatsapp_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respondido_at TIMESTAMP WITH TIME ZONE
);

-- 4. Criar tabela de avaliações
CREATE TABLE IF NOT EXISTS avaliacoes_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE CASCADE NOT NULL,
  cliente_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nota INTEGER CHECK (nota >= 1 AND nota <= 5) NOT NULL,
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fornecedor_id, cliente_user_id)
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_cidade ON fornecedores(cidade) WHERE cidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fornecedores_estado ON fornecedores(estado) WHERE estado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fornecedores_eh_fornecedor ON fornecedores(eh_fornecedor) WHERE eh_fornecedor = true;
CREATE INDEX IF NOT EXISTS idx_promocoes_ativas ON promocoes_fornecedores(ativa, data_fim) WHERE ativa = true;
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos_fornecedores(status, created_at);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_fornecedor ON avaliacoes_fornecedores(fornecedor_id);

-- 6. Trigger para updated_at em promoções
CREATE OR REPLACE FUNCTION update_promocoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promocoes_updated_at
  BEFORE UPDATE ON promocoes_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION update_promocoes_updated_at();

-- 7. RLS Policies para fornecedores (já existem, mas vamos adicionar para marketplace)
DROP POLICY IF EXISTS "Fornecedores marketplace visíveis" ON fornecedores;
CREATE POLICY "Fornecedores marketplace visíveis"
  ON fornecedores FOR SELECT
  USING (eh_fornecedor = true OR auth.uid() = user_id);

-- 8. RLS Policies para promoções
ALTER TABLE promocoes_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoções visíveis para todos autenticados"
  ON promocoes_fornecedores FOR SELECT
  USING (ativa = true AND data_fim > NOW());

CREATE POLICY "Fornecedores podem criar suas promoções"
  ON promocoes_fornecedores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fornecedores 
      WHERE id = fornecedor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Fornecedores podem atualizar suas promoções"
  ON promocoes_fornecedores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fornecedores 
      WHERE id = fornecedor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Fornecedores podem deletar suas promoções"
  ON promocoes_fornecedores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fornecedores 
      WHERE id = fornecedor_id AND user_id = auth.uid()
    )
  );

-- 9. RLS Policies para orçamentos
ALTER TABLE orcamentos_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem criar orçamentos"
  ON orcamentos_fornecedores FOR INSERT
  WITH CHECK (auth.uid() = cliente_user_id);

CREATE POLICY "Clientes veem seus orçamentos"
  ON orcamentos_fornecedores FOR SELECT
  USING (auth.uid() = cliente_user_id);

CREATE POLICY "Fornecedores veem orçamentos para eles"
  ON orcamentos_fornecedores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fornecedores 
      WHERE id = fornecedor_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Fornecedores podem responder orçamentos"
  ON orcamentos_fornecedores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fornecedores 
      WHERE id = fornecedor_id AND user_id = auth.uid()
    )
  );

-- 10. RLS Policies para avaliações
ALTER TABLE avaliacoes_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver avaliações"
  ON avaliacoes_fornecedores FOR SELECT
  USING (true);

CREATE POLICY "Clientes podem criar avaliações"
  ON avaliacoes_fornecedores FOR INSERT
  WITH CHECK (auth.uid() = cliente_user_id);

CREATE POLICY "Clientes podem atualizar suas avaliações"
  ON avaliacoes_fornecedores FOR UPDATE
  USING (auth.uid() = cliente_user_id);

-- 11. Adicionar campos cidade/estado na tabela profiles (para filtrar por localização)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT;

-- 12. Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION get_fornecedor_rating(fornecedor_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(AVG(nota), 0)::NUMERIC(3,2)
  FROM avaliacoes_fornecedores
  WHERE fornecedor_id = fornecedor_uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;
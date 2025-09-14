-- Adicionar campo markup_id na tabela receitas
ALTER TABLE receitas ADD COLUMN markup_id UUID REFERENCES markups(id);

-- Adicionar índice para melhor performance
CREATE INDEX idx_receitas_markup_id ON receitas(markup_id);
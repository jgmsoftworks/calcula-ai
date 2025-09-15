-- Remover receitas vazias "Nova Receita" que não têm conteúdo
DELETE FROM receitas 
WHERE nome = 'Nova Receita' 
  AND status = 'rascunho'
  AND id NOT IN (
    -- Manter receitas que têm pelo menos algum conteúdo
    SELECT DISTINCT r.id 
    FROM receitas r
    WHERE r.nome = 'Nova Receita' 
      AND r.status = 'rascunho'
      AND (
        EXISTS (SELECT 1 FROM receita_ingredientes WHERE receita_id = r.id) OR
        EXISTS (SELECT 1 FROM receita_sub_receitas WHERE receita_id = r.id) OR
        EXISTS (SELECT 1 FROM receita_embalagens WHERE receita_id = r.id) OR
        EXISTS (SELECT 1 FROM receita_mao_obra WHERE receita_id = r.id) OR
        r.rendimento_valor IS NOT NULL OR
        r.tipo_produto IS NOT NULL OR
        r.observacoes IS NOT NULL
      )
  );
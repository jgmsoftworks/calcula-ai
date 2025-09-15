-- Atualizar markups de sub-receitas existentes para ter markup_ideal = 1.0000
UPDATE markups 
SET 
  markup_ideal = 1.0000,
  markup_aplicado = 1.0000,
  updated_at = now()
WHERE tipo = 'sub_receita' 
  AND nome = 'sub-receitas'
  AND ativo = true
  AND (markup_ideal != 1.0000 OR markup_aplicado != 1.0000);
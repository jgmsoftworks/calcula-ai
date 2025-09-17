-- Atualizar markups existentes que têm markup_ideal = 1 para usar valor correto
-- Markup de 1.25 = 20% de margem de lucro (100 / (100 - 20) = 1.25)
UPDATE markups 
SET 
  markup_ideal = 1.25,
  markup_aplicado = 1.25,
  updated_at = now()
WHERE markup_ideal = 1 AND ativo = true;
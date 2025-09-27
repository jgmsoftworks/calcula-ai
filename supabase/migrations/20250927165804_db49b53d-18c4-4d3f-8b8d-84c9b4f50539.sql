-- Remover constraint existente e permitir mais flexibilidade
ALTER TABLE affiliate_links 
DROP CONSTRAINT IF EXISTS affiliate_links_product_type_check;

-- Atualizar dados existentes para novos formatos
UPDATE affiliate_links 
SET product_type = CASE 
  WHEN product_type = 'professional' THEN 'professional_monthly'
  WHEN product_type = 'enterprise' THEN 'enterprise_monthly'
  ELSE product_type
END;

-- Adicionar os novos tipos específicos sem constraint por enquanto
-- (será controlado pela aplicação)
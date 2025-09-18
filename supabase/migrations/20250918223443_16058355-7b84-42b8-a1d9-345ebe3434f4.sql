-- Simple update to sync Markup 1 with correct values
UPDATE markups 
SET margem_lucro = 30,
    gasto_sobre_faturamento = 4.19,
    encargos_sobre_venda = 13,
    markup_ideal = 1.8936,
    markup_aplicado = 1.8936
WHERE nome = 'Markup 1';
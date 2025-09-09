-- Atualizar o custo por hora dos funcionários que estão com valor 0
-- Calcular baseado no salário base dividido pelas horas totais por mês
UPDATE folha_pagamento 
SET custo_por_hora = CASE 
  WHEN horas_totais_mes > 0 THEN salario_base / horas_totais_mes
  ELSE 0
END
WHERE custo_por_hora = 0 AND salario_base > 0;
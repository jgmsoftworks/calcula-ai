-- Adicionar campos para cálculo de horas na folha de pagamento
ALTER TABLE public.folha_pagamento 
ADD COLUMN horas_por_dia numeric DEFAULT 8,
ADD COLUMN dias_por_semana numeric DEFAULT 5,
ADD COLUMN semanas_por_mes numeric DEFAULT 4.33,
ADD COLUMN horas_totais_mes numeric DEFAULT 173.2,
ADD COLUMN custo_por_hora numeric DEFAULT 0;
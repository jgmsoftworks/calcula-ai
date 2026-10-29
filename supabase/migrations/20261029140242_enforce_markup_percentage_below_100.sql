-- Impede novos blocos de markup normais com percentuais que consumam
-- 100% ou mais do preço de venda.
--
-- NOT VALID preserva o registro legado inválido já existente para que ele
-- seja corrigido manualmente pela interface, sem alterar dados do usuário.

alter table public.markups
  add constraint markups_total_percentual_below_100
  check (
    coalesce(tipo, 'normal') = 'sub_receita'
    or (
      coalesce(gasto_sobre_faturamento, 0)
      + coalesce(encargos_sobre_venda, 0)
      + coalesce(margem_lucro, 0)
    ) < 100
  ) not valid;

-- Speed up paginated recipe relations and automatic cost propagation.
-- No recipe data or pricing formulas are changed by this migration.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX IF NOT EXISTS idx_receita_ingredientes_receita ON public.receita_ingredientes (receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_ingredientes_produto ON public.receita_ingredientes (produto_id);
CREATE INDEX IF NOT EXISTS idx_receita_embalagens_receita ON public.receita_embalagens (receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_embalagens_produto ON public.receita_embalagens (produto_id);
CREATE INDEX IF NOT EXISTS idx_receita_mao_obra_receita ON public.receita_mao_obra (receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_sub_receitas_receita ON public.receita_sub_receitas (receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_sub_receitas_sub_receita ON public.receita_sub_receitas (sub_receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_passos_receita_ordem ON public.receita_passos_preparo (receita_id, ordem);

-- Direct RPC calls must respect the caller's row-level permissions. Existing
-- SECURITY DEFINER triggers still perform automatic costing with their own
-- execution privileges. Function bodies and grants remain unchanged.
ALTER FUNCTION public.calcular_custo_receita(uuid) SECURITY INVOKER;
ALTER FUNCTION public.atualizar_preco_receita(uuid) SECURITY INVOKER;
ALTER FUNCTION public.recalcular_todas_receitas(uuid) SECURITY INVOKER;

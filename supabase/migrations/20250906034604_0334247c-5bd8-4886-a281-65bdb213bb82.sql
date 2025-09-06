-- Habilitar tempo real para as tabelas de custos
ALTER TABLE public.despesas_fixas REPLICA IDENTITY FULL;
ALTER TABLE public.folha_pagamento REPLICA IDENTITY FULL;
ALTER TABLE public.encargos_venda REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas_fixas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folha_pagamento;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encargos_venda;
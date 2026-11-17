import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { receitasPdv } from '../_shared/receitasPdv.ts';

Deno.serve((request: Request) => receitasPdv(request, (tokenHash, month) => {
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.rpc('exportar_receitas_painel', { p_token_hash: tokenHash, p_mes: month });
}));

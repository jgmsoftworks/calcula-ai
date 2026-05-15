import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mesma lista do admin-delete-user
const USER_ID_TABLES = [
  'receita_passos_preparo', 'receita_mao_obra', 'receita_sub_receitas',
  'receita_embalagens', 'receita_ingredientes', 'estoque_receitas',
  'movimentacoes_receitas', 'movimentacoes_pdv', 'movimentacoes',
  'comprovantes', 'estoque_fechamentos_mensais', 'receitas', 'produtos',
  'markups', 'despesas_fixas', 'categorias_despesas_fixas', 'encargos_venda',
  'folha_pagamento', 'categorias', 'marcas', 'tipos_produto', 'fornecedores',
  'avaliacoes_fornecedores', 'orcamentos_fornecedores', 'notifications',
  'user_configurations', 'user_roles', 'coupon_redemptions', 'suggestions',
  'roadmap_votes', 'backup_history', 'affiliates', 'user_consents',
  'data_export_requests', 'profiles',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: pending, error } = await admin
      .from('account_deletion_requests')
      .select('id, user_id, email_snapshot')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (error) throw error;

    const results: any[] = [];

    for (const req of pending ?? []) {
      const userId = req.user_id;
      try {
        for (const table of USER_ID_TABLES) {
          try {
            await admin.from(table).delete().eq('user_id', userId);
          } catch (e: any) {
            console.warn(`[purge] ${table}:`, e.message);
          }
        }
        try { await admin.from('avaliacoes_fornecedores').delete().eq('cliente_user_id', userId); } catch {}
        try { await admin.from('orcamentos_fornecedores').delete().eq('cliente_user_id', userId); } catch {}
        try { await admin.from('affiliate_customers').delete().eq('customer_user_id', userId); } catch {}

        const { error: delErr } = await admin.auth.admin.deleteUser(userId);
        if (delErr) throw delErr;

        await admin.from('account_deletion_requests')
          .update({ status: 'purged', purged_at: new Date().toISOString() })
          .eq('id', req.id);

        results.push({ user_id: userId, status: 'purged' });
      } catch (e: any) {
        console.error(`[purge] erro user ${userId}:`, e.message);
        results.push({ user_id: userId, status: 'error', error: e.message });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length, results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[purge-deleted-accounts] erro:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

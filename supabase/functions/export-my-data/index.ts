import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tabelas que possuem coluna user_id pertencente ao titular
const USER_DATA_TABLES = [
  'profiles',
  'user_configurations',
  'user_roles',
  'produtos',
  'receitas',
  'receita_ingredientes',
  'receita_embalagens',
  'receita_sub_receitas',
  'receita_mao_obra',
  'receita_passos_preparo',
  'movimentacoes',
  'movimentacoes_pdv',
  'movimentacoes_receitas',
  'estoque_receitas',
  'estoque_fechamentos_mensais',
  'comprovantes',
  'categorias',
  'marcas',
  'tipos_produto',
  'fornecedores',
  'despesas_fixas',
  'categorias_despesas_fixas',
  'encargos_venda',
  'folha_pagamento',
  'markups',
  'notifications',
  'ordens_producao',
  'data_export_requests',
  'account_deletion_requests',
  'user_consents',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
    const ua = req.headers.get('user-agent') ?? null;

    const exportData: Record<string, unknown> = {
      _meta: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        email: userData.user.email,
        format_version: '1.0',
        legal_basis: 'LGPD Art. 18, II - direito de acesso e portabilidade',
      },
      auth_user: {
        id: userData.user.id,
        email: userData.user.email,
        phone: userData.user.phone,
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        email_confirmed_at: userData.user.email_confirmed_at,
        user_metadata: userData.user.user_metadata,
      },
    };

    const counts: Record<string, number> = {};

    for (const table of USER_DATA_TABLES) {
      try {
        const { data, error } = await admin
          .from(table)
          .select('*')
          .eq('user_id', userId);
        if (error) {
          console.warn(`[export-my-data] ${table}:`, error.message);
          continue;
        }
        exportData[table] = data ?? [];
        counts[table] = data?.length ?? 0;
      } catch (e: any) {
        console.warn(`[export-my-data] falha ${table}:`, e.message);
      }
    }

    // Log audit
    try {
      await admin.from('data_export_requests').insert({
        user_id: userId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: ua,
        records_count: counts,
      });
    } catch (e) {
      console.warn('[export-my-data] log error:', e);
    }

    const filename = `calcula-ai-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[export-my-data] erro:', err);
    return new Response(JSON.stringify({ error: 'Erro ao exportar dados' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

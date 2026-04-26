import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin role check
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role_or_higher', {
      required_role: 'admin',
      check_user_id: user.id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir sua própria conta de admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Capture identity for audit
    const { data: targetAuthUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const targetEmail = targetAuthUser?.user?.email ?? null;

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, business_name')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[ADMIN-DELETE-USER] Iniciando exclusão de:', userId, targetEmail);

    // Cleanup tables that reference user_id directly
    const userIdTables = [
      'receita_passos_preparo',
      'receita_mao_obra',
      'receita_sub_receitas',
      'receita_embalagens',
      'receita_ingredientes',
      'estoque_receitas',
      'movimentacoes_receitas',
      'movimentacoes_pdv',
      'movimentacoes',
      'comprovantes',
      'estoque_fechamentos_mensais',
      'receitas',
      'produtos',
      'markups',
      'despesas_fixas',
      'categorias_despesas_fixas',
      'encargos_venda',
      'folha_pagamento',
      'categorias',
      'marcas',
      'tipos_produto',
      'fornecedores',
      'avaliacoes_fornecedores',
      'orcamentos_fornecedores',
      'notifications',
      'user_configurations',
      'user_roles',
      'coupon_redemptions',
      'suggestions',
      'roadmap_votes',
      'backup_history',
      'affiliates',
      'profiles',
    ];

    for (const table of userIdTables) {
      try {
        // Try user_id column first
        const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
        if (error && !error.message?.includes('does not exist') && !error.message?.includes('column')) {
          console.warn(`[ADMIN-DELETE-USER] Aviso ao limpar ${table}:`, error.message);
        }
      } catch (e: any) {
        console.warn(`[ADMIN-DELETE-USER] Falha em ${table}:`, e.message);
      }
    }

    // Tables with non-standard columns
    try {
      await supabaseAdmin.from('avaliacoes_fornecedores').delete().eq('cliente_user_id', userId);
    } catch (e) {}
    try {
      await supabaseAdmin.from('orcamentos_fornecedores').delete().eq('cliente_user_id', userId);
    } catch (e) {}
    try {
      await supabaseAdmin.from('affiliate_customers').delete().eq('customer_user_id', userId);
    } catch (e) {}
    try {
      await supabaseAdmin.from('admin_actions').delete().eq('target_user_id', userId);
    } catch (e) {}

    // Audit log BEFORE deleting auth user (admin_actions referencing target may already be cleared)
    try {
      await supabaseAdmin.from('admin_actions').insert({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: 'delete_user',
        old_value: {
          email: targetEmail,
          full_name: targetProfile?.full_name ?? null,
          business_name: targetProfile?.business_name ?? null,
        },
        reason: 'Exclusão completa via painel admin',
      });
    } catch (e: any) {
      console.warn('[ADMIN-DELETE-USER] Não foi possível registrar auditoria:', e.message);
    }

    // Finally delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('[ADMIN-DELETE-USER] Erro ao deletar auth.users:', deleteAuthError);
      return new Response(
        JSON.stringify({
          error: 'Falha ao excluir usuário do sistema de autenticação',
          details: deleteAuthError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ADMIN-DELETE-USER] Usuário excluído com sucesso:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuário ${targetEmail ?? userId} excluído com sucesso. O e-mail está livre para novo cadastro.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ADMIN-DELETE-USER] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao excluir usuário' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

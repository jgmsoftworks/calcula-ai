import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const limited = await enforceRateLimit(req, { bucket: "producao-compartilhada", limit: 60, windowSeconds: 60 }, corsHeaders);
  if (limited) return limited;


  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body?.action ?? '');

    if (action === 'create' || action === 'revoke' || action === 'status') {
      const authorization = req.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) return json({ error: 'Não autorizado.' }, 401);
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
      const { data: { user }, error: userError } = await caller.auth.getUser();
      if (userError || !user) return json({ error: 'Sessão inválida.' }, 401);

      const date = String(body?.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Data inválida.' }, 400);

      if (action === 'status') {
        const { data } = await admin.from('producao_links_compartilhados')
          .select('id, expira_em, revogado_em, created_at')
          .eq('user_id', user.id).eq('data_producao', date)
          .is('revogado_em', null).gt('expira_em', new Date().toISOString())
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        return json({ active: Boolean(data), link: data ?? null });
      }

      await admin.from('producao_links_compartilhados')
        .update({ revogado_em: new Date().toISOString() })
        .eq('user_id', user.id).eq('data_producao', date).is('revogado_em', null);

      if (action === 'revoke') return json({ success: true });

      const token = randomToken();
      const tokenHash = await sha256(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await admin.from('producao_links_compartilhados').insert({
        user_id: user.id,
        data_producao: date,
        token_hash: tokenHash,
        expira_em: expiresAt,
      }).select('id, expira_em').single();
      if (error) throw error;
      return json({ token, expiresAt: data.expira_em });
    }

    const token = String(body?.token ?? '');
    if (token.length < 40 || token.length > 100) return json({ error: 'Link inválido ou expirado.' }, 404);
    const tokenHash = await sha256(token);
    const now = new Date();
    const { data: link } = await admin.from('producao_links_compartilhados')
      .select('id, user_id, data_producao, expira_em, revogado_em, janela_requisicoes_inicio, janela_requisicoes_total')
      .eq('token_hash', tokenHash).is('revogado_em', null).gt('expira_em', now.toISOString()).maybeSingle();
    if (!link) return json({ error: 'Link inválido ou expirado.' }, 404);

    const windowStarted = new Date(link.janela_requisicoes_inicio);
    const newWindow = now.getTime() - windowStarted.getTime() >= 60_000;
    const requestTotal = newWindow ? 1 : link.janela_requisicoes_total + 1;
    if (!newWindow && requestTotal > 120) return json({ error: 'Muitas tentativas. Aguarde um minuto.' }, 429);
    await admin.from('producao_links_compartilhados').update({
      ultimo_acesso_em: now.toISOString(),
      janela_requisicoes_inicio: newWindow ? now.toISOString() : link.janela_requisicoes_inicio,
      janela_requisicoes_total: requestTotal,
    }).eq('id', link.id);

    if (action === 'get') {
      const { data: tasks, error } = await admin.from('producao_tarefas').select(`
        id, titulo, quantidade, status, observacoes, ordem, inicio_previsto, fim_previsto, iniciado_em, concluido_em,
        receita:receitas!producao_tarefas_receita_id_fkey(id, nome, imagem_url),
        funcionario:folha_pagamento!producao_tarefas_funcionario_id_fkey(id, nome, cargo),
        area:producao_areas!producao_tarefas_area_id_fkey(id, nome, cor)
      `).eq('user_id', link.user_id).eq('data_producao', link.data_producao).order('ordem');
      if (error) throw error;
      return json({
        date: link.data_producao,
        expiresAt: link.expira_em,
        syncChannel: `producao:${link.user_id}:${link.data_producao}`,
        tasks: tasks ?? [],
      });
    }

    if (action === 'move') {
      const taskId = String(body?.taskId ?? '');
      const { data: task } = await admin.from('producao_tarefas')
        .select('id, status, iniciado_em, concluido_em')
        .eq('id', taskId).eq('user_id', link.user_id).eq('data_producao', link.data_producao).maybeSingle();
      if (!task) return json({ error: 'Tarefa não encontrada.' }, 404);
      const nextStatus = task.status === 'a_fazer' ? 'em_producao' : task.status === 'em_producao' ? 'feito' : null;
      if (!nextStatus) return json({ error: 'Esta tarefa já foi concluída.' }, 409);
      const patch: Record<string, string> = { status: nextStatus };
      if (nextStatus === 'em_producao' && !task.iniciado_em) patch.iniciado_em = now.toISOString();
      if (nextStatus === 'feito' && !task.concluido_em) patch.concluido_em = now.toISOString();
      const { data: updated, error } = await admin.from('producao_tarefas').update(patch)
        .eq('id', task.id).eq('status', task.status).select('id, status, iniciado_em, concluido_em').maybeSingle();
      if (error) throw error;
      if (!updated) return json({ error: 'A tarefa foi alterada por outra pessoa. Atualize a página.' }, 409);
      await admin.from('producao_tarefas_historico').insert({
        user_id: link.user_id,
        tarefa_id: task.id,
        de_status: task.status,
        para_status: nextStatus,
        movido_por: null,
        origem: 'link_compartilhado',
      });
      return json({ task: updated });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[producao-compartilhada]', error);
    return json({ error: 'Não foi possível concluir a operação.' }, 500);
  }
});


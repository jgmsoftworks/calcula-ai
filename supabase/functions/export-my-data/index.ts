import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { collectPrivacyExport } from "../_shared/privacyExport.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } });

  const limited = await enforceRateLimit(req, { bucket: "export-my-data", limit: 3, windowSeconds: 3600 }, corsHeaders);
  if (limited) return limited;

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
        format_version: '2.0',
        scope: 'Registros da conta nas tabelas listadas. Não inclui arquivos binários, backups nem registros dos provedores externos.',
        consistency: 'Leituras paginadas; alterações feitas durante a exportação podem aparecer em momentos diferentes.',
        purpose: 'Cópia de acesso aos registros da conta',
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

    const { data: records, counts } = await collectPrivacyExport(userId, async (query, from, to) => {
      return await admin.from(query.table).select('*')
        .in(query.column, query.values).order(query.order).range(from, to);
    });
    Object.assign(exportData, records);

    const { error: auditError } = await admin.from('data_export_requests').insert({
      user_id: userId, status: 'completed', completed_at: new Date().toISOString(),
      ip_address: ip, user_agent: ua, records_count: counts,
    });
    if (auditError) throw new Error('Export audit failed');

    const filename = `calcula-ai-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[export-my-data] falha ao preparar exportação');
    return new Response(JSON.stringify({ error: 'Não foi possível concluir a exportação. Tente novamente ou solicite uma cópia pelo atendimento.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

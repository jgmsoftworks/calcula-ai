import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETENTION_DAYS = 30;

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
    const email = userData.user.email ?? null;

    let body: any = {};
    try { body = await req.json(); } catch {}
    const action = body?.action ?? 'request';
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null;
    const confirm = body?.confirm === true;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
    const ua = req.headers.get('user-agent') ?? null;

    if (action === 'cancel') {
      // Cancel pending deletion
      await admin.from('profiles').update({
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        deletion_reason: null,
      }).eq('user_id', userId);

      await admin.from('account_deletion_requests')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'pending');

      return new Response(JSON.stringify({ success: true, cancelled: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!confirm) {
      return new Response(JSON.stringify({ error: 'Confirmação obrigatória' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Mark profile
    await admin.from('profiles').update({
      deletion_requested_at: now.toISOString(),
      deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: reason,
    }).eq('user_id', userId);

    // Cancel any previous pending requests
    await admin.from('account_deletion_requests')
      .update({ status: 'superseded', cancelled_at: now.toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending');

    // Create new request
    await admin.from('account_deletion_requests').insert({
      user_id: userId,
      status: 'pending',
      requested_at: now.toISOString(),
      scheduled_for: scheduledFor.toISOString(),
      reason,
      ip_address: ip,
      user_agent: ua,
      email_snapshot: email,
    });

    return new Response(JSON.stringify({
      success: true,
      scheduled_for: scheduledFor.toISOString(),
      retention_days: RETENTION_DAYS,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[request-account-deletion] erro:', err);
    return new Response(JSON.stringify({ error: 'Erro ao processar solicitação' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LGPD: retenção mínima razoável para logs de auditoria de privacidade
const RETENTION_DAYS = 730; // 2 anos

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000).toISOString();
    const result: Record<string, number | string> = { cutoff };

    for (const table of ['data_export_requests', 'admin_actions']) {
      try {
        const { error, count } = await admin
          .from(table)
          .delete({ count: 'exact' })
          .lt('created_at', cutoff);
        result[table] = error ? `error: ${error.message}` : (count ?? 0);
      } catch (e: any) {
        result[table] = `error: ${e.message}`;
      }
    }

    // account_deletion_requests "purged" mais antigos que retenção
    try {
      const { error, count } = await admin
        .from('account_deletion_requests')
        .delete({ count: 'exact' })
        .eq('status', 'purged')
        .lt('purged_at', cutoff);
      result['account_deletion_requests_purged'] = error ? `error: ${error.message}` : (count ?? 0);
    } catch (e: any) {
      result['account_deletion_requests_purged'] = `error: ${e.message}`;
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

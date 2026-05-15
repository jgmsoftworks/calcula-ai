// Edge function: csp-report
// Recebe relatórios de violação de Content-Security-Policy do navegador
// (formatos suportados: report-uri legacy "csp-report" e Reporting API "csp-violation").
// Público (sem JWT) — relatórios CSP são enviados pelo navegador sem credenciais.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NormalizedReport {
  document_uri?: string;
  referrer?: string;
  violated_directive?: string;
  effective_directive?: string;
  original_policy?: string;
  blocked_uri?: string;
  source_file?: string;
  line_number?: number;
  column_number?: number;
  status_code?: number;
}

function normalize(payload: any): NormalizedReport[] {
  if (!payload) return [];
  // Reporting API: array of reports
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r?.type === "csp-violation" || r?.body)
      .map((r) => {
        const b = r.body ?? r;
        return {
          document_uri: b.documentURL ?? b["document-uri"],
          referrer: b.referrer,
          violated_directive: b.violatedDirective ?? b["violated-directive"],
          effective_directive: b.effectiveDirective ?? b["effective-directive"],
          original_policy: b.originalPolicy ?? b["original-policy"],
          blocked_uri: b.blockedURL ?? b["blocked-uri"],
          source_file: b.sourceFile ?? b["source-file"],
          line_number: b.lineNumber ?? b["line-number"],
          column_number: b.columnNumber ?? b["column-number"],
          status_code: b.statusCode ?? b["status-code"],
        };
      });
  }
  // Legacy report-uri: { "csp-report": {...} }
  if (payload["csp-report"]) {
    const b = payload["csp-report"];
    return [{
      document_uri: b["document-uri"],
      referrer: b.referrer,
      violated_directive: b["violated-directive"],
      effective_directive: b["effective-directive"],
      original_policy: b["original-policy"],
      blocked_uri: b["blocked-uri"],
      source_file: b["source-file"],
      line_number: b["line-number"],
      column_number: b["column-number"],
      status_code: b["status-code"],
    }];
  }
  // Custom client emitter
  return [{
    document_uri: payload.documentURI,
    referrer: payload.referrer,
    violated_directive: payload.violatedDirective,
    effective_directive: payload.effectiveDirective,
    original_policy: payload.originalPolicy,
    blocked_uri: payload.blockedURI,
    source_file: payload.sourceFile,
    line_number: payload.lineNumber,
    column_number: payload.columnNumber,
    status_code: payload.statusCode,
  }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const text = await req.text();
    if (!text || text.length > 50_000) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 204,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { return new Response(null, { status: 204, headers: corsHeaders }); }

    const reports = normalize(payload).slice(0, 20); // hard cap por request
    if (reports.length === 0) return new Response(null, { status: 204, headers: corsHeaders });

    const ua = req.headers.get("user-agent") ?? null;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const rows = reports.map((r) => ({
      ...r,
      user_agent: ua,
      raw: r as unknown as Record<string, unknown>,
    }));

    await supabase.from("csp_violations").insert(rows);

    return new Response(JSON.stringify({ ok: true, received: rows.length }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("csp-report error", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, // não retornar erro p/ não poluir console do cliente
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helpers compartilhados para as edge functions de admin Stripe.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export interface AdminContext {
  userId: string;
  email: string;
  supabase: ReturnType<typeof createClient>;
  stripe: Stripe;
  stripeLegacy: Stripe | null;
}

/**
 * Garante que o caller é admin e devolve clientes Stripe (atual + legado).
 * Lança Response em caso de falha (use try/catch).
 */
export async function requireAdmin(req: Request): Promise<AdminContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw jsonResponse({ error: "Sem autorização" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    throw jsonResponse({ error: "Token inválido" }, 401);
  }
  const userId = claims.claims.sub as string;
  const email = (claims.claims.email as string) ?? "";

  const { data: isAdmin, error: roleErr } = await supabase.rpc(
    "has_role_or_higher",
    { required_role: "admin", check_user_id: userId },
  );
  if (roleErr || !isAdmin) {
    throw jsonResponse({ error: "Acesso restrito a administradores" }, 403);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw jsonResponse({ error: "STRIPE_SECRET_KEY ausente" }, 500);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const legacyKey = Deno.env.get("STRIPE_SECRET_KEY_LEGACY");
  const stripeLegacy = legacyKey
    ? new Stripe(legacyKey, { apiVersion: "2025-08-27.basil" })
    : null;

  return { userId, email, supabase, stripe, stripeLegacy };
}

export function handlePreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

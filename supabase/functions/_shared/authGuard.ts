// Guarda compartilhada para funções agendadas (cron) que rodam com service role.
// Aceita: header x-cron-secret == CRON_SECRET  OU  JWT de usuário admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

/**
 * Retorna null quando a chamada é autorizada, ou um Response 401/403 pronto.
 */
export async function requireCronOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const deny = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && timingSafeEqual(provided, cronSecret)) {
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return deny("Não autorizado", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return deny("Token inválido", 401);

  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role_or_higher", {
    required_role: "admin",
    check_user_id: userData.user.id,
  });
  if (roleErr || !isAdmin) return deny("Acesso restrito a administradores", 403);

  return null;
}

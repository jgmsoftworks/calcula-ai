// Limitador de chamadas por identificador (usuário logado ou IP), persistido no banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface RateLimitOptions {
  /** Nome lógico do limite, ex.: "create-checkout". */
  bucket: string;
  /** Número máximo de chamadas dentro da janela. */
  limit: number;
  /** Tamanho da janela em segundos. */
  windowSeconds: number;
}

function clientIdentifier(req: Request): string {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    // Usa um hash simples do token para não guardar o token em claro.
    const token = auth.slice(7);
    let h = 0;
    for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
    return `tok:${h}`;
  }
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return `ip:${fwd.split(",")[0].trim() || "desconhecido"}`;
}

/**
 * Retorna null quando a chamada é permitida, ou um Response 429 pronto.
 * Falha aberta (permite) se o banco estiver indisponível, para não derrubar o fluxo.
 */
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const identifier = clientIdentifier(req);
    const now = Date.now();
    const windowMs = opts.windowSeconds * 1000;

    const { data: existing } = await admin
      .from("rate_limits")
      .select("id, count, window_start")
      .eq("bucket", opts.bucket)
      .eq("identifier", identifier)
      .maybeSingle();

    if (!existing) {
      await admin.from("rate_limits").insert({
        bucket: opts.bucket,
        identifier,
        count: 1,
        window_start: new Date(now).toISOString(),
      });
      return null;
    }

    const startedAt = new Date(existing.window_start as string).getTime();

    if (now - startedAt > windowMs) {
      await admin
        .from("rate_limits")
        .update({ count: 1, window_start: new Date(now).toISOString() })
        .eq("id", existing.id);
      return null;
    }

    if ((existing.count as number) >= opts.limit) {
      const retryAfter = Math.ceil((startedAt + windowMs - now) / 1000);
      return new Response(
        JSON.stringify({
          error: "Muitas tentativas. Aguarde um momento e tente novamente.",
          retry_after_seconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    await admin
      .from("rate_limits")
      .update({ count: (existing.count as number) + 1 })
      .eq("id", existing.id);

    return null;
  } catch {
    return null;
  }
}

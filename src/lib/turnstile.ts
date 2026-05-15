// Cloudflare Turnstile — scaffolding atrás de feature flag.
// Para ativar:
//   1. Criar conta Cloudflare → Turnstile → criar widget (managed).
//   2. Adicionar build secrets: VITE_TURNSTILE_ENABLED=true, VITE_TURNSTILE_SITE_KEY=<site key>.
//   3. Adicionar runtime secret no Supabase: TURNSTILE_SECRET_KEY=<secret key>.
//   4. Atualizar edge functions de auth para validar o token via siteverify.
//
// Enquanto desligado, getTurnstileToken() retorna null e o backend deve aceitar.

export const TURNSTILE_ENABLED =
  String(import.meta.env.VITE_TURNSTILE_ENABLED ?? "false").toLowerCase() === "true";

export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";

let scriptLoading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (!TURNSTILE_ENABLED) return Promise.resolve();
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * Renderiza um widget invisível e resolve com o token.
 * Em caso de falha (rede, Cloudflare down) retorna null — fail-open para não
 * bloquear usuários legítimos.
 */
export async function getTurnstileToken(action = "default"): Promise<string | null> {
  if (!TURNSTILE_ENABLED || !TURNSTILE_SITE_KEY) return null;
  try {
    await loadScript();
    return await new Promise<string | null>((resolve) => {
      const ts = (window as any).turnstile;
      if (!ts) return resolve(null);
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);
      const timeout = window.setTimeout(() => resolve(null), 8000);
      ts.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        size: "invisible",
        callback: (token: string) => {
          window.clearTimeout(timeout);
          resolve(token);
          window.setTimeout(() => container.remove(), 0);
        },
        "error-callback": () => {
          window.clearTimeout(timeout);
          resolve(null);
          container.remove();
        },
      });
    });
  } catch {
    return null;
  }
}

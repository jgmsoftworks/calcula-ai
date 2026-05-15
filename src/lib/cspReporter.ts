// Captura violações de CSP no navegador e encaminha para a edge function `csp-report`.
// Funciona mesmo sem header CSP ativo: o listener fica idle até que algum CSP
// (definido no CDN/Cloudflare/header HTTP) gere violações.
//
// Uso: importar em src/main.tsx → initCspReporter().

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const ENDPOINT = PROJECT_REF
  ? `https://${PROJECT_REF}.supabase.co/functions/v1/csp-report`
  : null;

const SAMPLE_LIMIT_PER_SESSION = 25;
let sent = 0;

function send(report: Record<string, unknown>) {
  if (!ENDPOINT || sent >= SAMPLE_LIMIT_PER_SESSION) return;
  sent++;
  try {
    const blob = new Blob([JSON.stringify(report)], { type: "application/json" });
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {});
  } catch {/* swallow */}
}

export function initCspReporter() {
  if (typeof window === "undefined") return;
  window.addEventListener("securitypolicyviolation", (e) => {
    send({
      documentURI: e.documentURI,
      referrer: e.referrer,
      violatedDirective: e.violatedDirective,
      effectiveDirective: e.effectiveDirective,
      originalPolicy: e.originalPolicy,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
      statusCode: e.statusCode,
    });
  });
}

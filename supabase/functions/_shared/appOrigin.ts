// Retorna a origem do app apenas se for um domínio conhecido; senão, o domínio oficial.
const DEFAULT_ORIGIN = "https://calculaaibr.com";
const ALLOWED = new Set([
  DEFAULT_ORIGIN,
  "https://www.calculaaibr.com",
  "https://calcula-ai.lovable.app",
  "https://id-preview--ac17244e-6d9b-412a-86b9-4aefcc03057a.lovable.app",
  "http://localhost:8080",
]);

export function safeAppOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED.has(origin) ? origin : DEFAULT_ORIGIN;
}

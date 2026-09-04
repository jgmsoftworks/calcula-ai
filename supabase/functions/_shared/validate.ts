// Validação de entrada compartilhada para as edge functions.
import { z } from "https://esm.sh/zod@3.23.8";

export { z };

export interface ParseFailure {
  ok: false;
  response: Response;
}
export interface ParseSuccess<T> {
  ok: true;
  data: T;
}

/**
 * Lê e valida o corpo JSON da requisição.
 * Em caso de erro devolve um Response 400 pronto com os campos inválidos.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>,
): Promise<ParseSuccess<z.infer<T>> | ParseFailure> {
  const bad = (error: unknown) => ({
    ok: false as const,
    response: new Response(JSON.stringify({ error: "Dados inválidos", details: error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Corpo da requisição não é um JSON válido.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return bad(parsed.error.flatten().fieldErrors);

  return { ok: true, data: parsed.data };
}

// Blocos reutilizáveis
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().email().max(255);
export const shortText = z.string().trim().min(1).max(255);
export const longText = z.string().trim().max(5000);

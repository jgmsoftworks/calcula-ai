type ExportResult = { data: unknown; error: { code?: string } | null };
type ExportCatalog = (tokenHash: string, month: string) => PromiseLike<ExportResult>;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers });

/** Server-to-server only: no browser CORS, no arbitrary owner or SQL parameters. */
export async function receitasPdv(request: Request, exportCatalog: ExportCatalog): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { erro: 'Método não permitido.' });
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return reply(401, { erro: 'Integração não autorizada.' });
  if (Number(request.headers.get('Content-Length') ?? 0) > 128) return reply(413, { erro: 'Requisição inválida.' });
  let month: string;
  try {
    const bodyText = await request.text();
    if (bodyText.length > 128) return reply(413, { erro: 'Requisição inválida.' });
    const body: unknown = JSON.parse(bodyText);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        !('mes' in body) || typeof body.mes !== 'string' ||
        !/^20\d{2}-(0[1-9]|1[0-2])$/.test(body.mes) || Object.keys(body).length !== 1) {
      return reply(400, { erro: 'Mês inválido.' });
    }
    month = body.mes;
  } catch { return reply(400, { erro: 'Requisição inválida.' }); }
  try {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
    const { data, error } = await exportCatalog(hash, month);
    if (error?.code === '28000') return reply(401, { erro: 'Integração não autorizada.' });
    if (error || !data) return reply(503, { erro: 'Catálogo temporariamente indisponível.' });
    return reply(200, data);
  } catch { return reply(503, { erro: 'Catálogo temporariamente indisponível.' }); }
}

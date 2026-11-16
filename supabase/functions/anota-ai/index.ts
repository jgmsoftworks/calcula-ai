// Integração inicial com Anota AI — conexão por loja e teste de leitura.
// Não grava pedidos, altera status de vendas nem movimenta estoque.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const PARTNER_HOST = 'https://gateway-partners.anota.ai';
const STORE_ID_PATTERN = /^[0-9a-f]{24}$/i;
const CHECK_INTERVAL_MS = 30_000;
type DataObject = Record<string, unknown>;

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function response(payload: DataObject, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: CORS });
}
function asObject(value: unknown): DataObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as DataObject : {};
}
function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new ApiError('Integração ainda não configurada no servidor.', 503);
  return value;
}
function client() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cache local à instância. Cada instância pode renovar independentemente.
let oauthCache: { token: string; expiresAt: number } | null = null;
async function partnerToken(): Promise<string> {
  if (oauthCache && Date.now() < oauthCache.expiresAt) return oauthCache.token;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env('ANOTA_AI_CLIENT_ID'),
    client_secret: env('ANOTA_AI_CLIENT_SECRET'),
  });
  let http: Response;
  try {
    http = await fetch(PARTNER_HOST + '/integ/integ-oauth-api/oauth-client/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body, signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
  } catch {
    throw new ApiError('Não foi possível acessar a autenticação da Anota AI.', 502);
  }
  if (!http.ok) throw new ApiError('A Anota AI não autorizou a conta integradora.', 502);
  const payload = asObject(await http.json().catch(() => null));
  const token = payload.accessToken;
  if (typeof token !== 'string' || !token) {
    throw new ApiError('A Anota AI retornou uma autenticação inválida.', 502);
  }
  const seconds = typeof payload.expiresIn === 'number' ? payload.expiresIn : 3600;
  oauthCache = { token, expiresAt: Date.now() + Math.max(30, seconds - 90) * 1000 };
  return token;
}
async function partnerRequest(path: string, pageId?: string, pageToken?: string): Promise<DataObject> {
  const token = await partnerToken();
  const headers: Record<string, string> = { Authorization: 'Bearer ' + token };
  const body = pageToken ? JSON.stringify({ pageToken }) : undefined;
  if (body) headers['Content-Type'] = 'application/json';
  if (pageId) { headers['x-page-id'] = pageId; headers['Content-Length'] = '0'; }
  let http: Response;
  try {
    http = await fetch(PARTNER_HOST + path, {
      method: body ? 'POST' : 'GET', headers, body,
      signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
  } catch {
    throw new ApiError('A comunicação com a Anota AI falhou.', 502);
  }
  const payload = asObject(await http.json().catch(() => null));
  if (!http.ok || payload.success === false) {
    throw new ApiError('A Anota AI recusou a operação. Confira os dados e a liberação da integração.', 502);
  }
  return payload;
}
async function ping(pageId: string): Promise<void> {
  // Endpoint de leitura; o retorno pode conter pedidos e dados pessoais.
  // Deliberadamente descartado sem log ou persistência.
  await partnerRequest('/api-old/partnerauth/v2/ping/list?currentpage=1', pageId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return response({ ok: false, error: 'Método inválido.' }, 405);
  try {
    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new ApiError('Faça login.', 401);
    const db = client();
    const { data: auth, error: authError } = await db.auth.getUser(header.slice(7));
    if (authError || !auth.user) throw new ApiError('Sessão inválida.', 401);
    const owner = auth.user.id;
    const input = asObject(await req.json().catch(() => null));
    const action = input.action;

    if (action === 'status') {
      const { data, error } = await db.from('integracoes_pdv')
        .select('id,provider,external_store_id,active,connected_at,last_checked_at,last_error')
        .eq('user_id', owner).eq('provider', 'anota_ai').order('created_at', { ascending: false });
      if (error) throw new ApiError('Não foi possível consultar as integrações.', 503);
      return response({ ok: true, connections: data ?? [] });
    }

    if (action === 'connect') {
      const pageId = typeof input.pageId === 'string' ? input.pageId.trim().toLowerCase() : '';
      const pageToken = typeof input.pageToken === 'string' ? input.pageToken.trim() : '';
      if (!STORE_ID_PATTERN.test(pageId) || pageToken.length < 10 || pageToken.length > 4096) {
        throw new ApiError('Informe o ID da loja (24 caracteres) e a chave de integração.', 400);
      }
      const { data: existing, error: findError } = await db.from('integracoes_pdv')
        .select('id,user_id,last_checked_at').eq('provider', 'anota_ai')
        .eq('external_store_id', pageId).maybeSingle();
      if (findError) throw new ApiError('Não foi possível verificar a loja.', 503);
      if (existing && existing.user_id !== owner) throw new ApiError('Esta loja já está vinculada a outra conta.', 409);
      if (existing?.last_checked_at &&
          Date.now() - Date.parse(existing.last_checked_at) < CHECK_INTERVAL_MS) {
        throw new ApiError('Aguarde 30 segundos antes de verificar a loja novamente.', 429);
      }
      await partnerRequest('/integ/integ-public-core/v2/integration-partner/linkpage-by-token', undefined, pageToken);
      await ping(pageId);
      const stamp = new Date().toISOString();
      const fields = { active: true, last_checked_at: stamp, last_error: null, updated_at: stamp };
      const saved = existing
        ? await db.from('integracoes_pdv').update(fields).eq('id', existing.id).eq('user_id', owner)
            .select('id').single()
        : await db.from('integracoes_pdv').insert({
            ...fields, user_id: owner, provider: 'anota_ai', external_store_id: pageId,
          }).select('id').single();
      if (saved.error) throw new ApiError('Não foi possível salvar o vínculo desta loja.', 409);
      return response({ ok: true, connectionId: saved.data.id });
    }

    const connectionId = typeof input.connectionId === 'string' ? input.connectionId : '';
    if (!/^[0-9a-f-]{36}$/i.test(connectionId)) throw new ApiError('Integração inválida.', 400);
    const { data: connection, error: lookupError } = await db.from('integracoes_pdv')
      .select('id,external_store_id,active,last_checked_at')
      .eq('id', connectionId).eq('user_id', owner).eq('provider', 'anota_ai').maybeSingle();
    if (lookupError || !connection) throw new ApiError('Integração não encontrada.', 404);

    if (action === 'disconnect') {
      const { error } = await db.from('integracoes_pdv')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', connection.id).eq('user_id', owner);
      if (error) throw new ApiError('Não foi possível desativar a conexão.', 503);
      return response({ ok: true });
    }
    if (action === 'test') {
      if (!connection.active) throw new ApiError('Conexão desativada. Vincule a loja novamente.', 400);
      if (connection.last_checked_at &&
          Date.now() - Date.parse(connection.last_checked_at) < CHECK_INTERVAL_MS) {
        throw new ApiError('Aguarde 30 segundos entre as consultas da Anota AI.', 429);
      }
      const now = new Date().toISOString();
      // Reserva o início da verificação de forma condicional, impedindo duas
      // consultas simultâneas para a mesma loja.
      const cutoff = new Date(Date.now() - CHECK_INTERVAL_MS).toISOString();
      const { data: reserved, error: reserveError } = await db.from('integracoes_pdv')
        .update({ last_checked_at: now })
        .eq('id', connection.id).eq('user_id', owner).eq('active', true)
        .or('last_checked_at.is.null,last_checked_at.lt.' + cutoff)
        .select('id').maybeSingle();
      if (reserveError) throw new ApiError('Não foi possível iniciar a verificação.', 503);
      if (!reserved) throw new ApiError('Há uma verificação recente desta loja. Aguarde 30 segundos.', 429);
      try {
        await ping(connection.external_store_id);
        await db.from('integracoes_pdv').update({ last_error: null })
          .eq('id', connection.id).eq('user_id', owner);
      } catch {
        await db.from('integracoes_pdv').update({ last_error: 'Não foi possível validar o acesso à loja.' })
          .eq('id', connection.id).eq('user_id', owner);
        throw new ApiError('A leitura da loja falhou. Confira sua integração na Anota AI.', 502);
      }
      return response({ ok: true });
    }
    throw new ApiError('Ação inválida.', 400);
  } catch (error) {
    if (error instanceof ApiError) return response({ ok: false, error: error.message }, error.status);
    // Não expor tokens, corpos de pedido ou dados de sessão nos logs/erros.
    return response({ ok: false, error: 'Falha inesperada na integração.' }, 500);
  }
});

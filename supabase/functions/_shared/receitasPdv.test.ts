import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { receitasPdv } from './receitasPdv';
const token = 'a'.repeat(64);
const request = (body: unknown = { mes: '2026-11' }, authorization = `Bearer ${token}`) => new Request('https://example.test/receitas-pdv', {
  method: 'POST', headers: { Authorization: authorization }, body: JSON.stringify(body),
});
describe('Limited recipe integration endpoint', () => {
  it('rejects missing keys, malformed requests and owner injection before the export', async () => {
    const read = vi.fn();
    for (const auth of ['', 'Bearer public-anon-key', `Bearer ${'x'.repeat(64)}`]) expect((await receitasPdv(request(undefined, auth), read)).status).toBe(401);
    for (const body of [{ mes: '2026-13' }, { mes: '2026-11', user_id: 'foreign-owner' }, null, [], { mes: 202611 }]) expect((await receitasPdv(request(body), read)).status).toBe(400);
    expect((await receitasPdv(new Request('https://example.test'), read)).status).toBe(405);
    expect((await receitasPdv(request({ mes: 'x'.repeat(150) }), read)).status).toBe(413);
    expect(read).not.toHaveBeenCalled();
  });
  it('sends only a SHA-256 key hash and month to the server RPC', async () => {
    const read = vi.fn().mockResolvedValue({ data: { versao: 1, mes: '2026-11', receitas: [] }, error: null });
    const response = await receitasPdv(request(), read);
    expect(response.status).toBe(200);
    expect(read).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'), '2026-11');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(await response.text()).not.toContain(token);
  });
  it('denies revoked/invalid tokens and never exposes provider errors', async () => {
    expect((await receitasPdv(request(), async () => ({ data: null, error: { code: '28000' } }))).status).toBe(401);
    const response = await receitasPdv(request(), async () => { throw new Error('private token or database detail'); });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('private');
  });
});

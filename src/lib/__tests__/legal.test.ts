import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { getLegalStatus, LEGAL_RELEASE, legalContentHash, recordLegalAcceptance } from '../legal';
beforeEach(() => { rpc.mockReset(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => vi.unstubAllGlobals());
describe('exact document binding', () => {
  it('requires matching version and SHA-256, including the operator identity', async () => {
    const hash = await legalContentHash();
    const status = { version: LEGAL_RELEASE.version, content_sha256: hash, accepted: false };
    rpc.mockResolvedValue({ data: [status], error: null });
    await expect(getLegalStatus()).resolves.toEqual(status);
    rpc.mockResolvedValue({ data: [{ ...status, content_sha256: 'b'.repeat(64) }], error: null });
    await expect(getLegalStatus()).rejects.toThrow('conteúdo');
    rpc.mockResolvedValue({ data: [{ ...status, version: 'old' }], error: null });
    await expect(getLegalStatus()).rejects.toThrow('atualizados');
  });
  it('does not accept an empty or failed server response', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(getLegalStatus()).rejects.toThrow();
    rpc.mockResolvedValue({ data: null, error: { message: 'network' } });
    await expect(getLegalStatus()).rejects.toThrow();
  });
  it('sends no client-controlled identity or timestamp and propagates a save failure', async () => {
    rpc.mockResolvedValue({ error: { message: 'rejected' } });
    await expect(recordLegalAcceptance({ version: LEGAL_RELEASE.version, content_sha256: 'a'.repeat(64), accepted: false })).rejects.toThrow('salvar');
    expect(rpc).toHaveBeenCalledWith('accept_legal_documents', {
      p_version: LEGAL_RELEASE.version, p_content_sha256: 'a'.repeat(64), p_accept_terms: true, p_acknowledge_privacy: true,
    });
  });
});

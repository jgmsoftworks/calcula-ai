import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ requestAccess: vi.fn(), consumePdfExport: vi.fn(), from: vi.fn(), getUser: vi.fn(), save: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/contexts/PlanLimitContext', () => ({ usePlanGate: () => ({ requestAccess: mocks.requestAccess, consumePdfExport: mocks.consumePdfExport }) }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, auth: { getUser: mocks.getUser } } }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('jspdf', () => ({ default: class {
  constructor() {
    return new Proxy({
      save: mocks.save, internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      getNumberOfPages: () => 1, getTextWidth: () => 15, splitTextToSize: (text: string) => [text],
    }, { get: (target, key) => target[key as keyof typeof target] || (() => {}) });
  }
} }));
import { useReceitas } from '../useReceitas';
import { useExportReceitaPDF } from '../useExportReceitaPDF';

beforeEach(() => {
  vi.clearAllMocks(); mocks.requestAccess.mockResolvedValue(false); mocks.consumePdfExport.mockResolvedValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.from.mockImplementation(table => {
    const data = table === 'receitas' ? { nome: 'Bolo', receita_ingredientes: [], receita_embalagens: [], receita_sub_receitas: [] } : table === 'profiles' ? {} : [];
    const query: any = { select: () => query, eq: () => query, order: () => query, single: async () => ({ data, error: null }), then: (resolve: (value: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve) };
    return query;
  });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No image in this test')));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('recipe plan enforcement', () => {
  it('stops creation and duplication before any database work', async () => {
    const { result } = renderHook(useReceitas);
    await act(async () => {
      expect(await result.current.createReceita({ nome: 'Sexta' })).toBeNull();
      expect(await result.current.duplicarReceita('original')).toBe(false);
    });
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });
  it('blocks a PDF before loading its data and permits a later retry', async () => {
    const { result } = renderHook(useExportReceitaPDF);
    await act(async () => { await result.current.exportarReceitaPDF('recipe'); });
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled(); expect(result.current.exporting).toBe(false);
    await act(async () => { await result.current.exportarReceitaPDF('recipe'); });
    expect(mocks.requestAccess).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])('saves the prepared PDF only after final server authorization (%s)', async allowed => {
    mocks.requestAccess.mockResolvedValue(true); mocks.consumePdfExport.mockResolvedValue(allowed);
    const { result } = renderHook(useExportReceitaPDF);
    await act(async () => { await result.current.exportarReceitaPDF('recipe'); });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.consumePdfExport).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });
});

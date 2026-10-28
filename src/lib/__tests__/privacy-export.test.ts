import { describe, expect, it } from 'vitest';
import { collectPrivacyExport, type ExportQuery } from '../../../supabase/functions/_shared/privacyExport';

describe('privacy export ownership and completeness', () => {
  it('paginates beyond 1000 rows and scopes children to the exported parents', async () => {
    const queries: ExportQuery[] = [];
    const recipes = Array.from({ length: 1001 }, (_, i) => ({ id: `recipe-${i}` }));
    const result = await collectPrivacyExport('owner', async (q, from, to) => {
      queries.push(q);
      if (q.table === 'receitas') return { data: recipes.slice(from, to + 1), error: null };
      if (q.table === 'receita_ingredientes') return { data: q.values.map(id => ({ id: `item-${id}`, receita_id: id })), error: null };
      return { data: [], error: null };
    });
    expect(result.counts.receitas).toBe(1001);
    expect(result.counts.receita_ingredientes).toBe(1001);
    for (const q of queries) {
      if (q.column === 'user_id') expect(q.values).toEqual(['owner']);
      else expect(q.values.every(id => recipes.some(r => r.id === id))).toBe(true);
    }
    expect(queries.some(q => q.table === 'ordens_producao_itens')).toBe(false);
  });

  it('does not silently skip an inaccessible table', async () => {
    await expect(collectPrivacyExport('owner', async q => ({ data: [], error: q.table === 'produtos' ? { message: 'database error' } : null }))).rejects.toThrow('produtos');
  });

  it('fails on a later page instead of returning a truncated file', async () => {
    await expect(collectPrivacyExport('owner', async (_q, from) => from === 0
      ? { data: Array.from({ length: 500 }, (_, i) => ({ id: i })), error: null }
      : { data: null, error: new Error('timeout') })).rejects.toThrow();
  });
  it('refuses an export without an authenticated owner', async () => {
    await expect(collectPrivacyExport('', async () => ({ data: [], error: null }))).rejects.toThrow('Authentication required');
  });
});

// Explicit scope, checked against the deployed schema. Never infer ownership
// from client input or fall back to unfiltered service-role queries.
export const OWNED_EXPORT_TABLES = [
  'profiles', 'user_configurations', 'user_roles', 'produtos', 'receitas',
  'movimentacoes', 'estoque_fechamentos_mensais', 'comprovantes', 'categorias',
  'marcas', 'tipos_produto', 'fornecedores', 'despesas_fixas',
  'categorias_despesas_fixas', 'encargos_venda', 'folha_pagamento', 'markups',
  'notifications', 'ordens_producao', 'perdas', 'tarefas_avulsas',
  'producao_tarefas', 'producao_tarefas_historico', 'producao_areas',
  'producao_tarefas_recorrentes', 'data_export_requests',
  'account_deletion_requests', 'user_consents', 'legal_acceptance_receipts',
] as const;

export const CHILD_EXPORT_TABLES = [
  { table: 'receita_ingredientes', parent: 'receitas', column: 'receita_id' },
  { table: 'receita_embalagens', parent: 'receitas', column: 'receita_id' },
  { table: 'receita_sub_receitas', parent: 'receitas', column: 'receita_id' },
  { table: 'receita_mao_obra', parent: 'receitas', column: 'receita_id' },
  { table: 'receita_passos_preparo', parent: 'receitas', column: 'receita_id' },
  { table: 'ordens_producao_itens', parent: 'ordens_producao', column: 'ordem_id' },
] as const;

export type ExportRow = Record<string, unknown>;
export type ExportQuery = { table: string; column: string; values: string[]; order: string };
export type ReadExportPage = (query: ExportQuery, from: number, to: number) => Promise<{ data: ExportRow[] | null; error: unknown }>;

export async function collectPrivacyExport(userId: string, readPage: ReadExportPage) {
  if (!userId) throw new Error('Authentication required');
  const data: Record<string, ExportRow[]> = {};
  const counts: Record<string, number> = {};
  let total = 0;
  async function readAll(query: ExportQuery) {
    const rows: ExportRow[] = [];
    const size = 500;
    for (let from = 0; ; from += size) {
      const page = await readPage(query, from, from + size - 1);
      if (page.error || !Array.isArray(page.data)) throw new Error(`Export failed: ${query.table}`);
      total += page.data.length;
      // Fail explicitly instead of exhausting an edge worker or returning a partial file.
      if (total > 100_000) throw new Error('Export exceeds synchronous limit; contact support');
      rows.push(...page.data);
      if (page.data.length < size) return rows;
    }
  }
  for (const table of OWNED_EXPORT_TABLES) {
    data[table] = await readAll({ table, column: 'user_id', values: [userId], order: table === 'legal_acceptance_receipts' ? 'version' : 'id' });
    counts[table] = data[table].length;
  }
  for (const child of CHILD_EXPORT_TABLES) {
    const ids = data[child.parent].map(row => String(row.id));
    data[child.table] = [];
    for (let i = 0; i < ids.length; i += 100) {
      data[child.table].push(...await readAll({ table: child.table, column: child.column, values: ids.slice(i, i + 100), order: 'id' }));
    }
    counts[child.table] = data[child.table].length;
  }
  return { data, counts };
}

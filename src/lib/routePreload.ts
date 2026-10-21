// Download only the screen the user points to, focuses or touches in the menu.
// Browser module caching shares these imports with React.lazy in App.tsx.
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Index'),
  '/estoque': () => import('@/pages/Estoque'),
  '/estoque/movimentacoes': () => import('@/pages/Movimentacao'),
  '/estoque/historico': () => import('@/pages/EstoqueHistorico'),
  '/estoque/perdas': () => import('@/pages/Perdas'),
  '/receitas': () => import('@/pages/Receitas'),
  '/precificacao/media-faturamento': () => import('@/pages/precificacao/MediaFaturamentoPage'),
  '/precificacao/markups': () => import('@/pages/precificacao/MarkupsPage'),
  '/precificacao/despesas-fixas': () => import('@/pages/precificacao/DespesasFixasPage'),
  '/precificacao/folha-pagamento': () => import('@/pages/precificacao/FolhaPagamentoPage'),
  '/precificacao/encargos-venda': () => import('@/pages/precificacao/EncargosVendaPage'),
  '/producao/cronograma': () => import('@/pages/producao/CronogramaPage'),
  '/producao/agenda': () => import('@/pages/producao/AgendaPage'),
  '/relatorios/estoque': () => import('@/pages/RelatoriosEstoque'),
  '/relatorios/perdas': () => import('@/pages/RelatoriosPerdas'),
  '/relatorios/produtividade': () => import('@/pages/RelatoriosProdutividade'),
};
const pending = new Map<string, Promise<unknown>>();

export function preloadRoute(path: string) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || connection?.effectiveType?.includes('2g')) return;
  if (!loaders[path] || pending.has(path)) return;
  pending.set(path, loaders[path]().catch(() => { pending.delete(path); }));
}

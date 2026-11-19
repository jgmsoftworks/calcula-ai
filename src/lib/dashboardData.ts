import { supabase } from '@/integrations/supabase/client';
import { calculateEstoqueFinal, calcularCmvCompleto } from '@/lib/cmvCalculations';
import { meanSheetPercent, sheetBaseCost, sheetCmvPercent } from '@/lib/markupMath';
import { calcularDadosReceita } from '@/lib/receitasData';
import type { DashboardData } from '@/hooks/useDashboardData';

const PAGE_SIZE = 500;

// Read every page before calculating totals; never treat a failed page as an empty list.
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{ data: T[] }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data) throw new Error('Resposta incompleta ao carregar o painel');
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { data: rows };
  }
}

export function fetchActiveStock(userId: string, signal: AbortSignal) {
  return readAll((from, to) => supabase.from('produtos')
    .select('estoque_atual, custo_unitario')
    .eq('user_id', userId).eq('ativo', true)
    .order('id').range(from, to).abortSignal(signal));
}

export async function fetchRecipeCmv(userId: string, signal: AbortSignal) {
  const receitasParaCmv = await readAll((from, to) => supabase.from('receitas')
    .select(`
      preco_venda, rendimento_valor, markup:markups(tipo),
      ingredientes:receita_ingredientes(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
      embalagens:receita_embalagens(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
      mao_obra:receita_mao_obra(valor_total),
      sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(
        quantidade, sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(preco_venda, rendimento_valor)
      )
    `)
    .eq('user_id', userId).eq('status', 'finalizada').order('id').range(from, to).abortSignal(signal));
  const percentages = receitasParaCmv.data
    .filter(r => r.markup?.tipo !== 'sub_receita')
    .map(row => {
      const r = calcularDadosReceita(row);
      const total = r.custo_ingredientes + r.custo_embalagens + r.custo_mao_obra + r.custo_sub_receitas;
      return sheetCmvPercent(sheetBaseCost(total, r.rendimento_valor, false), r.preco_venda);
    });
  return meanSheetPercent(percentages);
}

export async function fetchDashboardData(userId: string, monthStart: string, monthEnd: string, signal: AbortSignal): Promise<Omit<DashboardData, 'loading' | 'updating' | 'hasData' | 'error'>> {
  const [allMovimentacoesMes, produtosEstoque, recipeCmv] = await Promise.all([
    readAll((from, to) => supabase.from('movimentacoes')
      .select('tipo, subtotal, custo_aplicado, quantidade, data_hora, motivo')
      .eq('user_id', userId).gte('data_hora', monthStart).lte('data_hora', monthEnd)
      .order('id').range(from, to).abortSignal(signal)),
    fetchActiveStock(userId, signal),
    fetchRecipeCmv(userId, signal),
  ]);
  const entradasMes = { data: allMovimentacoesMes.data.filter(m => m.tipo === 'entrada') };
  const saidasMes = { data: allMovimentacoesMes.data.filter(m => m.tipo === 'saida') };
  // ===== CMV REAL =====
  const cmvResult = await calcularCmvCompleto(
    userId,
    produtosEstoque.data || [],
    entradasMes.data || [],
    allMovimentacoesMes.data || [],
    signal,
    { start: monthStart, end: monthEnd },
  );

  // Valor em estoque (EF)
  const valorEmEstoque = calculateEstoqueFinal(produtosEstoque.data || []);

  // Total de entradas do mês
  const totalEntradasMes = entradasMes.data?.reduce((sum, mov) => {
    return sum + (mov.subtotal || ((mov.custo_aplicado || 0) * (mov.quantidade || 0)));
  }, 0) || 0;

  // Total de saídas do mês
  const totalSaidasMes = saidasMes.data?.reduce((sum, mov) => {
    return sum + (mov.subtotal || ((mov.custo_aplicado || 0) * (mov.quantidade || 0)));
  }, 0) || 0;

  // Processar movimentações diárias para gráfico
  const dailyMap = new Map<string, { entradas: number; saidas: number }>();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const key = d.toString().padStart(2, '0');
    dailyMap.set(key, { entradas: 0, saidas: 0 });
  }

  allMovimentacoesMes.data?.forEach(mov => {
    const date = new Date(mov.data_hora);
    const dayKey = date.getDate().toString().padStart(2, '0');
    const existing = dailyMap.get(dayKey) || { entradas: 0, saidas: 0 };
    const valor = mov.subtotal || ((mov.custo_aplicado || 0) * (mov.quantidade || 0));
    
    if (mov.tipo === 'entrada') {
      existing.entradas += valor;
    } else if (mov.tipo === 'saida') {
      existing.saidas += valor;
    }
    dailyMap.set(dayKey, existing);
  });

  const dailyMovements = Array.from(dailyMap.entries()).map(([day, values]) => ({
    day,
    entradas: values.entradas,
    saidas: values.saidas,
  }));

  return {
    cmvResult,
    cmvMedioReceitas: recipeCmv.average,
    cmvReceitasConsideradas: recipeCmv.count,
    valorEmEstoque,
    totalEntradasMes,
    totalSaidasMes,
    totalRevenue: 0,
    totalRevenueChange: 0,
    activeProducts: 0,
    activeProductsChange: 0,
    averageMargin: 0,
    averageMarginChange: 0,
    operationalCosts: 0,
    operationalCostsChange: 0,
    dailyMovements,
  };
}

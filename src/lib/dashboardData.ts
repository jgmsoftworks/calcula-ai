import { supabase } from '@/integrations/supabase/client';
import { calculateEstoqueFinal, calcularCmvCompleto } from '@/lib/cmvCalculations';
import type { DashboardData } from '@/hooks/useDashboardData';

const PAGE_SIZE = 500;

// Read every page before calculating totals; never treat a failed page as an empty list.
async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{ data: T[] }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data) throw new Error('Resposta incompleta ao carregar o painel');
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { data: rows };
  }
}

export async function fetchDashboardData(userId: string, monthStart: string, monthEnd: string, signal: AbortSignal): Promise<Omit<DashboardData, 'loading' | 'updating' | 'hasData' | 'error'>> {
  const [allMovimentacoesMes, produtosEstoque, receitasParaCmv] = await Promise.all([
    readAll((from, to) => supabase.from('movimentacoes')
      .select('tipo, subtotal, custo_aplicado, quantidade, data_hora, motivo')
      .eq('user_id', userId).gte('data_hora', monthStart).lte('data_hora', monthEnd)
      .order('id').range(from, to).abortSignal(signal)),
    readAll((from, to) => supabase.from('produtos')
      .select('estoque_atual, custo_unitario')
      .eq('user_id', userId).eq('ativo', true)
      .order('id').range(from, to).abortSignal(signal)),
    readAll((from, to) => supabase.from('receitas')
      .select('preco_venda,rendimento_valor,custo_ingredientes,custo_embalagens,custo_mao_obra,custo_sub_receitas,markup:markups(tipo)')
      .eq('user_id', userId).order('id').range(from, to).abortSignal(signal)),
  ]);
  const entradasMes = { data: allMovimentacoesMes.data.filter(m => m.tipo === 'entrada') };
  const saidasMes = { data: allMovimentacoesMes.data.filter(m => m.tipo === 'saida') };
  // ===== CMV REAL =====
  const cmvResult = await calcularCmvCompleto(
    userId,
    produtosEstoque.data || [],
    entradasMes.data || [],
    allMovimentacoesMes.data || [],
    signal
  );

  // ===== CMV MÉDIO DAS RECEITAS (exclui sub-receitas) =====
  // Aplica a mesma fórmula do ReceitaCard: (custoBase / precoEfetivo) * 100
  const receitasValidas = (receitasParaCmv.data || []).filter(
    (r: any) => r.markup?.tipo !== 'sub_receita'
  );

  const cmvsIndividuais: number[] = [];
  receitasValidas.forEach((r: any) => {
    const custoTotal =
      (r.custo_ingredientes || 0) +
      (r.custo_embalagens || 0) +
      (r.custo_mao_obra || 0) +
      (r.custo_sub_receitas || 0);

    const custoBase =
      !r.rendimento_valor || r.rendimento_valor <= 0
        ? custoTotal
        : custoTotal / r.rendimento_valor;

    const precoVenda = r.preco_venda || 0;

    if (precoVenda > 0) {
      cmvsIndividuais.push((custoBase / precoVenda) * 100);
    } else if (custoBase > 0) {
      // Sem preço mas com custo: trata como 100% (perda total)
      cmvsIndividuais.push(100);
    }
  });

  if (cmvsIndividuais.length > 0) {
    const cmvMedio =
      cmvsIndividuais.reduce((sum, v) => sum + v, 0) / cmvsIndividuais.length;
    cmvResult.cmvPercentual = cmvMedio;
    cmvResult.cmvDisponivel = true;
  }


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

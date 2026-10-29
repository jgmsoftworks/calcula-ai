import { supabase } from '@/integrations/supabase/client';
import { calculateEstoqueFinal, calcularCmvCompleto } from '@/lib/cmvCalculations';
import { calcularDadosReceita } from '@/lib/receitasData';
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
      .select(`
        preco_venda, rendimento_valor, markup:markups(tipo),
        ingredientes:receita_ingredientes(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
        embalagens:receita_embalagens(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
        mao_obra:receita_mao_obra(valor_total),
        sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(
          quantidade, sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(preco_venda, rendimento_valor)
        )
      `)
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

  // ===== CMV MÉDIO DAS RECEITAS =====
  // Média simples do CMV já usado nas receitas finais:
  // (custo unitário da receita / preço de venda) * 100.
  // Sub-receitas e receitas sem custo/preço válidos não entram na média.
  const cmvsIndividuais = receitasParaCmv.data
    .map(calcularDadosReceita)
    .filter((r: any) => r.markup?.tipo !== 'sub_receita')
    .map((r: any): number | null => {
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

      if (custoBase <= 0 || precoVenda <= 0) return null;

      const cmv = (custoBase / precoVenda) * 100;
      return Number.isFinite(cmv) ? cmv : null;
    })
    .filter((cmv: number | null): cmv is number => cmv !== null);

  const cmvMedioReceitas =
    cmvsIndividuais.length > 0
      ? cmvsIndividuais.reduce((sum, value) => sum + value, 0) / cmvsIndividuais.length
      : null;

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
    cmvMedioReceitas,
    cmvReceitasConsideradas: cmvsIndividuais.length,
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

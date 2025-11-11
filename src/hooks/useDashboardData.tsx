// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const BRASILIA_TZ = 'America/Sao_Paulo';

export type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DashboardData {
  // Novos indicadores de estoque
  cmvMesAtual: number;
  valorEmEstoque: number;
  totalSaidasMes: number;
  
  // Cards principais (mantidos para compatibilidade)
  totalRevenue: number;
  totalRevenueChange: number;
  activeProducts: number;
  activeProductsChange: number;
  averageMargin: number;
  averageMarginChange: number;
  operationalCosts: number;
  operationalCostsChange: number;
  
  // Dados para gráficos
  revenueData: Array<{ month: string; revenue: number; cost: number; date: string }>;
  categoryData: Array<{ name: string; value: number; color: string }>;
  dailyActivity: Array<{ day: string; vendas: number; produtos: number }>;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

interface FilterState {
  period: PeriodFilter;
  startDate?: Date;
  endDate?: Date;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    cmvMesAtual: 0,
    valorEmEstoque: 0,
    totalSaidasMes: 0,
    totalRevenue: 0,
    totalRevenueChange: 0,
    activeProducts: 0,
    activeProductsChange: 0,
    averageMargin: 0,
    averageMarginChange: 0,
    operationalCosts: 0,
    operationalCostsChange: 0,
    revenueData: [],
    categoryData: [],
    dailyActivity: [],
    loading: true,
    error: null,
  });

  const [filters, setFilters] = useState<FilterState>({
    period: 'month',
  });

  // Calcular datas baseadas no filtro
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (filters.period) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfMonth(subMonths(now, 11));
        end = endOfMonth(now);
        break;
      case 'custom':
        start = filters.startDate || startOfMonth(now);
        end = filters.endDate || endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  }, [filters]);

  // Calcular período anterior para comparação
  const previousDateRange = useMemo(() => {
    const { start, end } = dateRange;
    const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    return {
      start: subDays(start, diffInDays),
      end: subDays(end, diffInDays),
    };
  }, [dateRange]);

  // Calcular período do mês atual em Brasília
  const getCurrentMonthRangeBrasilia = () => {
    const now = new Date();
    const nowBrasilia = toZonedTime(now, BRASILIA_TZ);
    
    const startOfMonth = new Date(nowBrasilia.getFullYear(), nowBrasilia.getMonth(), 1, 0, 0, 0);
    const startBrasiliaUTC = fromZonedTime(startOfMonth, BRASILIA_TZ);
    
    const endBrasiliaUTC = fromZonedTime(nowBrasilia, BRASILIA_TZ);
    
    return {
      start: startBrasiliaUTC.toISOString(),
      end: endBrasiliaUTC.toISOString()
    };
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { start: monthStart, end: monthEnd } = getCurrentMonthRangeBrasilia();
      
      // Buscar dados de forma paralela para otimizar
      const [
        entradasMes,
        saidasMes,
        produtosEstoque,
        currentRevenue,
        previousRevenue,
        productsData,
        markupsData,
        costsData,
        categoriesData,
        historicalData
      ] = await Promise.all([
        // Entradas do mês para cálculo de Compras
        supabase
          .from('movimentacoes')
          .select('quantidade, custo_aplicado, subtotal, motivo')
          .eq('user_id', user.id)
          .eq('tipo', 'entrada')
          .gte('data_hora', monthStart)
          .lte('data_hora', monthEnd),
        // Saídas do mês para CMV e Total de Saídas
        supabase
          .from('movimentacoes')
          .select('quantidade, custo_aplicado, subtotal')
          .eq('user_id', user.id)
          .eq('tipo', 'saida')
          .gte('data_hora', monthStart)
          .lte('data_hora', monthEnd),
        
        // Produtos ativos para valor em estoque
        supabase
          .from('produtos')
          .select('estoque_atual, custo_unitario')
          .eq('user_id', user.id)
          .eq('ativo', true),
        // Receita atual (simulada - baseada em receitas cadastradas)
        supabase
          .from('receitas')
          .select('preco_venda, created_at')
          .eq('user_id', user.id)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString()),

        // Receita período anterior
        supabase
          .from('receitas')
          .select('preco_venda, created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousDateRange.start.toISOString())
          .lte('created_at', previousDateRange.end.toISOString()),

        // Produtos ativos
        // @ts-ignore - Tabela em migração
        supabase
          .from('produtos')
          .select('id, created_at, categorias')
          .eq('user_id', user.id)
          .eq('ativo', true),

        // Markups para calcular margem média
        supabase
          .from('markups')
          .select('margem_lucro, markup_ideal, created_at')
          .eq('user_id', user.id)
          .eq('ativo', true),

        // Custos operacionais
        supabase
          .from('despesas_fixas')
          .select('valor, created_at')
          .eq('user_id', user.id)
          .eq('ativo', true),

        // Categorias para distribuição
        // @ts-ignore - Tabela em migração
        supabase
          .from('produtos')
          .select('categorias')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .not('categorias', 'is', null),

        // Dados históricos para gráficos (últimos 6 meses)
        supabase
          .from('user_configurations')
          .select('configuration')
          .eq('user_id', user.id)
          .eq('type', 'faturamentos_historicos')
          .single()
      ]);

      // Calcular Estoque Final (EF) - valor atual do estoque
      const estoqueAtual = produtosEstoque.data?.reduce((sum, prod) => {
        return sum + ((prod.estoque_atual || 0) * (prod.custo_unitario || 0));
      }, 0) || 0;

      // Calcular Compras do mês (líquidas)
      // Incluir: compras normais, custos acessórios
      // Excluir: ajustes, transferências, bonificações sem custo
      const comprasMes = entradasMes.data?.reduce((sum, mov) => {
        const motivo = (mov.motivo || '').toLowerCase();
        
        // Excluir ajustes de inventário e transferências internas
        if (motivo.includes('ajuste') || 
            motivo.includes('inventário') || 
            motivo.includes('transferência') ||
            motivo.includes('bonificação') ||
            motivo.includes('cancelamento')) {
          return sum;
        }
        
        // Devolução ao fornecedor: SUBTRAIR das compras
        if (motivo.includes('devolução') && motivo.includes('fornecedor')) {
          return sum - ((mov.custo_aplicado || 0) * (mov.quantidade || 0));
        }
        
        // Compras normais: SOMAR
        return sum + ((mov.custo_aplicado || 0) * (mov.quantidade || 0));
      }, 0) || 0;

      // Calcular Estoque Inicial (EI)
      // EI = EF + Saídas - Entradas (reconstituindo o saldo do início do mês)
      const totalSaidasCusto = saidasMes.data?.reduce((sum, mov) => {
        return sum + ((mov.custo_aplicado || 0) * (mov.quantidade || 0));
      }, 0) || 0;
      
      const estoqueInicial = estoqueAtual + totalSaidasCusto - comprasMes;

      // CMV Periódico = EI + Compras - EF
      const cmvMesAtual = estoqueInicial + comprasMes - estoqueAtual;

      // Calcular valor total em estoque (mesmo que EF)
      const valorEmEstoque = estoqueAtual;

      // Calcular total de saídas do mês (valor de venda/saída)
      const totalSaidasMes = saidasMes.data?.reduce((sum, mov) => {
        return sum + (mov.subtotal || ((mov.custo_aplicado || 0) * (mov.quantidade || 0)));
      }, 0) || 0;

      // Processar receita total
      const currentRevenueValue = currentRevenue.data?.reduce((sum, item) => sum + (item.preco_venda || 0), 0) || 0;
      const previousRevenueValue = previousRevenue.data?.reduce((sum, item) => sum + (item.preco_venda || 0), 0) || 0;
      const revenueChange = previousRevenueValue > 0 
        ? ((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100 
        : 0;

      // Processar produtos ativos
      const currentProducts = productsData.data?.length || 0;
      const productsInPeriod = productsData.data?.filter(p => 
        new Date(p.created_at) >= dateRange.start && new Date(p.created_at) <= dateRange.end
      ).length || 0;

      // Processar margem média
      const margins = markupsData.data?.map(m => m.margem_lucro || 0) || [];
      const avgMargin = margins.length > 0 ? margins.reduce((sum, m) => sum + m, 0) / margins.length : 0;

      // Processar custos operacionais
      const totalCosts = costsData.data?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0;

      // Processar distribuição por categorias
      const categoryMap = new Map<string, number>();
      categoriesData.data?.forEach(product => {
        if (product.categorias && Array.isArray(product.categorias)) {
          product.categorias.forEach(cat => {
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
          });
        }
      });

      const totalCategoryCount = Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0);
      const processedCategories = Array.from(categoryMap.entries())
        .map(([name, count], index) => ({
          name,
          value: totalCategoryCount > 0 ? Math.round((count / totalCategoryCount) * 100) : 0,
          color: `hsl(${(index * 60) % 360}, 70%, 50%)`
        }))
        .slice(0, 5); // Top 5 categorias

      // Processar dados históricos
      const historicalFaturamento = historicalData.data?.configuration || [];
      const monthlyData = Array.isArray(historicalFaturamento) 
        ? historicalFaturamento.slice(-6).map((item: any) => ({
            month: format(new Date(item.mes), 'MMM'),
            revenue: item.valor / 100, // Convertendo centavos para reais
            cost: item.valor * 0.6 / 100, // Estimando 60% como custo
            date: item.mes
          }))
        : [];

      // Simular atividade diária
      const dailyActivityData = Array.from({ length: 7 }, (_, i) => {
        const day = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i];
        return {
          day,
          vendas: Math.floor(Math.random() * 30) + 10,
          produtos: Math.floor(Math.random() * 20) + 5,
        };
      });

      setData({
        cmvMesAtual,
        valorEmEstoque,
        totalSaidasMes,
        totalRevenue: currentRevenueValue,
        totalRevenueChange: revenueChange,
        activeProducts: currentProducts,
        activeProductsChange: productsInPeriod,
        averageMargin: avgMargin,
        averageMarginChange: 2.1, // Placeholder
        operationalCosts: totalCosts,
        operationalCostsChange: -5.2, // Placeholder
        revenueData: monthlyData,
        categoryData: processedCategories,
        dailyActivity: dailyActivityData,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar dados do dashboard',
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, dateRange]);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    data,
    filters,
    updateFilters,
    refreshData,
    dateRange,
  };
};
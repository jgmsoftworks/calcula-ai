// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  getCurrentMonthRangeBrasilia,
  calculateEstoqueFinal,
  calculateComprasLiquidas,
  calcularCmvCompleto,
  type CmvResult,
} from '@/lib/cmvCalculations';

const BRASILIA_TZ = 'America/Sao_Paulo';

export type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DashboardData {
  // CMV real
  cmvResult: CmvResult;

  // Cards de estoque
  valorEmEstoque: number;
  totalEntradasMes: number;
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
  dailyMovements: Array<{ day: string; entradas: number; saidas: number }>;
  
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
    cmvResult: {
      cmvDisponivel: false,
      cmvValor: null,
      cmvPercentual: null,
      breakdown: { estoqueInicial: null, comprasLiquidas: 0, estoqueFinal: 0, faturamentoLiquido: null },
    },
    valorEmEstoque: 0,
    totalEntradasMes: 0,
    totalSaidasMes: 0,
    totalRevenue: 0,
    totalRevenueChange: 0,
    activeProducts: 0,
    activeProductsChange: 0,
    averageMargin: 0,
    averageMarginChange: 0,
    operationalCosts: 0,
    operationalCostsChange: 0,
    dailyMovements: [],
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
        allMovimentacoesMes,
      ] = await Promise.all([
        // Entradas do mês para cálculo de Compras
        supabase
          .from('movimentacoes')
          .select('quantidade, custo_aplicado, subtotal, motivo')
          .eq('user_id', user.id)
          .eq('tipo', 'entrada')
          .gte('data_hora', monthStart)
          .lte('data_hora', monthEnd),
        // Saídas do mês para Total de Saídas
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

        // Todas as movimentações do mês para o gráfico diário
        supabase
          .from('movimentacoes')
          .select('tipo, subtotal, custo_aplicado, quantidade, data_hora')
          .eq('user_id', user.id)
          .gte('data_hora', monthStart)
          .lte('data_hora', monthEnd),
      ]);

      // ===== CMV REAL =====
      const cmvResult = await calcularCmvCompleto(
        user.id,
        produtosEstoque.data || [],
        entradasMes.data || [],
        allMovimentacoesMes.data || []
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

      setData({
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
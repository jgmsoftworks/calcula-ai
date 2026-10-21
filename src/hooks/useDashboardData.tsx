import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getCurrentMonthRangeBrasilia, type CmvResult } from '@/lib/cmvCalculations';
import { fetchDashboardData } from '@/lib/dashboardData';

export type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardData {
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
  updating: boolean;
  hasData: boolean;
  error: string | null;
}

interface FilterState {
  period: PeriodFilter;
  startDate?: Date;
  endDate?: Date;
}

const EMPTY_DATA: DashboardData = {
  cmvResult: {
    cmvDisponivel: false,
    cmvValor: null,
    cmvPercentual: null,
    breakdown: { estoqueInicial: null, estoqueInicialEstimado: false, comprasLiquidas: 0, estoqueFinal: 0, faturamentoLiquido: null },
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
  loading: false,
  updating: false,
  hasData: false,
  error: null,
};

export const useDashboardData = (enabled = true) => {
  const { user } = useAuth();
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


  const { start: monthStart } = getCurrentMonthRangeBrasilia();
  const query = useQuery({
    queryKey: ['dashboard', user?.id, monthStart, filters.period, filters.startDate?.toISOString(), filters.endDate?.toISOString()],
    queryFn: ({ signal }) => fetchDashboardData(user!.id, monthStart, getCurrentMonthRangeBrasilia().end, signal),
    enabled: enabled && !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  return {
    data: {
      ...EMPTY_DATA,
      ...query.data,
      loading: enabled && !!user?.id && query.isPending,
      updating: query.isFetching,
      hasData: !!query.data,
      error: query.isError ? 'Não foi possível atualizar o painel. Tente novamente.' : null,
    },
    filters,
    updateFilters: (newFilters: Partial<FilterState>) => setFilters(prev => ({ ...prev, ...newFilters })),
    refreshData: () => query.refetch(),
    dateRange,
  };
};

// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { PLAN_NAMES } from '@/lib/plan-names';
import { useCallback } from 'react';
import { normalizeLimitResult, type PlanLimitResult } from '@/lib/plan-access';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type PlanType = 'lite' | 'professional' | 'enterprise';

/** Normaliza planos legados ('free') para o novo slug 'lite'. */
export const normalizePlan = (plan?: string | null): PlanType =>
  (plan === 'free' || !plan ? 'lite' : plan) as PlanType;

export interface PlanLimits {
  produtos: number; // -1 = ilimitado
  receitas: number;
  markups: number;
  movimentacoes: number; // 0 = bloqueado, -1 = ilimitado
  pdf_exports: number;
}

export interface PlanInfo {
  name: string;
  price: number;
  yearlyPrice: number;
  limits: PlanLimits;
  features: string[];
}

/**
 * Fallback local — a fonte de verdade é a tabela public.planos (hook usePlanos).
 * Mantido apenas para não quebrar telas antes do carregamento do banco.
 */
export const PLAN_CONFIGS: Record<PlanType, PlanInfo> = {
  lite: {
    name: PLAN_NAMES.lite,
    price: 9.9,
    yearlyPrice: 95.9,
    limits: {
      produtos: 30,
      receitas: 5,
      markups: 1,
      movimentacoes: -1, // Liberado para todos os planos
      pdf_exports: 0,
    },
    features: [
      'Máx. 30 cadastros de matéria-prima',
      'Máx. 5 receitas',
      '1 bloco de markup',
      'Funcionalidades básicas',
      'Folha de pagamento liberada',
    ],
  },

  professional: {
    name: 'Profissional',
    price: 29.9,
    yearlyPrice: 289.9,
    limits: {
      produtos: -1,
      receitas: 60,
      markups: 3,
      movimentacoes: -1,
      pdf_exports: 80,
    },
    features: [
      'Matéria-prima ilimitada',
      'Máx. 60 receitas',
      'Até 3 blocos de markup',
      'Movimentação de estoque',
      'Simulador de preços',
      '80 impressões de ficha técnica/mês',
    ],
  },
  enterprise: {
    name: 'Empresarial',
    price: 49.9,
    yearlyPrice: 485.9,
    limits: {
      produtos: -1,
      receitas: -1,
      markups: -1,
      movimentacoes: -1,
      pdf_exports: -1,
    },
    features: [
      'Tudo ilimitado',
      'Simulador de preços',
      'Suporte prioritário',
      'Recursos avançados',
    ],
  },
};

export const usePlanLimits = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const planQuery = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('profiles')
        .select('plan, plan_expires_at, access_mode').eq('user_id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
  });
  const currentPlan = planQuery.data?.access_mode === 'trial' ? 'lite' : normalizePlan(planQuery.data?.plan);
  const planExpiration = planQuery.data?.plan_expires_at ? new Date(planQuery.data.plan_expires_at) : null;
  const loading = !!user?.id && planQuery.isPending;
  const loadUserPlan = () => planQuery.refetch();

  const checkLimit = useCallback(async (featureType: keyof PlanLimits, count: number = 1): Promise<PlanLimitResult> => {
    if (!user) {
      return { allowed: false, reason: 'user_not_authenticated' };
    }

    // Admin tem acesso ilimitado a tudo
    if (isAdmin) {
      return { 
        allowed: true, 
        reason: 'admin_access',
        currentCount: 0,
        maxAllowed: -1,
        plan: 'enterprise'
      };
    }

    try {
      const { data, error } = await supabase.rpc('check_plan_limits', {
        user_uuid: user.id,
        feature_type: featureType,
        feature_count: count,
      });

      if (error) throw error;

      return normalizeLimitResult(data);
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      return { allowed: false, reason: 'check_error' };
    }
  }, [user?.id, isAdmin]);

  const showUpgradeMessage = (featureType: keyof PlanLimits) => {
    let featureName = '';
    let suggestedPlan = '';

    switch (featureType) {
      case 'produtos':
        featureName = 'cadastro de matéria-prima';
        suggestedPlan = 'Profissional';
        break;
      case 'receitas':
        featureName = 'receitas';
        suggestedPlan = currentPlan === 'lite' ? 'Profissional' : 'Empresarial';
        break;
      case 'markups':
        featureName = 'blocos de markup';
        suggestedPlan = currentPlan === 'lite' ? 'Profissional' : 'Empresarial';
        break;
      case 'movimentacoes':
        featureName = 'movimentação de estoque';
        suggestedPlan = 'Profissional';
        break;
      case 'pdf_exports':
        featureName = 'impressão de fichas técnicas';
        suggestedPlan = currentPlan === 'lite' ? 'Profissional' : 'Empresarial';
        break;
    }

    toast({
      title: 'Recurso bloqueado',
      description: `${featureName} disponível no plano ${suggestedPlan}. Conheça os planos para liberar esse recurso.`,
      variant: 'destructive',
    });
  };

  const hasAccess = (requiredPlan: PlanType): boolean => {
    // Admin tem acesso a tudo
    if (isAdmin) {
      return true;
    }

    const planHierarchy: Record<PlanType, number> = {
      'lite': 0,
      'professional': 1,
      'enterprise': 2
    };
    
    return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
  };

  const getCurrentUsage = async (featureType: keyof PlanLimits): Promise<number> => {
    if (!user) return 0;

    try {
      let count = 0;
      
      switch (featureType) {
        case 'produtos':
          const { count: produtosCount } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          count = produtosCount || 0;
          break;
          
        case 'receitas':
          const { count: receitasCount } = await supabase
            .from('receitas')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          count = receitasCount || 0;
          break;
          
        case 'markups':
          const { count: markupsCount } = await supabase
            .from('markups')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('tipo', 'sub_receita');
          count = markupsCount || 0;
          break;
          
        default:
          count = 0;
      }
      
      return count;
    } catch (error) {
      console.error('Erro ao buscar uso atual:', error);
      return 0;
    }
  };

  return {
    currentPlan,
    planExpiration,
    loading,
    planInfo: PLAN_CONFIGS[currentPlan],
    checkLimit,
    showUpgradeMessage,
    reloadPlan: loadUserPlan,
    hasAccess,
    getCurrentUsage,
  };
};

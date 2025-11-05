// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type PlanType = 'free' | 'professional' | 'enterprise';

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

export const PLAN_CONFIGS: Record<PlanType, PlanInfo> = {
  free: {
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
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
    price: 49.9,
    yearlyPrice: 478.8,
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
      'Sistema de Vitrine',
      'Simulador de preços',
      '80 PDFs por mês',
    ],
  },
  enterprise: {
    name: 'Empresarial',
    price: 89.9,
    yearlyPrice: 838.8,
    limits: {
      produtos: -1,
      receitas: -1,
      markups: -1,
      movimentacoes: -1,
      pdf_exports: -1,
    },
    features: [
      'Tudo ilimitado',
      'Sistema de Vitrine',
      'Simulador de preços',
      'Suporte prioritário',
      'Recursos avançados',
    ],
  },
};

export const usePlanLimits = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<PlanType>('free');
  const [planExpiration, setPlanExpiration] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserPlan();
    }
  }, [user]);

  const loadUserPlan = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar plano do usuário:', error);
        return;
      }

      if (profile) {
        setCurrentPlan((profile.plan as PlanType) || 'free');
        setPlanExpiration(profile.plan_expires_at ? new Date(profile.plan_expires_at) : null);
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLimit = async (featureType: keyof PlanLimits, count: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount?: number;
    maxAllowed?: number;
    plan?: string;
  }> => {
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

      return data as {
        allowed: boolean;
        reason?: string;
        currentCount?: number;
        maxAllowed?: number;
        plan?: string;
      };
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      return { allowed: false, reason: 'check_error' };
    }
  };

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
        suggestedPlan = currentPlan === 'free' ? 'Profissional' : 'Empresarial';
        break;
      case 'markups':
        featureName = 'blocos de markup';
        suggestedPlan = currentPlan === 'free' ? 'Profissional' : 'Empresarial';
        break;
      case 'movimentacoes':
        featureName = 'movimentação de estoque';
        suggestedPlan = 'Profissional';
        break;
      case 'pdf_exports':
        featureName = 'exportação de PDFs';
        suggestedPlan = currentPlan === 'free' ? 'Profissional' : 'Empresarial';
        break;
    }

    toast({
      title: 'Recurso bloqueado',
      description: `${featureName} disponível apenas no plano ${suggestedPlan}. Faça upgrade para desbloquear.`,
      variant: 'destructive',
    });
  };

  const updatePdfCount = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          pdf_exports_count: await supabase
            .from('profiles')
            .select('pdf_exports_count')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => (data?.pdf_exports_count || 0) + 1)
        })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar contador de PDF:', error);
    }
  };

  const hasAccess = (requiredPlan: PlanType): boolean => {
    // Admin tem acesso a tudo
    if (isAdmin) {
      return true;
    }

    const planHierarchy: Record<PlanType, number> = {
      'free': 0,
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
    updatePdfCount,
    reloadPlan: loadUserPlan,
    hasAccess,
    getCurrentUsage,
  };
};
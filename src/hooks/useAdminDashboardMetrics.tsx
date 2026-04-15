import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminMetrics {
  // Funnel
  totalCadastros: number;
  emailVerificados: number;
  usuariosAtivos: number;
  assinantes: number;
  enterprise: number;

  // KPIs
  mrr: number;
  arr: number;
  ticketMedio: number;
  churnRate: number;
  ltv: number;
  totalAfiliados: number;
  comissoesPagas: number;
  receitaAfiliados: number;
  roas: number;

  // Growth
  userGrowth: Array<{ month: string; users: number; mrr: number }>;
  planDistribution: Array<{ name: string; value: number; color: string }>;

  // Channel comparison
  channels: Array<{
    name: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    cost: number;
    cpl: number;
    ltv: number;
    ltvCac: number;
  }>;

  loading: boolean;
}

const PLAN_PRICES = { professional: 49.90, enterprise: 89.90 };

export const useAdminDashboardMetrics = () => {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalCadastros: 0, emailVerificados: 0, usuariosAtivos: 0,
    assinantes: 0, enterprise: 0,
    mrr: 0, arr: 0, ticketMedio: 0, churnRate: 0, ltv: 0,
    totalAfiliados: 0, comissoesPagas: 0, receitaAfiliados: 0, roas: 0,
    userGrowth: [], planDistribution: [], channels: [],
    loading: true,
  });

  const fetchMetrics = async () => {
    if (!isAdmin) { setMetrics(prev => ({ ...prev, loading: false })); return; }

    try {
      setMetrics(prev => ({ ...prev, loading: true }));

      // Parallel fetches
      const [profilesRes, authInfoRes, affiliatesRes, salesRes, commissionsRes, linksRes] = await Promise.all([
        supabase.from('profiles').select('plan, created_at, full_name, business_name').eq('is_admin', false),
        supabase.rpc('get_users_auth_info'),
        supabase.from('affiliates').select('id, name, total_commissions, total_sales, status, created_at').eq('status', 'active'),
        supabase.from('affiliate_sales').select('affiliate_id, sale_amount, commission_amount, status, sale_date, plan_type'),
        supabase.from('affiliate_commissions').select('amount, status, paid_at'),
        supabase.from('affiliate_links').select('affiliate_id, clicks_count, conversions_count, source_channel'),
      ]);

      const profiles = profilesRes.data || [];
      const authInfo = authInfoRes.data || [];
      const affiliates = affiliatesRes.data || [];
      const sales = salesRes.data || [];
      const commissions = commissionsRes.data || [];
      const links = linksRes.data || [];

      // Funnel
      const totalCadastros = profiles.length;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const emailVerificados = authInfo.filter((u: any) => u.last_sign_in_at).length;
      const usuariosAtivos = authInfo.filter((u: any) => {
        if (!u.last_sign_in_at) return false;
        return new Date(u.last_sign_in_at) >= thirtyDaysAgo;
      }).length;

      const profCount = profiles.filter(p => p.plan === 'professional').length;
      const entCount = profiles.filter(p => p.plan === 'enterprise').length;
      const assinantes = profCount + entCount;

      // KPIs
      const mrr = (profCount * PLAN_PRICES.professional) + (entCount * PLAN_PRICES.enterprise);
      const arr = mrr * 12;
      const ticketMedio = assinantes > 0 ? mrr / assinantes : 0;

      const inactiveUsers = authInfo.filter((u: any) => {
        if (!u.last_sign_in_at) return true;
        return new Date(u.last_sign_in_at) < thirtyDaysAgo;
      }).length;
      const churnRate = totalCadastros > 0 ? (inactiveUsers / totalCadastros) * 100 : 0;
      const ltv = churnRate > 0 ? (mrr / (churnRate / 100)) : mrr * 24;

      const comissoesPagas = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
      const receitaAfiliados = sales.filter(s => s.status === 'confirmed').reduce((s, sale) => s + Number(sale.sale_amount), 0);
      const roas = comissoesPagas > 0 ? receitaAfiliados / comissoesPagas : 0;

      // Plan distribution
      const planDistribution = [
        { name: 'Gratuito', value: profiles.filter(p => !p.plan || p.plan === 'free').length, color: 'hsl(220 16% 65%)' },
        { name: 'Professional', value: profCount, color: 'hsl(205 96% 46%)' },
        { name: 'Enterprise', value: entCount, color: 'hsl(273 63% 42%)' },
      ].filter(p => p.value > 0);

      // User growth (last 6 months)
      const userGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const usersInMonth = profiles.filter(p => {
          const d = new Date(p.created_at);
          return d >= monthDate && d < nextMonth;
        }).length;
        const subsInMonth = profiles.filter(p => {
          const d = new Date(p.created_at);
          return d >= monthDate && d < nextMonth && p.plan && p.plan !== 'free';
        }).length;
        userGrowth.push({
          month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
          users: usersInMonth,
          mrr: subsInMonth * ((PLAN_PRICES.professional + PLAN_PRICES.enterprise) / 2),
        });
      }

      // Channel comparison
      const organicUsers = profiles.length - sales.length;
      const organicPaid = Math.max(0, assinantes - sales.filter(s => s.status === 'confirmed').length);

      const channels: AdminMetrics['channels'] = [
        {
          name: 'Orgânico',
          leads: Math.max(organicUsers, 0),
          conversions: organicPaid,
          conversionRate: organicUsers > 0 ? (organicPaid / organicUsers) * 100 : 0,
          revenue: organicPaid * ticketMedio,
          cost: 0,
          cpl: 0,
          ltv: ltv,
          ltvCac: 0,
        },
      ];

      // Per-affiliate channels
      affiliates.forEach(aff => {
        const affSales = sales.filter(s => s.affiliate_id === aff.id && s.status === 'confirmed');
        const affLinks = links.filter(l => l.affiliate_id === aff.id);
        const affClicks = affLinks.reduce((s, l) => s + (l.clicks_count || 0), 0);
        const affConversions = affSales.length;
        const affRevenue = affSales.reduce((s, sale) => s + Number(sale.sale_amount), 0);
        const affCost = affSales.reduce((s, sale) => s + Number(sale.commission_amount), 0);

        channels.push({
          name: aff.name,
          leads: affClicks,
          conversions: affConversions,
          conversionRate: affClicks > 0 ? (affConversions / affClicks) * 100 : 0,
          revenue: affRevenue,
          cost: affCost,
          cpl: affClicks > 0 ? affCost / affClicks : 0,
          ltv: affConversions > 0 ? affRevenue / affConversions : 0,
          ltvCac: affCost > 0 ? affRevenue / affCost : 0,
        });
      });

      setMetrics({
        totalCadastros, emailVerificados, usuariosAtivos, assinantes, enterprise: entCount,
        mrr, arr, ticketMedio, churnRate, ltv,
        totalAfiliados: affiliates.length, comissoesPagas, receitaAfiliados, roas,
        userGrowth, planDistribution, channels,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => { if (isAdmin) fetchMetrics(); }, [isAdmin]);

  return { metrics, refreshMetrics: fetchMetrics };
};

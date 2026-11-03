import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { StripeDashboardData } from '@/lib/adminFinancial';

export interface AdminMetrics {
  totalCadastros: number;
  usuariosComLogin: number;
  usuariosAtivos: number;
  totalAfiliados: number;
  userGrowth: Array<{ month: string; users: number }>;
  planDistribution: Array<{ name: string; value: number; color: string }>;
  channels: Array<{ name: string; clicks: number; conversions: number }>;
  financial: StripeDashboardData | null;
  financialError: string | null;
  error: string | null;
  loading: boolean;
}
const emptyUsage = { totalCadastros: 0, usuariosComLogin: 0, usuariosAtivos: 0, totalAfiliados: 0,
  userGrowth: [], planDistribution: [], channels: [] };

async function fetchUsage() {
  const [profilesRes, authRes, affiliatesRes, linksRes] = await Promise.all([
    supabase.from('profiles').select('user_id, plan, created_at').eq('is_admin', false),
    supabase.rpc('get_users_auth_info'),
    supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('affiliate_links').select('clicks_count, conversions_count, source_channel'),
  ]);
  for (const result of [profilesRes, authRes, affiliatesRes, linksRes]) if (result.error) throw result.error;
  const profiles = profilesRes.data ?? [];
  const profileIds = new Set(profiles.map(p => p.user_id));
  const auth = (authRes.data ?? []).filter(u => profileIds.has(u.user_id));
  const now = new Date();
  const activeSince = now.getTime() - 30 * 86400000;
  const planNames: Record<string, string> = { lite: 'Iniciante', professional: 'Profissional', enterprise: 'Empresarial', free: 'Gratuito' };
  const distribution = new Map<string, number>();
  profiles.forEach(p => { const plan = planNames[p.plan ?? 'free'] ?? p.plan; distribution.set(plan, (distribution.get(plan) ?? 0) + 1); });
  const colors = ['hsl(205 96% 46%)', 'hsl(273 63% 42%)', 'hsl(220 16% 65%)', 'hsl(315 82% 48%)'];
  const userGrowth = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return { month: start.toISOString().slice(0, 7), users: profiles.filter(p => new Date(p.created_at) >= start && new Date(p.created_at) < end).length };
  });
  const channels = new Map<string, { name: string; clicks: number; conversions: number }>();
  (linksRes.data ?? []).forEach(link => {
    const name = link.source_channel || 'direto';
    const row = channels.get(name) ?? { name, clicks: 0, conversions: 0 };
    row.clicks += link.clicks_count ?? 0;
    row.conversions += link.conversions_count ?? 0;
    channels.set(name, row);
  });
  return { totalCadastros: profiles.length, usuariosComLogin: auth.filter(u => u.last_sign_in_at).length,
    usuariosAtivos: auth.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= activeSince).length,
    totalAfiliados: affiliatesRes.count ?? 0, userGrowth,
    planDistribution: [...distribution].map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })),
    channels: [...channels.values()] };
}

export const useAdminDashboardMetrics = () => {
  const { isAdmin, user } = useAuth();
  const enabled = !!isAdmin && !!user?.id;
  const usage = useQuery({ queryKey: ['admin-usage', user?.id], enabled, queryFn: fetchUsage, staleTime: 60000, retry: 1 });
  const financial = useQuery({ queryKey: ['admin-financial', user?.id], enabled, staleTime: 60000, retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-admin-dashboard');
      if (error || !data?.current || data.error) throw new Error('Não foi possível consultar a cobrança. Atualize para tentar novamente.');
      return data as StripeDashboardData;
    } });
  const metrics: AdminMetrics = {
    ...(enabled && !usage.isError ? usage.data ?? emptyUsage : emptyUsage),
    financial: enabled && !financial.isError ? financial.data ?? null : null,
    financialError: financial.isError ? 'Consulta financeira indisponível. Nenhuma receita foi estimada.' : null,
    error: usage.isError ? 'Dados de cadastro e atividade indisponíveis.' : null,
    loading: enabled && (usage.isPending || financial.isPending),
  };
  return { metrics, refreshMetrics: () => Promise.all([usage.refetch(), financial.refetch()]) };
};

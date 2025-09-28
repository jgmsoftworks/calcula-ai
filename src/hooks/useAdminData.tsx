import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminDashboardData {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalAffiliates: number;
  pendingCommissions: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  userGrowth: Array<{
    month: string;
    users: number;
    revenue: number;
  }>;
  planDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'user_signup' | 'subscription' | 'affiliate_signup' | 'system_event';
    description: string;
    timestamp: string;
    user?: string;
  }>;
  loading: boolean;
}

export const useAdminData = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AdminDashboardData>({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalAffiliates: 0,
    pendingCommissions: 0,
    systemHealth: 'healthy',
    userGrowth: [],
    planDistribution: [],
    recentActivity: [],
    loading: true,
  });

  const fetchAdminData = async () => {
    if (!isAdmin) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true }));

      // Fetch users data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('plan, created_at, business_name, full_name')
        .eq('is_admin', false);

      if (profilesError) throw profilesError;

      // Fetch affiliates data
      const { data: affiliates, error: affiliatesError } = await supabase
        .from('affiliates')
        .select('id, total_commissions, status, created_at')
        .eq('status', 'active');

      if (affiliatesError) console.error('Error fetching affiliates:', affiliatesError);

      // Fetch affiliate commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('amount, status')
        .eq('status', 'pending');

      if (commissionsError) console.error('Error fetching commissions:', commissionsError);

      // Process data
      const totalUsers = profiles?.length || 0;
      const activeSubscriptions = profiles?.filter(p => p.plan !== 'free').length || 0;
      const totalAffiliates = affiliates?.length || 0;
      const pendingCommissions = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Calculate plan distribution
      const planCounts = profiles?.reduce((acc, profile) => {
        const plan = profile.plan || 'free';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const planDistribution = [
        { name: 'Gratuito', value: planCounts.free || 0, color: 'hsl(var(--muted))' },
        { name: 'Professional', value: planCounts.professional || 0, color: 'hsl(var(--primary))' },
        { name: 'Enterprise', value: planCounts.enterprise || 0, color: 'hsl(var(--secondary))' },
      ].filter(plan => plan.value > 0);

      // Calculate user growth (last 6 months)
      const userGrowth = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const usersInMonth = profiles?.filter(p => {
          const createdAt = new Date(p.created_at);
          return createdAt >= monthDate && createdAt < nextMonthDate;
        }).length || 0;

        const subscriptionsInMonth = profiles?.filter(p => {
          const createdAt = new Date(p.created_at);
          return createdAt >= monthDate && createdAt < nextMonthDate && p.plan !== 'free';
        }).length || 0;

        userGrowth.push({
          month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
          users: usersInMonth,
          revenue: subscriptionsInMonth * 47, // Assuming average revenue per subscription
        });
      }

      // Generate recent activity (mock data for now)
      const recentActivity = [
        {
          id: '1',
          type: 'user_signup' as const,
          description: 'Novo usuário cadastrado',
          timestamp: new Date().toISOString(),
          user: profiles?.[0]?.full_name || 'Usuário'
        },
        {
          id: '2',
          type: 'subscription' as const,
          description: 'Nova assinatura Professional',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: profiles?.[1]?.business_name || 'Empresa'
        },
        {
          id: '3',
          type: 'affiliate_signup' as const,
          description: 'Novo afiliado cadastrado',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          type: 'system_event' as const,
          description: 'Backup automático realizado',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ];

      setData({
        totalUsers,
        activeSubscriptions,
        monthlyRevenue: activeSubscriptions * 47, // Average monthly revenue
        totalAffiliates,
        pendingCommissions,
        systemHealth: 'healthy',
        userGrowth,
        planDistribution,
        recentActivity,
        loading: false,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        systemHealth: 'error' 
      }));
    }
  };

  const refreshData = () => {
    fetchAdminData();
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  return {
    data,
    refreshData,
  };
};
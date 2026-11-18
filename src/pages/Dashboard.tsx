import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { BusinessHome } from '@/components/dashboard/BusinessHome';
import { AdminFunnel } from '@/components/admin/AdminFunnel';
import { AdminKPICards } from '@/components/admin/AdminKPICards';
import { AdminChannelComparison } from '@/components/admin/AdminChannelComparison';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { format } from 'date-fns';
import { ptBR, pt, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { metrics: adminMetrics, refreshMetrics } = useAdminDashboardMetrics();
  const dateLocale = i18n.language === 'pt-BR' ? ptBR : i18n.language === 'pt-PT' ? pt : enUS;
  if (adminMetrics.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 animate-fade-in">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">{t('dashboard.loadingData')}</p>
        </div>
      </div>
    );
  }

  // ========== ADMIN MASTER DASHBOARD ==========
  return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: dateLocale })}
            </p>
          </div>
          <Button 
            onClick={refreshMetrics} 
            variant="outline" 
            size="sm"
            className="gap-1.5 rounded-xl h-9 border-border/50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>

        {/* KPI Cards */}
        <AdminKPICards metrics={adminMetrics} />

        {/* Funnel + Charts */}
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
          <AdminFunnel metrics={adminMetrics} />
          <div className="space-y-4">
            <AdminRevenueChart metrics={adminMetrics} />
          </div>
        </div>

        {/* Channel Comparison */}
        <AdminChannelComparison metrics={adminMetrics} />
      </div>
    );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  if (isAdmin) return <AdminDashboard />;
  if (!user) return null;
  const displayName = user.user_metadata?.business_name || user.user_metadata?.full_name || user.email?.split('@')[0];
  return <BusinessHome key={user.id} userId={user.id} displayName={displayName} />;
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  BarChart3,
  DollarSign,
  Plus,
  Building2,
  Users,
  Crown,
  Filter,
  TrendingDown,
  ArrowDownRight,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAdminData } from '@/hooks/useAdminData';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FinancialHealthScore } from '@/components/dashboard/FinancialHealthScore';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { CmvCard } from '@/components/dashboard/CmvCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatNumber } from '@/lib/formatters';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { data, filters, updateFilters, refreshData, dateRange } = useDashboardData();
  const { data: adminData, refreshData: refreshAdminData } = useAdminData();
  const { hasAccess } = usePlanLimits();

  const isAdminView = isAdmin;
  const currentData = isAdminView ? adminData : data;
  const currentRefresh = isAdminView ? refreshAdminData : refreshData;

  const adminStats = [
    {
      title: 'Total de Usuários',
      value: adminData.totalUsers.toString(),
      icon: Users,
      gradient: 'from-[#0483e4] to-[#2c4dc7]',
      iconBg: 'bg-[#0483e4]/10',
      iconColor: 'text-[#0483e4]',
    },
    {
      title: 'Assinantes Ativos',
      value: adminData.activeSubscriptions.toString(),
      icon: Crown,
      gradient: 'from-[#7328b1] to-[#af1188]',
      iconBg: 'bg-[#7328b1]/10',
      iconColor: 'text-[#7328b1]',
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${adminData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      gradient: 'from-[#dd0b52] to-[#f96e0c]',
      iconBg: 'bg-[#dd0b52]/10',
      iconColor: 'text-[#dd0b52]',
    },
  ];

  const userStats = [
    {
      title: 'Valor em Estoque',
      value: `R$ ${data.valorEmEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Package,
      gradient: 'from-[#0483e4] to-[#2c4dc7]',
      iconBg: 'bg-[#0483e4]/10',
      iconColor: 'text-[#0483e4]',
    },
    {
      title: 'Saídas (mês atual)',
      value: `R$ ${data.totalSaidasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowDownRight,
      gradient: 'from-[#7328b1] to-[#af1188]',
      iconBg: 'bg-[#7328b1]/10',
      iconColor: 'text-[#7328b1]',
    },
  ];

  const stats = isAdminView ? adminStats : userStats;
  const quickActions = isAdminView ? [
    { title: 'Gerenciar Usuários', icon: Users, href: '/admin-usuarios' },
    { title: 'Afiliados', icon: Crown, href: '/afiliados' },
    { title: 'Configurações', icon: Building2, href: '/admin-configuracoes' },
  ] : [
    { title: 'Novo Produto', icon: Plus, href: '/estoque' },
    { title: 'Análise Avançada', icon: BarChart3, href: '/custos', requiresPlan: 'professional' as const },
    { title: 'Configurações', icon: Building2, href: '/perfil' },
  ];

  if (currentData.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 animate-fade-in">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            {isAdminView ? 'Painel Admin' : `Olá, ${user?.email?.split('@')[0] || 'usuário'}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isAdminView && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-9 border-border/50">
                  <Filter className="h-3.5 w-3.5" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Personalize o período de análise</SheetDescription>
                </SheetHeader>
                <div className="py-6">
                  <DashboardFilters
                    currentPeriod={filters.period}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onPeriodChange={(period) => updateFilters({ period })}
                    onDateRangeChange={(startDate, endDate) => updateFilters({ startDate, endDate })}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <Button 
            onClick={currentRefresh} 
            variant="outline" 
            size="sm"
            className="gap-1.5 rounded-xl h-9 border-border/50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* CMV Card dedicado (apenas para usuários normais) */}
        {!isAdminView && (
          <CmvCard cmvResult={data.cmvResult} animationDelay="0ms" />
        )}

        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const delay = isAdminView ? i * 100 : (i + 1) * 100;
          return (
            <Card key={stat.title} className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
              {/* Top gradient accent */}
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold font-display text-foreground">
                      {stat.value}
                    </p>
                    {'description' in stat && stat.description && (
                      <p className="text-xs text-muted-foreground">
                        {(stat as any).description}
                      </p>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insights + Health Score */}
      {!isAdminView && (
        <div className="grid gap-4 md:grid-cols-2">
          <InsightsCard />
          <FinancialHealthScore />
        </div>
      )}

      {/* Chart */}
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-brand-horizontal" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Performance Financeira</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isAdminView ? 'Crescimento de usuários' : 'Receita ao longo do tempo'}
              </CardDescription>
            </div>
            {!isAdminView && (
              <Badge variant="outline" className="text-xs font-medium rounded-lg">
                {data.totalRevenueChange >= 0 ? '+' : ''}{formatNumber(data.totalRevenueChange, 1)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-56">
            {(isAdminView ? adminData.userGrowth.length > 0 : data.revenueData.length > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={isAdminView ? adminData.userGrowth : data.revenueData} 
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => isAdminView ? value.toString() : `R$${formatNumber(value/1000, 0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => {
                      if (isAdminView) return [value.toString(), 'Usuários'];
                      return [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita'];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={isAdminView ? "users" : "revenue"} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-xs">Sem dados disponíveis</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            if ('requiresPlan' in action && action.requiresPlan && !hasAccess(action.requiresPlan)) {
              return (
                <PlanRestrictedArea 
                  key={action.title}
                  requiredPlan={action.requiresPlan}
                  feature={action.title}
                  variant="overlay"
                >
                  <Button variant="outline" className="gap-2 rounded-xl h-9 text-sm border-border/50" disabled>
                    <action.icon className="h-3.5 w-3.5" />
                    {action.title}
                  </Button>
                </PlanRestrictedArea>
              );
            }
            
            return (
              <Button
                key={action.title}
                variant="outline"
                className="gap-2 rounded-xl h-9 text-sm border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                asChild
              >
                <Link to={action.href}>
                  <action.icon className="h-3.5 w-3.5" />
                  {action.title}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

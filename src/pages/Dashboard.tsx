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
  ArrowUpRight,
  Building2,
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  RefreshCcw,
  Users,
  Crown,
  Shield,
  FileText,
  Filter,
  Settings,
  HelpCircle,
  TrendingDown,
  ArrowDownRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAdminData } from '@/hooks/useAdminData';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FinancialHealthScore } from '@/components/dashboard/FinancialHealthScore';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { data, filters, updateFilters, refreshData, dateRange } = useDashboardData();
  const { data: adminData, refreshData: refreshAdminData } = useAdminData();
  const { activities, loading: activitiesLoading } = useActivityLog();
  const { hasAccess } = usePlanLimits();

  // Use admin data if user is admin, otherwise use regular dashboard data
  const isAdminView = isAdmin;
  const currentData = isAdminView ? adminData : data;
  const currentRefresh = isAdminView ? refreshAdminData : refreshData;

  // Preparar dados dos cards principais baseados no tipo de usuário
  const stats = isAdminView ? [
    {
      title: 'Total de Usuários',
      value: adminData.totalUsers.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      description: 'crescimento mensal',
      icon: Users,
      color: 'text-primary',
      trend: [120, 135, 142, 158, 167, 178, adminData.totalUsers],
    },
    {
      title: 'Assinantes Ativos',
      value: adminData.activeSubscriptions.toString(),
      change: '+23%',
      changeType: 'positive' as const,
      description: 'conversões do mês',
      icon: Crown,
      color: 'text-secondary',
      trend: [45, 52, 48, 61, 67, 72, adminData.activeSubscriptions],
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${adminData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: '+18%',
      changeType: 'positive' as const,
      description: 'receita recorrente',
      icon: DollarSign,
      color: 'text-accent',
      trend: [2800, 3200, 3100, 3500, 3800, 4200, adminData.monthlyRevenue],
    },
    {
      title: 'Afiliados Ativos',
      value: adminData.totalAffiliates.toString(),
      change: '+8%',
      changeType: 'positive' as const,
      description: 'parceiros ativos',
      icon: Building2,
      color: 'text-orange',
      trend: [12, 15, 14, 18, 19, 22, adminData.totalAffiliates],
    },
  ] : [
    {
      title: 'CMV (mês atual) — Periódico',
      value: `R$ ${data.cmvMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: null,
      changeType: null,
      description: 'Estoque Inicial + Compras - Estoque Final',
      icon: TrendingDown,
      color: 'text-orange',
      trend: [],
    },
    {
      title: 'Valor em Estoque (agora)',
      value: `R$ ${data.valorEmEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: null,
      changeType: null,
      description: 'Atualizado em Brasília',
      icon: Package,
      color: 'text-primary',
      trend: [],
    },
    {
      title: 'Saídas (mês atual)',
      value: `R$ ${data.totalSaidasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: null,
      changeType: null,
      description: 'Fuso: Brasília',
      icon: ArrowDownRight,
      color: 'text-secondary',
      trend: [],
    },
  ];

  const quickActions = isAdminView ? [
    {
      title: 'Gerenciar Usuários',
      description: 'Administrar contas e planos',
      icon: Users,
      href: '/admin-usuarios',
      gradient: 'from-primary to-primary-glow',
      stats: `${adminData.totalUsers} usuários registrados`,
    },
    {
      title: 'Sistema de Afiliados',
      description: 'Controlar parcerias e comissões',
      icon: Crown,
      href: '/afiliados',
      gradient: 'from-secondary to-purple',
      stats: `R$ ${adminData.pendingCommissions.toLocaleString('pt-BR')} em comissões`,
    },
    {
      title: 'Configurações',
      description: 'Administração do sistema',
      icon: Building2,
      href: '/admin-configuracoes',
      gradient: 'from-accent to-red',
      stats: 'Controle total do sistema',
    },
  ] : [
    {
      title: 'Novo Produto',
      description: 'Cadastrar e precificar rapidamente',
      icon: Plus,
      href: '/estoque',
      gradient: 'from-primary to-primary-glow',
      stats: `${data.activeProductsChange} produtos no período`,
    },
    {
      title: 'Análise Avançada',
      description: 'Relatórios detalhados de performance',
      icon: BarChart3,
      href: '/custos',
      gradient: 'from-secondary to-purple',
      stats: 'Dados atualizados em tempo real',
      requiresPlan: 'professional' as const,
    },
    {
      title: 'Configurações',
      description: 'Perfil da empresa e preferências',
      icon: Building2,
      href: '/perfil',
      gradient: 'from-accent to-red',
      stats: 'Gerencie suas configurações',
    },
  ];

  // Loading state
  if (currentData.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">
            {isAdminView ? 'Carregando dados administrativos...' : 'Carregando dados do dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Header - Soft & Clean */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {isAdminView ? '👨‍💼 Painel Admin' : `👋 Olá, ${user?.email?.split('@')[0] || 'usuário'}!`}
              </h1>
              <p className="text-muted-foreground text-lg">
                {isAdminView 
                  ? 'Visão geral do sistema' 
                  : `Aqui está o resumo do seu negócio ${format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}`
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {!isAdminView && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filtros do Dashboard</SheetTitle>
                      <SheetDescription>
                        Personalize o período de análise
                      </SheetDescription>
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
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Main Stats - Simplified & Spacious */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stats.slice(0, 3).map((stat) => {
            const Icon = stat.icon;
            const isPositive = stat.changeType === 'positive';
            return (
              <Card key={stat.title} className="soft-card">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-4xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      {stat.change ? (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={isPositive ? "default" : "destructive"} 
                            className="font-medium"
                          >
                            {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                            {stat.change}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {stat.description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {stat.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Insights + Health Score Row */}
        {!isAdminView && (
          <div className="grid gap-8 md:grid-cols-2">
            <InsightsCard />
            <FinancialHealthScore />
          </div>
        )}

        {/* Simplified Chart */}
        <Card className="soft-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Performance Financeira</CardTitle>
                <CardDescription className="mt-1">
                  {isAdminView ? 'Crescimento de usuários' : 'Receita ao longo do tempo'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold">
                {isAdminView ? `${adminData.totalUsers} usuários` : `${data.totalRevenueChange >= 0 ? '+' : ''}${data.totalRevenueChange.toFixed(1)}%`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {(isAdminView ? adminData.userGrowth.length > 0 : data.revenueData.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={isAdminView ? adminData.userGrowth : data.revenueData} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => isAdminView ? value.toString() : `R$ ${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        padding: '12px',
                      }}
                      formatter={(value, name) => {
                        if (isAdminView) {
                          return [value.toString(), name === 'users' ? 'Usuários' : 'Receita'];
                        }
                        return [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita'];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={isAdminView ? "users" : "revenue"} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                    <p className="text-sm">Nenhum dado disponível</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Horizontal Pills */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              if (action.requiresPlan && !hasAccess(action.requiresPlan)) {
                return (
                  <PlanRestrictedArea 
                    key={action.title}
                    requiredPlan={action.requiresPlan}
                    feature={action.title}
                    variant="overlay"
                  >
                    <Button
                      variant="outline"
                      className="gap-2 h-11 px-4 rounded-full"
                      disabled
                    >
                      <action.icon className="h-4 w-4" />
                      {action.title}
                    </Button>
                  </PlanRestrictedArea>
                );
              }
              
              return (
                <Button
                  key={action.title}
                  variant="outline"
                  className="gap-2 h-11 px-4 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <Link to={action.href}>
                    <action.icon className="h-4 w-4" />
                    {action.title}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
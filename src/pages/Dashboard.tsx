import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useActivityLog } from '@/hooks/useActivityLog';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const Dashboard = () => {
  const { user } = useAuth();
  const { data, filters, updateFilters, refreshData, dateRange } = useDashboardData();
  const { activities, loading: activitiesLoading } = useActivityLog();
  const { hasAccess } = usePlanLimits();

  // Preparar dados dos cards principais baseados nos dados reais
  const stats = [
    {
      title: 'Receita Total',
      value: `R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${data.totalRevenueChange >= 0 ? '+' : ''}${data.totalRevenueChange.toFixed(1)}%`,
      changeType: data.totalRevenueChange >= 0 ? 'positive' : 'negative',
      description: 'vs período anterior',
      icon: DollarSign,
      color: 'text-primary',
      trend: data.revenueData.slice(-7).map(d => d.revenue),
    },
    {
      title: 'Produtos Ativos',
      value: data.activeProducts.toString(),
      change: `+${data.activeProductsChange}`,
      changeType: 'positive' as const,
      description: 'novos no período',
      icon: Package,
      color: 'text-secondary',
      trend: [45, 52, 48, 61, 67, 72, data.activeProducts],
    },
    {
      title: 'Margem Média',
      value: `${data.averageMargin.toFixed(1)}%`,
      change: `${data.averageMarginChange >= 0 ? '+' : ''}${data.averageMarginChange.toFixed(1)}%`,
      changeType: data.averageMarginChange >= 0 ? 'positive' : 'negative',
      description: 'Meta: 30%',
      icon: TrendingUp,
      color: 'text-accent',
      trend: [28, 30, 29, 31, 32, 33, data.averageMargin],
    },
    {
      title: 'Custos Operacionais',
      value: `R$ ${data.operationalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${data.operationalCostsChange >= 0 ? '+' : ''}${data.operationalCostsChange.toFixed(1)}%`,
      changeType: data.operationalCostsChange >= 0 ? 'positive' : 'negative',
      description: 'variação mensal',
      icon: BarChart3,
      color: 'text-orange',
      trend: [3800, 3650, 3500, 3400, 3350, 3300, data.operationalCosts],
    },
  ];

  const quickActions = [
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
  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
            Dashboard Executivo
          </h1>
          <p className="text-lg text-muted-foreground">
            {user?.user_metadata?.full_name || user?.email} • {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <DashboardFilters
            currentPeriod={filters.period}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onPeriodChange={(period) => updateFilters({ period })}
            onDateRangeChange={(startDate, endDate) => updateFilters({ startDate, endDate })}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="h-9"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" className="h-9 bg-gradient-primary text-white shadow-glow">
            <Eye className="h-4 w-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.changeType === 'positive';
          return (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-elegant bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50"></div>
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${isPositive ? 'from-green-500/20 to-emerald-500/20' : 'from-red-500/20 to-rose-500/20'}`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
                          isPositive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {stat.change}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stat.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mini Sparkline */}
                <div className="mt-4 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stat.trend.map((value, i) => ({ value, index: i }))}>
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill={`url(#gradient-${index})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Performance Financeira</CardTitle>
                  <CardDescription>
                    Receita vs Custos • {data.revenueData.length > 0 ? 'Últimos meses' : 'Dados históricos'}
                  </CardDescription>
                </div>
                <Badge className="bg-gradient-primary text-white border-0">
                  {data.totalRevenueChange >= 0 ? '+' : ''}{data.totalRevenueChange.toFixed(1)}% no período
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-80">
                {data.revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value, name) => [
                        `R$ ${value.toLocaleString('pt-BR')}`, 
                        name === 'revenue' ? 'Receita' : 'Custos'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#revenueGradient)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#costGradient)"
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                      <p>Nenhum dado de faturamento encontrado</p>
                      <p className="text-sm">Configure seus dados históricos em Custos</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution */}
        <div className="space-y-6">
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Distribuição de Vendas</CardTitle>
              <CardDescription>Por categoria de produto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {data.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={data.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Package className="h-8 w-8 mx-auto opacity-50" />
                      <p className="text-sm">Nenhuma categoria encontrada</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3 mt-4">
                {data.categoryData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity */}
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Atividade Semanal</CardTitle>
              <CardDescription>Vendas e produtos por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'vendas' ? 'Vendas' : 'Produtos']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {quickActions.map((action, index) => {
          if (action.requiresPlan && !hasAccess(action.requiresPlan)) {
            return (
              <PlanRestrictedArea 
                key={action.title}
                requiredPlan={action.requiresPlan}
                feature={action.title}
                variant="overlay"
              >
                <Card className="relative overflow-hidden border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-5`}></div>
                  <CardContent className="relative p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${action.gradient} shadow-lg`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                        <p className="text-xs font-medium text-primary">
                          {action.stats}
                        </p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </PlanRestrictedArea>
            );
          }
          
          return (
            <Link key={action.title} to={action.href} className="block group">
              <Card className="relative overflow-hidden border-0 shadow-elegant bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500 group-hover:scale-[1.02]">
                <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardContent className="relative p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-r ${action.gradient} shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {action.stats}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-elegant">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <span>Atividade Recente</span>
              </CardTitle>
              <CardDescription>Últimas ações no sistema</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-muted-foreground">Carregando atividades...</span>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-glass border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                    activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    activity.status === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                    activity.status === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {activity.type === 'update' && <TrendingUp className="h-4 w-4" />}
                    {activity.type === 'create' && <Plus className="h-4 w-4" />}
                    {activity.type === 'delete' && <ArrowDown className="h-4 w-4" />}
                    {activity.type === 'auth' && <Activity className="h-4 w-4" />}
                    {activity.type === 'cost' && <AlertTriangle className="h-4 w-4" />}
                    {activity.type === 'report' && <BarChart3 className="h-4 w-4" />}
                    {(activity.type === 'info' || activity.type === 'login') && <Eye className="h-4 w-4" />}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{activity.action}</p>
                      {activity.value && (
                        <Badge variant="outline" className="text-xs">
                          {activity.value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto opacity-50 mb-4" />
              <p>Nenhuma atividade recente</p>
              <p className="text-sm">As atividades aparecerão aqui conforme você usar o sistema</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
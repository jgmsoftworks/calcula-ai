import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { 
  Calculator, 
  TrendingUp, 
  Package, 
  BarChart3,
  DollarSign,
  Plus,
  ArrowUpRight,
  Building2,
  Target,
  Activity,
  Calendar,
  Users,
  PieChart,
  Briefcase,
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Eye,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area, Pie } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();

  // Dados para gráficos
  const revenueData = [
    { month: 'Jan', revenue: 4500, cost: 3200 },
    { month: 'Fev', revenue: 5200, cost: 3600 },
    { month: 'Mar', revenue: 4800, cost: 3400 },
    { month: 'Abr', revenue: 6100, cost: 4200 },
    { month: 'Mai', revenue: 7200, cost: 4800 },
    { month: 'Jun', revenue: 8450, cost: 5200 },
  ];

  const categoryData = [
    { name: 'Produtos A', value: 35, color: 'hsl(var(--primary))' },
    { name: 'Produtos B', value: 25, color: 'hsl(var(--secondary))' },
    { name: 'Produtos C', value: 20, color: 'hsl(var(--accent))' },
    { name: 'Outros', value: 20, color: 'hsl(var(--muted))' },
  ];

  const dailyActivity = [
    { day: 'Seg', vendas: 12, produtos: 8 },
    { day: 'Ter', vendas: 19, produtos: 12 },
    { day: 'Qua', vendas: 15, produtos: 10 },
    { day: 'Qui', vendas: 25, produtos: 16 },
    { day: 'Sex', vendas: 22, produtos: 14 },
    { day: 'Sáb', vendas: 18, produtos: 11 },
    { day: 'Dom', vendas: 14, produtos: 9 },
  ];

  const stats = [
    {
      title: 'Receita Total',
      value: 'R$ 8.450',
      change: '+15.3%',
      changeType: 'positive',
      description: 'vs mês anterior',
      icon: DollarSign,
      color: 'text-primary',
      trend: [65, 78, 72, 85, 91, 88, 95],
    },
    {
      title: 'Produtos Ativos',
      value: '247',
      change: '+12',
      changeType: 'positive', 
      description: 'novos esta semana',
      icon: Package,
      color: 'text-secondary',
      trend: [45, 52, 48, 61, 67, 72, 75],
    },
    {
      title: 'Margem Média',
      value: '32.8%',
      change: '+2.1%',
      changeType: 'positive',
      description: 'Meta: 30%',
      icon: TrendingUp,
      color: 'text-accent',
      trend: [28, 30, 29, 31, 32, 33, 32.8],
    },
    {
      title: 'Custos Operacionais',
      value: 'R$ 3.250',
      change: '-5.2%',
      changeType: 'negative',
      description: 'redução mensal',
      icon: BarChart3,
      color: 'text-orange',
      trend: [3800, 3650, 3500, 3400, 3350, 3300, 3250],
    },
  ];

  const quickActions = [
    {
      title: 'Novo Produto',
      description: 'Cadastrar e precificar rapidamente',
      icon: Plus,
      href: '/estoque',
      gradient: 'from-primary to-primary-glow',
      stats: '12 produtos cadastrados hoje',
    },
    {
      title: 'Análise Avançada',
      description: 'Relatórios detalhados de performance',
      icon: BarChart3,
      href: '/custos',
      gradient: 'from-secondary to-purple',
      stats: '3 relatórios pendentes',
    },
    {
      title: 'Configurações',
      description: 'Perfil da empresa e preferências',
      icon: Building2,
      href: '/perfil',
      gradient: 'from-accent to-red',
      stats: 'Perfil 85% completo',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Produto atualizado',
      description: 'Hambúrguer Artesanal - Nova margem: 35%',
      time: '2 min atrás',
      type: 'update',
      value: 'R$ 18,50',
      status: 'success'
    },
    {
      id: 2,
      action: 'Produto cadastrado',
      description: 'Pizza Margherita adicionada ao catálogo',
      time: '1 hora atrás',
      type: 'create',
      value: 'R$ 24,00',
      status: 'success'
    },
    {
      id: 3,
      action: 'Custo alterado',
      description: 'Matéria-prima - Ajuste de 8%',
      time: '3 horas atrás',
      type: 'cost',
      value: '+R$ 125',
      status: 'warning'
    },
    {
      id: 4,
      action: 'Relatório gerado',
      description: 'Análise mensal de performance',
      time: '1 dia atrás',
      type: 'report',
      value: '15 produtos',
      status: 'info'
    }
  ];

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
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Calendar className="h-4 w-4 mr-2" />
            Período
          </Button>
          <Button size="sm" className="h-9 bg-gradient-primary text-white shadow-glow">
            <Eye className="h-4 w-4 mr-2" />
            Relatório Completo
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
                  <CardDescription>Receita vs Custos nos últimos 6 meses</CardDescription>
                </div>
                <Badge className="bg-gradient-primary text-white border-0">
                  +15.3% este mês
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {categoryData.map((item, index) => (
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
                  <BarChart data={dailyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
        {quickActions.map((action, index) => (
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
        ))}
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
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-glass border border-border/50 hover:bg-muted/30 transition-colors">
                <div className={`p-2 rounded-lg ${
                  activity.status === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                  activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  activity.status === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {activity.type === 'update' && <TrendingUp className="h-4 w-4" />}
                  {activity.type === 'create' && <Plus className="h-4 w-4" />}
                  {activity.type === 'cost' && <AlertTriangle className="h-4 w-4" />}
                  {activity.type === 'report' && <BarChart3 className="h-4 w-4" />}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{activity.action}</p>
                    <Badge variant="outline" className="text-xs">
                      {activity.value}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
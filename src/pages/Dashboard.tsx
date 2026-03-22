import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Package, 
  BarChart3,
  DollarSign,
  Users,
  Crown,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Warehouse,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAdminData } from '@/hooks/useAdminData';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CmvCard } from '@/components/dashboard/CmvCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { data, filters, updateFilters, refreshData, dateRange } = useDashboardData();
  const { data: adminData, refreshData: refreshAdminData } = useAdminData();

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
      title: 'Entradas (mês atual)',
      value: `R$ ${data.totalEntradasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowUpRight,
      gradient: 'from-[#16a34a] to-[#15803d]',
      iconBg: 'bg-[#16a34a]/10',
      iconColor: 'text-[#16a34a]',
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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const delay = i * 100;
          return (
            <Card key={stat.title} className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold font-display text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Movements Chart */}
      {!isAdminView && (
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-brand-horizontal" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Movimentações Diárias</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Entradas e saídas por dia no mês atual
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {data.dailyMovements.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.dailyMovements} 
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${(value / 1).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name === 'entradas' ? 'Entradas' : 'Saídas'
                      ]}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Legend 
                      formatter={(value) => value === 'entradas' ? 'Entradas' : 'Saídas'}
                    />
                    <Bar dataKey="entradas" fill="#16a34a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="saidas" fill="#7328b1" radius={[2, 2, 0, 0]} />
                  </BarChart>
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
      )}

      {/* Saldo Inicial + CMV % */}
      {!isAdminView && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300">
            <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Saldo Inicial do Estoque (mês)
                  </p>
                  {data.cmvResult.breakdown.estoqueInicial !== null ? (
                    <div>
                      <p className="text-3xl font-bold font-display text-foreground">
                        R$ {data.cmvResult.breakdown.estoqueInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {data.cmvResult.breakdown.estoqueInicialEstimado && (
                        <span className="text-xs text-muted-foreground mt-1 inline-block">(estimado)</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Sem dados para estimar</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-[#0483e4]/10 group-hover:scale-110 transition-transform">
                  <Warehouse className="h-6 w-6 text-[#0483e4]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300">
            <div className="h-1 bg-gradient-to-r from-[#dd0b52] to-[#f96e0c]" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    CMV %
                  </p>
                  {!data.cmvResult.cmvDisponivel ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Indisponível</span>
                    </div>
                  ) : data.cmvResult.cmvPercentual !== null ? (
                    <p className="text-3xl font-bold font-display text-foreground">
                      {data.cmvResult.cmvPercentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Sem vendas no período</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-[#dd0b52]/10 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-6 w-6 text-[#dd0b52]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

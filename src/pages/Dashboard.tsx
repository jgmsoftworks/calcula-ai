import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Calculator, 
  TrendingUp, 
  Package, 
  BarChart3,
  DollarSign,
  Plus,
  ArrowUpRight,
  Building2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Produtos Cadastrados',
      value: '12',
      description: '+2 esta semana',
      icon: Package,
      color: 'text-primary',
    },
    {
      title: 'Receita Projetada',
      value: 'R$ 8.450',
      description: '+15% vs mês anterior',
      icon: DollarSign,
      color: 'text-accent',
    },
    {
      title: 'Margem Média',
      value: '32%',
      description: 'Meta: 30%',
      icon: TrendingUp,
      color: 'text-secondary',
    },
    {
      title: 'Custos Fixos Mensais',
      value: 'R$ 3.250',
      description: 'Últimos 30 dias',
      icon: BarChart3,
      color: 'text-orange',
    },
  ];

  const quickActions = [
    {
      title: 'Novo Produto',
      description: 'Cadastrar produto e calcular preço',
      icon: Plus,
      href: '/estoque',
      variant: 'gradient' as const,
    },
    {
      title: 'Análise de Custos',
      description: 'Revisar estrutura de custos',
      icon: BarChart3,
      href: '/custos',
      variant: 'brand' as const,
    },
    {
      title: 'Perfil',
      description: 'Configurar sistema e dados',
      icon: Building2,
      href: '/perfil',
      variant: 'accent' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo de volta
        </h1>
        <p className="text-lg text-muted-foreground">
          Olá {user?.user_metadata?.full_name || user?.email}, 
          aqui está o resumo do seu negócio hoje.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className={`text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="card-premium group cursor-pointer overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow group-hover:shadow-purple transition-all duration-500">
                      <action.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-secondary group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant={action.variant} className="w-full button-premium group-hover:scale-105 transition-all duration-300">
                    Acessar
                    <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="card-premium">
        <CardHeader className="bg-gradient-to-r from-card to-card/50 border-b border-border/50">
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary" />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Atividade Recente
            </span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Últimas precificações e atualizações
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-glass rounded-xl border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary-glow rounded-full shadow-glow"></div>
                <div>
                  <p className="font-medium text-foreground">Hambúrguer Artesanal - Preço atualizado</p>
                  <p className="text-sm text-muted-foreground">Margem: 35% • Preço: R$ 18,50</p>
                </div>
              </div>
              <Badge className="bg-gradient-primary text-white border-0 shadow-brand">Hoje</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-glass rounded-xl border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-orange to-orange-light rounded-full shadow-orange"></div>
                <div>
                  <p className="font-medium text-foreground">Novo produto adicionado - Pizza Margherita</p>
                  <p className="text-sm text-muted-foreground">Custo: R$ 12,30 • Preço: R$ 24,00</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-secondary to-purple text-white border-0 shadow-purple">Ontem</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-glass rounded-xl border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-accent to-secondary rounded-full shadow-red"></div>
                <div>
                  <p className="font-medium text-foreground">Relatório mensal gerado</p>
                  <p className="text-sm text-muted-foreground">15 produtos analisados</p>
                </div>
              </div>
              <Badge variant="outline" className="border-border/50 text-muted-foreground hover:bg-muted/50">3 dias</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
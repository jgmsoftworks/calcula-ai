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
          Bem-vindo de volta! 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Olá {user?.user_metadata?.full_name || user?.email}, 
          aqui está o resumo do seu negócio hoje.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-soft hover:shadow-brand transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="shadow-soft hover:shadow-brand transition-bounce group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-secondary rounded-lg">
                      <action.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-smooth">
                        {action.title}
                      </CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant={action.variant} className="w-full">
                    Acessar
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary" />
            <span>Atividade Recente</span>
          </CardTitle>
          <CardDescription>
            Últimas precificações e atualizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-secondary rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div>
                  <p className="font-medium">Hambúrguer Artesanal - Preço atualizado</p>
                  <p className="text-sm text-muted-foreground">Margem: 35% • Preço: R$ 18,50</p>
                </div>
              </div>
              <Badge variant="secondary">Hoje</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-secondary rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <div>
                  <p className="font-medium">Novo produto adicionado - Pizza Margherita</p>
                  <p className="text-sm text-muted-foreground">Custo: R$ 12,30 • Preço: R$ 24,00</p>
                </div>
              </div>
              <Badge variant="secondary">Ontem</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-secondary rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <div>
                  <p className="font-medium">Relatório mensal gerado</p>
                  <p className="text-sm text-muted-foreground">15 produtos analisados</p>
                </div>
              </div>
              <Badge variant="secondary">3 dias</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
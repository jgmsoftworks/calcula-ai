import { Store, Package, TrendingUp, Star, DollarSign, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FornecedorDashboard() {
  const stats = [
    { title: 'Orçamentos', value: '12', icon: MessageCircle, trend: '+3 este mês', color: 'text-blue-600' },
    { title: 'Produtos', value: '48', icon: Package, trend: '5 categorias', color: 'text-green-600' },
    { title: 'Avaliação', value: '4.8', icon: Star, trend: '32 avaliações', color: 'text-yellow-600' },
    { title: 'Promoções Ativas', value: '3', icon: DollarSign, trend: 'Até 15% off', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
          <Store className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Fornecedor</h1>
          <p className="text-muted-foreground">Gerencie seu negócio no marketplace</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-panel hover:shadow-elegant transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 glass-panel rounded-xl hover:shadow-elegant transition-smooth text-left">
            <Package className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Adicionar Produto</h3>
            <p className="text-sm text-muted-foreground">Cadastre novos produtos</p>
          </button>
          <button className="p-4 glass-panel rounded-xl hover:shadow-elegant transition-smooth text-left">
            <DollarSign className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Criar Promoção</h3>
            <p className="text-sm text-muted-foreground">Lance ofertas especiais</p>
          </button>
          <button className="p-4 glass-panel rounded-xl hover:shadow-elegant transition-smooth text-left">
            <MessageCircle className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Ver Orçamentos</h3>
            <p className="text-sm text-muted-foreground">Responda solicitações</p>
          </button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 glass-panel rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium">Novo orçamento recebido</p>
                <p className="text-sm text-muted-foreground">Padaria São José - há 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 glass-panel rounded-lg">
              <Star className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium">Nova avaliação</p>
                <p className="text-sm text-muted-foreground">5 estrelas - Confeitaria Doce Mel</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 glass-panel rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Promoção ativada</p>
                <p className="text-sm text-muted-foreground">20% off em farinhas - há 1 dia</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAffiliates } from "@/hooks/useAffiliates";
import { TrendingUp, Users, DollarSign, Link2, Calendar, Download, Filter } from "lucide-react";
import { useState } from "react";
import { formatBRL, formatNumber } from '@/lib/formatters';

export function AffiliatesDashboard() {
  const { affiliates, affiliateLinks, affiliateSales, affiliateCommissions, loading } = useAffiliates();
  const [dateFilter, setDateFilter] = useState('this_month');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calcular métricas do dashboard
  const topAffiliates = affiliates
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, 5);

  const recentSales = affiliateSales
    .filter(sale => sale.status === 'confirmed')
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 10);

  const pendingCommissions = affiliateCommissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  const getFilteredSales = () => {
    const now = new Date();
    return affiliateSales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      
      switch (dateFilter) {
        case 'today':
          return saleDate.toDateString() === now.toDateString() && sale.status === 'confirmed';
        case 'this_week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          return saleDate >= weekStart && sale.status === 'confirmed';
        case 'this_month':
          return saleDate.getMonth() === now.getMonth() && 
                 saleDate.getFullYear() === now.getFullYear() &&
                 sale.status === 'confirmed';
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return saleDate.getMonth() === lastMonth.getMonth() && 
                 saleDate.getFullYear() === lastMonth.getFullYear() &&
                 sale.status === 'confirmed';
        default:
          return sale.status === 'confirmed';
      }
    });
  };

  const filteredSales = getFilteredSales();

  const conversionRates = affiliateLinks.map(link => ({
    ...link,
    conversionRate: link.clicks_count > 0 ? (link.conversions_count / link.clicks_count) * 100 : 0
  })).sort((a, b) => b.conversionRate - a.conversionRate);

  const exportReport = () => {
    // Placeholder para futura implementação de exportação
    alert('Funcionalidade de exportação será implementada em breve!');
  };

  return (
    <div className="space-y-6">
      {/* Controles do Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="this_week">Esta Semana</SelectItem>
              <SelectItem value="this_month">Este Mês</SelectItem>
              <SelectItem value="last_month">Mês Passado</SelectItem>
              <SelectItem value="all">Todos os Períodos</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumo executivo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas - {dateFilter === 'today' ? 'Hoje' : 
                       dateFilter === 'this_week' ? 'Esta Semana' :
                       dateFilter === 'this_month' ? 'Este Mês' :
                       dateFilter === 'last_month' ? 'Mês Passado' : 'Total'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {filteredSales.reduce((sum, s) => sum + s.sale_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSales.length} vendas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Afiliados Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.filter(a => a.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              de {affiliates.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatBRL(pendingCommissions)}
            </div>
            <p className="text-xs text-muted-foreground">
              A pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionRates.length > 0 
                ? `${formatNumber(conversionRates.reduce((sum, l) => sum + l.conversionRate, 0) / conversionRates.length, 1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Média geral
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Afiliados */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Afiliados por Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAffiliates.map((affiliate, index) => (
                <div key={affiliate.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {affiliate.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {affiliate.total_customers} clientes
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    R$ {formatBRL(affiliate.total_sales)}
                  </div>
                </div>
              ))}
              
              {topAffiliates.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma venda registrada ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sale.customer_name || sale.customer_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sale.plan_type} - {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    R$ {formatBRL(sale.sale_amount)}
                  </div>
                </div>
              ))}
              
              {recentSales.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma venda recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links com melhor performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionRates.slice(0, 5).map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {link.affiliate?.name} - {link.link_code}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {link.clicks_count} cliques • {link.conversions_count} conversões
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatNumber(link.conversionRate, 1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Taxa conversão
                  </p>
                </div>
              </div>
            ))}
            
            {conversionRates.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum link ativo
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
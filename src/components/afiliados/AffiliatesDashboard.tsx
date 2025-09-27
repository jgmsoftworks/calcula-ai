import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAffiliates } from "@/hooks/useAffiliates";
import { TrendingUp, Users, DollarSign, Link2 } from "lucide-react";

export function AffiliatesDashboard() {
  const { affiliates, affiliateLinks, affiliateSales, affiliateCommissions, loading } = useAffiliates();

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

  const thisMonthSales = affiliateSales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    const now = new Date();
    return saleDate.getMonth() === now.getMonth() && 
           saleDate.getFullYear() === now.getFullYear() &&
           sale.status === 'confirmed';
  });

  const conversionRates = affiliateLinks.map(link => ({
    ...link,
    conversionRate: link.clicks_count > 0 ? (link.conversions_count / link.clicks_count) * 100 : 0
  })).sort((a, b) => b.conversionRate - a.conversionRate);

  return (
    <div className="space-y-6">
      {/* Resumo executivo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {thisMonthSales.reduce((sum, s) => sum + s.sale_amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthSales.length} vendas confirmadas
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
              R$ {pendingCommissions.toFixed(2)}
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
                ? `${(conversionRates.reduce((sum, l) => sum + l.conversionRate, 0) / conversionRates.length).toFixed(1)}%`
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
                    R$ {affiliate.total_sales.toFixed(2)}
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
                    R$ {sale.sale_amount.toFixed(2)}
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
                    {link.conversionRate.toFixed(1)}%
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
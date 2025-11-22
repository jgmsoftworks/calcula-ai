import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatNumber } from '@/lib/formatters';

export function AffiliatesSales() {
  const { affiliateSales, loading } = useAffiliates();

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800"
    };
    
    const labels = {
      pending: "Pendente",
      confirmed: "Confirmada",
      cancelled: "Cancelada",
      refunded: "Reembolsada"
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const colors = {
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-orange-100 text-orange-800",
      free: "bg-gray-100 text-gray-800"
    };
    
    const labels = {
      professional: "Professional",
      enterprise: "Enterprise",
      free: "Gratuito"
    };
    
    return (
      <Badge className={colors[planType as keyof typeof colors] || "bg-blue-100 text-blue-800"}>
        {labels[planType as keyof typeof labels] || planType}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalSales = affiliateSales
    .filter(sale => sale.status === 'confirmed')
    .reduce((sum, sale) => sum + sale.sale_amount, 0);

  const totalCommissions = affiliateSales
    .filter(sale => sale.status === 'confirmed')
    .reduce((sum, sale) => sum + sale.commission_amount, 0);

  return (
    <div className="space-y-4">
      {/* Resumo de vendas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {affiliateSales.filter(s => s.status === 'confirmed').length} vendas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comissões Geradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissões confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSales > 0 ? `${formatNumber((totalCommissions / totalSales) * 100, 1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão média
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor Venda</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliateSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.affiliate?.name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {sale.customer_name || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {sale.customer_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(sale.plan_type)}
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {formatBRL(sale.sale_amount)}
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {formatBRL(sale.commission_amount)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sale.status)}
                  </TableCell>
                  <TableCell>
                    {sale.affiliate_link ? (
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {sale.affiliate_link.link_code}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">Direto</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {affiliateSales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda registrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
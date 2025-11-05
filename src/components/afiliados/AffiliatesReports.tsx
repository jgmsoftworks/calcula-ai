import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAffiliates } from "@/hooks/useAffiliates";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, Users, DollarSign, Percent, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AffiliatesReports() {
  const { affiliates, affiliateLinks, affiliateSales, affiliateCommissions, loading } = useAffiliates();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedAffiliate, setSelectedAffiliate] = useState('all');

  const getFilteredData = () => {
    const now = new Date();
    let sales = affiliateSales;
    
    // Filtro por período
    if (selectedPeriod !== 'all') {
      sales = sales.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        
        switch (selectedPeriod) {
          case 'today':
            return saleDate.toDateString() === now.toDateString();
          case 'this_week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            return saleDate >= weekStart;
          case 'this_month':
            return saleDate.getMonth() === now.getMonth() && 
                   saleDate.getFullYear() === now.getFullYear();
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return saleDate.getMonth() === lastMonth.getMonth() && 
                   saleDate.getFullYear() === lastMonth.getFullYear();
          default:
            return true;
        }
      });
    }
    
    // Filtro por afiliado
    if (selectedAffiliate !== 'all') {
      sales = sales.filter(sale => sale.affiliate_id === selectedAffiliate);
    }
    
    return sales.filter(sale => sale.status === 'confirmed');
  };

  const filteredSales = getFilteredData();

  const salesByAffiliate = affiliates.map(affiliate => ({
    name: affiliate.name,
    vendas: filteredSales.filter(s => s.affiliate_id === affiliate.id).length,
    valor: filteredSales.filter(s => s.affiliate_id === affiliate.id)
      .reduce((sum, s) => sum + s.sale_amount, 0),
    comissao: filteredSales.filter(s => s.affiliate_id === affiliate.id)
      .reduce((sum, s) => sum + s.commission_amount, 0)
  })).filter(data => data.vendas > 0);

  const salesByDay = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = filteredSales.filter(sale => 
        sale.sale_date.split('T')[0] === dateStr
      );
      
      last7Days.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        vendas: daySales.length,
        valor: daySales.reduce((sum, s) => sum + s.sale_amount, 0)
      });
    }
    return last7Days;
  };

  const planDistribution = () => {
    const planCounts = filteredSales.reduce((acc, sale) => {
      acc[sale.plan_type] = (acc[sale.plan_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(planCounts).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count,
      percentage: ((count / filteredSales.length) * 100).toFixed(1)
    }));
  };

  const topPerformers = salesByAffiliate
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const conversionRates = affiliateLinks.map(link => {
    const linkSales = filteredSales.filter(s => s.affiliate_link_id === link.id);
    return {
      ...link,
      vendas: linkSales.length,
      valor: linkSales.reduce((sum, s) => sum + s.sale_amount, 0),
      conversao: link.clicks_count > 0 ? (linkSales.length / link.clicks_count * 100) : 0
    };
  }).sort((a, b) => b.conversao - a.conversao);

  const exportToCSV = () => {
    const csvData = [
      ['Afiliado', 'Email', 'Vendas', 'Valor Total', 'Comissão Total', 'Taxa Conversão'],
      ...salesByAffiliate.map(data => {
        const affiliate = affiliates.find(a => a.name === data.name);
        const links = affiliateLinks.filter(l => l.affiliate_id === affiliate?.id);
        const totalClicks = links.reduce((sum, l) => sum + l.clicks_count, 0);
        const conversao = totalClicks > 0 ? (data.vendas / totalClicks * 100).toFixed(2) : '0.00';
        
        return [
          data.name,
          affiliate?.email || '',
          data.vendas.toString(),
          `R$ ${data.valor.toFixed(2)}`,
          `R$ ${data.comissao.toFixed(2)}`,
          `${conversao}%`
        ];
      })
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_afiliados_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Relatórios Avançados</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
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
          
          <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
            <SelectTrigger className="w-48">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Afiliados</SelectItem>
              {affiliates.filter(a => a.id && a.id.trim() !== '').map(affiliate => (
                <SelectItem key={affiliate.id} value={affiliate.id}>
                  {affiliate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={exportToCSV} disabled={salesByAffiliate.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Métricas Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-muted-foreground">vendas confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {filteredSales.reduce((sum, s) => sum + s.sale_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">receita total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {filteredSales.reduce((sum, s) => sum + s.commission_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">total comissões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {filteredSales.length > 0 
                ? (filteredSales.reduce((sum, s) => sum + s.sale_amount, 0) / filteredSales.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                : '0,00'
              }
            </div>
            <p className="text-xs text-muted-foreground">por venda</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vendas por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByDay()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'vendas' ? value : `R$ ${Number(value).toFixed(2)}`,
                    name === 'vendas' ? 'Vendas' : 'Valor'
                  ]}
                />
                <Bar dataKey="vendas" fill="#3b82f6" name="vendas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Plano */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {planDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Afiliado */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Afiliado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Comissões</TableHead>
                <TableHead>Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformers.map((performer, index) => {
                const affiliate = affiliates.find(a => a.name === performer.name);
                const links = affiliateLinks.filter(l => l.affiliate_id === affiliate?.id);
                const totalClicks = links.reduce((sum, l) => sum + l.clicks_count, 0);
                const conversao = totalClicks > 0 ? (performer.vendas / totalClicks * 100) : 0;
                
                return (
                  <TableRow key={performer.name}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{performer.name}</TableCell>
                    <TableCell>{performer.vendas}</TableCell>
                    <TableCell>R$ {performer.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R$ {performer.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{conversao.toFixed(2)}%</TableCell>
                  </TableRow>
                );
              })}
              {topPerformers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada no período selecionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance de Links */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Links de Afiliação</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código do Link</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Cliques</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversionRates.slice(0, 10).map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {link.link_code}
                    </code>
                  </TableCell>
                  <TableCell>{link.affiliate?.name}</TableCell>
                  <TableCell>{link.clicks_count}</TableCell>
                  <TableCell>{link.vendas}</TableCell>
                  <TableCell>R$ {link.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge variant={link.conversao > 5 ? "default" : link.conversao > 2 ? "secondary" : "outline"}>
                      {link.conversao.toFixed(2)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {conversionRates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum link ativo encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
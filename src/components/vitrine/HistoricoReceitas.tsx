import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHistoricoMovimentacoes } from '@/hooks/useHistoricoMovimentacoes';
import { formatDateBrasilia, formatTimeBrasilia } from '@/lib/dateUtils';
import { Download, X, ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, TrendingDown, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Receita {
  id: string;
  nome: string;
}

export const HistoricoReceitas = () => {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  
  const [filtros, setFiltros] = useState({
    receita_id: '',
    tipo: '',
    data_inicial: '',
    data_final: ''
  });

  const { movimentacoes, loading, loadMore, hasMore, refresh } = useHistoricoMovimentacoes({
    origem: 'vitrine',
    autoLoad: false,
  });

  // Carregar receitas
  useEffect(() => {
    if (user) {
      loadReceitas();
      handleFiltrar();
    }
  }, [user]);

  const loadReceitas = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('receitas')
        .select('id, nome')
        .eq('user_id', user.id)
        .order('nome');

      setReceitas(data || []);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    }
  };

  const handleFiltrar = () => {
    const filtrosAtivos: any = {};
    
    if (filtros.receita_id) filtrosAtivos.receita_id = filtros.receita_id;
    if (filtros.tipo) filtrosAtivos.tipo = filtros.tipo;
    if (filtros.data_inicial) filtrosAtivos.data_inicial = filtros.data_inicial;
    if (filtros.data_final) filtrosAtivos.data_final = filtros.data_final;
    
    refresh(filtrosAtivos);
  };

  const clearFilters = () => {
    setFiltros({
      receita_id: '',
      tipo: '',
      data_inicial: '',
      data_final: ''
    });
    refresh();
  };

  const hasActiveFilters = Object.values(filtros).some(v => v !== '');

  const exportToCsv = () => {
    if (movimentacoes.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Data', 'Hora', 'Tipo', 'Receita', 'Quantidade', 'Custo Unit.', 'Preço Venda', 'Total', 'Observação'];
    const rows = movimentacoes.map(mov => [
      formatDateBrasilia(mov.created_at),
      formatTimeBrasilia(mov.created_at),
      getTipoLabel(mov.tipo),
      mov.receitas?.nome || '-',
      mov.quantidade.toString().replace('.', ','),
      mov.custo_unitario.toFixed(2).replace('.', ','),
      (mov.preco_venda || 0).toFixed(2).replace('.', ','),
      (mov.quantidade * (mov.preco_venda || mov.custo_unitario)).toFixed(2).replace('.', ','),
      mov.observacao || '-'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_receitas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Arquivo CSV exportado com sucesso');
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: 'Entrada',
      venda: 'Venda',
      perdas: 'Perdas',
      brindes: 'Brindes'
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string }> = {
      entrada: { variant: 'default', icon: ArrowUpCircle, label: 'Entrada' },
      venda: { variant: 'default', icon: DollarSign, label: 'Venda' },
      perdas: { variant: 'destructive', icon: TrendingDown, label: 'Perdas' },
      brindes: { variant: 'secondary', icon: Gift, label: 'Brindes' }
    };

    const config = badges[tipo] || { variant: 'outline', icon: ArrowDownCircle, label: tipo };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Calcular totais
  const totais = movimentacoes.reduce(
    (acc, mov) => {
      if (mov.tipo === 'entrada') {
        acc.entradas += mov.quantidade;
        acc.custoTotal += mov.quantidade * mov.custo_unitario;
      } else if (mov.tipo === 'venda') {
        acc.vendas += mov.quantidade;
        acc.vendaTotal += mov.quantidade * (mov.preco_venda || 0);
      } else if (mov.tipo === 'perdas') {
        acc.perdas += mov.quantidade;
      } else if (mov.tipo === 'brindes') {
        acc.brindes += mov.quantidade;
      }
      return acc;
    },
    { entradas: 0, vendas: 0, perdas: 0, brindes: 0, custoTotal: 0, vendaTotal: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Cards de Resumo */}
      {movimentacoes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-primary" />
                Entradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.entradas.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Custo: R$ {totais.custoTotal.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.vendas.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Total: R$ {totais.vendaTotal.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Perdas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.perdas.toFixed(0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gift className="w-4 h-4 text-secondary" />
                Brindes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.brindes.toFixed(0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Receita</Label>
            <Select value={filtros.receita_id} onValueChange={(v) => setFiltros(prev => ({ ...prev, receita_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {receitas.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros(prev => ({ ...prev, tipo: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="perdas">Perdas</SelectItem>
                <SelectItem value="brindes">Brindes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={filtros.data_inicial}
              onChange={(e) => setFiltros(prev => ({ ...prev, data_inicial: e.target.value }))}
            />
          </div>

          <div>
            <Label>Data Final</Label>
            <Input
              type="date"
              value={filtros.data_final}
              onChange={(e) => setFiltros(prev => ({ ...prev, data_final: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleFiltrar} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Buscar
          </Button>
          <Button variant="outline" onClick={exportToCsv} disabled={movimentacoes.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateBrasilia(mov.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTimeBrasilia(mov.created_at)}
                    </TableCell>
                    <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                    <TableCell className="font-medium">{mov.receitas?.nome || '-'}</TableCell>
                    <TableCell>{mov.quantidade.toFixed(2)}</TableCell>
                    <TableCell>R$ {mov.custo_unitario.toFixed(2)}</TableCell>
                    <TableCell>R$ {(mov.preco_venda || 0).toFixed(2)}</TableCell>
                    <TableCell>R$ {(mov.quantidade * (mov.preco_venda || mov.custo_unitario)).toFixed(2)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.observacao || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Carregar Mais */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore}>
            Carregar mais 50 registros
          </Button>
        </div>
      )}

      {/* Total de registros */}
      {movimentacoes.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {movimentacoes.length} movimentações
        </p>
      )}
    </div>
  );
};

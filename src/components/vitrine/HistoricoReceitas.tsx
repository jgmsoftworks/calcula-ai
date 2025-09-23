import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, ShoppingCart, Trash2, Gift, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface MovimentacaoReceita {
  id: string;
  receita_id: string;
  tipo: 'entrada' | 'venda' | 'perdas' | 'brindes';
  quantidade: number;
  custo_unitario: number;
  preco_venda: number;
  observacao: string | null;
  data: string;
  created_at: string;
  receita: {
    nome: string;
  };
}

interface Receita {
  id: string;
  nome: string;
}

type TipoMovimentacao = 'todos' | 'entrada' | 'venda' | 'perdas' | 'brindes';

export function HistoricoReceitas() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoReceita[]>([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState<MovimentacaoReceita[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    receita_id: "todos",
    tipo: "todos" as TipoMovimentacao,
    data_inicio: "",
    data_fim: "",
    search: ""
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [filters, movimentacoes]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar movimentações
      const { data: movimentacoesData, error: movError } = await supabase
        .from('movimentacoes_receitas')
        .select('*')
        .eq('user_id', user?.id)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (movError) throw movError;

      // Carregar receitas para filtro
      const { data: receitasData, error: recError } = await supabase
        .from('receitas')
        .select('id, nome')
        .eq('user_id', user?.id)
        .order('nome');

      if (recError) throw recError;

      // Se há movimentações, carregar dados das receitas relacionadas
      let movimentacoesComReceitas: MovimentacaoReceita[] = [];
      if (movimentacoesData && movimentacoesData.length > 0) {
        const receitaIds = [...new Set(movimentacoesData.map(m => m.receita_id))];
        const { data: receitasMovData, error: recMovError } = await supabase
          .from('receitas')
          .select('id, nome')
          .in('id', receitaIds);

        if (recMovError) throw recMovError;

        movimentacoesComReceitas = movimentacoesData.map(mov => {
          const receita = receitasMovData?.find(r => r.id === mov.receita_id);
          return {
            ...mov,
            receita: {
              nome: receita?.nome || 'Receita não encontrada'
            }
          };
        });
      }

      setMovimentacoes(movimentacoesComReceitas);
      setReceitas(receitasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...movimentacoes];

    // Filtro por receita
    if (filters.receita_id !== "todos") {
      filtered = filtered.filter(mov => mov.receita_id === filters.receita_id);
    }

    // Filtro por tipo
    if (filters.tipo !== "todos") {
      filtered = filtered.filter(mov => mov.tipo === filters.tipo);
    }

    // Filtro por data
    if (filters.data_inicio) {
      filtered = filtered.filter(mov => mov.data >= filters.data_inicio);
    }
    if (filters.data_fim) {
      filtered = filtered.filter(mov => mov.data <= filters.data_fim);
    }

    // Filtro por busca
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(mov => 
        mov.receita.nome.toLowerCase().includes(search) ||
        (mov.observacao && mov.observacao.toLowerCase().includes(search))
      );
    }

    setFilteredMovimentacoes(filtered);
  };

  const clearFilters = () => {
    setFilters({
      receita_id: "todos",
      tipo: "todos",
      data_inicio: "",
      data_fim: "",
      search: ""
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <Badge variant="default" className="bg-green-100 text-green-800"><Plus className="h-3 w-3 mr-1" />Entrada</Badge>;
      case 'venda':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><ShoppingCart className="h-3 w-3 mr-1" />Venda</Badge>;
      case 'perdas':
        return <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Perdas</Badge>;
      case 'brindes':
        return <Badge variant="secondary"><Gift className="h-3 w-3 mr-1" />Brindes</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const calculateTotals = () => {
    const totals = filteredMovimentacoes.reduce((acc, mov) => {
      if (mov.tipo === 'entrada') {
        acc.entradas += mov.quantidade;
        acc.custoTotal += mov.quantidade * mov.custo_unitario;
      } else {
        acc.saidas += mov.quantidade;
        if (mov.tipo === 'venda') {
          acc.vendaTotal += mov.quantidade * mov.preco_venda;
        }
      }
      return acc;
    }, { entradas: 0, saidas: 0, custoTotal: 0, vendaTotal: 0 });

    return totals;
  };

  const exportToCsv = () => {
    const headers = ['Data', 'Receita', 'Tipo', 'Quantidade', 'Custo Unit.', 'Preço Unit.', 'Total', 'Observação'];
    const csvData = [
      headers.join(','),
      ...filteredMovimentacoes.map(mov => [
        formatDate(mov.data),
        `"${mov.receita.nome}"`,
        mov.tipo,
        mov.quantidade,
        mov.custo_unitario,
        mov.preco_venda,
        mov.tipo === 'venda' ? mov.quantidade * mov.preco_venda : mov.quantidade * mov.custo_unitario,
        `"${mov.observacao || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-vitrine-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCsv} disabled={filteredMovimentacoes.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da receita ou observação..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Receita */}
            <div className="space-y-2">
              <Label>Receita</Label>
              <Select value={filters.receita_id} onValueChange={(value) => setFilters(prev => ({ ...prev, receita_id: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as receitas</SelectItem>
                  {receitas.map((receita) => (
                    <SelectItem key={receita.id} value={receita.id}>
                      {receita.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filters.tipo} onValueChange={(value: TipoMovimentacao) => setFilters(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="venda">Vendas</SelectItem>
                  <SelectItem value="perdas">Perdas</SelectItem>
                  <SelectItem value="brindes">Brindes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => setFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.data_fim}
                onChange={(e) => setFilters(prev => ({ ...prev, data_fim: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      {filteredMovimentacoes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">{totals.entradas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Saídas</p>
                <p className="text-2xl font-bold text-red-600">{totals.saidas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Valor Investido</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.custoTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Valor Vendido</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.vendaTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            Histórico de Movimentações ({filteredMovimentacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovimentacoes.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação encontrada</h3>
              <p className="text-muted-foreground">
                {filters.receita_id !== "todos" || filters.tipo !== "todos" || filters.search || filters.data_inicio || filters.data_fim
                  ? "Ajuste os filtros para ver mais resultados."
                  : "Ainda não há movimentações registradas."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentacoes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatDate(mov.data)}</TableCell>
                      <TableCell className="font-medium">{mov.receita.nome}</TableCell>
                      <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                      <TableCell className="text-right">{mov.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {mov.tipo === 'venda' 
                          ? formatCurrency(mov.preco_venda)
                          : formatCurrency(mov.custo_unitario)
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.tipo === 'venda' 
                          ? formatCurrency(mov.quantidade * mov.preco_venda)
                          : formatCurrency(mov.quantidade * mov.custo_unitario)
                        }
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-muted-foreground">
                          {mov.observacao || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUp, ArrowDown, Download, Filter, X } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  produto_id: string;
  quantidade: number;
  custo_unitario: number | null;
  fornecedor_id: string | null;
  observacao: string | null;
  data: string;
  created_at: string;
  produtos: {
    nome: string;
    unidade: string;
  };
  fornecedores: {
    nome: string;
  } | null;
}

export const Historico = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const [filtros, setFiltros] = useState({
    produto_id: 'all',
    tipo: 'all' as 'all' | 'entrada' | 'saida',
    fornecedor_id: 'all',
    data_inicial: '',
    data_final: '',
    observacao: ''
  });

  const { toast } = useToast();
  const pageSize = 50;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMovimentacoes(true); // Reset when filters change
  }, [filtros]);

  const loadInitialData = async () => {
    await Promise.all([
      loadProdutos(),
      loadFornecedores(),
      loadMovimentacoes(true)
    ]);
  };

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadMovimentacoes = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      let query = supabase
        .from('movimentacoes')
        .select(`
          *,
          produtos (nome, unidade),
          fornecedores (nome)
        `)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.produto_id && filtros.produto_id !== 'all') {
        query = query.eq('produto_id', filtros.produto_id);
      }
      if (filtros.tipo && filtros.tipo !== 'all') {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros.fornecedor_id && filtros.fornecedor_id !== 'all') {
        query = query.eq('fornecedor_id', filtros.fornecedor_id);
      }
      if (filtros.data_inicial) {
        query = query.gte('data', filtros.data_inicial);
      }
      if (filtros.data_final) {
        query = query.lte('data', filtros.data_final);
      }
      if (filtros.observacao) {
        query = query.ilike('observacao', `%${filtros.observacao}%`);
      }

      const page = reset ? 0 : currentPage + 1;
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;

      if (error) throw error;

      const newData = data || [];
      
      if (reset) {
        setMovimentacoes(newData);
      } else {
        setMovimentacoes(prev => [...prev, ...newData]);
      }

      setHasMore(newData.length === pageSize);
      setCurrentPage(page);
    } catch (error) {
      toast({
        title: "Erro ao carregar histórico",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setFiltros({
      produto_id: 'all',
      tipo: 'all',
      fornecedor_id: 'all',
      data_inicial: '',
      data_final: '',
      observacao: ''
    });
  };

  const hasActiveFilters = filtros.produto_id !== 'all' || 
                          filtros.tipo !== 'all' || 
                          filtros.fornecedor_id !== 'all' ||
                          filtros.data_inicial !== '' || 
                          filtros.data_final !== '' || 
                          filtros.observacao !== '';

  const exportToCsv = () => {
    if (movimentacoes.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Data',
      'Tipo',
      'Produto',
      'Quantidade',
      'Custo Unitário',
      'Fornecedor',
      'Observação'
    ];

    const csvContent = [
      headers.join(','),
      ...movimentacoes.map(mov => [
        format(new Date(mov.data), 'dd/MM/yyyy'),
        mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        `"${mov.produtos.nome} (${mov.produtos.unidade})"`,
        mov.quantidade.toFixed(3).replace('.', ','),
        mov.custo_unitario ? `R$ ${mov.custo_unitario.toFixed(2).replace('.', ',')}` : '—',
        mov.fornecedores?.nome ? `"${mov.fornecedores.nome}"` : '—',
        mov.observacao ? `"${mov.observacao}"` : '—'
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-movimentacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Arquivo exportado com sucesso!"
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportToCsv}>
                <Download className="w-4 h-4 mr-1" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="produto_filter">Produto</Label>
              <Select value={filtros.produto_id} onValueChange={(value) => setFiltros(prev => ({ ...prev, produto_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo_filter">Tipo</Label>
              <Select value={filtros.tipo} onValueChange={(value: any) => setFiltros(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fornecedor_filter">Fornecedor</Label>
              <Select value={filtros.fornecedor_id} onValueChange={(value) => setFiltros(prev => ({ ...prev, fornecedor_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data_inicial">Data Inicial</Label>
              <Input
                id="data_inicial"
                type="date"
                value={filtros.data_inicial}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_inicial: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="data_final">Data Final</Label>
              <Input
                id="data_final"
                type="date"
                value={filtros.data_final}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_final: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="observacao_filter">Observação</Label>
              <Input
                id="observacao_filter"
                placeholder="Buscar texto..."
                value={filtros.observacao}
                onChange={(e) => setFiltros(prev => ({ ...prev, observacao: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <p className="text-sm text-muted-foreground">
            {movimentacoes.length} movimentação(ões) encontrada(s)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Custo Unitário</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={mov.tipo === 'entrada' ? 'default' : 'secondary'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {mov.tipo === 'entrada' ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )}
                            {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mov.produtos.nome} ({mov.produtos.unidade})
                        </TableCell>
                        <TableCell>{mov.quantidade.toFixed(3)}</TableCell>
                        <TableCell>
                          {mov.custo_unitario ? `R$ ${mov.custo_unitario.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>{mov.fornecedores?.nome || '—'}</TableCell>
                        <TableCell>
                          {mov.observacao ? (
                            <span className="text-sm">{mov.observacao}</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {movimentacoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </div>
              )}

              {hasMore && movimentacoes.length > 0 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => loadMovimentacoes(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Carregando...' : 'Carregar mais'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
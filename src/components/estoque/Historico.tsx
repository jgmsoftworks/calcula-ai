import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHistoricoMovimentacoes } from '@/hooks/useHistoricoMovimentacoes';
import { formatDateBrasilia, formatTimeBrasilia } from '@/lib/dateUtils';
import { Download, X, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

export const Historico = () => {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  
  const [filtros, setFiltros] = useState({
    produto_id: 'todos',
    tipo: 'todos',
    fornecedor_id: 'todos',
    data_inicial: '',
    data_final: ''
  });

  const { movimentacoes, loading, loadMore, hasMore, refresh } = useHistoricoMovimentacoes({
    origem: 'estoque',
    autoLoad: false,
  });

  // Carregar produtos e fornecedores
  useEffect(() => {
    if (user) {
      loadInitialData();
      handleFiltrar();
    }
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      const [produtosRes, fornecedoresRes] = await Promise.all([
        supabase
          .from('produtos')
          .select('id, nome')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('fornecedores')
          .select('id, nome')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome')
      ]);

      setProdutos(produtosRes.data || []);
      setFornecedores(fornecedoresRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const handleFiltrar = () => {
    const filtrosAtivos: any = {};
    
    if (filtros.produto_id && filtros.produto_id !== 'todos') filtrosAtivos.produto_id = filtros.produto_id;
    if (filtros.tipo && filtros.tipo !== 'todos') filtrosAtivos.tipo = filtros.tipo;
    if (filtros.fornecedor_id && filtros.fornecedor_id !== 'todos') filtrosAtivos.fornecedor_id = filtros.fornecedor_id;
    if (filtros.data_inicial) filtrosAtivos.data_inicial = filtros.data_inicial;
    if (filtros.data_final) filtrosAtivos.data_final = filtros.data_final;
    
    refresh(filtrosAtivos);
  };

  const clearFilters = () => {
    setFiltros({
      produto_id: 'todos',
      tipo: 'todos',
      fornecedor_id: 'todos',
      data_inicial: '',
      data_final: ''
    });
    refresh();
  };

  const hasActiveFilters = Object.values(filtros).some(v => v !== '' && v !== 'todos');

  const exportToCsv = () => {
    if (movimentacoes.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Data', 'Hora', 'Tipo', 'Produto', 'Quantidade', 'Unidade', 'Custo Unit.', 'Total', 'Fornecedor', 'Observação'];
    const rows = movimentacoes.map(mov => [
      formatDateBrasilia(mov.created_at),
      formatTimeBrasilia(mov.created_at),
      mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      mov.produtos?.nome || '-',
      mov.quantidade.toString().replace('.', ','),
      mov.produtos?.unidade || '',
      mov.custo_unitario.toFixed(2).replace('.', ','),
      (mov.quantidade * mov.custo_unitario).toFixed(2).replace('.', ','),
      mov.fornecedores?.nome || '-',
      mov.observacao || '-'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Arquivo CSV exportado com sucesso');
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'entrada') {
      return (
        <Badge variant="default" className="gap-1">
          <ArrowUpCircle className="w-3 h-3" />
          Entrada
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <ArrowDownCircle className="w-3 h-3" />
        Saída
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>Produto</Label>
            <Select value={filtros.produto_id} onValueChange={(v) => setFiltros(prev => ({ ...prev, produto_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
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
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <Select value={filtros.fornecedor_id} onValueChange={(v) => setFiltros(prev => ({ ...prev, fornecedor_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
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
                <TableHead>Produto</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center h-24">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : movimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
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
                    <TableCell className="font-medium">{mov.produtos?.nome || '-'}</TableCell>
                    <TableCell>{mov.quantidade.toFixed(3)}</TableCell>
                    <TableCell>{mov.produtos?.unidade || '-'}</TableCell>
                    <TableCell>R$ {mov.custo_unitario.toFixed(2)}</TableCell>
                    <TableCell>R$ {(mov.quantidade * mov.custo_unitario).toFixed(2)}</TableCell>
                    <TableCell>{mov.fornecedores?.nome || '-'}</TableCell>
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

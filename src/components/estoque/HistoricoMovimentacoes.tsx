import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Movimentacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  custo_unitario: number | null;
  observacao: string | null;
  fornecedor_id: string | null;
  fornecedores?: {
    nome: string;
  } | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface HistoricoMovimentacoesProps {
  produtoId: string;
}

export const HistoricoMovimentacoes = ({ produtoId }: HistoricoMovimentacoesProps) => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: 'todos', // 'todos', 'entradas', 'saidas'
    dataInicial: '',
    dataFinal: '',
    fornecedorId: ''
  });
  const [limite, setLimite] = useState(50);

  const { user } = useAuth();

  const loadFornecedores = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadHistorico = async () => {
    if (!produtoId || !user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('movimentacoes')
        .select(`
          id,
          data,
          tipo,
          quantidade,
          custo_unitario,
          observacao,
          fornecedor_id,
          fornecedores:fornecedor_id (
            nome
          )
        `)
        .eq('produto_id', produtoId)
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(limite);

      // Filtro por tipo
      if (filtros.tipo === 'entradas') {
        query = query.eq('tipo', 'entrada');
      } else if (filtros.tipo === 'saidas') {
        query = query.eq('tipo', 'saida');
      }

      // Filtros de data
      if (filtros.dataInicial) {
        query = query.gte('data', filtros.dataInicial);
      }
      if (filtros.dataFinal) {
        query = query.lte('data', filtros.dataFinal);
      }

      // Filtro por fornecedor
      if (filtros.fornecedorId) {
        query = query.eq('fornecedor_id', filtros.fornecedorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, [user]);

  useEffect(() => {
    loadHistorico();
  }, [produtoId, user, limite]);

  const handleFiltrar = () => {
    setLimite(50); // Reset limit when filtering
    loadHistorico();
  };

  const handleCarregarMais = () => {
    setLimite(prev => prev + 50);
  };

  return (
    <div className="space-y-3">
      {/* Filtros Compactos */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={filtros.tipo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tudo</SelectItem>
              <SelectItem value="entradas">Entradas</SelectItem>
              <SelectItem value="saidas">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-xs">Data Inicial</Label>
          <Input
            type="date"
            value={filtros.dataInicial}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataInicial: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        
        <div>
          <Label className="text-xs">Data Final</Label>
          <Input
            type="date"
            value={filtros.dataFinal}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataFinal: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        
        <div className="flex items-end">
          <Button size="sm" onClick={handleFiltrar} disabled={loading} className="h-8 text-xs">
            Filtrar
          </Button>
        </div>
      </div>

      {/* Fornecedor (linha separada) */}
      <div className="flex items-center gap-2 px-3">
        <Label className="text-xs min-w-[60px]">Fornecedor:</Label>
        <Select value={filtros.fornecedorId} onValueChange={(value) => setFiltros(prev => ({ ...prev, fornecedorId: value === "all" ? "" : value }))}>
          <SelectTrigger className="h-8 text-xs max-w-[200px]">
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

      {/* Tabela Compacta */}
      <div className="rounded-md border max-h-[200px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-xs p-2">Data</TableHead>
              <TableHead className="text-xs p-2">Tipo</TableHead>
              <TableHead className="text-xs p-2">Fornecedor</TableHead>
              <TableHead className="text-xs p-2">Qtd</TableHead>
              <TableHead className="text-xs p-2">Custo Unit.</TableHead>
              <TableHead className="text-xs p-2">Obs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="h-8">
                <TableCell colSpan={6} className="text-center text-xs p-2">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow className="h-8">
                <TableCell colSpan={6} className="text-center text-muted-foreground text-xs p-2">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((mov) => (
                <TableRow key={mov.id} className="h-8">
                  <TableCell className="text-xs p-2">
                    {format(new Date(mov.data), 'dd/MM/yy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs p-2">
                    <Badge 
                      variant={mov.tipo === 'entrada' ? 'default' : 'secondary'} 
                      className="text-xs px-1 py-0"
                    >
                      {mov.tipo === 'entrada' ? 'ENT' : 'SAI'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs p-2">
                    {mov.fornecedores?.nome || '-'}
                  </TableCell>
                  <TableCell className="text-xs p-2">
                    {mov.quantidade.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs p-2">
                    {mov.tipo === 'entrada' && mov.custo_unitario 
                      ? `R$ ${mov.custo_unitario.toFixed(2)}`
                      : '—'
                    }
                  </TableCell>
                  <TableCell className="text-xs p-2">
                    {mov.observacao || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Carregar Mais */}
      {movimentacoes.length >= limite && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={handleCarregarMais} className="text-xs">
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
};
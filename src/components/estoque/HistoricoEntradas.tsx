import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatBrasiliaDate } from '@/lib/dateUtils';

interface Movimentacao {
  id: string;
  data: string;
  quantidade: number;
  custo_unitario: number;
  observacao: string | null;
  fornecedor_id: string | null;
  fornecedores?: {
    nome: string;
  };
}

interface HistoricoEntradasProps {
  produtoId: string;
}

export const HistoricoEntradas = ({ produtoId }: HistoricoEntradasProps) => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicial: '',
    dataFinal: ''
  });
  const [limite, setLimite] = useState(50);

  const { user } = useAuth();

  const loadHistorico = async () => {
    if (!produtoId || !user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('movimentacoes')
        .select(`
          id,
          data,
          quantidade,
          custo_unitario,
          observacao,
          fornecedor_id,
          fornecedores:fornecedor_id (
            nome
          )
        `)
        .eq('produto_id', produtoId)
        .eq('tipo', 'entrada')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(limite);

      if (filtros.dataInicial) {
        query = query.gte('data', filtros.dataInicial);
      }
      if (filtros.dataFinal) {
        query = query.lte('data', filtros.dataFinal);
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
    loadHistorico();

    // Configurar listener para mudanças em tempo real
    const channel = supabase
      .channel(`entradas-produto-${produtoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes',
          filter: `produto_id=eq.${produtoId}`
        },
        (payload) => {
          console.log('📡 Mudança detectada em entradas:', payload);
          loadHistorico();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [produtoId, user, limite]);

  const handleFiltrar = () => {
    loadHistorico();
  };

  const handleCarregarMais = () => {
    setLimite(prev => prev + 50);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
        <div>
          <Label htmlFor="dataInicial">Data Inicial</Label>
          <Input
            id="dataInicial"
            type="date"
            value={filtros.dataInicial}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataInicial: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="dataFinal">Data Final</Label>
          <Input
            id="dataFinal"
            type="date"
            value={filtros.dataFinal}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataFinal: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleFiltrar} disabled={loading}>
            Filtrar
          </Button>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="rounded-md border max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Custo Unit.</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma entrada encontrada
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>
                    {formatBrasiliaDate(mov.data, 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    {mov.fornecedores?.nome || '-'}
                  </TableCell>
                  <TableCell>
                    {mov.quantidade.toFixed(3)}
                  </TableCell>
                  <TableCell>
                    R$ {(mov.custo_unitario || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R$ {((mov.custo_unitario || 0) * mov.quantidade).toFixed(2)}
                  </TableCell>
                  <TableCell>
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
          <Button variant="outline" onClick={handleCarregarMais}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
};
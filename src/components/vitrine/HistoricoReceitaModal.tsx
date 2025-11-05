import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Trash2, Gift, Plus, Package2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface MovimentacaoReceita {
  id: string;
  tipo: 'entrada' | 'venda' | 'perdas' | 'brindes';
  quantidade: number;
  custo_unitario: number;
  preco_venda: number;
  observacao: string | null;
  data: string;
  created_at: string;
}

interface EstoqueReceita {
  quantidade_atual: number;
  quantidade_minima: number;
  unidade: string;
  custo_unitario_medio: number;
}

interface HistoricoReceitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receitaId: string;
  receitaNome: string;
}

export function HistoricoReceitaModal({ open, onOpenChange, receitaId, receitaNome }: HistoricoReceitaModalProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoReceita[]>([]);
  const [estoque, setEstoque] = useState<EstoqueReceita | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && receitaId && user) {
      loadData();
    }
  }, [open, receitaId, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar movimentações da receita
      const { data: movimentacoesData, error: movError } = await supabase
        .from('movimentacoes_receitas')
        .select('*')
        .eq('user_id', user?.id)
        .eq('receita_id', receitaId)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20); // Últimas 20 movimentações

      if (movError) throw movError;

      // Carregar estoque atual
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque_receitas')
        .select('quantidade_atual, quantidade_minima, unidade, custo_unitario_medio')
        .eq('user_id', user?.id)
        .eq('receita_id', receitaId)
        .eq('ativo', true)
        .single();

      if (estoqueError && estoqueError.code !== 'PGRST116') {
        // PGRST116 = No rows returned, que é esperado se não há estoque
        throw estoqueError;
      }

      setMovimentacoes(movimentacoesData || []);
      setEstoque(estoqueData || null);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico da receita",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = () => {
    if (!estoque) return <Badge variant="outline">Sem estoque</Badge>;
    
    if (estoque.quantidade_atual === 0) {
      return <Badge variant="destructive">Sem estoque</Badge>;
    } else if (estoque.quantidade_atual <= estoque.quantidade_minima) {
      return <Badge variant="secondary">Estoque baixo</Badge>;
    } else {
      return <Badge variant="default">Normal</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Histórico da Vitrine - {receitaNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estoque Atual */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                {getStatusBadge()}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Estoque Atual</p>
                <p className="text-lg font-bold">
                  {estoque ? `${estoque.quantidade_atual} ${estoque.unidade}` : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Estoque Mínimo</p>
                <p className="text-lg font-bold">
                  {estoque ? `${estoque.quantidade_minima} ${estoque.unidade}` : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Custo Médio</p>
                <p className="text-lg font-bold">
                  {estoque ? formatCurrency(estoque.custo_unitario_medio) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Histórico de Movimentações */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Últimas Movimentações ({movimentacoes.length})
              </h3>

              {movimentacoes.length === 0 ? (
                <div className="text-center py-8">
                  <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação</h3>
                  <p className="text-muted-foreground">
                    Esta receita ainda não possui movimentações na vitrine.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimentacoes.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>{formatDate(mov.data)}</TableCell>
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
            </div>

            {/* Resumo */}
            {movimentacoes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Total Produzido</p>
                  <p className="text-2xl font-bold text-green-800">
                    {movimentacoes.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.quantidade, 0)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">Total Vendido</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {movimentacoes.filter(m => m.tipo === 'venda').reduce((acc, m) => acc + m.quantidade, 0)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-700">Receita de Vendas</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {formatCurrency(
                      movimentacoes
                        .filter(m => m.tipo === 'venda')
                        .reduce((acc, m) => acc + (m.quantidade * m.preco_venda), 0)
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
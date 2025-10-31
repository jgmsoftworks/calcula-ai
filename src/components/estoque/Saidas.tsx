import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getBrasiliaDate, toBrasiliaDateString, formatBrasiliaDate } from '@/lib/dateUtils';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
}

interface Movimentacao {
  id: string;
  produto_id: string;
  quantidade: number;
  observacao: string | null;
  data: string;
  created_at: string;
  produtos: {
    nome: string;
    unidade: string;
  };
}

export const Saidas = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saidas, setSaidas] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    observacao: '',
    data: toBrasiliaDateString(getBrasiliaDate())
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadProdutos(),
      loadSaidas()
    ]);
  };

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, unidade, estoque_atual')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadSaidas = async () => {
    try {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          produtos (nome, unidade)
        `)
        .eq('tipo', 'saida')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSaidas(data || []);
    } catch (error) {
      console.error('Erro ao carregar saídas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id || !formData.quantidade) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const quantidade = parseFloat(formData.quantidade);

    if (quantidade <= 0) {
      toast({
        title: "Quantidade deve ser maior que 0",
        variant: "destructive"
      });
      return;
    }

    // Verificar estoque disponível
    const produtoSelecionado = produtos.find(p => p.id === formData.produto_id);
    if (!produtoSelecionado) {
      toast({
        title: "Produto não encontrado",
        variant: "destructive"
      });
      return;
    }

    if (quantidade > produtoSelecionado.estoque_atual) {
      toast({
        title: "Estoque insuficiente",
        description: `Estoque disponível: ${produtoSelecionado.estoque_atual.toFixed(3)} ${produtoSelecionado.unidade}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Calcular novo estoque
      const novoEstoque = produtoSelecionado.estoque_atual - quantidade;

      // Registrar movimentação
      const { error: movError } = await supabase
        .from('movimentacoes')
        .insert([{
          user_id: user?.id,
          tipo: 'saida',
          produto_id: formData.produto_id,
          quantidade,
          custo_unitario: null, // Saídas não têm custo unitário
          fornecedor_id: null,
          observacao: formData.observacao || null,
          data: formData.data
        }]);

      if (movError) throw movError;

      // Atualizar estoque do produto (não alterar custo_medio)
      const { error: updateError } = await supabase
        .from('produtos')
        .update({
          estoque_atual: novoEstoque
        })
        .eq('id', formData.produto_id);

      if (updateError) throw updateError;

      toast({ title: "Saída registrada com sucesso!" });
      
      setFormData({
        produto_id: '',
        quantidade: '',
        observacao: '',
        data: toBrasiliaDateString(getBrasiliaDate())
      });

      // Recarregar dados
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar saída",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduto = produtos.find(p => p.id === formData.produto_id);

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Saída</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="produto_id">Produto *</Label>
                <Select value={formData.produto_id} onValueChange={(value) => setFormData(prev => ({ ...prev, produto_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} ({produto.unidade}) - Estoque: {produto.estoque_atual.toFixed(3)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantidade">
                  Quantidade * {selectedProduto && `(${selectedProduto.unidade})`}
                  {selectedProduto && (
                    <span className="text-sm text-muted-foreground ml-2">
                      Disponível: {selectedProduto.estoque_atual.toFixed(3)}
                    </span>
                  )}
                </Label>
                <NumericInputPtBr
                  tipo="quantidade_continua"
                  min={0.001}
                  max={selectedProduto?.estoque_atual}
                  value={parseFloat(formData.quantidade) || 0}
                  onChange={(valor) => setFormData(prev => ({ ...prev, quantidade: valor.toString() }))}
                  placeholder="Ex: 2.500"
                />
              </div>

              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Motivo da saída, destino, etc..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading || !selectedProduto}>
              {loading ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Saídas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saidas.map((saida) => (
                  <TableRow key={saida.id}>
                    <TableCell>
                      {formatBrasiliaDate(saida.data, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {saida.produtos.nome} ({saida.produtos.unidade})
                    </TableCell>
                    <TableCell>{saida.quantidade.toFixed(3)}</TableCell>
                    <TableCell>{saida.observacao || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {saidas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma saída registrada ainda
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
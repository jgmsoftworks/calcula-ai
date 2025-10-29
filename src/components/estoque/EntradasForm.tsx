import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ItemEntrada {
  id: string;
  produto_id: string;
  produto_nome: string;
  produto_unidade: string;
  quantidade: number;
  custo_total: number;
  custo_unitario: number;
}

export const EntradasForm = () => {
  const [fornecedor_id, setFornecedorId] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [itensEntrada, setItensEntrada] = useState<ItemEntrada[]>([]);
  
  // Formulário para novo item
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 0,
    custo_total: 0
  });
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProdutos();
    loadFornecedores();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, unidade')
        .eq('ativo', true)
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
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0 || novoItem.custo_total <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Produto, quantidade e custo total são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    // Verificar se produto já está na lista
    if (itensEntrada.find(item => item.produto_id === novoItem.produto_id)) {
      toast({
        title: "Produto já adicionado",
        description: "Este produto já está na lista de entradas",
        variant: "destructive"
      });
      return;
    }

    const custo_unitario = novoItem.custo_total / novoItem.quantidade;
    
    const novoItemEntrada: ItemEntrada = {
      id: Math.random().toString(36).substr(2, 9),
      produto_id: novoItem.produto_id,
      produto_nome: produto.nome,
      produto_unidade: produto.unidade,
      quantidade: novoItem.quantidade,
      custo_total: novoItem.custo_total,
      custo_unitario: custo_unitario
    };

    setItensEntrada(prev => [...prev, novoItemEntrada]);
    setNovoItem({
      produto_id: '',
      quantidade: 0,
      custo_total: 0
    });
  };

  const removerItem = (id: string) => {
    setItensEntrada(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (itensEntrada.length === 0) {
      toast({
        title: "Nenhum item adicionado",
        description: "Adicione pelo menos um produto",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar todos os movimentos
      for (const item of itensEntrada) {
        // Registrar movimento de entrada
        const { error: movError } = await supabase
          .from('movimentacoes')
          .insert([{
            produto_id: item.produto_id,
            tipo: 'entrada',
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            fornecedor_id: fornecedor_id || null,
            data: data,
            observacao: observacao || null,
            user_id: user?.id
          }]);

        if (movError) throw movError;

        // Atualizar estoque do produto
        const { data: produto, error: prodError } = await supabase
          .from('produtos')
          .select('estoque_atual, custo_medio')
          .eq('id', item.produto_id)
          .single();

        if (prodError) throw prodError;

        const novoEstoque = (produto.estoque_atual || 0) + item.quantidade;
        
        // Calcular novo custo médio
        const valorEstoqueAtual = (produto.estoque_atual || 0) * (produto.custo_medio || 0);
        const valorEntrada = item.quantidade * item.custo_unitario;
        const novoCustoMedio = novoEstoque > 0 ? (valorEstoqueAtual + valorEntrada) / novoEstoque : item.custo_unitario;

        // Atualizar custo total baseado no novo custo médio
        const novoCustoTotal = novoEstoque * novoCustoMedio;

        const { error: updateError } = await supabase
          .from('produtos')
          .update({ 
            estoque_atual: novoEstoque,
            custo_medio: novoCustoMedio,
            custo_total: novoCustoTotal,
            custo_unitario: item.custo_unitario
          })
          .eq('id', item.produto_id);

        if (updateError) throw updateError;
      }

      toast({ title: "Entradas registradas com sucesso!" });
      
      // Reset form
      setItensEntrada([]);
      setFornecedorId('');
      setData(new Date().toISOString().split('T')[0]);
      setObservacao('');
      setNovoItem({
        produto_id: '',
        quantidade: 0,
        custo_total: 0
      });
    } catch (error: any) {
      toast({
        title: "Erro ao registrar entradas",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const custoUnitarioCalculado = novoItem.quantidade > 0 ? novoItem.custo_total / novoItem.quantidade : 0;
  const totalGeral = itensEntrada.reduce((sum, item) => sum + item.custo_total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Entradas de Estoque</h2>
        <p className="text-muted-foreground">
          Registre entradas de múltiplos produtos no estoque
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            Nova Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados gerais da entrada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
              {/* Fornecedor */}
              <div className="space-y-2">
                <Label htmlFor="fornecedor" className="text-sm font-medium">Fornecedor</Label>
                <Select
                  value={fornecedor_id}
                  onValueChange={setFornecedorId}
                >
                  <SelectTrigger className="border-2 border-primary/30 focus:border-primary">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="data" className="text-sm font-medium">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                />
              </div>

              {/* Observação */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacao" className="text-sm font-medium">Observação</Label>
                <Input
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Observações gerais sobre a entrada..."
                />
              </div>
            </div>

            {/* Formulário para adicionar produtos */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-secondary/10">
              {/* Produto */}
              <div className="space-y-2">
                <Label htmlFor="produto" className="text-sm font-medium">Produto *</Label>
                <Select
                  value={novoItem.produto_id}
                  onValueChange={(value) => setNovoItem(prev => ({ ...prev, produto_id: value }))}
                >
                  <SelectTrigger className="border-2 border-primary/30 focus:border-primary">
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.filter(p => !itensEntrada.find(item => item.produto_id === p.id)).map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantidade" className="text-sm font-medium">Quantidade *</Label>
                <NumericInputPtBr
                  tipo="quantidade_continua"
                  min={0.01}
                  value={novoItem.quantidade}
                  onChange={(valor) => setNovoItem(prev => ({ ...prev, quantidade: valor }))}
                  className="border-2 border-primary/30 focus:border-primary"
                />
              </div>

              {/* Custo Total */}
              <div className="space-y-2">
                <Label htmlFor="custo_total" className="text-sm font-medium">Custo Total (R$) *</Label>
                <NumericInputPtBr
                  tipo="valor"
                  min={0}
                  value={novoItem.custo_total}
                  onChange={(valor) => setNovoItem(prev => ({ ...prev, custo_total: valor }))}
                  className="border-2 border-primary/30 focus:border-primary"
                />
              </div>

              {/* Custo Unitário (calculado) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custo Unitário (R$)</Label>
                <Input
                  type="text"
                  value={custoUnitarioCalculado.toFixed(2)}
                  readOnly
                  className="border-2 border-muted bg-muted/50"
                />
              </div>

              {/* Botão Adicionar */}
              <div className="space-y-2">
                <Label className="text-sm font-medium invisible">Adicionar</Label>
                <Button
                  type="button"
                  onClick={adicionarItem}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lista de produtos adicionados */}
            {itensEntrada.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos Adicionados</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Custo Total</TableHead>
                        <TableHead>Custo Unitário</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensEntrada.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.produto_nome}</div>
                              <div className="text-sm text-muted-foreground">({item.produto_unidade})</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantidade.toFixed(2)}</TableCell>
                          <TableCell>R$ {item.custo_total.toFixed(2)}</TableCell>
                          <TableCell>R$ {item.custo_unitario.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium bg-muted/50">
                        <TableCell colSpan={2}>Total Geral:</TableCell>
                        <TableCell>R$ {totalGeral.toFixed(2)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading || itensEntrada.length === 0}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8"
              >
                {loading ? 'Registrando...' : `Registrar ${itensEntrada.length} Entrada${itensEntrada.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
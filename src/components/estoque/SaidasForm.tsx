import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingDown, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { formatters } from '@/lib/formatters';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
}

interface ItemSaida {
  id: string;
  produto_id: string;
  produto_nome: string;
  produto_unidade: string;
  estoque_disponivel: number;
  quantidade: number;
  motivo: string;
}

export const SaidasForm = () => {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [itensSaida, setItensSaida] = useState<ItemSaida[]>([]);
  
  // Formulário para novo item
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 0,
    motivo: 'venda'
  });
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProdutos();
  }, []);

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

  const adicionarItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Produto e quantidade são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    // Verificar se produto já está na lista
    if (itensSaida.find(item => item.produto_id === novoItem.produto_id)) {
      toast({
        title: "Produto já adicionado",
        description: "Este produto já está na lista de saídas",
        variant: "destructive"
      });
      return;
    }

    // Verificar estoque disponível
    if (novoItem.quantidade > produto.estoque_atual) {
      toast({
        title: "Estoque insuficiente",
        description: `Estoque disponível: ${produto.estoque_atual} ${produto.unidade}`,
        variant: "destructive"
      });
      return;
    }
    
    const novoItemSaida: ItemSaida = {
      id: Math.random().toString(36).substr(2, 9),
      produto_id: novoItem.produto_id,
      produto_nome: produto.nome,
      produto_unidade: produto.unidade,
      estoque_disponivel: produto.estoque_atual,
      quantidade: novoItem.quantidade,
      motivo: novoItem.motivo
    };

    setItensSaida(prev => [...prev, novoItemSaida]);
    setNovoItem({
      produto_id: '',
      quantidade: 0,
      motivo: 'venda'
    });
  };

  const removerItem = (id: string) => {
    setItensSaida(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (itensSaida.length === 0) {
      toast({
        title: "Nenhum item adicionado",
        description: "Adicione pelo menos um produto",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar todos os movimentos de saída
      for (const item of itensSaida) {
        // Registrar movimento de saída
        const { error: movError } = await supabase
          .from('movimentacoes')
          .insert([{
            produto_id: item.produto_id,
            tipo: 'saida',
            quantidade: item.quantidade,
            data: data,
            observacao: `${item.motivo}${observacao ? ` - ${observacao}` : ''}`,
            user_id: user?.id
          }]);

        if (movError) throw movError;

        // Atualizar estoque do produto
        const { data: produto, error: prodError } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.produto_id)
          .single();

        if (prodError) throw prodError;

        const novoEstoque = produto.estoque_atual - item.quantidade;
        
        const { error: updateError } = await supabase
          .from('produtos')
          .update({ estoque_atual: novoEstoque })
          .eq('id', item.produto_id);

        if (updateError) throw updateError;
      }

      toast({ title: "Saídas registradas com sucesso!" });
      
      // Reset form
      setItensSaida([]);
      setData(new Date().toISOString().split('T')[0]);
      setObservacao('');
      setNovoItem({
        produto_id: '',
        quantidade: 0,
        motivo: 'venda'
      });
      loadProdutos(); // Reload to update stock levels
    } catch (error: any) {
      toast({
        title: "Erro ao registrar saídas",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Saídas de Estoque</h2>
        <p className="text-muted-foreground">
          Registre saídas de múltiplos produtos do estoque
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingDown className="w-5 h-5" />
            Nova Saída
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados gerais da saída */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
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
              <div className="space-y-2">
                <Label htmlFor="observacao" className="text-sm font-medium">Observação</Label>
                <Input
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Observações gerais sobre a saída..."
                />
              </div>
            </div>

            {/* Formulário para adicionar produtos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/10">
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
                    {produtos.filter(p => !itensSaida.find(item => item.produto_id === p.id)).map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} - Est: {produto.estoque_atual}
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
                  value={novoItem.quantidade}
                  onChange={(valor) => setNovoItem(prev => ({ ...prev, quantidade: valor }))}
                  min={0.01}
                  className="border-2 border-primary/30 focus:border-primary"
                />
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label htmlFor="motivo" className="text-sm font-medium">Motivo *</Label>
                <Select
                  value={novoItem.motivo}
                  onValueChange={(value) => setNovoItem(prev => ({ ...prev, motivo: value }))}
                >
                  <SelectTrigger className="border-2 border-primary/30 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="uso_interno">Uso Interno</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                    <SelectItem value="vencimento">Vencimento</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="ajuste">Ajuste de Estoque</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
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
            {itensSaida.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos Adicionados</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Estoque Disponível</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensSaida.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.produto_nome}</div>
                              <div className="text-sm text-muted-foreground">({item.produto_unidade})</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatters.quantidadeContinua(item.quantidade)}</TableCell>
                          <TableCell>
                            {item.motivo === 'venda' && 'Venda'}
                            {item.motivo === 'uso_interno' && 'Uso Interno'}
                            {item.motivo === 'perda' && 'Perda'}
                            {item.motivo === 'vencimento' && 'Vencimento'}
                            {item.motivo === 'devolucao' && 'Devolução'}
                            {item.motivo === 'transferencia' && 'Transferência'}
                            {item.motivo === 'ajuste' && 'Ajuste de Estoque'}
                            {item.motivo === 'outro' && 'Outro'}
                          </TableCell>
                          <TableCell>{formatters.quantidadeContinua(item.estoque_disponivel)} {item.produto_unidade}</TableCell>
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
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading || itensSaida.length === 0}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8"
              >
                {loading ? 'Registrando...' : `Registrar ${itensSaida.length} Saída${itensSaida.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
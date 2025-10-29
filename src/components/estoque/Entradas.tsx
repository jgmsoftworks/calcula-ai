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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Movimentacao {
  id: string;
  produto_id: string;
  quantidade: number;
  custo_unitario: number;
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

export const Entradas = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [entradas, setEntradas] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    custo_unitario: '',
    fornecedor_id: '',
    observacao: '',
    data: format(new Date(), 'yyyy-MM-dd')
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadProdutos(),
      loadFornecedores(),
      loadEntradas()
    ]);
  };

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

  const loadEntradas = async () => {
    try {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          produtos (nome, unidade),
          fornecedores (nome)
        `)
        .eq('tipo', 'entrada')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntradas(data || []);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id || !formData.quantidade || !formData.custo_unitario) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const quantidade = parseFloat(formData.quantidade);
    const custoUnitario = parseFloat(formData.custo_unitario);

    if (quantidade <= 0 || custoUnitario < 0) {
      toast({
        title: "Valores inválidos",
        description: "Quantidade deve ser maior que 0 e custo não pode ser negativo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar dados atuais do produto
      const { data: produtoAtual, error: produtoError } = await supabase
        .from('produtos')
        .select('estoque_atual, custo_medio')
        .eq('id', formData.produto_id)
        .single();

      if (produtoError) throw produtoError;

      // Calcular novo estoque e custo médio
      const novoEstoque = produtoAtual.estoque_atual + quantidade;
      const totalAntigo = produtoAtual.estoque_atual * produtoAtual.custo_medio;
      const totalNovo = quantidade * custoUnitario;
      const novoCustoMedio = (totalAntigo + totalNovo) / Math.max(novoEstoque, 1);

      // Iniciar transação
      const { error: movError } = await supabase
        .from('movimentacoes')
        .insert([{
          user_id: user?.id,
          tipo: 'entrada',
          produto_id: formData.produto_id,
          quantidade,
          custo_unitario: custoUnitario,
          fornecedor_id: formData.fornecedor_id === 'none' ? null : formData.fornecedor_id || null,
          observacao: formData.observacao || null,
          data: formData.data
        }]);

      if (movError) throw movError;

      // Atualizar produto
      const { error: updateError } = await supabase
        .from('produtos')
        .update({
          estoque_atual: novoEstoque,
          custo_medio: novoCustoMedio
        })
        .eq('id', formData.produto_id);

      if (updateError) throw updateError;

      toast({ title: "Entrada registrada com sucesso!" });
      
      setFormData({
        produto_id: '',
        quantidade: '',
        custo_unitario: '',
        fornecedor_id: '',
        observacao: '',
        data: format(new Date(), 'yyyy-MM-dd')
      });

      loadEntradas();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar entrada",
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
          <CardTitle>Registrar Entrada</CardTitle>
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
                        {produto.nome} ({produto.unidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade * {selectedProduto && `(${selectedProduto.unidade})`}</Label>
                <NumericInputPtBr
                  tipo="quantidade_continua"
                  min={0.001}
                  value={parseFloat(formData.quantidade) || 0}
                  onChange={(valor) => setFormData(prev => ({ ...prev, quantidade: valor.toString() }))}
                  placeholder="Ex: 10.500"
                />
              </div>

              <div>
                <Label htmlFor="custo_unitario">Custo Unitário * (R$)</Label>
                <NumericInputPtBr
                  tipo="valor"
                  min={0}
                  value={parseFloat(formData.custo_unitario) || 0}
                  onChange={(valor) => setFormData(prev => ({ ...prev, custo_unitario: valor.toString() }))}
                  placeholder="Ex: 5.50"
                />
              </div>

              <div>
                <Label htmlFor="fornecedor_id">Fornecedor</Label>
                <Select value={formData.fornecedor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, fornecedor_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {fornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                placeholder="Observações sobre esta entrada..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Entradas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo Unitário</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((entrada) => (
                  <TableRow key={entrada.id}>
                    <TableCell>
                      {format(new Date(entrada.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {entrada.produtos.nome} ({entrada.produtos.unidade})
                    </TableCell>
                    <TableCell>{entrada.quantidade.toFixed(3)}</TableCell>
                    <TableCell>R$ {entrada.custo_unitario.toFixed(2)}</TableCell>
                    <TableCell>R$ {(entrada.quantidade * entrada.custo_unitario).toFixed(2)}</TableCell>
                    <TableCell>{entrada.fornecedores?.nome || '-'}</TableCell>
                    <TableCell>{entrada.observacao || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
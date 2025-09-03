import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

export const EntradasForm = () => {
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 0,
    fornecedor_id: '',
    data: new Date().toISOString().split('T')[0],
    custo_unitario: 0,
    observacao: ''
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id || !formData.quantidade || formData.quantidade <= 0) {
      toast({
        title: "Dados obrigatórios",
        description: "Produto e quantidade são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar movimento de entrada
      const { error: movError } = await supabase
        .from('movimentacoes')
        .insert([{
          produto_id: formData.produto_id,
          tipo: 'entrada',
          quantidade: formData.quantidade,
          custo_unitario: formData.custo_unitario || null,
          fornecedor_id: formData.fornecedor_id || null,
          data: formData.data,
          observacao: formData.observacao || null,
          user_id: user?.id
        }]);

      if (movError) throw movError;

      // Atualizar estoque do produto
      const { data: produto, error: prodError } = await supabase
        .from('produtos')
        .select('estoque_atual, custo_medio')
        .eq('id', formData.produto_id)
        .single();

      if (prodError) throw prodError;

      const novoEstoque = (produto.estoque_atual || 0) + formData.quantidade;
      
      // Calcular novo custo médio se foi informado custo unitário
      let novoCustoMedio = produto.custo_medio;
      if (formData.custo_unitario > 0) {
        const valorEstoqueAtual = (produto.estoque_atual || 0) * (produto.custo_medio || 0);
        const valorEntrada = formData.quantidade * formData.custo_unitario;
        novoCustoMedio = novoEstoque > 0 ? (valorEstoqueAtual + valorEntrada) / novoEstoque : formData.custo_unitario;
      }

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ 
          estoque_atual: novoEstoque,
          custo_medio: novoCustoMedio
        })
        .eq('id', formData.produto_id);

      if (updateError) throw updateError;

      toast({ title: "Entrada registrada com sucesso!" });
      
      // Reset form
      setFormData({
        produto_id: '',
        quantidade: 0,
        fornecedor_id: '',
        data: new Date().toISOString().split('T')[0],
        custo_unitario: 0,
        observacao: ''
      });
    } catch (error: any) {
      toast({
        title: "Erro ao registrar entrada",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = produtos.find(p => p.id === formData.produto_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Entradas de Estoque</h2>
        <p className="text-muted-foreground">
          Registre entradas de produtos no estoque
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Produto */}
              <div className="space-y-2">
                <Label htmlFor="produto" className="text-sm font-medium">Produto *</Label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) => handleInputChange('produto_id', value)}
                >
                  <SelectTrigger className="border-2 border-primary/30 focus:border-primary">
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

              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantidade" className="text-sm font-medium">
                  Quantidade * {selectedProduct && `(${selectedProduct.unidade})`}
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange('quantidade', parseFloat(e.target.value) || 0)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="0"
                />
              </div>

              {/* Fornecedor */}
              <div className="space-y-2">
                <Label htmlFor="fornecedor" className="text-sm font-medium">Fornecedor</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) => handleInputChange('fornecedor_id', value)}
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
                  value={formData.data}
                  onChange={(e) => handleInputChange('data', e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                />
              </div>

              {/* Custo Unitário */}
              <div className="space-y-2">
                <Label htmlFor="custo" className="text-sm font-medium">Custo Unitário (R$)</Label>
                <Input
                  id="custo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.custo_unitario}
                  onChange={(e) => handleInputChange('custo_unitario', parseFloat(e.target.value) || 0)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao" className="text-sm font-medium">Observação</Label>
              <Input
                id="observacao"
                value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value)}
                className="border-2 border-primary/30 focus:border-primary"
                placeholder="Observações sobre a entrada..."
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8"
              >
                {loading ? 'Registrando...' : 'Registrar Entrada'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
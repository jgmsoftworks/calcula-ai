import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingDown } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
}

export const SaidasForm = () => {
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 0,
    motivo: 'venda',
    data: new Date().toISOString().split('T')[0],
    observacao: ''
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

    const produto = produtos.find(p => p.id === formData.produto_id);
    if (produto && formData.quantidade > produto.estoque_atual) {
      toast({
        title: "Estoque insuficiente",
        description: `Estoque atual: ${produto.estoque_atual} ${produto.unidade}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar movimento de saída
      const { error: movError } = await supabase
        .from('movimentacoes')
        .insert([{
          produto_id: formData.produto_id,
          tipo: 'saida',
          quantidade: formData.quantidade,
          data: formData.data,
          observacao: `${formData.motivo}${formData.observacao ? ` - ${formData.observacao}` : ''}`,
          user_id: user?.id
        }]);

      if (movError) throw movError;

      // Atualizar estoque do produto
      if (produto) {
        const novoEstoque = produto.estoque_atual - formData.quantidade;
        
        const { error: updateError } = await supabase
          .from('produtos')
          .update({ estoque_atual: novoEstoque })
          .eq('id', formData.produto_id);

        if (updateError) throw updateError;
      }

      toast({ title: "Saída registrada com sucesso!" });
      
      // Reset form and reload products
      setFormData({
        produto_id: '',
        quantidade: 0,
        motivo: 'venda',
        data: new Date().toISOString().split('T')[0],
        observacao: ''
      });
      loadProdutos(); // Reload to update stock levels
    } catch (error: any) {
      toast({
        title: "Erro ao registrar saída",
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
        <h2 className="text-2xl font-bold tracking-tight text-primary">Saídas de Estoque</h2>
        <p className="text-muted-foreground">
          Registre saídas de produtos do estoque
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
                        {produto.nome} - Estoque: {produto.estoque_atual} {produto.unidade}
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
                  max={selectedProduct?.estoque_atual || undefined}
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange('quantidade', parseFloat(e.target.value) || 0)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="0"
                />
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    Estoque disponível: {selectedProduct.estoque_atual} {selectedProduct.unidade}
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label htmlFor="motivo" className="text-sm font-medium">Motivo *</Label>
                <Select
                  value={formData.motivo}
                  onValueChange={(value) => handleInputChange('motivo', value)}
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
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao" className="text-sm font-medium">Observação</Label>
              <Input
                id="observacao"
                value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value)}
                className="border-2 border-primary/30 focus:border-primary"
                placeholder="Observações sobre a saída..."
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8"
              >
                {loading ? 'Registrando...' : 'Registrar Saída'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
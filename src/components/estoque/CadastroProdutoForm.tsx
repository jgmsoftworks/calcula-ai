import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
}

export const CadastroProdutoForm = () => {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    unidade: 'un' as const,
    custo_unitario: 0,
    fornecedor_id: '',
    estoque_atual: 0
  });
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFornecedores();
  }, []);

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
    
    if (!formData.nome.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome,
        categorias: formData.categoria ? [formData.categoria] : null,
        unidade: formData.unidade,
        custo_unitario: formData.custo_unitario,
        estoque_atual: formData.estoque_atual,
        fornecedor_ids: formData.fornecedor_id ? [formData.fornecedor_id] : null,
        user_id: user?.id,
        ativo: true
      };

      const { error } = await supabase
        .from('produtos')
        .insert([payload]);

      if (error) throw error;

      toast({ title: "Produto cadastrado com sucesso!" });
      
      // Reset form
      setFormData({
        nome: '',
        categoria: '',
        unidade: 'un',
        custo_unitario: 0,
        fornecedor_id: '',
        estoque_atual: 0
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar produto",
        description: error.message?.includes('duplicate') ? "Já existe um produto com esse nome" : "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Cadastro de Produto</h2>
        <p className="text-muted-foreground">
          Cadastre novos produtos no estoque
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Plus className="w-5 h-5" />
            Novo Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Digite o nome do produto"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-sm font-medium">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: Ingredientes, Bebidas..."
                />
              </div>

              {/* Unidade */}
              <div className="space-y-2">
                <Label htmlFor="unidade" className="text-sm font-medium">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) => handleInputChange('unidade', value)}
                >
                  <SelectTrigger className="border-2 border-primary/30 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="l">Litro (l)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="m">Metro (m)</SelectItem>
                    <SelectItem value="cm">Centímetro (cm)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preço de Compra */}
              <div className="space-y-2">
                <Label htmlFor="preco" className="text-sm font-medium">Preço de Compra (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.custo_unitario}
                  onChange={(e) => handleInputChange('custo_unitario', parseFloat(e.target.value) || 0)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="0,00"
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

              {/* Quantidade em Estoque */}
              <div className="space-y-2">
                <Label htmlFor="estoque" className="text-sm font-medium">Quantidade em Estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min="0"
                  value={formData.estoque_atual}
                  onChange={(e) => handleInputChange('estoque_atual', parseFloat(e.target.value) || 0)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8"
              >
                {loading ? 'Salvando...' : 'Salvar Produto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
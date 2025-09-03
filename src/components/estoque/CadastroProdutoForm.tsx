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
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Layout em duas colunas igual ao modal */}
            <div className="flex gap-8">
              {/* Coluna Esquerda - Formulário */}
              <div className="flex-1 space-y-6 h-[300px] overflow-y-auto pr-2">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium text-foreground">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="Digite o nome do produto"
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-sm font-medium text-foreground">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => handleInputChange('categoria', e.target.value)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="Ex: Ingredientes, Bebidas..."
                  />
                </div>

                {/* Unidade */}
                <div className="space-y-2">
                  <Label htmlFor="unidade" className="text-sm font-medium text-foreground">Unidade</Label>
                  <Select
                    value={formData.unidade}
                    onValueChange={(value) => handleInputChange('unidade', value)}
                  >
                    <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg">
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

                {/* Preço de Compra e Fornecedor em linha */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="preco" className="text-sm font-medium text-foreground">Preço de Compra (R$)</Label>
                    <Input
                      id="preco"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.custo_unitario}
                      onChange={(e) => handleInputChange('custo_unitario', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fornecedor" className="text-sm font-medium text-foreground">Fornecedor</Label>
                    <Select
                      value={formData.fornecedor_id}
                      onValueChange={(value) => handleInputChange('fornecedor_id', value)}
                    >
                      <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg">
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
                </div>

                {/* Quantidade em Estoque */}
                <div className="space-y-2">
                  <Label htmlFor="estoque" className="text-sm font-medium text-foreground">Quantidade em Estoque</Label>
                  <Input
                    id="estoque"
                    type="number"
                    min="0"
                    value={formData.estoque_atual}
                    onChange={(e) => handleInputChange('estoque_atual', parseFloat(e.target.value) || 0)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Coluna Direita - Painel Informativo */}
              <div className="w-80 h-[300px] border-2 border-dashed border-primary/40 rounded-xl p-4 bg-primary/5 flex flex-col items-center justify-center">
                <div className="text-center text-primary">
                  <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Novo Produto</h3>
                  <p className="text-sm text-muted-foreground">
                    Preencha os campos ao lado para cadastrar um novo produto no estoque
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 mt-4 border-t border-primary/20">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 h-12"
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
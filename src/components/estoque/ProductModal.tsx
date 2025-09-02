import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Plus, Trash2 } from 'lucide-react';
import { MultiSelectTags } from './MultiSelectTags';
import { ProductImageUpload } from './ProductImageUpload';
import { HistoricoEntradas } from './HistoricoEntradas';

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  categorias: string[] | null;
  marcas: string[] | null;
  unidade: string;
  estoque_atual: number;
  custo_medio: number;
  custo_unitario: number;
  estoque_minimo: number;
  sku: string | null;
  codigo_interno: string | null;
  codigo_barras: string | null;
  imagem_url: string | null;
  fornecedor_ids: string[] | null;
  ativo: boolean;
  rotulo_porcao: string | null;
  rotulo_kcal: number | null;
  rotulo_carb: number | null;
  rotulo_prot: number | null;
  rotulo_gord_total: number | null;
  rotulo_gord_sat: number | null;
  rotulo_gord_trans: number | null;
  rotulo_fibra: number | null;
  rotulo_sodio: number | null;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Produto | null;
  onSave: () => void;
}

export const ProductModal = ({ isOpen, onClose, product, onSave }: ProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  
  const [formData, setFormData] = useState({
    nome: '',
    marcas: [] as string[],
    categorias: [] as string[],
    codigo_interno: '',
    codigo_barras: '',
    imagem_url: '',
    unidade: 'un' as const,
    custo_unitario: 0,
    estoque_minimo: 0,
    ativo: true,
    rotulo_porcao: '',
    rotulo_kcal: 0,
    rotulo_carb: 0,
    rotulo_prot: 0,
    rotulo_gord_total: 0,
    rotulo_gord_sat: 0,
    rotulo_gord_trans: 0,
    rotulo_fibra: 0,
    rotulo_sodio: 0
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        nome: product.nome,
        marcas: product.marcas || [],
        categorias: product.categorias || [],
        codigo_interno: product.codigo_interno || '',
        codigo_barras: product.codigo_barras || '',
        imagem_url: product.imagem_url || '',
        unidade: product.unidade as any,
        custo_unitario: product.custo_unitario || 0,
        estoque_minimo: product.estoque_minimo || 0,
        ativo: product.ativo,
        rotulo_porcao: product.rotulo_porcao || '',
        rotulo_kcal: product.rotulo_kcal || 0,
        rotulo_carb: product.rotulo_carb || 0,
        rotulo_prot: product.rotulo_prot || 0,
        rotulo_gord_total: product.rotulo_gord_total || 0,
        rotulo_gord_sat: product.rotulo_gord_sat || 0,
        rotulo_gord_trans: product.rotulo_gord_trans || 0,
        rotulo_fibra: product.rotulo_fibra || 0,
        rotulo_sodio: product.rotulo_sodio || 0
      });
    } else {
      setFormData({
        nome: '',
        marcas: [],
        categorias: [],
        codigo_interno: '',
        codigo_barras: '',
        imagem_url: '',
        unidade: 'un',
        custo_unitario: 0,
        estoque_minimo: 0,
        ativo: true,
        rotulo_porcao: '',
        rotulo_kcal: 0,
        rotulo_carb: 0,
        rotulo_prot: 0,
        rotulo_gord_total: 0,
        rotulo_gord_sat: 0,
        rotulo_gord_trans: 0,
        rotulo_fibra: 0,
        rotulo_sodio: 0
      });
    }
  }, [product]);

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
        ...formData,
        user_id: user?.id,
        // Convert empty arrays to null for consistency
        marcas: formData.marcas.length > 0 ? formData.marcas : null,
        categorias: formData.categorias.length > 0 ? formData.categorias : null,
        // Convert 0 values to null for nullable numeric fields
        rotulo_kcal: formData.rotulo_kcal || null,
        rotulo_carb: formData.rotulo_carb || null,
        rotulo_prot: formData.rotulo_prot || null,
        rotulo_gord_total: formData.rotulo_gord_total || null,
        rotulo_gord_sat: formData.rotulo_gord_sat || null,
        rotulo_gord_trans: formData.rotulo_gord_trans || null,
        rotulo_fibra: formData.rotulo_fibra || null,
        rotulo_sodio: formData.rotulo_sodio || null,
        rotulo_porcao: formData.rotulo_porcao.trim() || null
      };

      if (product) {
        const { error } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', product.id);

        if (error) throw error;
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Produto cadastrado com sucesso!" });
      }

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message?.includes('duplicate') ? "Já existe um produto com esse nome" : "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    // Check if product has movements
    const { data: movements } = await supabase
      .from('movimentacoes')
      .select('id')
      .eq('produto_id', product.id)
      .limit(1);

    if (movements && movements.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Existem movimentações vinculadas a este produto",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const { error } = await supabase
          .from('produtos')
          .delete()
          .eq('id', product.id);

        if (error) throw error;
        
        toast({ title: "Produto excluído com sucesso!" });
        onSave();
        onClose();
      } catch (error: any) {
        toast({
          title: "Erro ao excluir produto",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const custoTotal = (formData.custo_unitario || 0) * (product?.estoque_atual || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {product ? 'Editar Produto' : 'Novo Cadastro'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados Principais</TabsTrigger>
              <TabsTrigger value="estoque">Estoque e Custos</TabsTrigger>
              <TabsTrigger value="rotulo">Rótulo Nutricional</TabsTrigger>
              {product && (
                <TabsTrigger value="historico">Histórico de Entradas</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dados" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Farinha de Trigo"
                    required
                    className="text-lg font-medium"
                  />
                </div>

                <div>
                  <Label>Marcas</Label>
                  <MultiSelectTags
                    values={formData.marcas}
                    onChange={(marcas) => setFormData(prev => ({ ...prev, marcas }))}
                    placeholder="Adicionar marca..."
                  />
                </div>

                <div>
                  <Label>Categorias</Label>
                  <MultiSelectTags
                    values={formData.categorias}
                    onChange={(categorias) => setFormData(prev => ({ ...prev, categorias }))}
                    placeholder="Adicionar categoria..."
                  />
                </div>

                <div>
                  <Label htmlFor="codigo_interno">Código Interno</Label>
                  <Input
                    id="codigo_interno"
                    value={formData.codigo_interno}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_interno: e.target.value }))}
                    placeholder="Auto-gerado"
                    readOnly={!product}
                  />
                </div>

                <div>
                  <Label htmlFor="codigo_barras">Código de Barras</Label>
                  <Input
                    id="codigo_barras"
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                    placeholder="Ex: 1234567890123"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Imagem do Produto</Label>
                  <ProductImageUpload
                    value={formData.imagem_url}
                    onChange={(imagem_url) => setFormData(prev => ({ ...prev, imagem_url }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="ativo">
                    Status: {formData.ativo ? 'Ativo' : 'Desativado'}
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="estoque" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unidade">Unidade de Medida *</Label>
                  <Select value={formData.unidade} onValueChange={(value: any) => setFormData(prev => ({ ...prev, unidade: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidades (un)</SelectItem>
                      <SelectItem value="g">Gramas (g)</SelectItem>
                      <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                      <SelectItem value="L">Litros (L)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="custo_unitario">Custo Unitário (R$)</Label>
                  <Input
                    id="custo_unitario"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.custo_unitario}
                    onChange={(e) => setFormData(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="estoque_atual">Quantidade em Estoque (somente leitura)</Label>
                  <Input
                    id="estoque_atual"
                    type="number"
                    step="0.001"
                    value={product?.estoque_atual?.toFixed(3) || '0.000'}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                  <Input
                    id="estoque_minimo"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="custo_total">Custo Total (R$) - somente leitura</Label>
                  <Input
                    id="custo_total"
                    type="text"
                    value={`R$ ${custoTotal.toFixed(2)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                💡 <strong>Dica:</strong> Entradas/Saídas atualizam o estoque automaticamente. Este campo é apenas leitura.
              </div>
            </TabsContent>

            <TabsContent value="rotulo" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rotulo_porcao">Porção</Label>
                  <Input
                    id="rotulo_porcao"
                    value={formData.rotulo_porcao}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_porcao: e.target.value }))}
                    placeholder="Ex: 50g"
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_kcal">Energia (kcal)</Label>
                  <Input
                    id="rotulo_kcal"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_kcal}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_kcal: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_carb">Carboidratos (g)</Label>
                  <Input
                    id="rotulo_carb"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_carb}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_carb: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_prot">Proteínas (g)</Label>
                  <Input
                    id="rotulo_prot"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_prot}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_prot: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_gord_total">Gorduras Totais (g)</Label>
                  <Input
                    id="rotulo_gord_total"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_gord_total}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_total: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_gord_sat">Gorduras Saturadas (g)</Label>
                  <Input
                    id="rotulo_gord_sat"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_gord_sat}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_sat: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_gord_trans">Gorduras Trans (g)</Label>
                  <Input
                    id="rotulo_gord_trans"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_gord_trans}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_trans: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_fibra">Fibra Alimentar (g)</Label>
                  <Input
                    id="rotulo_fibra"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_fibra}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_fibra: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rotulo_sodio">Sódio (mg)</Label>
                  <Input
                    id="rotulo_sodio"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.rotulo_sodio}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotulo_sodio: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </TabsContent>

            {product && (
              <TabsContent value="historico">
                <HistoricoEntradas produtoId={product.id} />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-between pt-4 border-t">
            <div>
              {product && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
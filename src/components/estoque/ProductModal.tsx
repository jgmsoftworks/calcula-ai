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
import { X, Trash2 } from 'lucide-react';
import { MultiSelectTags } from './MultiSelectTags';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';

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
  const [activeTab, setActiveTab] = useState('estoque');
  
  const [formData, setFormData] = useState({
    nome: '',
    marcas: [] as string[],
    categorias: [] as string[],
    codigo_interno: '',
    codigo_barras: '',
    imagem_url: '',
    unidade: 'un' as const,
    total_embalagem: 1,
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
        total_embalagem: 1,
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
        total_embalagem: 1,
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
    setActiveTab('estoque');
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
      <DialogContent className="w-[1040px] max-w-[1040px] max-h-[calc(100vh-120px)] overflow-hidden p-4">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {product ? 'Editar Produto' : 'Novo Cadastro'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Dados Principais - Seção Fixa */}
          <div className="border-b pb-3 mb-2 h-[240px] overflow-hidden">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">DADOS PRINCIPAIS</h3>
            <div className="grid grid-cols-[1fr_320px] gap-4 h-full">
              {/* Coluna Esquerda - Dados */}
              <div className="space-y-3">
                {/* Nome (largura completa) */}
                <div>
                  <Label htmlFor="nome" className="text-xs">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Farinha de Trigo"
                    required
                    className="h-8 text-sm"
                  />
                </div>

                {/* Marcas e Categorias */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Marcas</Label>
                    <MultiSelectTags
                      values={formData.marcas}
                      onChange={(marcas) => setFormData(prev => ({ ...prev, marcas }))}
                      placeholder="Adicionar marca..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Categorias</Label>
                    <MultiSelectTags
                      values={formData.categorias}
                      onChange={(categorias) => setFormData(prev => ({ ...prev, categorias }))}
                      placeholder="Adicionar categoria..."
                    />
                  </div>
                </div>

                {/* Códigos */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="codigo_interno" className="text-xs">Código Interno</Label>
                    <Input
                      id="codigo_interno"
                      value={formData.codigo_interno}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo_interno: e.target.value }))}
                      placeholder="Auto-gerado"
                      readOnly={!product}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="codigo_barras" className="text-xs">Código de Barras</Label>
                    <Input
                      id="codigo_barras"
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                      placeholder="Ex: 1234567890123"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Painel de Imagem */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                {/* Preview da imagem */}
                <div className="aspect-[4/3] w-full bg-muted rounded-md overflow-hidden">
                  {formData.imagem_url ? (
                    <img
                      src={formData.imagem_url}
                      alt="Produto"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/180x135?text=Erro';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Sem imagem
                    </div>
                  )}
                </div>

                {/* Botões Upload e Remover */}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs">
                    Upload
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, imagem_url: '' }))}
                    disabled={!formData.imagem_url}
                    className="text-xs"
                  >
                    Remover
                  </Button>
                </div>

                {/* URL Input */}
                <div>
                  <Input
                    placeholder="Cole a URL da imagem..."
                    value={formData.imagem_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Sugestões de imagem - Grade 2x2 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sugestões de imagem</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=64&h=64&fit=crop', name: 'Farinha' },
                      { url: 'https://images.unsplash.com/photo-1571167530149-c72f2b8b82c5?w=64&h=64&fit=crop', name: 'Açúcar' },
                      { url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=64&h=64&fit=crop', name: 'Óleo' },
                      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=64&h=64&fit=crop', name: 'Sal' }
                    ].map((suggestion, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-shadow rounded p-1 border"
                        onClick={() => setFormData(prev => ({ ...prev, imagem_url: suggestion.url }))}
                      >
                        <img
                          src={suggestion.url}
                          alt={suggestion.name}
                          className="w-full h-12 object-cover rounded mb-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/64x64?text=Erro';
                          }}
                        />
                        <p className="text-[10px] text-center truncate">{suggestion.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label htmlFor="ativo" className="text-xs">
                    Status: {formData.ativo ? 'Ativo' : 'Inativo'}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 h-9 mb-2">
                <TabsTrigger value="estoque" className="text-xs">Estoque e Custos</TabsTrigger>
                <TabsTrigger value="rotulo" className="text-xs">Rótulo Nutricional</TabsTrigger>
                {product && (
                  <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 min-h-0 max-h-[320px]">

                <TabsContent value="estoque" className="space-y-2 overflow-y-auto max-h-full p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="total_embalagem" className="text-xs">Total na Embalagem</Label>
                      <Input
                        id="total_embalagem"
                        type="number"
                        min="1"
                        value={formData.total_embalagem}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_embalagem: parseInt(e.target.value) || 1 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unidade" className="text-xs">Unidade de Medida *</Label>
                      <Select value={formData.unidade} onValueChange={(value: any) => setFormData(prev => ({ ...prev, unidade: value }))}>
                        <SelectTrigger className="h-8 text-sm">
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
                      <Label htmlFor="custo_unitario" className="text-xs">Custo Unitário (R$)</Label>
                      <Input
                        id="custo_unitario"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.custo_unitario}
                        onChange={(e) => setFormData(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estoque_atual" className="text-xs">Qtd em Estoque (readonly)</Label>
                      <Input
                        id="estoque_atual"
                        type="number"
                        step="0.001"
                        value={product?.estoque_atual?.toFixed(3) || '0.000'}
                        readOnly
                        className="h-8 text-sm bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estoque_minimo" className="text-xs">Estoque Mínimo</Label>
                      <Input
                        id="estoque_minimo"
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.estoque_minimo}
                        onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="custo_total" className="text-xs">Custo Total (readonly)</Label>
                      <Input
                        id="custo_total"
                        type="text"
                        value={`R$ ${custoTotal.toFixed(2)}`}
                        readOnly
                        className="h-8 text-sm bg-muted"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    💡 Entradas/Saídas atualizam o estoque automaticamente.
                  </div>
                </TabsContent>

                <TabsContent value="rotulo" className="space-y-2 overflow-y-auto max-h-full p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="rotulo_porcao" className="text-xs">Porção</Label>
                      <Input
                        id="rotulo_porcao"
                        value={formData.rotulo_porcao}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_porcao: e.target.value }))}
                        placeholder="Ex: 50g"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_kcal" className="text-xs">Energia (kcal)</Label>
                      <Input
                        id="rotulo_kcal"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_kcal}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_kcal: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_carb" className="text-xs">Carboidratos (g)</Label>
                      <Input
                        id="rotulo_carb"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_carb}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_carb: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_prot" className="text-xs">Proteínas (g)</Label>
                      <Input
                        id="rotulo_prot"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_prot}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_prot: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_gord_total" className="text-xs">Gorduras Totais (g)</Label>
                      <Input
                        id="rotulo_gord_total"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_gord_total}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_total: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_gord_sat" className="text-xs">Gorduras Saturadas (g)</Label>
                      <Input
                        id="rotulo_gord_sat"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_gord_sat}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_sat: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_gord_trans" className="text-xs">Gorduras Trans (g)</Label>
                      <Input
                        id="rotulo_gord_trans"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_gord_trans}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_trans: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_fibra" className="text-xs">Fibra Alimentar (g)</Label>
                      <Input
                        id="rotulo_fibra"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_fibra}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_fibra: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rotulo_sodio" className="text-xs">Sódio (mg)</Label>
                      <Input
                        id="rotulo_sodio"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_sodio}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_sodio: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>

                {product && (
                  <TabsContent value="historico" className="overflow-y-auto max-h-full p-2">
                    <HistoricoMovimentacoes produtoId={product.id} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>

          {/* Footer com botões */}
          <div className="flex justify-between pt-3 border-t mt-auto">
            <div>
              {product && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
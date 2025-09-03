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
import { X, Trash2, Camera, Upload, Crop } from 'lucide-react';
import { MultiSelectTags } from './MultiSelectTags';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { ImageCropper } from './ImageCropper';

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
  const [imageForCrop, setImageForCrop] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  
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

  const imageSuggestions = [
    { url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80&h=80&fit=crop', name: 'Farinha' },
    { url: 'https://images.unsplash.com/photo-1571167530149-c72f2b8b82c5?w=80&h=80&fit=crop', name: 'Açúcar' },
    { url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=80&h=80&fit=crop', name: 'Óleo' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop', name: 'Sal' }
  ];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageForCrop(result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setFormData(prev => ({ ...prev, imagem_url: croppedImage }));
    setShowCropper(false);
    setImageForCrop('');
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageForCrop('');
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
        ...formData,
        user_id: user?.id,
        marcas: formData.marcas.length > 0 ? formData.marcas : null,
        categorias: formData.categorias.length > 0 ? formData.categorias : null,
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
      <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[800px] overflow-hidden p-0 bg-background border-2 border-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95">
          <DialogTitle className="text-xl font-bold text-primary">
            {product ? "Editar Produto" : "Novo Cadastro"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full">
          {/* Dados Principais - Layout em duas colunas */}
          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="flex gap-8 h-full">
              {/* Coluna Esquerda */}
              <div className="flex-1 space-y-6">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium text-foreground">Nome</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="Digite o nome do produto"
                  />
                </div>

                {/* Marca */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Marca</Label>
                  <MultiSelectTags
                    values={formData.marcas}
                    onChange={(marcas) => setFormData(prev => ({ ...prev, marcas }))}
                    placeholder="Adicionar marca..."
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Categoria</Label>
                  <MultiSelectTags
                    values={formData.categorias}
                    onChange={(categorias) => setFormData(prev => ({ ...prev, categorias }))}
                    placeholder="Adicionar categoria..."
                  />
                </div>

                {/* Códigos em linha */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="codigo_interno" className="text-sm font-medium text-foreground">Código Interno</Label>
                    <Input
                      id="codigo_interno"
                      name="codigo_interno"
                      value={formData.codigo_interno}
                      onChange={handleInputChange}
                      readOnly={!product}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg bg-primary/5"
                      placeholder="121212"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigo_barras" className="text-sm font-medium text-foreground">Código de Barras</Label>
                    <Input
                      id="codigo_barras"
                      name="codigo_barras"
                      value={formData.codigo_barras}
                      onChange={handleInputChange}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                      placeholder="Digite o código de barras"
                    />
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Painel de Imagem */}
              <div className="w-80 h-[376px] border-2 border-dashed border-primary/40 rounded-xl p-6 bg-primary/5 flex flex-col">
                {/* Preview da Imagem */}
                <div className="aspect-[4/3] h-42 bg-background/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:bg-background/70 transition-colors group mb-4 relative"
                     onClick={() => document.getElementById('image-upload')?.click()}>
                  {formData.imagem_url ? (
                    <>
                      <img
                        src={formData.imagem_url}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Crop className="w-3 h-3" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-xs font-medium">Sem foto</p>
                      <p className="text-xs">Clique para adicionar</p>
                    </div>
                  )}
                </div>

                {/* Sugestões de Imagem */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-primary uppercase tracking-wide">Sugestão de Imagem</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {imageSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="aspect-square w-full bg-background/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-primary/60 transition-all duration-200 overflow-hidden hover:shadow-lg"
                        onClick={() => {
                          setImageForCrop(suggestion.url);
                          setShowCropper(true);
                        }}
                      >
                        <img
                          src={suggestion.url}
                          alt={suggestion.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggle Ativo */}
                <div className="flex items-center justify-center pt-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="ativo" className="text-sm font-bold text-primary">
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Input de arquivo oculto */}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Image Cropper Modal */}
            <ImageCropper
              imageSrc={imageForCrop}
              isOpen={showCropper}
              onClose={handleCropCancel}
              onCropComplete={handleCropComplete}
            />
          </div>

          {/* Abas */}
          <div className="flex-1 px-6 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 h-12 mb-4 bg-muted/50 rounded-lg">
                <TabsTrigger value="estoque" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary">
                  Estoque e Custos
                </TabsTrigger>
                <TabsTrigger value="rotulo" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary">
                  Rótulo Nutricional
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary">
                  Histórico de Entradas
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="estoque" className="space-y-4 p-4 bg-background/50 rounded-lg border h-full overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="total_embalagem" className="text-sm font-medium">Total na Embalagem</Label>
                      <Input
                        id="total_embalagem"
                        type="number"
                        min="1"
                        value={formData.total_embalagem}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_embalagem: parseInt(e.target.value) || 1 }))}
                        className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unidade" className="text-sm font-medium">Unidade de Medida</Label>
                      <Select value={formData.unidade} onValueChange={(value: any) => setFormData(prev => ({ ...prev, unidade: value }))}>
                        <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">Unidade (un.)</SelectItem>
                          <SelectItem value="g">Gramas (g)</SelectItem>
                          <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                          <SelectItem value="ml">Mililitros (ml)</SelectItem>
                          <SelectItem value="L">Litros (L)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Custo Total (R$)</Label>
                      <Input
                        value={`R$ ${custoTotal.toFixed(2)}`}
                        readOnly
                        className="h-12 border-2 border-primary/30 text-base rounded-lg bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custo_unitario" className="text-sm font-medium">Custo Unitário (R$)</Label>
                      <Input
                        id="custo_unitario"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.custo_unitario}
                        onChange={(e) => setFormData(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                        className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quantidade em Estoque</Label>
                      <Input
                        value={product?.estoque_atual || 0}
                        readOnly
                        className="h-12 border-2 border-primary/30 text-base rounded-lg bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estoque_minimo" className="text-sm font-medium">Estoque Mínimo</Label>
                      <Input
                        id="estoque_minimo"
                        type="number"
                        min="0"
                        value={formData.estoque_minimo}
                        onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                        className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rotulo" className="space-y-4 p-4 bg-background/50 rounded-lg border h-full overflow-y-auto">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rotulo_porcao" className="text-sm font-medium">Porção</Label>
                      <Input
                        id="rotulo_porcao"
                        value={formData.rotulo_porcao}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_porcao: e.target.value }))}
                        placeholder="Ex: 100g"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_kcal" className="text-sm font-medium">Energia (kcal)</Label>
                      <Input
                        id="rotulo_kcal"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_kcal}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_kcal: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_carb" className="text-sm font-medium">Carboidratos (g)</Label>
                      <Input
                        id="rotulo_carb"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_carb}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_carb: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_prot" className="text-sm font-medium">Proteínas (g)</Label>
                      <Input
                        id="rotulo_prot"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_prot}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_prot: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_gord_total" className="text-sm font-medium">Gorduras Totais (g)</Label>
                      <Input
                        id="rotulo_gord_total"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_gord_total}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_gord_total: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_fibra" className="text-sm font-medium">Fibra (g)</Label>
                      <Input
                        id="rotulo_fibra"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_fibra}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_fibra: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rotulo_sodio" className="text-sm font-medium">Sódio (mg)</Label>
                      <Input
                        id="rotulo_sodio"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.rotulo_sodio}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotulo_sodio: parseFloat(e.target.value) || 0 }))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="p-4 bg-background/50 rounded-lg border h-full overflow-hidden">
                  {product && (
                    <HistoricoMovimentacoes produtoId={product.id} />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer com Botões */}
          <div className="flex justify-center gap-4 px-6 py-4 border-t border-border bg-background/95">
            <Button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-8 py-3 text-base font-semibold border-2 border-muted-foreground text-muted-foreground hover:bg-muted/50 rounded-lg"
            >
              Cancelar
            </Button>
            
            {product && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="px-8 py-3 text-base font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
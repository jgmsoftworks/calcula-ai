import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, X, Trash2 } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';

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
  custo_total?: number;
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
  total_embalagem?: number | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Produto | null;
  onSave: () => void;
}

export const ProductModal = ({ isOpen, onClose, product, onSave }: ProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [showImageCropper, setShowImageCropper] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    marcas: [] as string[],
    categorias: [] as string[],
    codigo_interno: '',
    codigo_barras: '',
    unidade: 'un' as const,
    total_embalagem: 1,
    custo_unitario: 0,
    custo_total: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    fornecedor_id: '',
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

  const [currencyInputs, setCurrencyInputs] = useState({
    custo_total: '',
    custo_unitario: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFornecedores();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        nome: product.nome,
        marcas: product.marcas || [],
        categorias: product.categorias || [],
        codigo_interno: product.codigo_interno || '',
        codigo_barras: product.codigo_barras || '',
        unidade: product.unidade as any,
        total_embalagem: product.total_embalagem || 1,
        custo_unitario: product.custo_unitario || 0,
        custo_total: product.custo_total || 0,
        estoque_atual: product.estoque_atual || 0,
        estoque_minimo: product.estoque_minimo || 0,
        fornecedor_id: product.fornecedor_ids?.[0] || '',
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
      
      setSelectedImage(product.imagem_url || null);
      
      // Formatar valores monetários
      setCurrencyInputs({
        custo_total: formatCurrency(((product.custo_total || 0) * 100).toString()),
        custo_unitario: formatCurrency(((product.custo_unitario || 0) * 100).toString())
      });
    }
  }, [product]);

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

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return parseFloat(numbers) / 100 || 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Calcular custo unitário automaticamente quando custo_total ou total_embalagem mudar
      if (field === 'custo_total' || field === 'total_embalagem') {
        const custoTotal = field === 'custo_total' ? value : updated.custo_total;
        const totalEmbalagem = field === 'total_embalagem' ? value : updated.total_embalagem;
        
        if (custoTotal > 0 && totalEmbalagem > 0) {
          updated.custo_unitario = custoTotal / totalEmbalagem;
          setCurrencyInputs(prev => ({
            ...prev,
            custo_unitario: formatCurrency((updated.custo_unitario * 100).toString())
          }));
        } else {
          updated.custo_unitario = 0;
          setCurrencyInputs(prev => ({
            ...prev,
            custo_unitario: ''
          }));
        }
      }
      
      return updated;
    });
  };

  const handleCurrencyChange = (field: string, formattedValue: string) => {
    setCurrencyInputs(prev => ({
      ...prev,
      [field]: formatCurrency(formattedValue)
    }));
    
    const numericValue = parseCurrency(formattedValue);
    handleInputChange(field, numericValue);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setShowImageCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setSelectedImage(croppedImage);
    setShowImageCropper(false);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
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
        marcas: formData.marcas.length > 0 ? formData.marcas : null,
        categorias: formData.categorias.length > 0 ? formData.categorias : null,
        codigo_interno: formData.codigo_interno || null,
        codigo_barras: formData.codigo_barras || null,
        unidade: formData.unidade,
        total_embalagem: formData.total_embalagem,
        custo_unitario: formData.custo_unitario,
        custo_total: formData.custo_total,
        custo_medio: formData.custo_unitario,
        estoque_atual: formData.estoque_atual,
        estoque_minimo: formData.estoque_minimo,
        fornecedor_ids: formData.fornecedor_id ? [formData.fornecedor_id] : null,
        imagem_url: selectedImage,
        user_id: user?.id,
        ativo: formData.ativo,
        rotulo_porcao: formData.rotulo_porcao.trim() || null,
        rotulo_kcal: formData.rotulo_kcal || null,
        rotulo_carb: formData.rotulo_carb || null,
        rotulo_prot: formData.rotulo_prot || null,
        rotulo_gord_total: formData.rotulo_gord_total || null,
        rotulo_gord_sat: formData.rotulo_gord_sat || null,
        rotulo_gord_trans: formData.rotulo_gord_trans || null,
        rotulo_fibra: formData.rotulo_fibra || null,
        rotulo_sodio: formData.rotulo_sodio || null
      };

      const { error } = await supabase
        .from('produtos')
        .update(payload)
        .eq('id', product!.id);

      if (error) throw error;
      
      toast({ title: "Produto atualizado com sucesso!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message?.includes('duplicate') ? "Já existe um produto com esse nome" : "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-primary/20 bg-background/95">
          <DialogTitle className="flex items-center justify-between text-xl font-bold text-primary">
            <span>Editar Produto</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm font-medium text-primary">
                  {formData.ativo ? 'Ativo' : 'Desativado'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Seção Superior - Campos Básicos e Imagem */}
            <div className="flex gap-6 mb-6">
              {/* Campos Básicos */}
              <div className="flex-1 space-y-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium text-foreground">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="Nome do produto"
                  />
                </div>

                {/* Marca e Categoria lado a lado */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium text-foreground">Marca</Label>
                    <MarcasSelector
                      selectedMarcas={formData.marcas}
                      onMarcasChange={(marcas) => handleInputChange('marcas', marcas)}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium text-foreground">Categoria</Label>
                    <CategoriasSelector
                      selectedCategorias={formData.categorias}
                      onCategoriasChange={(categorias) => handleInputChange('categorias', categorias)}
                    />
                  </div>
                </div>

                {/* Códigos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo_interno" className="text-sm font-medium text-foreground">Código Interno</Label>
                    <Input
                      id="codigo_interno"
                      value={formData.codigo_interno}
                      onChange={(e) => handleInputChange('codigo_interno', e.target.value)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center bg-primary/5"
                      placeholder="121212"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigo_barras" className="text-sm font-medium text-foreground">Código de Barras</Label>
                    <Input
                      id="codigo_barras"
                      value={formData.codigo_barras}
                      onChange={(e) => handleInputChange('codigo_barras', e.target.value)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                      placeholder="Digite o código de barras"
                    />
                  </div>
                </div>
              </div>

              {/* Área de Imagem */}
              <div className="w-64 flex flex-col items-center">
                <div className="w-64 h-64 border-2 border-dashed border-primary/40 rounded-xl bg-primary/5 flex flex-col items-center justify-center mb-4 relative overflow-hidden cursor-pointer hover:bg-primary/10 transition-colors"
                     onClick={() => !selectedImage && document.getElementById('image-upload')?.click()}>
                  {selectedImage ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={selectedImage} 
                        alt="Produto" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-primary/50 mb-2" />
                      <span className="text-sm text-primary/70">Sem foto</span>
                      <span className="text-xs text-muted-foreground">Clique para adicionar</span>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Abas */}
            <Tabs defaultValue="estoque" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-primary/10">
                <TabsTrigger value="estoque" className="data-[state=active]:bg-background data-[state=active]:text-primary">
                  Estoque e Custos
                </TabsTrigger>
                <TabsTrigger value="rotulo" className="data-[state=active]:bg-background data-[state=active]:text-primary">
                  Rótulo Nutricional
                </TabsTrigger>
              </TabsList>

              <TabsContent value="estoque" className="space-y-4 p-4 bg-background/50 rounded-lg border">
                <div className="grid grid-cols-3 gap-6">
                  {/* Custo Total */}
                  <div className="space-y-2">
                    <Label htmlFor="custo_total" className="text-sm font-medium">Custo Total</Label>
                    <Input
                      id="custo_total"
                      value={currencyInputs.custo_total}
                      onChange={(e) => handleCurrencyChange('custo_total', e.target.value)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                      placeholder="R$ 0,00"
                    />
                  </div>

                  {/* Total na Embalagem */}
                  <div className="space-y-2">
                    <Label htmlFor="total_embalagem" className="text-sm font-medium">Total na Embalagem</Label>
                    <Input
                      id="total_embalagem"
                      type="number"
                      min="1"
                      value={formData.total_embalagem}
                      onChange={(e) => handleInputChange('total_embalagem', parseInt(e.target.value) || 1)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  {/* Custo Unitário */}
                  <div className="space-y-2">
                    <Label htmlFor="custo_unitario" className="text-sm font-medium">Custo Unitário</Label>
                    <Input
                      id="custo_unitario"
                      value={currencyInputs.custo_unitario}
                      readOnly
                      className="h-12 border-2 border-primary/30 text-base px-4 rounded-lg bg-primary/5"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {/* Unidade */}
                  <div className="space-y-2">
                    <Label htmlFor="unidade" className="text-sm font-medium">Unidade</Label>
                    <Select value={formData.unidade} onValueChange={(value) => handleInputChange('unidade', value)}>
                      <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">Gramas (g)</SelectItem>
                        <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                        <SelectItem value="ml">Mililitros (ml)</SelectItem>
                        <SelectItem value="l">Litros (l)</SelectItem>
                        <SelectItem value="un">Unidades (un)</SelectItem>
                        <SelectItem value="cx">Caixas (cx)</SelectItem>
                        <SelectItem value="pct">Pacotes (pct)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estoque Atual */}
                  <div className="space-y-2">
                    <Label htmlFor="estoque_atual" className="text-sm font-medium">Estoque Atual</Label>
                    <Input
                      id="estoque_atual"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.estoque_atual}
                      onChange={(e) => handleInputChange('estoque_atual', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  {/* Estoque Mínimo */}
                  <div className="space-y-2">
                    <Label htmlFor="estoque_minimo" className="text-sm font-medium">Estoque Mínimo</Label>
                    <Input
                      id="estoque_minimo"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.estoque_minimo}
                      onChange={(e) => handleInputChange('estoque_minimo', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  {/* Fornecedor */}
                  <div className="space-y-2">
                    <Label htmlFor="fornecedor" className="text-sm font-medium">Fornecedor</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(value) => handleInputChange('fornecedor_id', value)}>
                      <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {fornecedores.map((fornecedor) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rotulo" className="space-y-4 p-4 bg-background/50 rounded-lg border">
                {/* Porção */}
                <div className="space-y-2">
                  <Label htmlFor="rotulo_porcao" className="text-sm font-medium">Porção</Label>
                  <Input
                    id="rotulo_porcao"
                    value={formData.rotulo_porcao}
                    onChange={(e) => handleInputChange('rotulo_porcao', e.target.value)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    placeholder="Ex: 100g, 1 xícara, 1 fatia"
                  />
                </div>

                {/* Valores Nutricionais */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="rotulo_kcal" className="text-sm font-medium">Calorias (kcal)</Label>
                    <Input
                      id="rotulo_kcal"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_kcal}
                      onChange={(e) => handleInputChange('rotulo_kcal', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_carb" className="text-sm font-medium">Carboidratos (g)</Label>
                    <Input
                      id="rotulo_carb"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_carb}
                      onChange={(e) => handleInputChange('rotulo_carb', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_prot" className="text-sm font-medium">Proteínas (g)</Label>
                    <Input
                      id="rotulo_prot"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_prot}
                      onChange={(e) => handleInputChange('rotulo_prot', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_gord_total" className="text-sm font-medium">Gorduras Totais (g)</Label>
                    <Input
                      id="rotulo_gord_total"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_gord_total}
                      onChange={(e) => handleInputChange('rotulo_gord_total', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_gord_sat" className="text-sm font-medium">Gorduras Saturadas (g)</Label>
                    <Input
                      id="rotulo_gord_sat"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_gord_sat}
                      onChange={(e) => handleInputChange('rotulo_gord_sat', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_gord_trans" className="text-sm font-medium">Gorduras Trans (g)</Label>
                    <Input
                      id="rotulo_gord_trans"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_gord_trans}
                      onChange={(e) => handleInputChange('rotulo_gord_trans', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_fibra" className="text-sm font-medium">Fibras (g)</Label>
                    <Input
                      id="rotulo_fibra"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_fibra}
                      onChange={(e) => handleInputChange('rotulo_fibra', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rotulo_sodio" className="text-sm font-medium">Sódio (mg)</Label>
                    <Input
                      id="rotulo_sodio"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.rotulo_sodio}
                      onChange={(e) => handleInputChange('rotulo_sodio', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer com botões */}
          <div className="border-t border-primary/20 px-6 py-4 bg-background/95">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>

        {/* Image Cropper Modal */}
        <ImageCropper
          imageSrc={imageSrc}
          isOpen={showImageCropper}
          onClose={() => setShowImageCropper(false)}
          onCropComplete={handleCropComplete}
        />
      </DialogContent>
    </Dialog>
  );
};
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Camera, X } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';

interface Fornecedor {
  id: string;
  nome: string;
}

export const CadastroProdutoForm = () => {
  const [formData, setFormData] = useState({
    nome: '',
    marcas: [] as string[], // Mudança: agora é array
    categorias: [] as string[], // Mudança: agora é array de categorias
    codigo_interno: '',
    codigo_barras: '',
    unidade: 'un' as const,
    total_embalagem: 1,
    custo_unitario: 0,
    custo_total: 0,
    estoque_atual: 0,
    estoque_minimo: 15,
    fornecedor_id: '',
    ativo: true
  });
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  const generateImageSuggestions = async (productName: string) => {
    if (!productName.trim()) return;
    
    setLoadingSuggestions(true);
    try {
      const response = await supabase.functions.invoke('generate-image-suggestions', {
        body: { productName }
      });
      
      if (response.error) throw response.error;
      
      setSuggestedImages(response.data.images || []);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      toast({
        title: "Erro ao gerar sugestões",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const generateMoreSuggestions = () => {
    if (formData.nome.trim()) {
      generateImageSuggestions(formData.nome);
    }
  };

  // Efeito para gerar sugestões quando o nome mudar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.nome.trim()) {
        generateImageSuggestions(formData.nome);
      } else {
        setSuggestedImages([]);
      }
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timer);
  }, [formData.nome]);

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
        marcas: formData.marcas.length > 0 ? formData.marcas : null, // Mudança: usar array de marcas
        categorias: formData.categorias.length > 0 ? formData.categorias : null,
        codigo_interno: formData.codigo_interno || null,
        codigo_barras: formData.codigo_barras || null,
        unidade: formData.unidade,
        total_embalagem: formData.total_embalagem,
        custo_unitario: formData.custo_unitario,
        custo_total: formData.custo_total,
        estoque_atual: formData.estoque_atual,
        estoque_minimo: formData.estoque_minimo,
        fornecedor_ids: formData.fornecedor_id ? [formData.fornecedor_id] : null,
        user_id: user?.id,
        ativo: formData.ativo
      };

      const { error } = await supabase
        .from('produtos')
        .insert([payload]);

      if (error) throw error;

      toast({ title: "Produto cadastrado com sucesso!" });
      
      // Reset form
      setFormData({
        nome: '',
        marcas: [], // Mudança: resetar array
        categorias: [], // Mudança: resetar array
        codigo_interno: '',
        codigo_barras: '',
        unidade: 'un',
        total_embalagem: 1,
        custo_unitario: 0,
        custo_total: 0,
        estoque_atual: 0,
        estoque_minimo: 15,
        fornecedor_id: '',
        ativo: true
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção Superior - Campos Básicos e Imagem */}
            <div className="flex gap-6">
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
                    placeholder="teste"
                  />
                </div>

                {/* Marca e Categoria lado a lado */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="marcas" className="text-sm font-medium text-foreground">Marca</Label>
                    <MarcasSelector
                      selectedMarcas={formData.marcas}
                      onMarcasChange={(marcas) => handleInputChange('marcas', marcas)}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="categorias" className="text-sm font-medium text-foreground">Categoria</Label>
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
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                      placeholder="121212"
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
                <div className="w-full h-48 border-2 border-dashed border-primary/40 rounded-xl bg-primary/5 flex flex-col items-center justify-center mb-4 relative overflow-hidden cursor-pointer hover:bg-primary/10 transition-colors"
                     onClick={() => !selectedImage && document.getElementById('image-upload')?.click()}>
                  {selectedImage ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={selectedImage} 
                        alt="Produto" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
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
                
                <div className="text-center mb-4">
                  <h4 className="text-sm font-medium text-primary mb-2">SUGESTÃO DE IMAGEM</h4>
                  
                  {!formData.nome.trim() ? (
                    <div className="py-4">
                      <span className="text-sm text-muted-foreground">Adicione um nome</span>
                    </div>
                  ) : loadingSuggestions ? (
                    <div className="flex gap-2 justify-center mb-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 bg-muted animate-pulse rounded border"></div>
                      ))}
                    </div>
                  ) : suggestedImages.length > 0 ? (
                    <div className="flex gap-2 justify-center mb-2">
                      {suggestedImages.slice(0, 4).map((image, index) => (
                        <div
                          key={index}
                          className="w-10 h-10 border rounded cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => {
                            setImageSrc(image);
                            setShowImageCropper(true);
                          }}
                        >
                          <img 
                            src={image} 
                            alt={`Sugestão ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center mb-2">
                      <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                      <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                      <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                      <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                    </div>
                  )}
                  
                  {formData.nome.trim() && (
                    <button
                      type="button"
                      onClick={generateMoreSuggestions}
                      disabled={loadingSuggestions}
                      className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingSuggestions ? 'Gerando...' : 'Mostrar mais'}
                    </button>
                  )}
                </div>

                {/* Switch Ativo */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                  />
                  <span className="text-sm font-medium text-primary">Ativo</span>
                </div>
              </div>
            </div>

            {/* Abas */}
            <Tabs defaultValue="estoque" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-primary/10">
                <TabsTrigger value="estoque" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Estoque e Custos
                </TabsTrigger>
                <TabsTrigger value="nutricional" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Rótulo Nutricional
                </TabsTrigger>
                <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Histórico de Entradas
                </TabsTrigger>
              </TabsList>

              {/* Aba Estoque e Custos */}
              <TabsContent value="estoque" className="space-y-4 mt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_embalagem" className="text-sm font-medium text-foreground">Total na Embalagem</Label>
                    <Input
                      id="total_embalagem"
                      type="number"
                      min="1"
                      value={formData.total_embalagem}
                      onChange={(e) => handleInputChange('total_embalagem', parseInt(e.target.value) || 1)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="unidade" className="text-sm font-medium text-foreground">Unidade de Medida</Label>
                    <Select
                      value={formData.unidade}
                      onValueChange={(value) => handleInputChange('unidade', value)}
                    >
                      <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="un">Unidade (un.)</SelectItem>
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

                  <div className="space-y-2">
                    <Label htmlFor="custo_total" className="text-sm font-medium text-foreground">Custo Total (R$)</Label>
                    <Input
                      id="custo_total"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.custo_total}
                      onChange={(e) => handleInputChange('custo_total', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="custo_unitario" className="text-sm font-medium text-foreground">Custo Unitário (R$)</Label>
                    <Input
                      id="custo_unitario"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.custo_unitario}
                      onChange={(e) => handleInputChange('custo_unitario', parseFloat(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estoque_atual" className="text-sm font-medium text-foreground">Quantidade em Estoque</Label>
                    <Input
                      id="estoque_atual"
                      type="number"
                      min="0"
                      value={formData.estoque_atual}
                      onChange={(e) => handleInputChange('estoque_atual', parseInt(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estoque_minimo" className="text-sm font-medium text-foreground">Estoque Mínimo</Label>
                    <Input
                      id="estoque_minimo"
                      type="number"
                      min="0"
                      value={formData.estoque_minimo}
                      onChange={(e) => handleInputChange('estoque_minimo', parseInt(e.target.value) || 0)}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Rótulo Nutricional */}
              <TabsContent value="nutricional" className="space-y-4 mt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Informações nutricionais serão implementadas em breve</p>
                </div>
              </TabsContent>

              {/* Aba Histórico de Entradas */}
              <TabsContent value="historico" className="space-y-4 mt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Histórico será exibido após o primeiro cadastro</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Botões */}
            <div className="flex justify-between pt-6 border-t border-primary/20">
              <Button 
                type="button" 
                variant="destructive"
                className="px-8 h-12"
              >
                Excluir
              </Button>
              
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  className="px-8 h-12 border-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 h-12"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <ImageCropper
        imageSrc={imageSrc}
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};
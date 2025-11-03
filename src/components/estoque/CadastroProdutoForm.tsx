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
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Camera, X } from 'lucide-react';
import { resizeImageToSquare } from '@/lib/imageUtils';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';
import { ModoUsoTab } from './ModoUsoTab';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { formatters } from '@/lib/formatters';

interface Fornecedor {
  id: string;
  nome: string;
}

interface CadastroProdutoFormProps {
  onProductCadastrado?: () => void;
}

export const CadastroProdutoForm = ({ onProductCadastrado }: CadastroProdutoFormProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    marcas: [] as string[], // Mudança: agora é array
    categorias: [] as string[], // Mudança: agora é array de categorias
    codigo_interno: '',
    codigos_barras: [''], // Inicializar com um campo vazio
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
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [conversaoData, setConversaoData] = useState<{
    unidade_compra: string;
    quantidade_por_unidade: number;
    unidade_uso_receitas: string;
    custo_unitario_uso: number;
    quantidade_unidade_uso: number;
  } | null>(null);

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

  const [currencyInputs, setCurrencyInputs] = useState({
    custo_total: '',
    custo_unitario: ''
  });

  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (!numbers) return '';
    
    // Converte para número (dividindo por 100 para ter os centavos)
    const amount = parseFloat(numbers) / 100;
    
    // Formata como moeda brasileira
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const parseCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    // Converte para número dividindo por 100
    return parseFloat(numbers) / 100 || 0;
  };

  const handleInputChange = (field: string, value: any) => {
    // Validação especial para estoque_atual: permitir zero, mas não negativo
    if (field === 'estoque_atual') {
      const numValue = parseFloat(value);
      if (numValue < 0) {
        toast({
          title: "Valor inválido",
          description: "O estoque não pode ser negativo",
          variant: "destructive"
        });
        return;
      }
    }
    
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  };

  const handleCurrencyChange = (field: string, formattedValue: string) => {
    // Atualiza o input formatado
    setCurrencyInputs(prev => ({
      ...prev,
      [field]: formatCurrency(formattedValue)
    }));
    
    // Converte e salva o valor numérico
    const numericValue = parseCurrency(formattedValue);
    handleInputChange(field, numericValue);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalImage = e.target?.result as string;
        try {
          // Converter automaticamente para 512x512px
          const processedImage = await resizeImageToSquare(originalImage, 512, 0.9);
          setSelectedImage(processedImage);
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          toast({
            title: "Erro ao processar imagem",
            description: "Tente novamente com outra imagem",
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(file);
    }
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

    // Aviso não bloqueante: estoque > 0 mas custo_unitario = 0
    if (formData.estoque_atual > 0 && formData.custo_unitario === 0) {
      toast({
        title: "Atenção",
        description: "Produto com estoque mas sem custo unitário definido",
        variant: "default"
      });
    }

    // Validar se a conversão foi definida
    if (!conversaoData) {
      toast({
        title: "Atenção",
        description: "Por favor, defina o Modo de Uso do produto na aba correspondente",
        variant: "destructive",
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
        codigo_barras: formData.codigos_barras.length > 0 ? formData.codigos_barras.filter(c => c.trim()) : null,
        unidade: formData.unidade,
        total_embalagem: 1,
        custo_unitario: formData.custo_unitario,
        custo_total: formData.estoque_atual * formData.custo_unitario,
        custo_medio: formData.custo_unitario,
        estoque_atual: formData.estoque_atual,
        estoque_minimo: formData.estoque_minimo,
        fornecedor_ids: formData.fornecedor_id ? [formData.fornecedor_id] : null,
        imagem_url: selectedImage,
        user_id: user?.id,
        ativo: formData.ativo
      };

      const { data: produtoInserido, error } = await supabase
        .from('produtos')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Inserir a conversão (Modo de Uso)
      const conversaoPayload = {
        produto_id: produtoInserido.id,
        user_id: user!.id,
        ...conversaoData,
        ativo: true
      };

      const { error: conversaoError } = await supabase
        .from('produto_conversoes')
        .insert([{
          ...conversaoPayload,
          unidade_compra: conversaoPayload.unidade_compra as Database['public']['Enums']['unidade_medida'],
          unidade_uso_receitas: conversaoPayload.unidade_uso_receitas as Database['public']['Enums']['unidade_medida']
        }]);

      if (conversaoError) throw conversaoError;

      toast({ title: "Produto cadastrado com sucesso!" });
      
      // Redirecionar para a lista
      onProductCadastrado?.();
      
      // Reset form
      setFormData({
        nome: '',
        marcas: [],
        categorias: [],
        codigo_interno: '',
        codigos_barras: [''],
        unidade: 'un',
        total_embalagem: 1,
        custo_unitario: 0,
        custo_total: 0,
        estoque_atual: 0,
        estoque_minimo: 15,
        fornecedor_id: '',
        ativo: true
      });
      setCurrencyInputs({
        custo_total: '',
        custo_unitario: ''
      });
      setSelectedImage(null);
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

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-primary">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Produto
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => handleInputChange('ativo', checked)}
              />
              <span className="text-sm font-medium text-primary">
                {formData.ativo ? 'Ativo' : 'Desativado'}
              </span>
            </div>
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
                <div className="flex gap-6">
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
                <div className="space-y-4">
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
                  
                  {/* Códigos de Barras Múltiplos */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Códigos de Barras</Label>
                    <div className="space-y-2">
                      {formData.codigos_barras.map((codigo, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={codigo}
                            onChange={(e) => {
                              const newCodigos = [...formData.codigos_barras];
                              newCodigos[index] = e.target.value;
                              handleInputChange('codigos_barras', newCodigos);
                            }}
                            className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg flex-1"
                            placeholder={`Código de barras ${index + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newCodigos = formData.codigos_barras.filter((_, i) => i !== index);
                              handleInputChange('codigos_barras', newCodigos);
                            }}
                            className="h-12 px-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleInputChange('codigos_barras', [...formData.codigos_barras, '']);
                        }}
                        className="h-10 w-full border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar mais Códigos de Barras
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Área de Imagem */}
              <div className="w-64 flex flex-col items-center">
                <div className="w-[256px] h-[256px] border-2 border-dashed border-primary/40 rounded-xl bg-muted/50 flex flex-col items-center justify-center mb-4 relative overflow-hidden cursor-pointer hover:bg-primary/10 transition-colors"
                     onClick={() => !selectedImage && document.getElementById('image-upload')?.click()}>
                  {selectedImage ? (
                    <div className="w-full h-full relative bg-white rounded-lg">
                      <img 
                        src={selectedImage} 
                        alt="Produto" 
                        className="w-full h-full object-contain p-2"
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
                          onClick={async () => {
                            try {
                              const processedImage = await resizeImageToSquare(image, 512, 0.9);
                              setSelectedImage(processedImage);
                            } catch (error) {
                              console.error('Erro ao processar imagem sugerida:', error);
                            }
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

              </div>
            </div>

            {/* Abas */}
            <Tabs defaultValue="estoque" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-primary/10">
                <TabsTrigger value="estoque" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Estoque e Custos
                </TabsTrigger>
                <TabsTrigger value="modo-uso" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Modo de Uso
                </TabsTrigger>
              </TabsList>

              {/* Aba Estoque e Custos */}
              <TabsContent value="estoque" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="kg">Quilo (k)</SelectItem>
                        <SelectItem value="g">Grama (g)</SelectItem>
                        <SelectItem value="fardo">Fardo</SelectItem>
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
                    <Label htmlFor="custo_unitario" className="text-sm font-medium text-foreground">Custo Unitário (R$)</Label>
                    <NumericInputPtBr
                      tipo="valor"
                      value={formData.custo_unitario}
                      onChange={(valor) => handleInputChange('custo_unitario', valor)}
                      min={0}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estoque_atual" className="text-sm font-medium text-foreground">Quantidade em Estoque</Label>
                    <NumericInputPtBr
                      tipo={formData.unidade === 'un' || formData.unidade === 'fardo' ? 'quantidade_un' : 'quantidade_continua'}
                      value={formData.estoque_atual}
                      onChange={(valor) => handleInputChange('estoque_atual', valor)}
                      min={0}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estoque_minimo" className="text-sm font-medium text-foreground">Estoque Mínimo</Label>
                    <NumericInputPtBr
                      tipo={formData.unidade === 'un' || formData.unidade === 'fardo' ? 'quantidade_un' : 'quantidade_continua'}
                      value={formData.estoque_minimo}
                      onChange={(valor) => handleInputChange('estoque_minimo', valor)}
                      min={0}
                      className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custo_total_estoque" className="text-sm font-medium text-foreground">Valor Total em Estoque (R$)</Label>
                    <Input
                      id="custo_total_estoque"
                      type="text"
                      value={formatters.valor(formData.estoque_atual * formData.custo_unitario)}
                      readOnly
                      className="h-12 border-2 border-muted text-base px-4 rounded-lg text-center bg-muted/50 cursor-not-allowed font-medium text-primary"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Modo de Uso */}
              <TabsContent value="modo-uso" className="space-y-4 mt-6">
                <ModoUsoTab
                  totalEmbalagem={formData.total_embalagem}
                  custoTotal={formData.custo_total}
                  custoUnitario={formData.custo_unitario}
                  unidadeCompra={formData.unidade}
                  onConversaoChange={setConversaoData}
                />
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
    </div>
  );
};
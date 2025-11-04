import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, Camera, X, Plus } from 'lucide-react';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';
import { ModoUsoTab } from './ModoUsoTab';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { Produto } from './CadastroProdutos';
import { resizeImageToSquare } from '@/lib/imageUtils';
import { toSafeNumber } from '@/lib/formatters';

interface ProductModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  product: Produto | null;
  onSave: () => void;
}

interface FormDataType {
  nome: string;
  marcas: string[];
  categorias: string[];
  codigo_interno: string;
  codigos_barras: string[];
  unidade: Database['public']['Enums']['unidade_medida'];
  total_embalagem: number;
  custo_unitario: number;
  custo_total: number;
  estoque_atual: number;
  estoque_minimo: number;
  fornecedor_ids: string[];
  ativo: boolean;
  imagem_url: string | null;
  rotulo_porcao: string;
  rotulo_kcal: number;
  rotulo_carb: number;
  rotulo_prot: number;
  rotulo_gord_total: number;
  rotulo_gord_sat: number;
  rotulo_gord_trans: number;
  rotulo_fibra: number;
  rotulo_sodio: number;
}

export const ProductModalV2 = ({ isOpen, onClose, product, onSave }: ProductModalV2Props) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormDataType>({} as FormDataType);
  const [originalData, setOriginalData] = useState<FormDataType>({} as FormDataType);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [conversaoData, setConversaoData] = useState<any>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      const initialData: FormDataType = {
        nome: product.nome || '',
        marcas: product.marcas || [],
        categorias: product.categorias || [],
        codigo_interno: product.codigo_interno || '',
        codigos_barras: product.codigo_barras && product.codigo_barras.length > 0 ? product.codigo_barras : [''],
        unidade: product.unidade as Database['public']['Enums']['unidade_medida'],
        total_embalagem: toSafeNumber(product.total_embalagem, 1),
        custo_unitario: toSafeNumber(product.custo_unitario, 0),
        custo_total: toSafeNumber(product.custo_total, 0),
        estoque_atual: toSafeNumber(product.estoque_atual, 0),
        estoque_minimo: toSafeNumber(product.estoque_minimo, 0),
        fornecedor_ids: product.fornecedor_ids || [],
        ativo: product.ativo,
        imagem_url: product.imagem_url || null,
        rotulo_porcao: product.rotulo_porcao || '',
        rotulo_kcal: toSafeNumber(product.rotulo_kcal, 0),
        rotulo_carb: toSafeNumber(product.rotulo_carb, 0),
        rotulo_prot: toSafeNumber(product.rotulo_prot, 0),
        rotulo_gord_total: toSafeNumber(product.rotulo_gord_total, 0),
        rotulo_gord_sat: toSafeNumber(product.rotulo_gord_sat, 0),
        rotulo_gord_trans: toSafeNumber(product.rotulo_gord_trans, 0),
        rotulo_fibra: toSafeNumber(product.rotulo_fibra, 0),
        rotulo_sodio: toSafeNumber(product.rotulo_sodio, 0)
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
      setSelectedImage(product.imagem_url || null);

      loadConversao(product.id);
    }
  }, [product, user]);

  const loadConversao = async (produtoId: string) => {
    try {
      const { data } = await supabase
        .from('produto_conversoes')
        .select('*')
        .eq('produto_id', produtoId)
        .eq('user_id', user!.id)
        .eq('ativo', true)
        .maybeSingle();

      if (data) {
        setConversaoData({
          id: data.id,
          unidade_compra: data.unidade_compra,
          quantidade_por_unidade: data.quantidade_por_unidade,
          unidade_uso_receitas: data.unidade_uso_receitas,
          custo_unitario_uso: data.custo_unitario_uso,
          quantidade_unidade_uso: data.quantidade_unidade_uso
        });
      }
    } catch (error) {
      console.error('Erro ao carregar conversão:', error);
    }
  };

  const formatCurrencyFromDB = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalImage = e.target?.result as string;
        try {
          const processedImage = await resizeImageToSquare(originalImage, 512, 0.9);
          setSelectedImage(processedImage);
        } catch (error) {
          toast({
            title: "Erro ao processar imagem",
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdicionarCodigo = () => {
    handleInputChange('codigos_barras', [...(formData.codigos_barras || []), '']);
  };

  const handleRemoverCodigo = (index: number) => {
    const novosCodigos = formData.codigos_barras.filter((_: any, idx: number) => idx !== index);
    handleInputChange('codigos_barras', novosCodigos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome?.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // ✅ CONSTRUIR PAYLOAD POR DIFF (só campos que mudaram)
      const payload: any = {};
      
      // Comparar cada campo e só incluir se mudou
      if (formData.nome !== originalData.nome) {
        payload.nome = formData.nome.trim();
      }
      
      if (JSON.stringify(formData.marcas) !== JSON.stringify(originalData.marcas)) {
        payload.marcas = formData.marcas.length > 0 ? formData.marcas : null;
      }
      
      if (JSON.stringify(formData.categorias) !== JSON.stringify(originalData.categorias)) {
        payload.categorias = formData.categorias.length > 0 ? formData.categorias : null;
        payload.categoria = formData.categorias.length > 0 ? formData.categorias[0] : null;
      }
      
      if (formData.codigo_interno !== originalData.codigo_interno) {
        payload.codigo_interno = formData.codigo_interno?.trim() || null;
      }
      
      if (JSON.stringify(formData.codigos_barras) !== JSON.stringify(originalData.codigos_barras)) {
        const filtrados = formData.codigos_barras.filter((c: string) => c.trim());
        payload.codigo_barras = filtrados.length > 0 ? filtrados : null;
      }
      
      // ✅ UNIDADE: SÓ ENVIA SE MUDOU (com cast correto para o ENUM)
      if (formData.unidade !== originalData.unidade) {
        payload.unidade = formData.unidade as Database['public']['Enums']['unidade_medida'];
      }
      
      if (formData.custo_unitario !== originalData.custo_unitario) {
        payload.custo_unitario = toSafeNumber(formData.custo_unitario, 0);
        payload.custo_medio = toSafeNumber(formData.custo_unitario, 0);
      }

      if (formData.custo_total !== originalData.custo_total) {
        payload.custo_total = toSafeNumber(formData.custo_total, 0);
      }
      
      if (formData.estoque_atual !== originalData.estoque_atual) {
        payload.estoque_atual = toSafeNumber(formData.estoque_atual, 0);
      }
      
      if (formData.estoque_minimo !== originalData.estoque_minimo) {
        payload.estoque_minimo = toSafeNumber(formData.estoque_minimo, 0);
      }

      if (formData.total_embalagem !== originalData.total_embalagem) {
        payload.total_embalagem = toSafeNumber(formData.total_embalagem, 1);
      }
      
      if (selectedImage !== originalData.imagem_url) {
        payload.imagem_url = selectedImage;
      }
      
      if (formData.ativo !== originalData.ativo) {
        payload.ativo = formData.ativo;
      }

      // Rótulos nutricionais
      const rotuloFields = [
        'rotulo_porcao', 'rotulo_kcal', 'rotulo_carb', 'rotulo_prot',
        'rotulo_gord_total', 'rotulo_gord_sat', 'rotulo_gord_trans',
        'rotulo_fibra', 'rotulo_sodio'
      ];
      
      rotuloFields.forEach(field => {
        if (formData[field] !== originalData[field]) {
          payload[field] = formData[field] || null;
        }
      });

      // ✅ SÓ FAZ UPDATE SE HOUVER MUDANÇAS
      if (Object.keys(payload).length === 0) {
        toast({ title: "Nenhuma alteração detectada" });
        onClose();
        return;
      }

      const { error } = await supabase
        .from('produtos')
        .update(payload)
        .eq('id', product!.id);

      if (error) throw error;

      // Salvar conversão se houver
      if (conversaoData && user) {
        const conversaoPayload = {
          produto_id: product!.id,
          user_id: user.id,
          unidade_compra: conversaoData.unidade_compra as Database['public']['Enums']['unidade_medida'],
          quantidade_por_unidade: conversaoData.quantidade_por_unidade,
          unidade_uso_receitas: conversaoData.unidade_uso_receitas as Database['public']['Enums']['unidade_medida'],
          custo_unitario_uso: conversaoData.custo_unitario_uso,
          quantidade_unidade_uso: conversaoData.quantidade_unidade_uso,
          ativo: true
        };

        if (conversaoData.id) {
          await supabase
            .from('produto_conversoes')
            .update(conversaoPayload)
            .eq('id', conversaoData.id);
        } else {
          await supabase
            .from('produto_conversoes')
            .insert([conversaoPayload]);
        }
      }
      
      toast({ title: "Produto atualizado com sucesso!" });
      onSave();
      onClose();
    } catch (error: any) {
      const errorMessage = error.code === '42804' 
        ? "Erro de tipo de dados. Verifique os campos." 
        : error.message || "Erro ao atualizar produto";
      
      toast({
        title: "Erro ao atualizar produto",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir "${product?.nome}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', product!.id);

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
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-bold text-primary">
              Editar Produto
            </DialogTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                />
                <span className="text-sm font-medium">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção Superior - Campos Básicos e Imagem */}
          <div className="flex gap-6">
            {/* Campos Básicos */}
            <div className="flex-1 space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                  className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                />
              </div>

              {/* Marca e Categoria lado a lado */}
              <div className="flex gap-6">
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
                    onCategoriasChange={(cats) => handleInputChange('categorias', cats)}
                  />
                </div>
              </div>

              {/* Códigos */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Código Interno</Label>
                  <Input
                    value={formData.codigo_interno}
                    onChange={(e) => handleInputChange('codigo_interno', e.target.value)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                  />
                </div>
                
                {/* Códigos de Barras Múltiplos */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Códigos de Barras</Label>
                  <div className="space-y-2">
                    {formData.codigos_barras?.map((codigo: string, index: number) => (
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
                          onClick={() => handleRemoverCodigo(index)}
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
                      onClick={handleAdicionarCodigo}
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
                   onClick={() => !selectedImage && document.getElementById('image-upload-v2')?.click()}>
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
                        setSelectedImage(null);
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
                  id="image-upload-v2"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="estoque">
            <TabsList className="grid w-full grid-cols-3 bg-primary/10">
              <TabsTrigger value="estoque" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Estoque e Custos
              </TabsTrigger>
              <TabsTrigger value="modo" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Modo de Uso
              </TabsTrigger>
              <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="space-y-4 mt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Unidade</Label>
                  <Select 
                    value={formData.unidade}
                    onValueChange={(val) => handleInputChange('unidade', val)}
                  >
                    <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary text-base rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="k">Quilo (k)</SelectItem>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="cx">Caixa (cx)</SelectItem>
                      <SelectItem value="pct">Pacote (pct)</SelectItem>
                      <SelectItem value="fd">Fardo (fd)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Custo Unitário</Label>
                  <NumericInputPtBr
                    tipo="valor"
                    value={formData.custo_unitario}
                    onChange={(valor) => handleInputChange('custo_unitario', valor)}
                    min={0}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Estoque Atual</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    value={formData.estoque_atual}
                    onChange={(val) => handleInputChange('estoque_atual', val)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Estoque Mínimo</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    value={formData.estoque_minimo}
                    onChange={(val) => handleInputChange('estoque_minimo', val)}
                    className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Valor Total em Estoque</Label>
                  <Input
                    value={formatCurrencyFromDB((formData.custo_unitario || 0) * (formData.estoque_atual || 0))}
                    disabled
                    className="h-12 border-2 border-primary/30 text-base px-4 rounded-lg bg-secondary/20"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modo">
              <ModoUsoTab
                totalEmbalagem={formData.total_embalagem}
                custoTotal={formData.custo_total}
                custoUnitario={formData.custo_unitario}
                unidadeCompra={formData.unidade}
                onConversaoChange={setConversaoData}
                initialData={conversaoData}
              />
            </TabsContent>

            <TabsContent value="historico">
              <HistoricoMovimentacoes produtoId={product.id} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-8 h-12 border-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 h-12"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

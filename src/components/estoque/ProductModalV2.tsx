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
import { Trash2, Camera, X } from 'lucide-react';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';
import { ModoUsoTab } from './ModoUsoTab';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { Produto } from './CadastroProdutos';
import { resizeImageToSquare } from '@/lib/imageUtils';

interface ProductModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  product: Produto | null;
  onSave: () => void;
}

export const ProductModalV2 = ({ isOpen, onClose, product, onSave }: ProductModalV2Props) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currencyInputs, setCurrencyInputs] = useState({
    custo_unitario: '',
    custo_total: ''
  });
  const [conversaoData, setConversaoData] = useState<any>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      const initialData = {
        nome: product.nome || '',
        marcas: product.marcas || [],
        categorias: product.categorias || [],
        codigo_interno: product.codigo_interno || '',
        codigos_barras: product.codigo_barras || [],
        unidade: product.unidade,
        total_embalagem: product.total_embalagem || 1,
        custo_unitario: product.custo_unitario || 0,
        custo_total: product.custo_total || 0,
        estoque_atual: product.estoque_atual || 0,
        estoque_minimo: product.estoque_minimo || 0,
        fornecedor_ids: product.fornecedor_ids || [],
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
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
      setSelectedImage(product.imagem_url || null);
      
      setCurrencyInputs({
        custo_unitario: formatCurrencyFromDB(product.custo_unitario || 0),
        custo_total: formatCurrencyFromDB(product.custo_total || 0)
      });

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

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatCurrencyFromDB = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return parseFloat(numbers) / 100 || 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCurrencyChange = (field: string, formattedValue: string) => {
    setCurrencyInputs(prev => ({
      ...prev,
      [field]: formatCurrency(formattedValue)
    }));
    
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
      
      // ✅ UNIDADE: SÓ ENVIA SE MUDOU
      if (formData.unidade !== originalData.unidade) {
        payload.unidade = formData.unidade;
      }
      
      if (formData.custo_unitario !== originalData.custo_unitario) {
        payload.custo_unitario = Number(formData.custo_unitario);
        payload.custo_medio = Number(formData.custo_unitario);
      }
      
      if (formData.estoque_atual !== originalData.estoque_atual) {
        payload.estoque_atual = Number(formData.estoque_atual);
      }
      
      if (formData.estoque_minimo !== originalData.estoque_minimo) {
        payload.estoque_minimo = Number(formData.estoque_minimo);
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
          <div className="flex items-center justify-between">
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
          {/* Campos Básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Código Interno</Label>
              <Input
                value={formData.codigo_interno}
                onChange={(e) => handleInputChange('codigo_interno', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <MarcasSelector
                selectedMarcas={formData.marcas}
                onMarcasChange={(marcas) => handleInputChange('marcas', marcas)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <CategoriasSelector
                selectedCategorias={formData.categorias}
                onCategoriasChange={(cats) => handleInputChange('categorias', cats)}
              />
            </div>
          </div>

          {/* Imagem */}
          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-4 items-center">
              <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center relative cursor-pointer"
                   onClick={() => document.getElementById('image-upload-v2')?.click()}>
                {selectedImage ? (
                  <div className="relative w-full h-full">
                    <img src={selectedImage} alt="Produto" className="w-full h-full object-contain p-2" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <input
                id="image-upload-v2"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="estoque">
            <TabsList>
              <TabsTrigger value="estoque">Estoque e Custos</TabsTrigger>
              <TabsTrigger value="modo">Modo de Uso</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select 
                    value={formData.unidade}
                    onValueChange={(val) => handleInputChange('unidade', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="cx">Caixa (cx)</SelectItem>
                      <SelectItem value="pct">Pacote (pct)</SelectItem>
                      <SelectItem value="fardo">Fardo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Custo Unitário</Label>
                  <Input
                    value={currencyInputs.custo_unitario}
                    onChange={(e) => handleCurrencyChange('custo_unitario', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estoque Atual</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    value={formData.estoque_atual}
                    onChange={(val) => handleInputChange('estoque_atual', val)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    value={formData.estoque_minimo}
                    onChange={(val) => handleInputChange('estoque_minimo', val)}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

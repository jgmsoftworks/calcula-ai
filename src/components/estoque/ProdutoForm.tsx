import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { CodigosBarrasInput } from './CodigosBarrasInput';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';
import { useEstoque, Produto } from '@/hooks/useEstoque';
import { formatters } from '@/lib/formatters';
import { UNIDADES_VALIDAS, UNIDADES_LABELS } from '@/lib/constants';

interface ProdutoFormProps {
  produto?: Produto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProdutoForm({ produto, open, onOpenChange, onSuccess }: ProdutoFormProps) {
  const { gerarCodigoInterno, createProduto, updateProduto, uploadImagemProduto } = useEstoque();
  const [saving, setSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Ensure all values are valid before setting as defaults
  const defaultValues = produto ? {
    ...produto,
    unidade_compra: (produto.unidade_compra && produto.unidade_compra.trim() !== '') 
      ? produto.unidade_compra 
      : 'un',
    unidade_uso: (produto.unidade_uso && produto.unidade_uso.trim() !== '') 
      ? produto.unidade_uso 
      : null,
  } : {
    codigo_interno: 0,
    codigos_barras: [],
    marcas: [],
    categorias: [],
    unidade_compra: 'un',
    custo_unitario: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    unidade_uso: null,
    fator_conversao: null,
  };
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<Partial<Produto>>({
    defaultValues,
  });

  const codigosBarras = watch('codigos_barras') || [];
  const marcas = watch('marcas') || [];
  const categorias = watch('categorias') || [];
  const custo_unitario = watch('custo_unitario') || 0;
  const estoque_atual = watch('estoque_atual') || 0;
  const fator_conversao = watch('fator_conversao');

  const valorTotalEstoque = custo_unitario * estoque_atual;
  const custoUnidadeUso = fator_conversao && fator_conversao > 0
    ? custo_unitario / fator_conversao
    : 0;

  // Reset form when produto changes or modal opens
  useEffect(() => {
    console.log('🔵 [MODAL] Modal state changed - Open:', open, 'Produto:', produto?.nome || 'NOVO');
    
    if (open) {
      if (produto) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 [EDITAR] Carregando dados do produto');
        console.log('🏷️ [NOME]:', produto.nome);
        console.log('🔢 [CODIGO INTERNO]:', produto.codigo_interno);
        console.log('📸 [IMAGEM URL]:', produto.imagem_url || 'SEM IMAGEM');
        console.log('🏭 [MARCAS]:', produto.marcas);
        console.log('📂 [CATEGORIAS]:', produto.categorias);
        console.log('📦 [UNIDADE COMPRA]:', produto.unidade_compra);
        console.log('💰 [CUSTO UNITARIO]:', produto.custo_unitario);
        console.log('📊 [ESTOQUE ATUAL]:', produto.estoque_atual);
        console.log('⚠️ [ESTOQUE MINIMO]:', produto.estoque_minimo);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const formData = {
          ...produto,
          unidade_compra: (produto.unidade_compra && produto.unidade_compra.trim() !== '') 
            ? produto.unidade_compra 
            : 'un',
          unidade_uso: (produto.unidade_uso && produto.unidade_uso.trim() !== '') 
            ? produto.unidade_uso 
            : null,
        };
        
        console.log('✅ [RESET] Executando reset com formData:', formData);
        reset(formData);
        
        // Carregar preview da imagem existente
        setImagePreview(produto.imagem_url || null);
        setSelectedImageFile(null);
        
        // Verificar se dados foram setados corretamente
        setTimeout(() => {
          console.log('🎯 [VERIFICAÇÃO] Após reset - imagem_url:', watch('imagem_url'));
          console.log('🎯 [VERIFICAÇÃO] Após reset - nome:', watch('nome'));
          console.log('🎯 [VERIFICAÇÃO] Após reset - codigo_interno:', watch('codigo_interno'));
        }, 100);
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('➕ [NOVO] Criando novo produto');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        reset(defaultValues);
        setImagePreview(null);
        setSelectedImageFile(null);
        loadCodigoInterno();
      }
    }
  }, [open, produto, reset, watch]);

  const loadCodigoInterno = async () => {
    const codigo = await gerarCodigoInterno();
    setValue('codigo_interno', codigo);
  };

  const onSubmit = async (data: Partial<Produto>) => {
    if (!data.nome || data.nome.length < 2) {
      return;
    }

    // Validação crítica: unidade_compra nunca pode ser vazio
    if (!data.unidade_compra || data.unidade_compra.trim() === '') {
      toast.error('Unidade de compra é obrigatória');
      return;
    }

    setSaving(true);

    try {
      // Primeiro criar/atualizar o produto (sem imagem)
      const produtoData = { ...data };
      delete produtoData.imagem_url; // Remover imagem_url temporariamente

      const result = produto
        ? await updateProduto(produto.id, produtoData)
        : await createProduto(produtoData);

      if (!result) {
        setSaving(false);
        return;
      }

      // Se há arquivo de imagem selecionado, fazer upload
      if (selectedImageFile) {
        console.log('📸 [SUBMIT] Fazendo upload da imagem...');
        const imageUrl = await uploadImagemProduto(selectedImageFile, result.id);
        
        if (imageUrl) {
          // Atualizar produto com URL da imagem
          await updateProduto(result.id, { imagem_url: imageUrl });
          console.log('✅ [SUBMIT] Imagem salva com sucesso!');
        }
      }

      setSaving(false);
      reset();
      setImagePreview(null);
      setSelectedImageFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('❌ [SUBMIT] Erro ao salvar produto:', error);
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      key={produto?.id || 'new-product'}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {produto ? 'Editar Produto' : 'Criar Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="estoque" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="estoque">Estoque & Custos</TabsTrigger>
              <TabsTrigger value="modo-uso">Modo de Uso</TabsTrigger>
              <TabsTrigger value="historico" disabled={!produto}>
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Campo de Foto - Quadrado Clicável */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Foto do Produto</Label>
                  <div 
                    className="relative w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group bg-muted/30"
                    onClick={() => document.getElementById('imagem-input')?.click()}
                  >
                    <input
                      id="imagem-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('📸 Arquivo:', file.name, (file.size / 1024).toFixed(2), 'KB');
                          setSelectedImageFile(file);
                          
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    
                    {imagePreview ? (
                      <>
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagePreview(null);
                            setSelectedImageFile(null);
                            setValue('imagem_url', null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Camera className="h-10 w-10 mb-2" />
                        <span className="text-xs font-medium">Adicionar foto</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique para selecionar
                  </p>
                </div>

                {/* Campos do formulário */}
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Produto *</Label>
                      <Input
                        {...register('nome', { required: true, minLength: 2 })}
                        placeholder="Ex: Farinha de Trigo"
                      />
                    </div>

                    <div>
                      <Label>Código Interno *</Label>
                      <Input
                        type="number"
                        {...register('codigo_interno', { required: true, valueAsNumber: true })}
                        placeholder="Ex: 1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Marcas</Label>
                      <MarcasSelector
                        value={marcas}
                        onChange={(v) => setValue('marcas', v)}
                      />
                    </div>

                    <div>
                      <Label>Categorias</Label>
                      <CategoriasSelector
                        value={categorias}
                        onChange={(v) => setValue('categorias', v)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Códigos de Barras</Label>
                    <CodigosBarrasInput
                      value={codigosBarras}
                      onChange={(v) => setValue('codigos_barras', v)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Unidade de Compra *</Label>
                      <Select
                        value={(watch('unidade_compra') || 'un').toString()}
                        onValueChange={(v) => setValue('unidade_compra', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_VALIDAS.map((unidade) => (
                            <SelectItem key={unidade} value={unidade}>
                              {UNIDADES_LABELS[unidade]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Custo Unitário *</Label>
                      <NumericInputPtBr
                        tipo="valor"
                        value={custo_unitario}
                        onChange={(v) => setValue('custo_unitario', v)}
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <Label>Valor Total em Estoque</Label>
                      <Input
                        value={formatters.valor(valorTotalEstoque)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Estoque Atual *</Label>
                      <NumericInputPtBr
                        tipo="quantidade_continua"
                        value={estoque_atual}
                        onChange={(v) => setValue('estoque_atual', v)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label>Estoque Mínimo</Label>
                      <NumericInputPtBr
                        tipo="quantidade_continua"
                        value={watch('estoque_minimo') || 0}
                        onChange={(v) => setValue('estoque_minimo', v)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modo-uso" className="space-y-4 mt-4">
              <Card className="p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Configure como este produto será usado nas receitas. Por exemplo:
                  1 caixa (compra) = 24 unidades (uso).
                </p>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unidade de Uso</Label>
                  <Select
                    value={watch('unidade_uso') || 'none'}
                    onValueChange={(v) => setValue('unidade_uso', v === 'none' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {UNIDADES_VALIDAS.map((unidade) => (
                        <SelectItem key={unidade} value={unidade}>
                          {UNIDADES_LABELS[unidade]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fator de Conversão</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    value={fator_conversao || 0}
                    onChange={(v) => setValue('fator_conversao', v || null)}
                    placeholder="Ex: 24"
                  />
                </div>

                <div>
                  <Label>Custo por Unidade de Uso</Label>
                  <Input
                    value={formatters.valor(custoUnidadeUso)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <Card className="p-8 text-center text-muted-foreground">
                <p>Histórico de movimentações será exibido aqui</p>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

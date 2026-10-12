import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Camera, X, Sparkles } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { CodigosBarrasInput } from './CodigosBarrasInput';
import { MarcasSelector } from './MarcasSelector';
import { CategoriasSelector } from './CategoriasSelector';
import { HistoricoProduto } from './HistoricoProduto';
import { SugestaoFotosModal } from './SugestaoFotosModal';
import { ConsumoMedioCard } from './ConsumoMedioCard';
import { useEstoque, Produto } from '@/hooks/useEstoque';
import { formatters } from '@/lib/formatters';
import { UNIDADES_VALIDAS, UNIDADES_LABELS } from '@/lib/constants';
import { RotuloNutricionalTab } from './RotuloNutricionalTab';
import { missingNutritionFields, nutritionLabelSchema, readNutritionLabel, type NutritionLabel } from '@/lib/nutritionLabel';
import { removeNutritionPhoto, uploadNutritionPhoto } from '@/lib/nutritionStorage';
import type { Json } from '@/integrations/supabase/types';

interface ProdutoFormProps {
  produto?: Produto;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ProdutoForm({ produto, onCancel, onSuccess }: ProdutoFormProps) {
  const { gerarCodigoInterno, createProduto, updateProduto, uploadImagemProduto } = useEstoque();
  const [saving, setSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(produto?.imagem_url || null);
  const [sugestaoOpen, setSugestaoOpen] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLabel | null>(() => readNutritionLabel(produto?.rotulo_nutricional));
  const [nutritionPhoto, setNutritionPhoto] = useState<File | null>(null);
  const [nutritionBusy, setNutritionBusy] = useState(false);
  const [tab, setTab] = useState('estoque');
  
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
  
  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<Partial<Omit<Produto, 'rotulo_nutricional'>>>({
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

  // The route remounts this form for each product. Never reset an in-progress
  // edit on a refetch; only allocate the internal code for a new product.
  useEffect(() => {
    if (produto) return;
    let active = true;
    void gerarCodigoInterno().then(codigo => {
      if (active) setValue('codigo_interno', codigo);
    });
    return () => { active = false; };
  }, [produto, gerarCodigoInterno, setValue]);

  const onSubmit = async (data: Partial<Produto>) => {
    if (nutritionBusy || saving) return;
    if (!data.nome || data.nome.trim().length < 2) {
      setTab('estoque');
      setError('nome', { message: 'Informe um nome com pelo menos 2 caracteres.' });
      toast.error('Informe o nome do produto com pelo menos 2 caracteres.');
      return;
    }

    // Validação crítica: unidade_compra nunca pode ser vazio
    if (!data.unidade_compra || data.unidade_compra.trim() === '') {
      toast.error('Unidade de compra é obrigatória');
      return;
    }

    setSaving(true);
    let uploadedNutritionPath: string | null = null;
    let productSaved = false;

    try {
      // Primeiro criar/atualizar o produto (sem imagem)
      const produtoData = { ...data };
      delete produtoData.imagem_url; // Remover imagem_url temporariamente
      if (nutrition) {
        const parsed = nutritionLabelSchema.safeParse(nutrition);
        if (!parsed.success) throw new Error('Confira os campos do rótulo nutricional antes de salvar.');
        if (nutritionPhoto) uploadedNutritionPath = await uploadNutritionPhoto(nutritionPhoto);
        produtoData.rotulo_nutricional = {
          ...parsed.data,
          foto_path: uploadedNutritionPath ?? parsed.data.foto_path,
          conferido: parsed.data.conferido && missingNutritionFields(parsed.data).length === 0,
        } as Json;
      } else {
        produtoData.rotulo_nutricional = null;
      }

      const result = produto
        ? await updateProduto(produto.id, produtoData)
        : await createProduto(produtoData);

      if (!result) {
        if (uploadedNutritionPath) await removeNutritionPhoto(uploadedNutritionPath);
        setSaving(false);
        return;
      }
      productSaved = true;
      const previousNutritionPath = readNutritionLabel(produto?.rotulo_nutricional)?.foto_path;
      if (previousNutritionPath && (uploadedNutritionPath || !nutrition)) void removeNutritionPhoto(previousNutritionPath);

      // Se há arquivo de imagem selecionado, fazer upload
      if (selectedImageFile) {
        const imageUrl = await uploadImagemProduto(selectedImageFile, result.id);
        
        if (imageUrl) {
          // Atualizar produto com URL da imagem
          await updateProduto(result.id, { imagem_url: imageUrl });
        }
      }

      setSaving(false);
      onSuccess();
    } catch (error) {
      if (uploadedNutritionPath && !productSaved) await removeNutritionPhoto(uploadedNutritionPath);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o produto. Tente novamente.');
      console.error('❌ [SUBMIT] Erro ao salvar produto:', error);
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Button type="button" variant="ghost" className="min-h-11 -ml-3 gap-2" disabled={saving} onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para produtos
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{produto ? 'Editar Produto' : 'Criar Produto'}</h1>
          <p className="text-sm text-muted-foreground">{produto ? produto.nome : 'Cadastre os dados, os custos e o modo de uso do produto.'}</p>
        </div>
      </div>

      <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={handleSubmit(onSubmit, () => {
        setTab('estoque');
        toast.error('Confira o nome e o código interno do produto.');
      })}>
        <fieldset disabled={saving} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-24 pr-1">
          <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
            <TabsList aria-label="Dados do produto" className="sticky top-0 z-10 bg-muted grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="estoque" className="min-h-12 text-xs sm:text-sm px-1 sm:px-3 py-2 whitespace-normal leading-tight">Estoque & Custos</TabsTrigger>
              <TabsTrigger value="nutricional" className="min-h-12 text-xs sm:text-sm px-1 sm:px-3 py-2 whitespace-normal leading-tight">Rótulo nutricional</TabsTrigger>
              <TabsTrigger value="historico" disabled={!produto} className="min-h-12 text-xs sm:text-sm px-1 sm:px-3 py-2 whitespace-normal leading-tight">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 gap-6 rounded-xl border bg-card p-4 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)]">
                {/* Campo de Foto - Quadrado Clicável */}
                <div className="order-2 flex min-w-0 flex-col gap-2 max-lg:mx-auto max-lg:w-full max-lg:max-w-[180px] lg:order-none">
                  <Label className="text-sm font-medium">Foto do Produto</Label>
                  <div 
                    className="relative w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group bg-muted/30"
                    onClick={() => document.getElementById('imagem-input')?.click()}
                  >
                    <input
                      id="imagem-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
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
                          aria-label="Remover foto do produto"
                          className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 hover:bg-background shadow-lg"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!watch('nome') && (!codigosBarras || codigosBarras.length === 0)}
                    onClick={() => setSugestaoOpen(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Sugerir fotos
                  </Button>
                  <SugestaoFotosModal
                    open={sugestaoOpen}
                    onOpenChange={setSugestaoOpen}
                    productName={watch('nome') || undefined}
                    barcode={codigosBarras?.[0]}
                    onSelect={(file, previewUrl) => {
                      setSelectedImageFile(file);
                      setImagePreview(previewUrl);
                    }}
                  />
                  {produto?.id && (
                    <ConsumoMedioCard
                      produtoId={produto.id}
                      unidade={watch('unidade_compra') || 'un'}
                    />
                  )}
                </div>

                {/* Campos do formulário */}
                <div className="space-y-4">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="produto-nome">Nome do Produto *</Label>
                      <Input
                        id="produto-nome"
                        aria-invalid={Boolean(errors.nome)}
                        {...register('nome', { required: true, minLength: 2 })}
                        placeholder="Ex: Farinha de Trigo"
                      />
                      {errors.nome && <p role="alert" className="mt-1 text-xs text-destructive">Informe um nome com pelo menos 2 caracteres.</p>}
                    </div>

                    <div>
                      <Label htmlFor="produto-codigo">Código Interno *</Label>
                      <Input
                        id="produto-codigo"
                        aria-invalid={Boolean(errors.codigo_interno)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="produto-unidade-compra">Unidade de Compra *</Label>
                      <Select
                        value={(watch('unidade_compra') || 'un').toString()}
                        onValueChange={(v) => setValue('unidade_compra', v)}
                      >
                        <SelectTrigger id="produto-unidade-compra">
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
                      <Label htmlFor="produto-custo">Custo Unitário *</Label>
                      <NumericInputPtBr id="produto-custo"
                        tipo="valor"
                        value={custo_unitario}
                        onChange={(v) => setValue('custo_unitario', v)}
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="produto-total">Valor Total em Estoque</Label>
                      <Input id="produto-total"
                        value={formatters.valor(valorTotalEstoque)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="produto-estoque">Estoque Atual *</Label>
                      <NumericInputPtBr id="produto-estoque"
                        tipo="quantidade_continua"
                        value={estoque_atual}
                        onChange={(v) => setValue('estoque_atual', v)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="produto-minimo">Estoque Mínimo</Label>
                      <NumericInputPtBr id="produto-minimo"
                        tipo="quantidade_continua"
                        value={watch('estoque_minimo') || 0}
                        onChange={(v) => setValue('estoque_minimo', v)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <section aria-labelledby="modo-uso-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
                <div>
                  <h2 id="modo-uso-heading" className="font-semibold">Modo de Uso</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                  Configure como este produto será usado nas receitas. Por exemplo:
                  1 caixa (compra) = 24 unidades (uso).
                  </p>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="produto-unidade-uso">Unidade de Uso</Label>
                  <Select
                    value={watch('unidade_uso') || 'none'}
                    onValueChange={(v) => setValue('unidade_uso', v === 'none' ? null : v)}
                  >
                    <SelectTrigger id="produto-unidade-uso">
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
                  <Label htmlFor="produto-fator">Fator de Conversão</Label>
                  <NumericInputPtBr id="produto-fator"
                    tipo="quantidade_continua"
                    value={fator_conversao || 0}
                    onChange={(v) => setValue('fator_conversao', v || null)}
                    placeholder="Ex: 24"
                  />
                </div>

                <div>
                  <Label htmlFor="produto-custo-uso">Custo por Unidade de Uso</Label>
                  <Input id="produto-custo-uso"
                    value={formatters.valor(custoUnidadeUso)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              </section>
            </TabsContent>

            <TabsContent value="nutricional" className="mt-6 rounded-xl border bg-card p-4 sm:p-6">
              <RotuloNutricionalTab value={nutrition} onChange={setNutrition} photo={nutritionPhoto} onPhotoChange={setNutritionPhoto}
                onBusyChange={setNutritionBusy} marcaSugerida={marcas.length === 1 ? marcas[0] : ''} disabled={saving} />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              {produto ? (
                <HistoricoProduto produtoId={produto.id} />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  <p>Salve o produto para visualizar o histórico.</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>

        </fieldset>
          <div role="region" aria-label="Ações do produto" className="flex shrink-0 items-center justify-end gap-3 border-t bg-background pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="mr-auto hidden text-sm text-muted-foreground md:block">{nutritionBusy ? 'Lendo foto do rótulo…' : 'Salve para aplicar as alterações.'}</p>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="min-h-11 flex-1 sm:flex-none sm:min-w-28"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11 flex-1 sm:flex-none sm:min-w-36" disabled={saving || nutritionBusy}>
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </Button>
          </div>
        </form>
    </div>
  );
}

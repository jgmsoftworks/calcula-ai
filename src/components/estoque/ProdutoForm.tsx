// Fixed: All SelectItem values are non-empty - verified 2025-01-05
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Settings2 } from 'lucide-react';
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

interface ProdutoFormProps {
  produto?: Produto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProdutoForm({ produto, open, onOpenChange, onSuccess }: ProdutoFormProps) {
  const { gerarCodigoInterno, createProduto, updateProduto } = useEstoque();
  const [saving, setSaving] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<Partial<Produto>>({
    defaultValues: produto || {
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
    },
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

  useEffect(() => {
    if (open && !produto) {
      loadCodigoInterno();
    }
  }, [open]);

  const loadCodigoInterno = async () => {
    const codigo = await gerarCodigoInterno();
    setValue('codigo_interno', codigo);
  };

  const onSubmit = async (data: Partial<Produto>) => {
    if (!data.nome || data.nome.length < 2) {
      return;
    }

    setSaving(true);

    const result = produto
      ? await updateProduto(produto.id, data)
      : await createProduto(data);

    setSaving(false);

    if (result) {
      reset();
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

            <TabsContent value="estoque" className="space-y-4 mt-4">
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Marcas</Label>
                  <MarcasSelector
                    value={marcas}
                    onChange={(v) => setValue('marcas', v)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
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
                    value={watch('unidade_compra') || 'un'}
                    onValueChange={(v) => setValue('unidade_compra', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">UN</SelectItem>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="g">G</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="ml">ML</SelectItem>
                      <SelectItem value="cx">CX</SelectItem>
                      <SelectItem value="pc">PC</SelectItem>
                      <SelectItem value="fd">FD</SelectItem>
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
                      <SelectItem value="un">UN</SelectItem>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="g">G</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="ml">ML</SelectItem>
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

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from '@/lib/motivosMovimentacao';
import { formatters } from '@/lib/formatters';
import { productUnit } from '@/lib/productUnits';
import type { Produto } from '@/hooks/useEstoque';
import { ArrowDownLeft, ArrowUpRight, Package, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MovimentacaoModalProps {
  produto: Produto | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => boolean | void;
  saidasPendentes?: number;
}

export function MovimentacaoModal({ produto, open, onClose, onAddToCart, saidasPendentes = 0 }: MovimentacaoModalProps) {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [motivo, setMotivo] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [custoAplicado, setCustoAplicado] = useState(produto?.custo_unitario || 0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (open && produto) {
      setCustoAplicado(produto.custo_unitario || 0);
      setQuantidade(1);
      setTipo('entrada');
      setMotivo('');
      setImageError(false);
    }
  }, [produto, open]);

  if (!produto) return null;

  const compra = productUnit(produto.unidade_compra);
  const uso = productUnit(produto.unidade_uso);
  const fator = Number(produto.fator_conversao);
  const temConversao = !!produto.unidade_uso && Number.isFinite(fator) && fator > 0;
  const estoque = Number(produto.estoque_atual) || 0;
  const disponivel = Math.max(0, estoque - saidasPendentes);
  const motivosDisponiveis = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;
  const estoqueInsuficiente = tipo === 'saida' && quantidade > disponivel + 0.000000001;
  const subtotal = quantidade * custoAplicado;
  const valido = !!produto.id && !!motivo && Number.isFinite(quantidade) && quantidade > 0 &&
    Number.isFinite(custoAplicado) && custoAplicado >= 0 && Number.isFinite(subtotal) && !estoqueInsuficiente;
  const quantidadeFormatada = formatters.quantidadeContinua(quantidade);

  const mudarTipo = (value: 'entrada' | 'saida') => {
    setTipo(value);
    setMotivo('');
    if (value === 'saida') setCustoAplicado(produto.custo_unitario || 0);
  };
  const handleAdicionar = () => {
    if (!valido) return;
    const added = onAddToCart({
      produto_id: produto.id, produto_nome: produto.nome, imagem_url: produto.imagem_url,
      unidade_compra: produto.unidade_compra, tipo, motivo, quantidade,
      custo_aplicado: custoAplicado, subtotal,
    });
    if (added !== false) onClose();
  };

  return <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose(); }}>
    <DialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[740px] sm:p-0">
      <div className="border-b px-5 py-4 pr-14 sm:px-6">
        <DialogTitle className="text-lg font-semibold">Movimentar estoque</DialogTitle>
        <DialogDescription className="sr-only">Confira o produto e informe a entrada ou saída na unidade de compra.</DialogDescription>
      </div>

      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <section aria-label="Informações do produto" className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-start gap-4 p-4 sm:gap-5 sm:p-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 sm:h-32 sm:w-32">
              {produto.imagem_url && !imageError
                ? <img src={produto.imagem_url} alt={produto.nome} onError={() => setImageError(true)} className="h-full w-full object-cover" />
                : <Package aria-hidden="true" className="h-10 w-10 text-primary/60" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Produto #{produto.codigo_interno}</p>
              <h3 className="break-words text-lg font-semibold leading-snug sm:text-xl">{produto.nome}</h3>
              {!!produto.marcas?.length && <p className="mt-1 break-words text-sm text-muted-foreground">{produto.marcas.join(' · ')}</p>}
              {!!produto.categorias?.length && <div className="mt-3 flex flex-wrap gap-1.5">
                {produto.categorias.map(categoria => <span key={categoria} className="rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent dark:text-foreground">{categoria}</span>)}
              </div>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t px-4 py-4 sm:grid-cols-4 sm:px-5">
            <div><dt className="text-xs text-muted-foreground">Unidade de compra</dt><dd className="mt-1 text-sm font-semibold">{compra.label}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Unidade de uso</dt><dd className="mt-1 text-sm font-semibold">{produto.unidade_uso ? uso.label : 'Não configurada'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Estoque atual</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{formatters.quantidadeContinua(estoque)} {compra.symbol}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Custo cadastrado</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{formatters.valor(produto.custo_unitario || 0)}{compra.symbol && <span className="font-normal text-muted-foreground"> / {compra.symbol}</span>}</dd></div>
          </dl>
          <div className="border-t bg-accent/5 px-4 py-3 text-sm sm:px-5">
            <span className="font-medium">Modo de uso: </span>
            {temConversao
              ? <>1 {compra.symbol} de compra = {formatters.quantidadeContinua(fator)} {uso.symbol} para uso nas receitas.</>
              : produto.unidade_uso ? 'Conversão não configurada no cadastro.' : 'Unidade de uso não configurada no cadastro.'}
          </div>
        </section>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Tipo de movimentação</legend>
          <RadioGroup value={tipo} onValueChange={mudarTipo} className="grid grid-cols-2 gap-3">
            {(['entrada', 'saida'] as const).map(value => {
              const selected = tipo === value;
              const Icon = value === 'entrada' ? ArrowDownLeft : ArrowUpRight;
              return <Label key={value} htmlFor={`mov-${value}`} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors sm:p-4', selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30')}>
                <RadioGroupItem value={value} id={`mov-${value}`} />
                <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', value === 'entrada' ? 'text-primary' : 'text-accent')} />
                <span><span className="block font-semibold">{value === 'entrada' ? 'Entrada' : 'Saída'}</span><span className="mt-1 hidden text-xs font-normal text-muted-foreground sm:block">{value === 'entrada' ? 'Adicionar ao estoque' : 'Retirar do estoque'}</span></span>
              </Label>;
            })}
          </RadioGroup>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="mov-motivo">Motivo</Label>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger id="mov-motivo"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
            <SelectContent>{motivosDisponiveis.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mov-quantidade">Quantidade{compra.symbol && ` (${compra.symbol})`}</Label>
            <NumericInputPtBr id="mov-quantidade" tipo="quantidade_continua" value={quantidade} onChange={setQuantidade} min={0.001}
              aria-invalid={estoqueInsuficiente} aria-describedby={estoqueInsuficiente ? 'mov-estoque-error' : 'mov-quantidade-hint'} />
            <p id="mov-quantidade-hint" className="text-xs text-muted-foreground">
              {temConversao ? `Equivale a ${formatters.quantidadeContinua(quantidade * fator)} ${uso.symbol} para uso.` : `Movimentação na unidade de compra${compra.symbol ? ` (${compra.symbol})` : ''}.`}
            </p>
            {saidasPendentes > 0 && <p className="text-xs text-muted-foreground">Já no carrinho: {formatters.quantidadeContinua(saidasPendentes)} {compra.symbol} em saídas.</p>}
            {estoqueInsuficiente && <p id="mov-estoque-error" role="alert" className="text-sm text-destructive">Estoque insuficiente. Disponível: {formatters.quantidadeContinua(disponivel)} {compra.symbol}.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-custo">Custo{compra.symbol ? ` por ${compra.symbol}` : ' unitário'}</Label>
            <NumericInputPtBr id="mov-custo" tipo="valor" value={custoAplicado} onChange={setCustoAplicado} min={0} readOnly={tipo === 'saida'} className={tipo === 'saida' ? 'bg-muted/40' : ''} />
            <p className="text-xs text-muted-foreground">{tipo === 'entrada' ? 'Informe o custo da unidade de compra.' : 'A saída utiliza o custo cadastrado do produto.'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div><p className="text-sm font-medium">Valor da movimentação</p><p className="mt-1 text-xs text-muted-foreground">{quantidadeFormatada} {compra.symbol} × {formatters.valor(custoAplicado)}</p></div>
          <p aria-label="Subtotal" aria-live="polite" className="break-all text-2xl font-semibold tabular-nums text-primary">{formatters.valor(subtotal)}</p>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 border-t bg-card px-5 py-4 sm:justify-end sm:px-6">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="button" onClick={handleAdicionar} disabled={!valido} className="min-w-0 flex-1 sm:flex-none"><ShoppingCart className="h-4 w-4" /><span className="sm:hidden">Adicionar</span><span className="hidden sm:inline">Adicionar ao carrinho</span></Button>
      </div>
    </DialogContent>
  </Dialog>;
}

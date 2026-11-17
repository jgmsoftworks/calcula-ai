import type { ProdutoMovimentacao } from '@/types/movimentacao';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { compactProductUnit } from '@/lib/productUnits';
import { formatters } from '@/lib/formatters';
import { Package, Tag } from 'lucide-react';

interface ProdutoCardProps {
  produto: ProdutoMovimentacao;
  onSelect: (produto: ProdutoMovimentacao) => void;
}

export function ProdutoCard({ produto, onSelect }: ProdutoCardProps) {
  usePortugalTranslation();
  const unit = compactProductUnit(produto.unidade_compra);
  const fridge = produto.origem_estoque === 'geladeira';
  const category = fridge ? produto.tipo_produto_nome?.trim() || 'Sem tipo' : produto.categorias?.join(' · ') || 'Sem categoria';
  return <button type="button" onClick={() => onSelect(produto)} aria-label={`Movimentar ${produto.nome}`}
    className="group flex h-full w-full gap-4 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99] sm:flex-col sm:gap-0">
    <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-primary/5 sm:aspect-[4/3] sm:h-auto sm:w-full">
      {produto.imagem_url ? <img loading="lazy" decoding="async" src={produto.imagem_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-primary/35"><Package className="h-9 w-9" /><span className="text-[10px] font-medium">Sem foto</span></div>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col sm:px-1 sm:pt-3">
      <h4 className="break-words text-sm font-semibold leading-relaxed text-foreground sm:min-h-[2.5rem]">{produto.nome}</h4>
      <div className="mb-3 mt-2 flex items-start">
        <span className="inline-flex max-w-full items-start gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.07] px-2 py-1.5 text-[11px] font-semibold leading-snug text-primary">
          <Tag className="mt-px h-3 w-3 shrink-0" />
          <span className="break-words"><span className="font-normal opacity-75">{fridge ? 'Tipo' : 'Categoria'}: </span>{category}</span>
        </span>
      </div>
      <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t border-border/70 pt-3">
        <div><p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Custo / {unit}</p><p className={`font-bold tabular-nums text-primary ${produto.custo_indisponivel ? 'text-xs' : 'text-lg'}`}>{produto.custo_indisponivel ? 'Indisponível' : formatters.valor(produto.custo_unitario)}</p></div>
        <div className="text-right"><p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Em estoque</p><p className="rounded-md bg-muted/60 px-2 py-1 text-xs font-semibold tabular-nums">{formatters.quantidadeContinua(produto.estoque_atual)} <span className="font-normal text-muted-foreground">{unit}</span></p></div>
      </div>
    </div>
  </button>;
}

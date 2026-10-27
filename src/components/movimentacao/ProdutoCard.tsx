import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { productUnit } from '@/lib/productUnits';
import { formatters } from '@/lib/formatters';

interface ProdutoCardProps {
  produto: any;
  onSelect: (produto: any) => void;
}

export function ProdutoCard({ produto, onSelect }: ProdutoCardProps) {
  usePortugalTranslation();
  return (
    <Card 
      className="flex min-h-20 cursor-pointer items-center gap-3 p-3 transition-all active:scale-[0.99] sm:block sm:min-h-0 sm:hover:scale-[1.02] sm:hover:shadow-lg"
      onClick={() => onSelect(produto)}
    >
      {produto.imagem_url ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:mb-2 sm:h-auto sm:w-full sm:aspect-square">
          <img loading="lazy" decoding="async"
            src={produto.imagem_url}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:mb-2 sm:h-auto sm:w-full sm:aspect-square">
          <span className="text-2xl text-muted-foreground sm:text-4xl">
            {produto.nome.substring(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="line-clamp-2 text-sm font-semibold sm:min-h-[2.5rem]">
          {produto.nome}
        </h4>
        <p className="text-primary font-bold text-base">
          {formatters.valor(produto.custo_unitario)} <span className="text-xs font-normal text-muted-foreground">/ {productUnit(produto.unidade_compra).symbol}</span>
        </p>
        <p className="text-xs text-muted-foreground">{localizeText("Estoque:")} {formatters.quantidadeContinua(produto.estoque_atual)} {productUnit(produto.unidade_compra).symbol}</p>
      </div>
    </Card>
  );
}

import type { ItemCarrinhoVisual } from '@/types/movimentacao';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { compactProductUnit } from '@/lib/productUnits';
import { formatters } from '@/lib/formatters';

interface ItemCarrinhoProps {
  item: ItemCarrinhoVisual;
  onRemove: () => void;
}

export function ItemCarrinho({ item, onRemove }: ItemCarrinhoProps) {
  return (
    <Card className="rounded-xl border-border/60 shadow-none">
      <CardContent className="p-3">
        <div className="flex gap-3">
          {item.imagem_url && (
            <img
              src={item.imagem_url}
              alt={item.produto_nome}
              className="h-16 w-16 rounded object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm line-clamp-2">
                {item.produto_nome}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remover ${item.produto_nome}`}
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.origem_estoque === 'geladeira' && <Badge variant="secondary">Geladeira</Badge>}
              {item.tipo === 'entrada' ? (
                <Badge variant="outline" className="text-primary border-primary/30">
                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                  Entrada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-accent border-accent/30 dark:text-foreground">
                  <ArrowDownCircle className="h-3 w-3 mr-1" />
                  Saída
                </Badge>
              )}
            </div>

            {item.motivo && (
              <p className="text-xs text-muted-foreground italic">
                {item.motivo}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
              <div>Quantidade<p className="mt-1 font-medium text-foreground">{formatters.quantidadeContinua(item.quantidade)} {compactProductUnit(item.unidade_compra)}</p></div>
              <div className="text-right">Custo unitário<p className="mt-1 font-medium text-foreground">{formatters.valor(item.custo_aplicado)}{item.unidade_compra ? ` / ${compactProductUnit(item.unidade_compra)}` : ''}</p></div>
            </div>

            <div className="text-sm font-bold text-primary">
              {formatters.valor(item.subtotal)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

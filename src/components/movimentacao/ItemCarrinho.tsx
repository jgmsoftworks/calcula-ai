import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatters } from '@/lib/formatters';

interface ItemCarrinhoProps {
  item: any;
  onRemove: () => void;
}

export function ItemCarrinho({ item, onRemove }: ItemCarrinhoProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-3">
          {item.imagem_url && (
            <img
              src={item.imagem_url}
              alt={item.produto_nome}
              className="h-16 w-16 rounded object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm line-clamp-2">
                {item.produto_nome}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {item.tipo === 'entrada' ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                  Entrada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
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

            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Qtd: {formatters.quantidadeContinua(item.quantidade)}</div>
              <div>Unit: {formatters.valor(item.custo_aplicado)}</div>
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

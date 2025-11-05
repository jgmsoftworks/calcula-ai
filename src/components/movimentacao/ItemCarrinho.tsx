import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { formatters } from '@/lib/formatters';

interface ItemCarrinhoProps {
  item: any;
  onRemove: () => void;
}

export function ItemCarrinho({ item, onRemove }: ItemCarrinhoProps) {
  return (
    <Card className="p-3">
      <div className="flex gap-3">
        {item.imagem_url && (
          <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
            <img
              src={item.imagem_url}
              alt={item.nome}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-1">{item.nome}</h4>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={item.tipo === 'entrada' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {item.tipo === 'entrada' ? (
                <>
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Entrada
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Saída
                </>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Qtd: {formatters.quantidadeContinua(item.quantidade)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-muted-foreground">
              {formatters.valor(item.custo_aplicado)} x {formatters.quantidadeContinua(item.quantidade)}
            </span>
            <span className="font-semibold">
              {formatters.valor(item.subtotal)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

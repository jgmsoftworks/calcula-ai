import { formatters } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, ShoppingCart, X } from 'lucide-react';

export interface ItemCarrinho {
  id: string;
  origem: 'estoque' | 'vitrine';
  produto_id?: string;
  receita_id?: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  tipo: 'entrada' | 'saida';
  fornecedor_id?: string;
  fornecedor_nome?: string;
  observacao?: string;
}

interface CarrinhoLateralProps {
  carrinho: ItemCarrinho[];
  tipoMovimentacao: 'entrada' | 'saida' | null;
  onRemoverItem: (id: string) => void;
  onLimpar: () => void;
  onFinalizar: () => void;
}

export function CarrinhoLateral({
  carrinho,
  tipoMovimentacao,
  onRemoverItem,
  onLimpar,
  onFinalizar,
}: CarrinhoLateralProps) {
  const subtotal = carrinho.reduce((acc, item) => acc + item.valor_total, 0);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-muted/20">
      {/* Header compacto */}
      <div className="p-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Carrinho
          </h2>
          {tipoMovimentacao && (
            <Badge 
              variant={tipoMovimentacao === 'entrada' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {tipoMovimentacao}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
        </p>
      </div>

      {/* Lista super compacta */}
      <ScrollArea className="flex-1">
        {carrinho.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-10" />
            <p className="text-sm font-medium text-muted-foreground">Carrinho vazio</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione produtos</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {carrinho.map((item) => (
              <div 
                key={item.id} 
                className="bg-card rounded-lg p-2 border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs line-clamp-1 leading-tight">
                      {item.nome}
                    </h4>
                    {item.fornecedor_nome && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.fornecedor_nome}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatters.quantidadeContinua(item.quantidade)} {item.unidade}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => onRemoverItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t">
                  <span className="text-xs text-muted-foreground">
                    {formatters.valor(item.valor_unitario)}/un
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {formatters.valor(item.valor_total)}
                  </span>
                </div>

                {item.observacao && (
                  <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-1">
                    {item.observacao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer destacado */}
      {carrinho.length > 0 && (
        <div className="border-t p-3 bg-card/80 backdrop-blur-sm space-y-3">
          <div className="bg-primary/10 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Subtotal</span>
              <span className="text-sm font-medium">{formatters.valor(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">TOTAL</span>
              <span className="text-xl font-bold text-primary">
                {formatters.valor(subtotal)}
              </span>
            </div>
          </div>

          <Button 
            onClick={onFinalizar}
            className="w-full h-11 text-base font-bold"
            size="lg"
          >
            FINALIZAR ({carrinho.length})
          </Button>
          
          <Button
            onClick={onLimpar}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}

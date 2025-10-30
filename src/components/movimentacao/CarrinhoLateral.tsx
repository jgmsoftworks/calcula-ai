import { formatters } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho
          </h2>
          {tipoMovimentacao && (
            <Badge variant={tipoMovimentacao === 'entrada' ? 'default' : 'secondary'}>
              {tipoMovimentacao === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
        </p>
      </div>

      {/* Lista de Itens */}
      <ScrollArea className="flex-1">
        {carrinho.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
            <p className="font-medium">Carrinho vazio</p>
            <p className="text-sm mt-1">Adicione produtos para começar</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {carrinho.map((item, index) => (
              <div key={item.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                        {item.nome}
                      </h4>
                      {item.fornecedor_nome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Fornecedor: {item.fornecedor_nome}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => onRemoverItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatters.quantidadeContinua(item.quantidade)} {item.unidade} × {formatters.valor(item.valor_unitario)}
                    </span>
                    <span className="font-semibold">
                      {formatters.valor(item.valor_total)}
                    </span>
                  </div>

                  {item.observacao && (
                    <p className="text-xs text-muted-foreground italic">
                      Obs: {item.observacao}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {carrinho.length > 0 && (
        <div className="border-t p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatters.valor(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatters.valor(subtotal)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={onFinalizar}
              className="w-full"
              size="lg"
            >
              Finalizar ({carrinho.length})
            </Button>
            
            <Button
              onClick={onLimpar}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Carrinho
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

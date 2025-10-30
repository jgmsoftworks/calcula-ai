import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, X } from 'lucide-react';
import { formatters } from '@/lib/formatters';

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
  const subtotal = carrinho.reduce((sum, item) => sum + item.valor_total, 0);

  return (
    <div className="h-full border-r flex flex-col bg-background">
      {/* Cabeçalho - Fixo no topo */}
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="font-bold text-lg">
          {tipoMovimentacao ? (
            tipoMovimentacao === 'entrada' ? '📥 ENTRADA' : '📤 SAÍDA'
          ) : (
            'CARRINHO'
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
        </p>
      </div>

      {/* Lista de Itens - ScrollArea com altura flex */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {carrinho.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Carrinho vazio
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formatters.quantidadeContinua(item.quantidade)} × {item.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.unidade} • {formatters.valor(item.valor_unitario)}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatters.valor(item.valor_total)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoverItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Rodapé com Total e Botões - Fixo no fim */}
      <div className="p-4 border-t space-y-3 flex-shrink-0 bg-background">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-medium">{formatters.valor(subtotal)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">{formatters.valor(subtotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={onFinalizar}
            disabled={carrinho.length === 0}
          >
            Finalizar
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onLimpar}
              disabled={carrinho.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { formatters } from '@/lib/formatters';
import { Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Produto {
  id: string;
  nome: string;
  imagem_url?: string;
  custo_unitario: number;
  preco_venda?: number;
  estoque_atual: number;
  unidade: string;
}

interface GridProdutosProps {
  produtos: Produto[];
  origem: 'estoque' | 'vitrine';
  onSelectProduto: (produto: Produto) => void;
}

export function GridProdutos({ produtos, origem, onSelectProduto }: GridProdutosProps) {
  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Nenhum produto encontrado</p>
        <p className="text-sm">Tente ajustar os filtros de busca</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {produtos.map((produto) => {
        const valor = origem === 'estoque' ? produto.custo_unitario : produto.preco_venda;
        const semEstoque = produto.estoque_atual <= 0;
        const estoqueVariant = semEstoque ? 'destructive' : 'secondary';

        return (
          <Card 
            key={produto.id}
            className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all duration-200 group"
            onClick={() => onSelectProduto(produto)}
          >
            <CardContent className="p-0">
              {/* Imagem mais compacta com aspect 4:3 */}
              <div className="aspect-[4/3] relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                {produto.imagem_url ? (
                  <img
                    src={produto.imagem_url}
                    alt={produto.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                
                {/* Badge de estoque absoluto */}
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge 
                    variant={estoqueVariant}
                    className="backdrop-blur-md text-xs w-full justify-center font-semibold"
                  >
                    {semEstoque ? 'SEM ESTOQUE' : `${formatters.quantidadeContinua(produto.estoque_atual)} ${produto.unidade}`}
                  </Badge>
                </div>
              </div>

              {/* Informações compactas */}
              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] leading-tight">
                  {produto.nome}
                </h3>
                
                <div className="flex items-center justify-center">
                  <span className="text-base font-bold text-primary">
                    {formatters.valor(valor || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

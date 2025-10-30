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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {produtos.map((produto) => {
        const valor = origem === 'estoque' ? produto.custo_unitario : produto.preco_venda;
        const estoqueClass = produto.estoque_atual <= 0 
          ? 'text-destructive' 
          : produto.estoque_atual < 10 
          ? 'text-orange-500' 
          : 'text-muted-foreground';

        return (
          <Card 
            key={produto.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden"
            onClick={() => onSelectProduto(produto)}
          >
            <CardContent className="p-0">
              {/* Imagem */}
              <div className="aspect-square relative bg-muted overflow-hidden">
                {produto.imagem_url ? (
                  <img
                    src={produto.imagem_url}
                    alt={produto.nome}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Badge de estoque */}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                    {formatters.quantidadeContinua(produto.estoque_atual)} {produto.unidade}
                  </Badge>
                </div>
              </div>

              {/* Informações */}
              <div className="p-4 space-y-2">
                <h3 className="font-medium line-clamp-2 min-h-[2.5rem] leading-tight">
                  {produto.nome}
                </h3>
                
                <div className="flex items-center justify-between pt-1">
                  <span className="text-lg font-bold text-primary">
                    {formatters.valor(valor || 0)}
                  </span>
                  
                  <span className={`text-sm font-medium ${estoqueClass}`}>
                    {produto.estoque_atual <= 0 ? 'Sem estoque' : `${formatters.quantidadeContinua(produto.estoque_atual)} ${produto.unidade}`}
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

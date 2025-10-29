import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatters } from '@/lib/formatters';

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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum produto encontrado
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {produtos.map((produto) => (
        <Card
          key={produto.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectProduto(produto)}
        >
          <CardContent className="p-4">
            <div className="aspect-square relative mb-3 rounded-md overflow-hidden bg-muted">
              {produto.imagem_url ? (
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-4xl">
                  📦
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
              {produto.nome}
            </h3>
            
            <div className="space-y-1">
              <p className="text-lg font-bold text-primary">
                {formatters.valor(origem === 'estoque' ? produto.custo_unitario : (produto.preco_venda || 0))}
              </p>
              
              <Badge variant="secondary" className="text-xs">
                Estoque: {formatters.quantidadeContinua(produto.estoque_atual)} {produto.unidade}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

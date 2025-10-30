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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {produtos.map((produto) => (
        <Card
          key={produto.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectProduto(produto)}
        >
          <CardContent className="p-3 flex items-center gap-3 min-h-[88px]">
            {/* Imagem pequena à esquerda - Fixed size */}
            <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
              {produto.imagem_url ? (
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  loading="lazy"
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-2xl">
                  📦
                </div>
              )}
            </div>
            
            {/* Informações do produto */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1 truncate">
                {produto.nome}
              </h3>
              <p className="text-lg font-bold text-primary">
                {formatters.valor(origem === 'estoque' ? produto.custo_unitario : (produto.preco_venda || 0))}
              </p>
            </div>
            
            {/* Badge de estoque à direita */}
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {formatters.quantidadeContinua(produto.estoque_atual)} {produto.unidade}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

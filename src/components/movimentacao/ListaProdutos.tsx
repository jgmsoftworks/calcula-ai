import { useState, useEffect } from 'react';
import { useEstoque } from '@/hooks/useEstoque';
import { ProdutoCard } from './ProdutoCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ListaProdutosProps {
  onSelectProduto: (produto: any) => void;
}

export function ListaProdutos({ onSelectProduto }: ListaProdutosProps) {
  const { fetchProdutos } = useEstoque();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const results = await fetchProdutos();
      setProdutos(results);
      agruparPorCategoria(results);
    } finally {
      setLoading(false);
    }
  };

  const agruparPorCategoria = (prods: any[]) => {
    const grupos: Record<string, any[]> = {};

    prods.forEach((produto) => {
      if (produto.categorias && produto.categorias.length > 0) {
        produto.categorias.forEach((categoria: string) => {
          if (!grupos[categoria]) {
            grupos[categoria] = [];
          }
          grupos[categoria].push(produto);
        });
      } else {
        if (!grupos['Sem Categoria']) {
          grupos['Sem Categoria'] = [];
        }
        grupos['Sem Categoria'].push(produto);
      }
    });

    setProdutosPorCategoria(grupos);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (produtos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum produto cadastrado
        </CardContent>
      </Card>
    );
  }

  const categorias = Object.keys(produtosPorCategoria).sort();

  return (
    <div className="space-y-6">
      {categorias.map((categoria) => (
        <Card key={categoria}>
          <CardHeader>
            <CardTitle className="text-lg">{categoria}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {produtosPorCategoria[categoria].map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  onSelect={onSelectProduto}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEstoque } from '@/hooks/useEstoque';
import { ProdutoCard } from './ProdutoCard';

export function BuscaProduto({ onAddToCart }: any) {
  const { fetchProdutos } = useEstoque();
  const [search, setSearch] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState<Record<string, any[]>>({});

  const handleSearch = async (value: string) => {
    setSearch(value);
    if (value.length >= 2) {
      const results = await fetchProdutos({ search: value });
      setProdutos(results);
    } else {
      setProdutos([]);
    }
  };

  useEffect(() => {
    if (produtos.length === 0) {
      setProdutosPorCategoria({});
      return;
    }

    const grouped = produtos.reduce((acc, produto) => {
      const cats = produto.categorias && produto.categorias.length > 0 
        ? produto.categorias 
        : ['Sem Categoria'];
      
      cats.forEach((cat: string) => {
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(produto);
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    setProdutosPorCategoria(grouped);
  }, [produtos]);

  const totalCategorias = Object.keys(produtosPorCategoria).length;

  return (
    <Card className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Busque por nome, código ou código de barras..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {produtos.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">
            {produtos.length} produto{produtos.length !== 1 ? 's' : ''} encontrado{produtos.length !== 1 ? 's' : ''}
          </Badge>
          {totalCategorias > 0 && (
            <Badge variant="outline">
              {totalCategorias} categoria{totalCategorias !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {Object.entries(produtosPorCategoria).map(([categoria, prods]) => (
        <div key={categoria} className="mb-6 last:mb-0">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {categoria}
            <Badge variant="secondary">{prods.length}</Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prods.map((produto) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </div>
      ))}

      {produtos.length === 0 && search.length >= 2 && (
        <div className="text-center text-muted-foreground py-8">
          Nenhum produto encontrado
        </div>
      )}

      {search.length < 2 && (
        <div className="text-center text-muted-foreground py-8">
          Digite pelo menos 2 caracteres para buscar
        </div>
      )}
    </Card>
  );
}

import { useMemo } from 'react';
import { ProdutoCard } from './ProdutoCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ListaProdutosProps {
  produtos: any[];
  loading: boolean;
  categoriaSelecionada: string | null;
  onSelectProduto: (produto: any) => void;
}

export function ListaProdutos({ 
  produtos, 
  loading, 
  categoriaSelecionada, 
  onSelectProduto 
}: ListaProdutosProps) {
  const produtosFiltrados = useMemo(() => {
    if (!categoriaSelecionada) return produtos;
    
    return produtos.filter(p => 
      p.categorias && p.categorias.includes(categoriaSelecionada)
    );
  }, [produtos, categoriaSelecionada]);

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

  if (produtosFiltrados.length === 0 && categoriaSelecionada) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum produto nesta categoria
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
      {produtosFiltrados.map((produto) => (
        <ProdutoCard
          key={produto.id}
          produto={produto}
          onSelect={onSelectProduto}
        />
      ))}
    </div>
  );
}

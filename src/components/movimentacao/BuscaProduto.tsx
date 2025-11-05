import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEstoque } from '@/hooks/useEstoque';

export function BuscaProduto({ onAddToCart }: any) {
  const { fetchProdutos } = useEstoque();
  const [search, setSearch] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);

  const handleSearch = async (value: string) => {
    setSearch(value);
    if (value.length >= 2) {
      const results = await fetchProdutos({ search: value });
      setProdutos(results.slice(0, 10));
    } else {
      setProdutos([]);
    }
  };

  return (
    <Card className="p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Busque por nome, código ou código de barras..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {produtos.length > 0 && (
        <div className="mt-4 space-y-2">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              onClick={() => onAddToCart({ ...produto, quantidade: 1, tipo: 'entrada' })}
              className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
            >
              <div className="font-medium">{produto.nome}</div>
              <div className="text-sm text-muted-foreground">
                Código: {produto.codigo_interno} | Estoque: {produto.estoque_atual}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

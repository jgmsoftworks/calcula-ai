import { useState, useEffect } from 'react';
import { useEstoque } from '@/hooks/useEstoque';
import { CategoriasFiltro } from '@/components/movimentacao/CategoriasFiltro';
import { ListaProdutos } from '@/components/movimentacao/ListaProdutos';
import { MovimentacaoModal } from '@/components/movimentacao/MovimentacaoModal';
import { CarrinhoMovimentacao } from '@/components/movimentacao/CarrinhoMovimentacao';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Movimentacao() {
  const { fetchProdutos } = useEstoque();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);

  useEffect(() => {
    loadProdutos();
  }, [searchTerm]);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const results = await fetchProdutos({
        search: searchTerm || undefined
      });
      setProdutos(results);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduto = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalOpen(true);
  };

  const handleAddToCart = (item: any) => {
    if (!item.produto_id) {
      console.error('❌ Item sem produto_id:', item);
      return;
    }
    console.log('✅ Item adicionado ao carrinho:', item);
    setCarrinho([...carrinho, item]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Busque por nome, código ou código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-9 text-sm"
        />
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-8 w-8 p-0 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <CategoriasFiltro 
        produtos={produtos}
        categoriaSelecionada={categoriaSelecionada}
        onSelectCategoria={setCategoriaSelecionada}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ListaProdutos 
            produtos={produtos}
            loading={loading}
            categoriaSelecionada={categoriaSelecionada}
            onSelectProduto={handleSelectProduto}
          />
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          <CarrinhoMovimentacao 
            carrinho={carrinho} 
            onCarrinhoChange={setCarrinho} 
          />
        </div>
      </div>

      <MovimentacaoModal
        produto={produtoSelecionado}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

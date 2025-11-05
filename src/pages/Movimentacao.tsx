import { useState, useEffect } from 'react';
import { useEstoque } from '@/hooks/useEstoque';
import { CategoriasFiltro } from '@/components/movimentacao/CategoriasFiltro';
import { ListaProdutos } from '@/components/movimentacao/ListaProdutos';
import { MovimentacaoModal } from '@/components/movimentacao/MovimentacaoModal';
import { CarrinhoMovimentacao } from '@/components/movimentacao/CarrinhoMovimentacao';

export default function Movimentacao() {
  const { fetchProdutos } = useEstoque();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const results = await fetchProdutos();
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
    setCarrinho([...carrinho, item]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Categorias */}
      <CategoriasFiltro 
        produtos={produtos}
        categoriaSelecionada={categoriaSelecionada}
        onSelectCategoria={setCategoriaSelecionada}
      />

      {/* Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área de Produtos */}
        <div className="lg:col-span-2">
          <ListaProdutos 
            produtos={produtos}
            loading={loading}
            categoriaSelecionada={categoriaSelecionada}
            onSelectProduto={handleSelectProduto}
          />
        </div>

        {/* Carrinho */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CarrinhoMovimentacao 
            carrinho={carrinho} 
            onCarrinhoChange={setCarrinho} 
          />
        </div>
      </div>

      {/* Modal */}
      <MovimentacaoModal
        produto={produtoSelecionado}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

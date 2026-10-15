import { useState, useEffect } from 'react';
import { useEstoque } from '@/hooks/useEstoque';
import { CategoriasFiltro } from '@/components/movimentacao/CategoriasFiltro';
import { ListaProdutos } from '@/components/movimentacao/ListaProdutos';
import { MovimentacaoModal } from '@/components/movimentacao/MovimentacaoModal';
import { CarrinhoMovimentacao } from '@/components/movimentacao/CarrinhoMovimentacao';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Movimentacao() {
  const { t } = useTranslation();
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
      toast.error('Produto inválido. Atualize a página e tente novamente.');
      return;
    }
    if (item.tipo === 'saida') {
      const produto = produtos.find(p => p.id === item.produto_id);
      const outrasSaidas = carrinho
        .filter((cartItem: any) => cartItem.produto_id === item.produto_id && cartItem.tipo === 'saida')
        .reduce((soma: number, cartItem: any) => soma + cartItem.quantidade, 0);
      if (produto && outrasSaidas + item.quantidade > Number(produto.estoque_atual) + 0.000000001) {
        toast.error(`Estoque insuficiente para ${produto.nome}. O carrinho já inclui ${outrasSaidas} em saídas; disponível: ${produto.estoque_atual}.`);
        return;
      }
    }
    setCarrinho(atual => [...atual, item]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="glass-card flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder={t('movimentacao.searchPlaceholder')}
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

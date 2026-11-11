import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchGeladeira, geladeiraComoProduto } from '@/lib/geladeiraData';
import { useCallback, useState } from 'react';
import { useProdutosMovimentacao } from '@/hooks/useProdutosPage';
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
  const { user } = useAuth();
  const [origem, setOrigem] = useState<'produto' | 'geladeira'>('produto');
  const geladeira = useQuery({ queryKey: ['geladeira', user?.id], enabled: !!user, queryFn: ({ signal }) => fetchGeladeira(user!.id, signal), staleTime: 0 });
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);

  const { produtos, resumo, isPending: loading, isError, isFetching, isFetchingNextPage, isPlaceholderData, searching, hasNextPage, fetchNextPage, refetch: loadProdutos } = useProdutosMovimentacao({
    search: searchTerm, categorias: categoriaSelecionada ? [categoriaSelecionada] : [],
  });
  const itensGeladeira = (geladeira.data || []).map(geladeiraComoProduto).filter(item =>
    `${item.nome} ${item.codigo_interno}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const exibindoGeladeira = origem === 'geladeira';
  const itensVisiveis = exibindoGeladeira ? itensGeladeira : produtos;
  const erroAtual = exibindoGeladeira ? geladeira.isError : isError;
  const loadMore = useCallback(() => { void fetchNextPage({ cancelRefetch: false }); }, [fetchNextPage]);

  const handleSelectProduto = (produto: any) => {
    setProdutoSelecionado(produto);
    setModalOpen(true);
  };

  const handleAddToCart = (item: any) => {
    if (!item.produto_id) {
      toast.error('Produto inválido. Atualize a página e tente novamente.');
      return false;
    }
    if (item.tipo === 'saida') {
      const produto = itensVisiveis.find(p => p.id === item.produto_id) || (produtoSelecionado?.id === item.produto_id ? produtoSelecionado : null);
      const outrasSaidas = carrinho
        .filter((cartItem: any) => cartItem.produto_id === item.produto_id && cartItem.tipo === 'saida')
        .reduce((soma: number, cartItem: any) => soma + cartItem.quantidade, 0);
      if (produto && outrasSaidas + item.quantidade > Number(produto.estoque_atual) + 0.000000001) {
        toast.error(`Estoque insuficiente para ${produto.nome}. O carrinho já inclui ${outrasSaidas} em saídas; disponível: ${produto.estoque_atual}.`);
        return false;
      }
    }
    setCarrinho(atual => [...atual, item]);
    setModalOpen(false);
    return true;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2" role="group" aria-label="Local do estoque">
        <Button variant={origem === 'produto' ? 'default' : 'outline'} onClick={() => { setOrigem('produto'); setCategoriaSelecionada(null); }}>Lista de Produtos</Button>
        <Button variant={exibindoGeladeira ? 'default' : 'outline'} onClick={() => { setOrigem('geladeira'); setCategoriaSelecionada(null); }}>Geladeira</Button>
      </div>
      {/* Search */}
      <div className="glass-card flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder={exibindoGeladeira ? 'Buscar na Geladeira...' : t('movimentacao.searchPlaceholder')}
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

      {erroAtual && <div role="alert" className="rounded-xl border p-4 text-sm">
        Não foi possível atualizar os itens. <Button variant="link" onClick={() => { void (exibindoGeladeira ? geladeira.refetch() : loadProdutos()); }}>Tentar novamente</Button>
      </div>}

      {/* Category Filter */}
      <CategoriasFiltro 
        produtos={itensVisiveis}
        resumo={exibindoGeladeira ? undefined : resumo?.categorias}
        total={exibindoGeladeira ? itensGeladeira.length : resumo?.totalBusca}
        categoriaSelecionada={categoriaSelecionada}
        onSelectCategoria={setCategoriaSelecionada}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ListaProdutos 
            produtos={itensVisiveis}
            loading={exibindoGeladeira ? geladeira.isPending : loading}
            categoriaSelecionada={categoriaSelecionada}
            onSelectProduto={handleSelectProduto}
            hasMore={!exibindoGeladeira && !!hasNextPage}
            loadingMore={!exibindoGeladeira && isFetchingNextPage}
            updating={exibindoGeladeira ? geladeira.isFetching : isFetching || searching}
            canLoadMore={!exibindoGeladeira && !isFetching && !isPlaceholderData && !searching && !isError}
            onLoadMore={loadMore}
            resetKey={`${origem}:${searchTerm}:${categoriaSelecionada || ''}`}
            hasError={erroAtual}
          />
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
          <CarrinhoMovimentacao 
            carrinho={carrinho} 
            onCarrinhoChange={setCarrinho}
            onSuccess={() => { void loadProdutos(); void geladeira.refetch(); }}
          />
        </div>
      </div>

      <MovimentacaoModal
        produto={produtoSelecionado}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddToCart={handleAddToCart}
        saidasPendentes={carrinho.filter(item => item.produto_id === produtoSelecionado?.id && item.tipo === 'saida').reduce((sum, item) => sum + item.quantidade, 0)}
      />
    </div>
  );
}

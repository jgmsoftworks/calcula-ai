import type { ProdutoMovimentacao, ItemCarrinhoVisual } from '@/types/movimentacao';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchGeladeira, geladeiraComoProduto } from '@/lib/geladeiraData';
import { useCallback, useState } from 'react';
import { useProdutosMovimentacao } from '@/hooks/useProdutosPage';
import { useTiposProduto } from '@/hooks/useTiposProduto';
import type { CategoriaResumo } from '@/lib/produtosPageData';
import { CategoriasFiltro } from '@/components/movimentacao/CategoriasFiltro';
import { ListaProdutos } from '@/components/movimentacao/ListaProdutos';
import { MovimentacaoModal } from '@/components/movimentacao/MovimentacaoModal';
import { CarrinhoMovimentacao } from '@/components/movimentacao/CarrinhoMovimentacao';
import { Package, Search, ShoppingCart, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Movimentacao() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [origem, setOrigem] = useState<'produto' | 'geladeira'>('produto');
  const exibindoGeladeira = origem === 'geladeira';
  const tiposProduto = useTiposProduto(exibindoGeladeira);
  const geladeira = useQuery({ queryKey: ['geladeira', user?.id], enabled: !!user, queryFn: ({ signal }) => fetchGeladeira(user!.id, signal), staleTime: 0 });
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinhoVisual[]>([]);
  const [mobilePanel, setMobilePanel] = useState<'catalogo' | 'carrinho'>('catalogo');
  const [modalOpen, setModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoMovimentacao | null>(null);

  const { produtos, resumo, isPending: loading, isError, isFetching, isFetchingNextPage, isPlaceholderData, searching, hasNextPage, fetchNextPage, refetch: loadProdutos } = useProdutosMovimentacao({
    search: searchTerm, categorias: !exibindoGeladeira && categoriaSelecionada ? [categoriaSelecionada] : [],
  });
  const itensGeladeira = (geladeira.data || []).map(geladeiraComoProduto).filter(item =>
    `${item.nome} ${item.codigo_interno}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const categoriasGeladeira = new Map<string, CategoriaResumo & { id: string }>(
    (tiposProduto.data || []).map(tipo => [tipo.id, { ...tipo, imagem: tipo.imagem_url || null, count: 0 }]),
  );
  if (geladeira.data?.some(item => !item.receita.tipo_produto?.id)) {
    categoriasGeladeira.set('sem-tipo', { id: 'sem-tipo', nome: 'Sem tipo', imagem: null, count: 0 });
  }
  for (const item of itensGeladeira) {
    const tipo = item.receita.tipo_produto;
    const id = tipo?.id || 'sem-tipo';
    const categoria = categoriasGeladeira.get(id) || { id, nome: tipo?.nome?.trim() || 'Sem tipo', imagem: null, count: 0 };
    categoria.count++;
    categoria.imagem ||= item.imagem_url || null;
    categoriasGeladeira.set(id, categoria);
  }
  const resumoGeladeira = [...categoriasGeladeira.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const itensVisiveis = exibindoGeladeira
    ? itensGeladeira.filter(item => !categoriaSelecionada || (item.receita.tipo_produto?.id || 'sem-tipo') === categoriaSelecionada)
    : produtos;
  const erroAtual = exibindoGeladeira ? geladeira.isError || tiposProduto.isError : isError;
  const loadMore = useCallback(() => { void fetchNextPage({ cancelRefetch: false }); }, [fetchNextPage]);

  const handleSelectProduto = (produto: ProdutoMovimentacao) => {
    setProdutoSelecionado(produto);
    setModalOpen(true);
  };

  const handleAddToCart = (item: ItemCarrinhoVisual) => {
    if (!item.produto_id) {
      toast.error('Produto inválido. Atualize a página e tente novamente.');
      return false;
    }
    if (item.tipo === 'saida') {
      const produto = itensVisiveis.find(p => p.id === item.produto_id) || (produtoSelecionado?.id === item.produto_id ? produtoSelecionado : null);
      const outrasSaidas = carrinho
        .filter((cartItem: ItemCarrinhoVisual) => cartItem.produto_id === item.produto_id && cartItem.tipo === 'saida')
        .reduce((soma: number, cartItem: ItemCarrinhoVisual) => soma + cartItem.quantidade, 0);
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-border/60 bg-card p-2.5 sm:flex-row sm:items-center sm:gap-4 sm:p-3">
      <div className="flex shrink-0 gap-1 rounded-xl bg-muted/60 p-1" role="group" aria-label="Local do estoque">
        <Button variant={origem === 'produto' ? 'default' : 'outline'} onClick={() => { setOrigem('produto'); setCategoriaSelecionada(null); }}>Lista de Produtos</Button>
        <Button variant={exibindoGeladeira ? 'default' : 'outline'} onClick={() => { setOrigem('geladeira'); setCategoriaSelecionada(null); }}>Geladeira</Button>
      </div>
      {/* Search */}
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border/60 bg-background px-3">
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
      </div>

      {erroAtual && <div role="alert" className="shrink-0 rounded-xl border p-2 text-sm">
        Não foi possível atualizar os itens. <Button variant="link" onClick={() => { void (exibindoGeladeira ? Promise.all([geladeira.refetch(), tiposProduto.refetch()]) : loadProdutos()); }}>Tentar novamente</Button>
      </div>}

      {/* Main Layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Catálogo de movimentação" className={`${mobilePanel === 'catalogo' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card lg:flex`}>
          <div className="shrink-0 border-b border-border/60 px-2">
            <CategoriasFiltro
              produtos={itensVisiveis}
              resumo={exibindoGeladeira ? resumoGeladeira : resumo?.categorias}
              total={exibindoGeladeira ? itensGeladeira.length : resumo?.totalBusca}
              categoriaSelecionada={categoriaSelecionada}
              onSelectCategoria={setCategoriaSelecionada}
            />
          </div>
          <ListaProdutos 
            produtos={itensVisiveis}
            loading={exibindoGeladeira ? geladeira.isPending || tiposProduto.isPending : loading}
            categoriaSelecionada={categoriaSelecionada}
            onSelectProduto={handleSelectProduto}
            hasMore={!exibindoGeladeira && !!hasNextPage}
            loadingMore={!exibindoGeladeira && isFetchingNextPage}
            updating={exibindoGeladeira ? geladeira.isFetching || tiposProduto.isFetching : isFetching || searching}
            canLoadMore={!exibindoGeladeira && !isFetching && !isPlaceholderData && !searching && !isError}
            onLoadMore={loadMore}
            resetKey={`${origem}:${searchTerm}:${categoriaSelecionada || ''}`}
            hasError={erroAtual}
          />
        </section>

        <section aria-label="Carrinho de movimentação" className={`${mobilePanel === 'carrinho' ? 'block' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <CarrinhoMovimentacao 
            carrinho={carrinho} 
            onCarrinhoChange={setCarrinho}
            onSuccess={() => { void loadProdutos(); void geladeira.refetch(); }}
          />
        </section>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 rounded-xl border border-border/60 bg-card p-1 lg:hidden" role="group" aria-label="Área de movimentação">
        <Button variant={mobilePanel === 'catalogo' ? 'default' : 'ghost'} aria-pressed={mobilePanel === 'catalogo'} onClick={() => setMobilePanel('catalogo')}><Package className="mr-2 h-4 w-4" />Produtos</Button>
        <Button variant={mobilePanel === 'carrinho' ? 'default' : 'ghost'} aria-pressed={mobilePanel === 'carrinho'} onClick={() => setMobilePanel('carrinho')}><ShoppingCart className="mr-2 h-4 w-4" />Carrinho{carrinho.length > 0 && <span className="ml-2 rounded-md bg-primary/10 px-1.5 text-xs">{carrinho.length}</span>}</Button>
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

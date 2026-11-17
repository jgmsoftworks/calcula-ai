import type { ProdutoMovimentacao } from '@/types/movimentacao';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ProdutoCard } from './ProdutoCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ListaProdutosProps {
  produtos: ProdutoMovimentacao[];
  loading: boolean;
  categoriaSelecionada: string | null;
  onSelectProduto: (produto: ProdutoMovimentacao) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  updating?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  resetKey?: string;
  hasError?: boolean;
}

export function ListaProdutos({ 
  produtos, 
  loading, 
  onSelectProduto,
  hasMore, loadingMore, updating, canLoadMore, onLoadMore, resetKey, hasError,
}: ListaProdutosProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [resetKey]);
  useEffect(() => {
    if (!hasMore || !canLoadMore || !moreRef.current || !scrollRef.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) onLoadMore?.();
    }, { root: scrollRef.current, rootMargin: '160px' });
    observer.observe(moreRef.current);
    return () => observer.disconnect();
  }, [hasMore, canLoadMore, onLoadMore]);

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
          {hasError ? 'Os produtos não foram carregados. Tente novamente acima.' : 'Nenhum produto encontrado'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={scrollRef} role="region" aria-label="Produtos disponíveis" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" aria-busy={updating}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
        {produtos.map((produto) => (
          <ProdutoCard
            key={produto.id}
            produto={produto}
            onSelect={onSelectProduto}
          />
        ))}
      </div>
      {hasMore && <Button ref={moreRef} variant="outline" className="mt-4 min-h-11 w-full" disabled={!canLoadMore || loadingMore} onClick={onLoadMore}>
        {loadingMore ? 'Carregando mais produtos…' : 'Carregar mais produtos'}
      </Button>}
      <p role="status" className="min-h-9 py-2 text-center text-sm text-muted-foreground">{updating && !loadingMore ? 'Atualizando produtos…' : ''}</p>
    </div>
  );
}

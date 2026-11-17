import type { ProdutoMovimentacao } from '@/types/movimentacao';
import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import type { CategoriaResumo } from '@/lib/produtosPageData';
type CategoriaFiltro = CategoriaResumo & { id?: string };
interface CategoriasFiltroProps {
  produtos: ProdutoMovimentacao[];
  resumo?: CategoriaFiltro[];
  total?: number;
  categoriaSelecionada: string | null;
  onSelectCategoria: (categoria: string | null) => void;
}
export function CategoriasFiltro({
  produtos,
  resumo,
  total,
  categoriaSelecionada,
  onSelectCategoria
}: CategoriasFiltroProps) {
  const categorias = useMemo<CategoriaFiltro[]>(() => {
    if (resumo) return resumo;
    const categoriasMap = new Map<string, {
      imagem: string | null;
      count: number;
    }>();
    produtos.forEach(produto => {
      if (produto.categorias && produto.categorias.length > 0) {
        produto.categorias.forEach((categoria: string) => {
          const existing = categoriasMap.get(categoria);
          if (existing) {
            existing.count++;
            if (!existing.imagem && produto.imagem_url) {
              existing.imagem = produto.imagem_url;
            }
          } else {
            categoriasMap.set(categoria, {
              imagem: produto.imagem_url || null,
              count: 1
            });
          }
        });
      }
    });
    return Array.from(categoriasMap.entries()).map(([nome, data]) => ({
      nome,
      ...data
    })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos, resumo]);
  const totalProdutos = total ?? produtos.length;
  return <ScrollArea className="w-full">
      <div className="flex gap-2 px-1 py-3 sm:gap-3">
        {/* Botão Todos */}
        <button aria-pressed={categoriaSelecionada === null} onClick={() => onSelectCategoria(null)} className="flex w-24 shrink-0 flex-col items-center gap-1.5">
          <div className={`relative ${!categoriaSelecionada ? 'ring-2 ring-primary ring-offset-2' : ''} rounded-full transition-all`}>
            <Avatar className="h-14 w-14 border-2 border-background sm:h-16 sm:w-16">
              <AvatarFallback className="bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <Badge variant="secondary" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
              {totalProdutos}
            </Badge>
          </div>
          <span className="line-clamp-2 h-8 w-full break-words px-1 text-center text-xs font-medium leading-4">
            Todos
          </span>
        </button>

        {/* Círculos de Categorias */}
        {categorias.map(categoria => {
          const value = categoria.id ?? categoria.nome;
          return <button key={value} aria-pressed={categoriaSelecionada === value} onClick={() => onSelectCategoria(value)} className="flex w-24 shrink-0 flex-col items-center gap-1.5">
            <div className={`relative ${categoriaSelecionada === value ? 'ring-2 ring-primary ring-offset-2' : ''} rounded-full transition-all`}>
              <Avatar className="h-14 w-14 border-2 border-background sm:h-16 sm:w-16">
                {categoria.imagem ? <AvatarImage src={categoria.imagem} alt={categoria.nome} className="object-cover" /> : <AvatarFallback className="bg-muted">
                    {categoria.nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>}
              </Avatar>
              <Badge variant="secondary" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                {categoria.count}
              </Badge>
            </div>
            <span title={categoria.nome} className={`line-clamp-2 h-8 w-full rounded-lg px-1 break-words text-center text-xs font-medium leading-4 ${categoriaSelecionada === value ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              {categoria.nome}
            </span>
          </button>;
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>;
}

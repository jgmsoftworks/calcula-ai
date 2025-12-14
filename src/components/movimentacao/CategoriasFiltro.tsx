import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface CategoriasFiltroProps {
  produtos: any[];
  categoriaSelecionada: string | null;
  onSelectCategoria: (categoria: string | null) => void;
}

export function CategoriasFiltro({ 
  produtos, 
  categoriaSelecionada, 
  onSelectCategoria 
}: CategoriasFiltroProps) {
  const categorias = useMemo(() => {
    const categoriasMap = new Map<string, { imagem: string | null; count: number }>();

    produtos.forEach((produto) => {
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
              count: 1,
            });
          }
        });
      }
    });

    return Array.from(categoriasMap.entries())
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos]);

  const totalProdutos = produtos.length;

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-6">
        {/* Botão Todos */}
        <button
          onClick={() => onSelectCategoria(null)}
          className="flex flex-col items-center gap-2 shrink-0"
        >
          <div className={`relative ${
            !categoriaSelecionada 
              ? 'ring-2 ring-primary ring-offset-2' 
              : ''
          } rounded-full transition-all`}>
            <Avatar className="h-20 w-20 border-2 border-muted">
              <AvatarFallback className="bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <Badge 
              variant="secondary" 
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalProdutos}
            </Badge>
          </div>
          <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">
            Todos
          </span>
        </button>

        {/* Círculos de Categorias */}
        {categorias.map((categoria) => (
          <button
            key={categoria.nome}
            onClick={() => onSelectCategoria(categoria.nome)}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            <div className={`relative ${
              categoriaSelecionada === categoria.nome
                ? 'ring-2 ring-primary ring-offset-2' 
                : ''
            } rounded-full transition-all`}>
              <Avatar className="h-20 w-20 border-2 border-muted">
                {categoria.imagem ? (
                  <AvatarImage 
                    src={categoria.imagem} 
                    alt={categoria.nome}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-muted">
                    {categoria.nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <Badge 
                variant="secondary" 
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {categoria.count}
              </Badge>
            </div>
            <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">
              {categoria.nome}
            </span>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

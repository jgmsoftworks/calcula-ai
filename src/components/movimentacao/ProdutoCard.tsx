import { Card } from '@/components/ui/card';
import { formatters } from '@/lib/formatters';

interface ProdutoCardProps {
  produto: any;
  onSelect: (produto: any) => void;
}

export function ProdutoCard({ produto, onSelect }: ProdutoCardProps) {
  return (
    <Card 
      className="p-3 cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
      onClick={() => onSelect(produto)}
    >
      {produto.imagem_url ? (
        <div className="aspect-square overflow-hidden rounded-lg bg-muted mb-2">
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square overflow-hidden rounded-lg bg-muted mb-2 flex items-center justify-center">
          <span className="text-4xl text-muted-foreground">
            {produto.nome.substring(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className="space-y-1">
        <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
          {produto.nome}
        </h4>
        <p className="text-primary font-bold text-base">
          {formatters.valor(produto.custo_unitario)}
        </p>
      </div>
    </Card>
  );
}

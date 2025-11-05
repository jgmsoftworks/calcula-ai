import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatters } from '@/lib/formatters';

interface ProdutoCardProps {
  produto: any;
  onSelect: (produto: any) => void;
}

export function ProdutoCard({ produto, onSelect }: ProdutoCardProps) {
  return (
    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow">
      {produto.imagem_url && (
        <div className="aspect-square overflow-hidden rounded-md bg-muted mb-2">
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">#{produto.codigo_interno}</p>
        <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
          {produto.nome}
        </h4>
        <p className="text-primary font-bold">
          {formatters.valor(produto.custo_unitario)}
        </p>
      </div>

      <Button size="sm" className="w-full mt-2" onClick={() => onSelect(produto)}>
        Selecionar
      </Button>
    </Card>
  );
}

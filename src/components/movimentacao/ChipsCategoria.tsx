import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ChipsCategoriaProps {
  categorias: string[];
  categoriaAtiva: string;
  onSelectCategoria: (categoria: string) => void;
}

export function ChipsCategoria({ categorias, categoriaAtiva, onSelectCategoria }: ChipsCategoriaProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {categorias.map((categoria) => (
          <Button
            key={categoria}
            variant={categoriaAtiva === categoria ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectCategoria(categoria)}
            className="rounded-full flex-shrink-0 px-4 font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            {categoria}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="h-2" />
    </ScrollArea>
  );
}

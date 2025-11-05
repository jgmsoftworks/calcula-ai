import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
import { CategoriasModal } from './CategoriasModal';
import { useMarcasCategorias } from '@/hooks/useMarcasCategorias';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CategoriasSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategoriasSelector({ value, onChange }: CategoriasSelectorProps) {
  const { fetchCategorias } = useMarcasCategorias();
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCategorias = async () => {
    const data = await fetchCategorias();
    setCategorias(data);
  };

  useEffect(() => {
    loadCategorias();
  }, []);

  const handleToggle = (nome: string) => {
    if (value.includes(nome)) {
      onChange(value.filter(c => c !== nome));
    } else {
      onChange([...value, nome]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Selecionar Categorias
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {categorias.map((categoria) => (
                <div key={categoria.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`categoria-${categoria.id}`}
                    checked={value.includes(categoria.nome)}
                    onCheckedChange={() => handleToggle(categoria.nome)}
                  />
                  <Label
                    htmlFor={`categoria-${categoria.id}`}
                    className="cursor-pointer flex-1"
                  >
                    {categoria.nome}
                  </Label>
                </div>
              ))}

              {categorias.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria cadastrada
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((categoria) => (
            <Badge key={categoria} variant="secondary">
              {categoria}
            </Badge>
          ))}
        </div>
      )}

      <CategoriasModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) loadCategorias();
        }}
      />
    </div>
  );
}

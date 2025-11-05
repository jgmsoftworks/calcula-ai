import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
import { MarcasModal } from './MarcasModal';
import { useMarcasCategorias } from '@/hooks/useMarcasCategorias';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface MarcasSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MarcasSelector({ value, onChange }: MarcasSelectorProps) {
  const { fetchMarcas } = useMarcasCategorias();
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadMarcas = async () => {
    const data = await fetchMarcas();
    setMarcas(data);
  };

  useEffect(() => {
    loadMarcas();
  }, []);

  const handleToggle = (nome: string) => {
    if (value.includes(nome)) {
      onChange(value.filter(m => m !== nome));
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
              Selecionar Marcas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {marcas.map((marca) => (
                <div key={marca.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`marca-${marca.id}`}
                    checked={value.includes(marca.nome)}
                    onCheckedChange={() => handleToggle(marca.nome)}
                  />
                  <Label
                    htmlFor={`marca-${marca.id}`}
                    className="cursor-pointer flex-1"
                  >
                    {marca.nome}
                  </Label>
                </div>
              ))}

              {marcas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma marca cadastrada
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
          {value.map((marca) => (
            <Badge key={marca} variant="secondary">
              {marca}
            </Badge>
          ))}
        </div>
      )}

      <MarcasModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) loadMarcas();
        }}
      />
    </div>
  );
}

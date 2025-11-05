import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, X, ChevronDown } from 'lucide-react';
import { MarcasModal } from './MarcasModal';
import { useMarcasCategorias } from '@/hooks/useMarcasCategorias';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface MarcasSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MarcasSelector({ value, onChange }: MarcasSelectorProps) {
  const { fetchMarcas } = useMarcasCategorias();
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const loadMarcas = async () => {
    const data = await fetchMarcas();
    setMarcas(data as { id: string; nome: string }[]);
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

  const handleRemove = (nome: string) => {
    onChange(value.filter(m => m !== nome));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              <span className="text-muted-foreground">
                {value.length > 0 ? `${value.length} selecionada(s)` : 'Selecione marcas...'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar marca..." />
              <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {marcas.map((marca) => (
                  <CommandItem
                    key={marca.id}
                    onSelect={() => handleToggle(marca.nome)}
                  >
                    <div className="flex items-center w-full">
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        value.includes(marca.nome)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}>
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77248 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>{marca.nome}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setModalOpen(true)}
          title="Gerenciar marcas"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((marca) => (
            <Badge key={marca} variant="secondary" className="pl-2 pr-1">
              {marca}
              <button
                type="button"
                onClick={() => handleRemove(marca)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
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

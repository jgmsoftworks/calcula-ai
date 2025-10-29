import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarcaModal } from './MarcaModal';
import { useToast } from '@/hooks/use-toast';

interface Marca {
  id: string;
  nome: string;
}

interface MarcasSelectorProps {
  selectedMarcas: string[];
  onMarcasChange: (marcas: string[]) => void;
}

export const MarcasSelector = ({ selectedMarcas, onMarcasChange }: MarcasSelectorProps) => {
  const [availableMarcas, setAvailableMarcas] = useState<Marca[]>([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar marcas do banco
  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setAvailableMarcas(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
    }
  };

  const handleSelectMarca = (marcaNome: string) => {
    if (!selectedMarcas.includes(marcaNome)) {
      onMarcasChange([...selectedMarcas, marcaNome]);
    }
    setOpen(false);
  };

  const handleRemoveMarca = (marca: string) => {
    onMarcasChange(selectedMarcas.filter(m => m !== marca));
  };

  const handleMarcaCreated = (novaMarca: Marca) => {
    setAvailableMarcas(prev => [...prev, novaMarca]);
    onMarcasChange([...selectedMarcas, novaMarca.nome]);
    toast({
      title: "Marca adicionada!",
      description: `${novaMarca.nome} foi adicionada ao produto`,
    });
  };

  // Filtrar marcas que ainda não foram selecionadas
  const availableOptions = availableMarcas.filter(
    marca => !selectedMarcas.includes(marca.nome)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between w-full h-12 text-left border-2 border-primary/30 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="text-muted-foreground">
                Selecione marcas...
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 max-h-[320px]" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar marcas..."
                className="h-12 text-base"
              />
              <CommandEmpty>
                <div className="text-center py-4 space-y-2">
                  <p>Nenhuma marca encontrada.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3 h-3" />
                    Criar nova marca
                  </button>
                </div>
              </CommandEmpty>
              <CommandGroup className="max-h-[240px] overflow-y-auto">
                {availableOptions.map((marca) => (
                  <CommandItem
                    key={marca.id}
                    onSelect={() => handleSelectMarca(marca.nome)}
                    className="cursor-pointer py-3 text-base"
                  >
                    {marca.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
              {availableOptions.length > 0 && (
                <div className="border-t bg-background sticky bottom-0 p-1">
                  <CommandItem
                    onSelect={() => setShowModal(true)}
                    className="cursor-pointer py-3 text-base text-primary font-medium justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar nova marca
                  </CommandItem>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Marcas selecionadas */}
      {selectedMarcas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMarcas.map((marca) => (
            <Badge
              key={marca}
              variant="secondary"
              className="px-3 py-1 text-sm bg-primary/10 text-primary border border-primary/20"
            >
              {marca}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-2 hover:bg-transparent"
                onClick={() => handleRemoveMarca(marca)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <MarcaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onMarcaCreated={handleMarcaCreated}
        existingMarcas={availableMarcas}
      />
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarcaModal } from './MarcaModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between h-12 border-2 border-primary/30 hover:border-primary text-base px-4 rounded-lg"
            >
              Selecionar marca...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar marca..." className="h-9" />
              <CommandList>
                <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                <CommandGroup>
                  {availableOptions.map((marca) => (
                    <CommandItem
                      key={marca.id}
                      value={marca.nome}
                      onSelect={() => handleSelectMarca(marca.nome)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedMarcas.includes(marca.nome) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {marca.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button 
          type="button" 
          onClick={() => setShowModal(true)}
          className="h-12 w-12 bg-primary hover:bg-primary/90"
          title="Cadastrar nova marca"
        >
          <Plus className="w-5 h-5" />
        </Button>
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
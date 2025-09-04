import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CategoriaModal } from './CategoriaModal';

interface Categoria {
  id: string;
  nome: string;
}

interface CategoriasSelectorProps {
  selectedCategorias: string[];
  onCategoriasChange: (categorias: string[]) => void;
}

export const CategoriasSelector = ({ selectedCategorias, onCategoriasChange }: CategoriasSelectorProps) => {
  const [availableCategorias, setAvailableCategorias] = useState<Categoria[]>([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCategorias();
  }, [user]);

  const loadCategorias = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      setAvailableCategorias(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSelectCategoria = (categoriaNome: string) => {
    if (!selectedCategorias.includes(categoriaNome)) {
      onCategoriasChange([...selectedCategorias, categoriaNome]);
    }
    setOpen(false);
  };

  const handleRemoveCategoria = (categoria: string) => {
    onCategoriasChange(selectedCategorias.filter(c => c !== categoria));
  };

  const handleCategoriaCreated = (novaCategoria: Categoria) => {
    setAvailableCategorias(prev => [...prev, novaCategoria]);
    onCategoriasChange([...selectedCategorias, novaCategoria.nome]);
    toast({
      title: "Categoria adicionada!",
      description: `A categoria "${novaCategoria.nome}" foi criada e selecionada.`
    });
  };

  // Filtrar categorias que não estão selecionadas
  const availableOptions = availableCategorias.filter(
    categoria => !selectedCategorias.includes(categoria.nome)
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
                Selecione categorias...
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar categorias..."
                className="h-12 text-base"
              />
              <CommandEmpty>
                <div className="text-center py-4 space-y-2">
                  <p>Nenhuma categoria encontrada.</p>
                  <Button
                    onClick={() => setShowModal(true)}
                    size="sm"
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Criar nova categoria
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {availableOptions.map((categoria) => (
                  <CommandItem
                    key={categoria.id}
                    onSelect={() => handleSelectCategoria(categoria.nome)}
                    className="cursor-pointer py-3 text-base"
                  >
                    {categoria.nome}
                  </CommandItem>
                ))}
                {availableOptions.length > 0 && (
                  <CommandItem
                    onSelect={() => setShowModal(true)}
                    className="cursor-pointer py-3 text-base border-t mt-2 pt-3 text-primary font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar nova categoria
                  </CommandItem>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Categorias selecionadas */}
      {selectedCategorias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategorias.map((categoria, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="px-3 py-1 text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {categoria}
              <button
                onClick={() => handleRemoveCategoria(categoria)}
                className="ml-2 hover:text-destructive transition-colors"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Modal para criar categorias */}
      <CategoriaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCategoriaCreated={handleCategoriaCreated}
        existingCategorias={availableCategorias}
      />
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TipoProdutoModal } from './TipoProdutoModal';
import { useToast } from '@/hooks/use-toast';

interface TipoProduto {
  id: string;
  nome: string;
  descricao?: string;
}

interface TiposProdutoSelectorProps {
  selectedTipo: string;
  onTipoChange: (tipo: string) => void;
}

export const TiposProdutoSelector = ({ selectedTipo, onTipoChange }: TiposProdutoSelectorProps) => {
  const [availableTipos, setAvailableTipos] = useState<TipoProduto[]>([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar tipos do banco
  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('id, nome, descricao')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setAvailableTipos(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de produto:', error);
    }
  };

  const handleSelectTipo = (tipoNome: string) => {
    onTipoChange(tipoNome);
    setOpen(false);
  };

  const handleTipoCreated = (novoTipo: TipoProduto) => {
    setAvailableTipos(prev => [...prev, novoTipo]);
    onTipoChange(novoTipo.nome);
    toast({
      title: "Tipo adicionado!",
      description: `${novoTipo.nome} foi adicionado à receita`,
    });
  };

  const selectedTipoObj = availableTipos.find(tipo => tipo.nome === selectedTipo);

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full h-12 text-left border-2 border-primary/30 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span className={selectedTipo ? "text-foreground" : "text-muted-foreground"}>
              {selectedTipo || "Selecione um tipo de produto..."}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar tipos..."
              className="h-12 text-base"
            />
            <CommandEmpty>
              <div className="text-center py-4 space-y-2">
                <p>Nenhum tipo encontrado.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-3 h-3" />
                  Criar novo tipo
                </button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {availableTipos.map((tipo) => (
                <CommandItem
                  key={tipo.id}
                  onSelect={() => handleSelectTipo(tipo.nome)}
                  className="cursor-pointer py-3 text-base"
                >
                  <div className="flex flex-col">
                    <span>{tipo.nome}</span>
                    {tipo.descricao && (
                      <span className="text-sm text-muted-foreground">
                        {tipo.descricao}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {availableTipos.length > 0 && (
                <CommandItem
                  onSelect={() => setShowModal(true)}
                  className="cursor-pointer py-3 text-base border-t mt-2 pt-3 text-primary font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar novo tipo
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Tipo selecionado */}
      {selectedTipoObj && selectedTipoObj.descricao && (
        <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border">
          <strong>Descrição:</strong> {selectedTipoObj.descricao}
        </div>
      )}

      <TipoProdutoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTipoCreated={handleTipoCreated}
        existingTipos={availableTipos}
      />
    </div>
  );
};
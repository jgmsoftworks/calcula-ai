import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
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
  const [filteredMarcas, setFilteredMarcas] = useState<Marca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar marcas do banco
  useEffect(() => {
    loadMarcas();
  }, []);

  // Filtrar marcas baseado na pesquisa
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = availableMarcas.filter(marca =>
        marca.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedMarcas.includes(marca.nome)
      );
      setFilteredMarcas(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, availableMarcas, selectedMarcas]);

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

  const handleAddMarca = (marca: string) => {
    if (marca.trim() && !selectedMarcas.includes(marca.trim())) {
      onMarcasChange([...selectedMarcas, marca.trim()]);
      setSearchTerm('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveMarca = (marca: string) => {
    onMarcasChange(selectedMarcas.filter(m => m !== marca));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        handleAddMarca(searchTerm);
      }
    }
  };

  const handleMarcaCreated = (novaMarca: Marca) => {
    setAvailableMarcas(prev => [...prev, novaMarca]);
    handleAddMarca(novaMarca.nome);
    toast({
      title: "Marca adicionada!",
      description: `${novaMarca.nome} foi adicionada ao produto`,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite o nome da marca"
            className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
            onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          
          {/* Sugestões */}
          {showSuggestions && filteredMarcas.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
              {filteredMarcas.map((marca) => (
                <button
                  key={marca.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                  onClick={() => handleAddMarca(marca.nome)}
                >
                  {marca.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Button 
          type="button" 
          onClick={() => setShowModal(true)}
          className="h-12 w-12 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Marcas selecionadas */}
      {selectedMarcas.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
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
      />
    </div>
  );
};
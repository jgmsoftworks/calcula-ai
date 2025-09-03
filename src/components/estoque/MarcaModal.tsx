import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarcaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarcaCreated: (marca: { id: string; nome: string }) => void;
  existingMarcas: { id: string; nome: string }[];
}

export const MarcaModal = ({ isOpen, onClose, onMarcaCreated, existingMarcas }: MarcaModalProps) => {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marcas')
        .insert([{
          nome: nome.trim(),
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Marca já existe",
            description: "Esta marca já foi cadastrada anteriormente",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Marca cadastrada com sucesso!",
      });

      onMarcaCreated(data);
      setNome('');
      onClose();
    } catch (error: any) {
      console.error('Erro ao cadastrar marca:', error);
      toast({
        title: "Erro ao cadastrar marca",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNome('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Plus className="w-5 h-5" />
            Nova Marca
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium text-foreground">
              Nome da Marca
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Coca-Cola, Nike, Apple..."
              className="h-12 border-2 border-primary/30 focus:border-primary text-base px-4 rounded-lg"
              required
            />
          </div>

          {/* Lista de marcas existentes */}
          {existingMarcas.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Marcas já cadastradas:
              </Label>
              <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2 bg-muted/20">
                <div className="flex flex-wrap gap-1">
                  {existingMarcas.map((marca) => (
                    <span
                      key={marca.id}
                      className="text-xs bg-background border border-border rounded px-2 py-1 text-muted-foreground"
                    >
                      {marca.nome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 px-6"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Edit2, Trash2, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  // Filtrar marcas baseado na busca
  const filteredMarcas = existingMarcas.filter(marca =>
    marca.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setSearchTerm('');
    setEditingId(null);
    setEditingName('');
    onClose();
  };

  const handleEdit = (marca: { id: string; nome: string }) => {
    setEditingId(marca.id);
    setEditingName(marca.nome);
  };

  const handleSaveEdit = async (marcaId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('marcas')
        .update({ nome: editingName.trim() })
        .eq('id', marcaId);

      if (error) {
        if (error.code === '23505') {
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
        title: "Marca atualizada com sucesso!",
      });

      // Resetar estado de edição
      setEditingId(null);
      setEditingName('');
      
      // Recarregar as marcas (você pode implementar uma callback para isso)
      window.location.reload(); // Solução temporária
    } catch (error: any) {
      console.error('Erro ao atualizar marca:', error);
      toast({
        title: "Erro ao atualizar marca",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (marcaId: string, marcaNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a marca "${marcaNome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', marcaId);

      if (error) throw error;

      toast({
        title: "Marca excluída com sucesso!",
      });

      // Recarregar as marcas (você pode implementar uma callback para isso)
      window.location.reload(); // Solução temporária
    } catch (error: any) {
      console.error('Erro ao excluir marca:', error);
      toast({
        title: "Erro ao excluir marca",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Plus className="w-5 h-5" />
            Gerenciar Marcas
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 p-2">
          {/* Formulário para nova marca */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                Nova Marca
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Coca-Cola, Nike, Apple..."
                className="h-12 border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base px-4 rounded-lg"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 px-6"
              >
                {loading ? 'Salvando...' : 'Adicionar Marca'}
              </Button>
            </div>
          </form>

          {/* Divisor */}
          <div className="border-t border-border"></div>

          {/* Lista de marcas existentes */}
          {existingMarcas.length > 0 && (
            <div className="space-y-3 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Marcas cadastradas ({existingMarcas.length})
                </Label>
                
                {/* Campo de busca */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar marcas..."
                    className="pl-10 h-10 border border-border rounded-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64 border border-border rounded-md p-6 bg-muted/10 m-1">
                {filteredMarcas.length > 0 ? (
                  filteredMarcas.map((marca) => (
                    <div
                      key={marca.id}
                      className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      {editingId === marca.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 h-9 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(marca.id)}
                            className="h-9 px-3 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="h-9 px-3 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium">
                            {marca.nome}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(marca)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              title="Editar marca"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(marca.id, marca.nome)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              title="Excluir marca"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhuma marca encontrada' : 'Nenhuma marca cadastrada'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão fechar */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
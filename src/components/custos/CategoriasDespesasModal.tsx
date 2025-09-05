import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CategoriasDespesas {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

interface CategoriasDespesasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriaCreated: (categoria: CategoriasDespesas) => void;
  categorias: CategoriasDespesas[];
  onCategoriaUpdated: () => void;
}

export function CategoriasDespesasModal({ 
  isOpen, 
  onClose, 
  onCategoriaCreated, 
  categorias, 
  onCategoriaUpdated 
}: CategoriasDespesasModalProps) {
  const [novaCategoria, setNovaCategoria] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !novaCategoria.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorias_despesas_fixas')
        .insert({
          user_id: user.id,
          nome: novaCategoria.trim(),
          ativo: true
        })
        .select()
        .single();

      if (error) throw error;

      onCategoriaCreated(data);
      setNovaCategoria('');
      toast({
        title: "Categoria criada",
        description: "Nova categoria de despesa fixa criada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast({
        title: "Erro ao criar categoria",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (categoria: CategoriasDespesas) => {
    setEditingId(categoria.id);
    setEditingNome(categoria.nome);
  };

  const handleSaveEdit = async () => {
    if (!editingNome.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('categorias_despesas_fixas')
        .update({ nome: editingNome.trim() })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditingNome('');
      onCategoriaUpdated();
      toast({
        title: "Categoria atualizada",
        description: "Nome da categoria atualizado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNome('');
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categorias_despesas_fixas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      onCategoriaUpdated();
      toast({
        title: "Categoria removida",
        description: "Categoria removida com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast({
        title: "Erro ao remover",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="categoria">Nova categoria</Label>
              <Input
                id="categoria"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Ex: Moradia, Transporte, Alimentação..."
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Organize suas despesas criando categorias personalizadas para melhor controle financeiro.
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !novaCategoria.trim()}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Categoria
            </Button>
          </form>

          {filteredCategorias.length > 0 && (
            <>
              <div>
                <Label htmlFor="busca">Buscar categoria</Label>
                <Input
                  id="busca"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="mt-1"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredCategorias.map((categoria) => (
                  <div key={categoria.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded border">
                    {editingId === categoria.id ? (
                      <>
                        <Input
                          value={editingNome}
                          onChange={(e) => setEditingNome(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveEdit}
                          className="h-8 px-2 text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-8 px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="font-medium">{categoria.nome}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(categoria)}
                          className="h-8 px-2 gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(categoria.id)}
                          className="h-8 px-2 gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Apagar
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
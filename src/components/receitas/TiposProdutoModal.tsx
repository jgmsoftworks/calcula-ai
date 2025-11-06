import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface TipoProduto {
  id: string;
  nome: string;
}

interface TiposProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (tipoId: string) => void;
}

export const TiposProdutoModal = ({ open, onOpenChange, onSelect }: TiposProdutoModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [newNome, setNewNome] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchTipos();
    }
  }, [open, user]);

  const fetchTipos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      setTipos(data || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tipos de produto.',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    if (!user || !newNome.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .insert({ user_id: user.id, nome: newNome.trim() })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tipo de produto criado com sucesso.',
      });

      setTipos([...tipos, data]);
      setNewNome('');
      setCreating(false);

      if (onSelect && data) {
        onSelect(data.id);
      }
    } catch (error) {
      console.error('Erro ao criar tipo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o tipo de produto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingNome.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tipos_produto')
        .update({ nome: editingNome.trim() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tipo de produto atualizado com sucesso.',
      });

      setTipos(tipos.map(t => t.id === id ? { ...t, nome: editingNome.trim() } : t));
      setEditingId(null);
      setEditingNome('');
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o tipo de produto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de produto?')) return;

    setLoading(true);
    try {
      // Verificar se está em uso
      const { count } = await supabase
        .from('receitas')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_produto_id', id);

      if (count && count > 0) {
        toast({
          title: 'Não é possível excluir',
          description: `Este tipo está sendo usado em ${count} receita(s).`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('tipos_produto')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tipo de produto excluído com sucesso.',
      });

      setTipos(tipos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o tipo de produto.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tipo: TipoProduto) => {
    setEditingId(tipo.id);
    setEditingNome(tipo.nome);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNome('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Tipos de Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Criar novo */}
          {creating ? (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
              <Label htmlFor="new-tipo">Novo Tipo de Produto</Label>
              <div className="flex gap-2">
                <Input
                  id="new-tipo"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Ex: Bolo, Pão, Doce..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleCreate}
                  disabled={loading || !newNome.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setNewNome('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Tipo
            </Button>
          )}

          {/* Lista de tipos */}
          <div className="space-y-2">
            {tipos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum tipo de produto cadastrado
              </div>
            ) : (
              tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {editingId === tipo.id ? (
                    <>
                      <Input
                        value={editingNome}
                        onChange={(e) => setEditingNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tipo.id)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdate(tipo.id)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{tipo.nome}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(tipo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(tipo.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

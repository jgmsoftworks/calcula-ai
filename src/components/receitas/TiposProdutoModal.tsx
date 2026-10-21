import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTiposProduto } from '@/hooks/useTiposProduto';
import { ordenarTiposProduto, tiposProdutoKey, type TipoProduto } from '@/lib/tiposProdutoData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface TiposProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (tipoId: string) => void;
}

export const TiposProdutoModal = ({ open, onOpenChange, onSelect }: TiposProdutoModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tiposQuery = useTiposProduto(open);
  const tipos = tiposQuery.data || [];
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [newNome, setNewNome] = useState('');
  const [creating, setCreating] = useState(false);

  const syncTipos = async (update: (previous: TipoProduto[]) => TipoProduto[]) => {
    if (!user) return;
    const queryKey = tiposProdutoKey(user.id);
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TipoProduto[]>(queryKey, previous => ordenarTiposProduto(update(previous || [])));
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ['receitas-lista', user.id] });
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

      await syncTipos(previous => [...previous.filter(tipo => tipo.id !== data.id), { id: data.id, nome: data.nome }]);
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
    if (!user || !editingNome.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tipos_produto')
        .update({ nome: editingNome.trim() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tipo de produto atualizado com sucesso.',
      });

      await syncTipos(previous => previous.map(t => t.id === id ? { ...t, nome: editingNome.trim() } : t));
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
    if (!user) return;
    if (!confirm('Tem certeza que deseja excluir este tipo de produto?')) return;

    setLoading(true);
    try {
      // Verificar se está em uso
      const { count, error: usageError } = await supabase
        .from('receitas')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_produto_id', id)
        .eq('user_id', user.id);

      if (usageError) throw usageError;
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
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tipo de produto excluído com sucesso.',
      });

      await syncTipos(previous => previous.filter(t => t.id !== id));
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
                  aria-label="Criar tipo de produto"
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
            {tiposQuery.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Carregando tipos de produto…</p> : tiposQuery.isError && !tipos.length ? (
              <div role="alert" className="space-y-2 py-4 text-center text-sm">
                <p>Não foi possível carregar os tipos de produto.</p>
                <Button type="button" variant="outline" disabled={tiposQuery.isFetching} onClick={() => void tiposQuery.refetch()}>Tentar novamente</Button>
              </div>
            ) : tipos.length === 0 ? (
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
                        aria-label="Salvar tipo de produto"
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
                        aria-label={`Editar ${tipo.nome}`}
                        onClick={() => startEdit(tipo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${tipo.nome}`}
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

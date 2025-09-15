import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CriarReceitaModal } from '@/components/receitas/CriarReceitaModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface Receita {
  id: string;
  nome: string;
  tempo_preparo_total: number;
  tempo_preparo_mao_obra: number;
  tipo_produto: string;
  rendimento_valor: number;
  rendimento_unidade: string;
  status: string;
  ingredientes_count: number;
  sub_receitas_count: number;
  embalagens_count: number;
  created_at: string;
  updated_at: string;
}

const Receitas = () => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadReceitas();
    }
  }, [user?.id]);

  const loadReceitas = async () => {
    try {
      setLoading(true);

      // Buscar receitas com contagens
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          *,
          receita_ingredientes(count),
          receita_sub_receitas!receita_sub_receitas_receita_id_fkey(count),
          receita_embalagens(count)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        return;
      }

      // Transformar os dados para incluir as contagens
      const receitasComContagens: Receita[] = (receitasData || []).map(receita => ({
        ...receita,
        ingredientes_count: receita.receita_ingredientes[0]?.count || 0,
        sub_receitas_count: receita.receita_sub_receitas[0]?.count || 0,
        embalagens_count: receita.receita_embalagens[0]?.count || 0,
      }));

      setReceitas(receitasComContagens);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = (wasOpened: boolean) => {
    setIsModalOpen(wasOpened);
    if (!wasOpened) {
      // Recarregar receitas quando modal for fechado
      loadReceitas();
    }
  };

  const deleteReceita = async (receitaId: string) => {
    if (!user?.id) return;

    setDeletingId(receitaId);
    
    try {
      console.log('🗑️ Iniciando deleção da receita:', receitaId);

      // Deletar dados relacionados primeiro (devido às foreign keys)
      const { error: ingredientesError } = await supabase
        .from('receita_ingredientes')
        .delete()
        .eq('receita_id', receitaId);

      if (ingredientesError) {
        console.error('Erro ao deletar ingredientes:', ingredientesError);
        throw ingredientesError;
      }

      const { error: subReceitasError } = await supabase
        .from('receita_sub_receitas')
        .delete()
        .eq('receita_id', receitaId);

      if (subReceitasError) {
        console.error('Erro ao deletar sub-receitas:', subReceitasError);
        throw subReceitasError;
      }

      const { error: embalagensError } = await supabase
        .from('receita_embalagens')
        .delete()
        .eq('receita_id', receitaId);

      if (embalagensError) {
        console.error('Erro ao deletar embalagens:', embalagensError);
        throw embalagensError;
      }

      const { error: maoObraError } = await supabase
        .from('receita_mao_obra')
        .delete()
        .eq('receita_id', receitaId);

      if (maoObraError) {
        console.error('Erro ao deletar mão de obra:', maoObraError);
        throw maoObraError;
      }

      // Por último, deletar a receita principal
      const { error: receitaError } = await supabase
        .from('receitas')
        .delete()
        .eq('id', receitaId)
        .eq('user_id', user.id);

      if (receitaError) {
        console.error('Erro ao deletar receita:', receitaError);
        throw receitaError;
      }

      console.log('✅ Receita deletada com sucesso');
      
      toast({
        title: "Sucesso",
        description: "Receita deletada com sucesso!",
      });

      // Recarregar lista
      loadReceitas();
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a receita.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e seus custos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando receitas...</p>
          </div>
        ) : receitas.length > 0 ? (
          receitas.map((receita) => (
            <Card key={receita.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{receita.nome}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{receita.tipo_produto || 'Sem categoria'}</Badge>
                      {receita.rendimento_valor && (
                        <Badge variant="outline">
                          Rendimento: {receita.rendimento_valor} {receita.rendimento_unidade}
                        </Badge>
                      )}
                      <Badge variant={receita.status === 'finalizada' ? 'default' : 'outline'}>
                        {receita.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Criado: {new Date(receita.created_at).toLocaleDateString()}</p>
                      <p>Atualizado: {new Date(receita.updated_at).toLocaleDateString()}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingId === receita.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar Receita</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar a receita "{receita.nome}"? 
                            Esta ação não pode ser desfeita e todos os dados relacionados 
                            (ingredientes, sub-receitas, embalagens, mão de obra) serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteReceita(receita.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tempo Total</p>
                    <p className="font-medium">{receita.tempo_preparo_total || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tempo M.O.</p>
                    <p className="font-medium">{receita.tempo_preparo_mao_obra || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ingredientes</p>
                    <p className="font-medium">{receita.ingredientes_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sub-receitas</p>
                    <p className="font-medium">{receita.sub_receitas_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Embalagens</p>
                    <p className="font-medium">{receita.embalagens_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Nenhuma receita criada</h3>
                  <p className="text-muted-foreground">Comece criando sua primeira receita</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Receita
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CriarReceitaModal 
        open={isModalOpen} 
        onOpenChange={handleModalClose}
      />
    </div>
  );
};

export default Receitas;
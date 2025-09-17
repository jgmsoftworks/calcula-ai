import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CriarReceitaModal } from '@/components/receitas/CriarReceitaModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  markup_id: string;
  markup_nome: string;
  custo_materia_prima: number;
  custo_mao_obra: number;
  custo_embalagens: number;
  custo_total: number;
  preco_venda: number;
  margem_contribuicao: number;
  lucro_liquido: number;
}

const Receitas = () => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingReceitaId, setEditingReceitaId] = useState<string | null>(null);
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

      // Buscar receitas básicas primeiro
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          *,
          markups(nome, tipo)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        return;
      }

      if (!receitasData || receitasData.length === 0) {
        setReceitas([]);
        return;
      }

      // Buscar dados relacionados separadamente para cada receita
      const receitasComDados = await Promise.all(
        receitasData.map(async (receita) => {
          // Buscar ingredientes
          const { data: ingredientes } = await supabase
            .from('receita_ingredientes')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar sub-receitas  
          const { data: subReceitas } = await supabase
            .from('receita_sub_receitas')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar embalagens
          const { data: embalagens } = await supabase
            .from('receita_embalagens')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar mão de obra
          const { data: maoObra } = await supabase
            .from('receita_mao_obra')
            .select('valor_total')
            .eq('receita_id', receita.id);

          return {
            ...receita,
            receita_ingredientes: ingredientes || [],
            receita_sub_receitas: subReceitas || [],
            receita_embalagens: embalagens || [],
            receita_mao_obra: maoObra || []
          };
        })
      );

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        return;
      }

      // Transformar os dados para incluir as contagens e custos
      const receitasComContagens: Receita[] = receitasComDados.map((receita, index) => {
        const custoMateriaPrima = receita.receita_ingredientes?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoSubReceitas = receita.receita_sub_receitas?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoEmbalagens = receita.receita_embalagens?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoMaoObra = receita.receita_mao_obra?.reduce((sum: number, item: any) => sum + (Number(item.valor_total) || 0), 0) || 0;
        
        const custoTotal = custoMateriaPrima + custoSubReceitas + custoEmbalagens + custoMaoObra;
        
        // Verificar se é uma sub-receita
        const isSubReceita = receita.markups?.tipo === 'sub_receita';
        
        // Sempre usar o preço de venda salvo no banco, ou valor padrão se não existir
        const precoVenda = receita.preco_venda || (custoTotal > 0 ? custoTotal * 2 : 0);
        
        let margemContribuicao, lucroLiquido;
        
        if (isSubReceita) {
          // Para sub-receitas: não mostrar lucro nem margem
          margemContribuicao = 0;
          lucroLiquido = 0;
        } else {
          // Para receitas normais: calcular margem e lucro
          margemContribuicao = precoVenda - custoTotal;
          lucroLiquido = margemContribuicao > 0 ? margemContribuicao * 0.8 : 0;
        }
        
        return {
          ...receita,
          ingredientes_count: receita.receita_ingredientes?.length || 0,
          sub_receitas_count: receita.receita_sub_receitas?.length || 0,
          embalagens_count: receita.receita_embalagens?.length || 0,
          markup_nome: receita.markups?.nome || 'Nenhum markup',
          custo_materia_prima: custoMateriaPrima + custoSubReceitas,
          custo_mao_obra: custoMaoObra,
          custo_embalagens: custoEmbalagens,
          custo_total: custoTotal,
          preco_venda: precoVenda,
          margem_contribuicao: margemContribuicao,
          lucro_liquido: lucroLiquido,
        };
      });

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
      setEditingReceitaId(null);
      loadReceitas();
    }
  };

  const handleEditReceita = (receitaId: string) => {
    setEditingReceitaId(receitaId);
    setIsModalOpen(true);
  };

  const handleNovaReceita = () => {
    setEditingReceitaId(null);
    setIsModalOpen(true);
  };

  const deleteReceita = async (receitaId: string) => {
    if (!user?.id) return;

    setDeletingId(receitaId);
    
    // Update otimista: remove da lista imediatamente para feedback visual
    const receitaOriginal = receitas.find(r => r.id === receitaId);
    setReceitas(prev => prev.filter(r => r.id !== receitaId));
    
    try {
      console.log('🗑️ Iniciando deleção da receita:', receitaId);

      // Deletar dados relacionados primeiro (devido às foreign keys)
      await Promise.all([
        supabase.from('receita_ingredientes').delete().eq('receita_id', receitaId),
        supabase.from('receita_sub_receitas').delete().eq('receita_id', receitaId),
        supabase.from('receita_embalagens').delete().eq('receita_id', receitaId),
        supabase.from('receita_mao_obra').delete().eq('receita_id', receitaId)
      ]);

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

    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      
      // Reverter update otimista em caso de erro
      if (receitaOriginal) {
        setReceitas(prev => [...prev, receitaOriginal].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      
      toast({
        title: "Erro",
        description: "Não foi possível deletar a receita.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    // Se o valor for NaN, undefined, null ou não for um número válido, retorna R$ 0,00
    const validValue = (!value || isNaN(value)) ? 0 : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(validValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e seus custos</p>
        </div>
        <Button onClick={handleNovaReceita} className="gap-2">
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
          receitas.map((receita, index) => (
            <Card key={receita.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                        {index + 1}
                      </span>
                      <CardTitle className="text-lg">{receita.nome}</CardTitle>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{receita.tipo_produto || 'Tipo não definido'}</Badge>
                      <Badge variant="outline">{receita.markup_nome}</Badge>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReceita(receita.id)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
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
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo Total</p>
                    <p className="font-medium">{receita.tempo_preparo_total || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo M.O.</p>
                    <p className="font-medium">{receita.tempo_preparo_mao_obra || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Ingredientes</p>
                    <p className="font-medium">{receita.ingredientes_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Sub-receitas</p>
                    <p className="font-medium">{receita.sub_receitas_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Embalagens</p>
                    <p className="font-medium">{receita.embalagens_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Custo M.O.</p>
                    <p className="font-medium text-orange-600">{formatCurrency(receita.custo_mao_obra)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Custo Total</p>
                    <p className="font-medium text-red-600">{formatCurrency(receita.custo_total)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Custo Matéria-Prima</p>
                    <p className="font-medium text-blue-600">{formatCurrency(receita.custo_materia_prima)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Margem Contribuição</p>
                    <p className="font-medium text-green-600">{formatCurrency(receita.margem_contribuicao)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Preço Venda</p>
                    <p className="font-medium text-purple-600">{formatCurrency(receita.preco_venda)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Lucro Líquido</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(receita.lucro_liquido)}</p>
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
                <Button onClick={handleNovaReceita} className="gap-2">
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
        receitaId={editingReceitaId}
      />
    </div>
  );
};

export default Receitas;
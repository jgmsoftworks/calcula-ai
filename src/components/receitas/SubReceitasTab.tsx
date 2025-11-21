import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search, Info, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { ReceitaCompleta, Receita } from '@/types/receitas';

interface TempSubReceita {
  id: string;
  sub_receita_id: string;
  quantidade: number;
  sub_receita: any;
}

interface SubReceitasTabProps {
  // Modo edição
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  
  // Modo criação
  mode: 'create' | 'edit';
  tempSubReceitas?: TempSubReceita[];
  onAddTemp?: (subReceita: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
}

export function SubReceitasTab({ 
  receita, 
  onUpdate, 
  mode, 
  tempSubReceitas = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp 
}: SubReceitasTabProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [receitas, setReceitas] = useState<any[]>([]);
  const [allSubReceitas, setAllSubReceitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMarkup, setHasMarkup] = useState(true);

  // Carregar sub-receitas disponíveis automaticamente
  useEffect(() => {
    loadAvailableSubReceitas();
  }, [user]);

  const loadAvailableSubReceitas = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar o markup de sub-receitas ativo do usuário
      const { data: markupData, error: markupError } = await supabase
        .from('markups')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'sub_receita')
        .eq('ativo', true)
        .maybeSingle();

      if (markupError) throw markupError;

      // Se não houver markup de sub-receitas configurado
      if (!markupData) {
        setHasMarkup(false);
        setAllSubReceitas([]);
        setReceitas([]);
        setLoading(false);
        return;
      }

      setHasMarkup(true);

      // Buscar TODAS as receitas vinculadas ao markup de sub-receitas
      const { data, error } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .eq('markup_id', markupData.id)
        .order('nome');
      
      // Filtrar receita atual apenas em modo edição
      if (mode === 'edit' && receita?.id) {
        const filtered = (data || []).filter(r => r.id !== receita.id);
        setAllSubReceitas(filtered);
        setReceitas(filtered);
      } else {
        setAllSubReceitas(data || []);
        setReceitas(data || []);
      }

    } catch (error: any) {
      console.error('Erro ao buscar sub-receitas:', error);
      toast.error('Erro ao carregar sub-receitas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar em tempo real conforme usuário digita
  useEffect(() => {
    if (!search.trim()) {
      setReceitas(allSubReceitas);
      return;
    }

    const filtered = allSubReceitas.filter(r => 
      r.nome.toLowerCase().includes(search.toLowerCase())
    );
    setReceitas(filtered);
  }, [search, allSubReceitas]);

  const handleAddSubReceita = async (subReceita: Receita) => {
    if (mode === 'create') {
      onAddTemp?.(subReceita, 1);
      setSearch('');
      return;
    }

    try {
      const { error } = await supabase.from('receita_sub_receitas').insert({
        receita_id: receita!.id,
        sub_receita_id: subReceita.id,
        quantidade: 1,
      });

      if (error) throw error;
      toast.success('Sub-receita adicionada');
      setSearch('');
      onUpdate?.();
      loadAvailableSubReceitas();
    } catch (error: any) {
      console.error('Erro ao adicionar sub-receita:', error);
      toast.error('Erro ao adicionar sub-receita');
    }
  };

  const handleRemoveSubReceita = async (id: string) => {
    if (mode === 'create') {
      onRemoveTemp?.(id);
      return;
    }

    try {
      const { error } = await supabase
        .from('receita_sub_receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Sub-receita removida');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao remover sub-receita:', error);
      toast.error('Erro ao remover sub-receita');
    }
  };

  const handleUpdateQuantidade = async (id: string, quantidade: number) => {
    if (mode === 'create') {
      onUpdateQuantidadeTemp?.(id, quantidade);
      return;
    }

    try {
      const { error } = await supabase
        .from('receita_sub_receitas')
        .update({ quantidade })
        .eq('id', id);

      if (error) throw error;
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
    }
  };

  const subReceitas = mode === 'create' ? tempSubReceitas : (receita?.sub_receitas || []);

  const total = subReceitas.reduce((sum, sr) => {
    if (!sr.sub_receita) return sum;
    const custoUnitario = sr.sub_receita.rendimento_valor && sr.sub_receita.rendimento_valor > 0
      ? sr.sub_receita.preco_venda / sr.sub_receita.rendimento_valor
      : sr.sub_receita.preco_venda;
    return sum + (custoUnitario * sr.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Card explicativo */}
      {!hasMarkup ? (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Nenhum Markup de Sub-receitas Configurado
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Para usar sub-receitas, você precisa:
                </p>
                <ol className="text-sm text-amber-800 dark:text-amber-200 list-decimal list-inside space-y-1">
                  <li>Ir para a página <strong>Precificação</strong></li>
                  <li>Criar um <strong>Markup de Sub-receitas</strong></li>
                  <li>Voltar às suas receitas e selecionar esse markup nas receitas que deseja usar como sub-receitas</li>
                  <li>Finalizar essas receitas (status "Finalizada")</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : allSubReceitas.length === 0 ? (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Nenhuma Sub-receita Disponível
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Você tem o markup de sub-receitas configurado, mas ainda não vinculou nenhuma receita a ele.
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Para criar sub-receitas: Vá até a aba <strong>6 Precificação</strong> de qualquer receita finalizada e selecione o <strong>Markup de Sub-receitas</strong>. Essa receita ficará disponível aqui para ser usada como sub-receita.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  {allSubReceitas.length} Sub-receita{allSubReceitas.length !== 1 ? 's' : ''} Disponível{allSubReceitas.length !== 1 ? 'is' : ''}
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Busque e clique em uma sub-receita abaixo para adicioná-la nesta receita.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMarkup && allSubReceitas.length > 0 && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar sub-receitas pelo nome..."
                className="pl-9"
              />
            </div>
          </div>

          {receitas.length > 0 && (
            <div className="border rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
              {receitas.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleAddSubReceita(r)}
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white">
                      <Package className="h-3 w-3 mr-1" />
                      Sub
                    </Badge>
                    <div>
                      <p className="font-medium">{r.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {r.preco_venda.toFixed(2)} / {r.rendimento_unidade || 'un'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {receitas.length === 0 && search && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Nenhuma sub-receita encontrada com "{search}"
            </div>
          )}
        </>
      )}

      {subReceitas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nenhuma sub-receita adicionada
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-base px-4 py-2">
              Total: R$ {total.toFixed(2)}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-receita</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subReceitas.map((subReceita) => {
                if (!subReceita.sub_receita) return null;
                
                const custoUnitario = subReceita.sub_receita.rendimento_valor && subReceita.sub_receita.rendimento_valor > 0
                  ? subReceita.sub_receita.preco_venda / subReceita.sub_receita.rendimento_valor
                  : subReceita.sub_receita.preco_venda;
                const custoTotal = custoUnitario * subReceita.quantidade;
                const unidade = subReceita.sub_receita.rendimento_unidade || 'un';

                return (
                  <TableRow key={subReceita.id}>
                    <TableCell>{subReceita.sub_receita.nome}</TableCell>
                    <TableCell>{unidade}</TableCell>
                    <TableCell className="text-right">
                      <NumericInput
                        value={subReceita.quantidade}
                        onChange={(e) => handleUpdateQuantidade(subReceita.id, Number(e.target.value))}
                        className="w-20 text-right"
                        min={0}
                        step={0.01}
                      />
                    </TableCell>
                    <TableCell className="text-right">R$ {custoUnitario.toFixed(4)}</TableCell>
                    <TableCell className="text-right">R$ {custoTotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubReceita(subReceita.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

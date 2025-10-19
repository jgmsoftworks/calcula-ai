import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface ReceitaDisponivel {
  id: string;
  nome: string;
  custo_total: number;
  rendimento_valor: number;
  rendimento_unidade: string;
}

interface SubReceitasStepProps {
  receitaId: string | null;
  subReceitas: SubReceita[];
  onSubReceitasChange: (subReceitas: SubReceita[]) => void;
}

export function SubReceitasStep({ receitaId, subReceitas, onSubReceitasChange }: SubReceitasStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [receitasDisponiveis, setReceitasDisponiveis] = useState<ReceitaDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadReceitasComMarkupSubReceitas();
    }
  }, [user?.id]);

  const loadReceitasComMarkupSubReceitas = async () => {
    try {
      setLoading(true);
      
      // Buscar receitas que têm markup do tipo "sub-receitas"
      let query = supabase
        .from('receitas')
        .select(`
          id,
          nome,
          rendimento_valor,
          rendimento_unidade,
          markups!inner(tipo)
        `)
        .eq('user_id', user?.id)
        .eq('markups.tipo', 'sub_receita')
        
      // Não incluir a própria receita se estiver editando
      if (receitaId) {
        query = query.neq('id', receitaId);
      }
      
      const { data: receitas, error } = await query;

      if (error) {
        console.error('Erro ao carregar receitas com markup Sub-receitas:', error);
        return;
      }

      // Calcular custo total de cada receita fazendo queries separadas
      const receitasComCustos: ReceitaDisponivel[] = [];
      
      for (const receita of receitas || []) {
        // Buscar custos separadamente para evitar ambiguidade de relacionamentos
        const [ingredientes, subReceitas, embalagens, maoObra] = await Promise.all([
          supabase.from('receita_ingredientes').select('custo_total').eq('receita_id', receita.id),
          supabase.from('receita_sub_receitas').select('custo_total').eq('receita_id', receita.id),
          supabase.from('receita_embalagens').select('custo_total').eq('receita_id', receita.id),
          supabase.from('receita_mao_obra').select('valor_total').eq('receita_id', receita.id)
        ]);

        const custoMateriaPrima = ingredientes.data?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoSubReceitas = subReceitas.data?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoEmbalagens = embalagens.data?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoMaoObra = maoObra.data?.reduce((sum: number, item: any) => sum + (Number(item.valor_total) || 0), 0) || 0;
        
        const custoTotal = custoMateriaPrima + custoSubReceitas + custoEmbalagens + custoMaoObra;
        
        receitasComCustos.push({
          id: receita.id,
          nome: receita.nome,
          custo_total: custoTotal,
          rendimento_valor: receita.rendimento_valor || 1,
          rendimento_unidade: receita.rendimento_unidade || 'porção'
        });
      }

      setReceitasDisponiveis(receitasComCustos);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarSubReceita = (receita: ReceitaDisponivel) => {
    const custoUnitario = receita.custo_total / receita.rendimento_valor;
    
    const novaSubReceita: SubReceita = {
      id: Date.now().toString(),
      receita_id: receita.id,
      nome: receita.nome,
      quantidade: 1,
      unidade: receita.rendimento_unidade,
      custo_unitario: custoUnitario,
      custo_total: custoUnitario,
    };
    
    onSubReceitasChange([...subReceitas, novaSubReceita]);
  };

  const removerSubReceita = (id: string) => {
    onSubReceitasChange(subReceitas.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const updatedSubReceitas = subReceitas.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    );
    onSubReceitasChange(updatedSubReceitas);
  };

  const custoTotalSubReceitas = subReceitas.reduce((total, item) => total + item.custo_total, 0);
  
  const receitasFiltradas = receitasDisponiveis.filter(receita =>
    receita.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adicionar Sub-receitas</h3>
        <p className="text-muted-foreground">Selecione as receitas que fazem parte desta receita principal (opcional)</p>
      </div>

      <div className="space-y-6">
        {/* Buscar Receitas */}
        <div>
          <Label htmlFor="search-receitas" className="text-sm font-medium">
            Buscar Sub-receitas
          </Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search-receitas"
              placeholder="Digite o nome da receita..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Resultados da Busca */}
          {searchTerm && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Carregando receitas...</p>
                </div>
              ) : receitasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma receita disponível como sub-receita</p>
                  <p className="text-sm">Para uma receita aparecer aqui, ela precisa usar um markup do tipo "sub-receitas"</p>
                </div>
              ) : (
                receitasFiltradas.map((receita) => {
                  const custoUnitario = receita.custo_total / receita.rendimento_valor;
                  return (
                    <div key={receita.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{receita.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {custoUnitario.toFixed(2)} / {receita.rendimento_unidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rendimento: {receita.rendimento_valor} {receita.rendimento_unidade}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => adicionarSubReceita(receita)}
                        disabled={subReceitas.some(item => item.receita_id === receita.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sub-receitas Selecionadas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Sub-receitas da Receita</CardTitle>
              <Badge variant="secondary">
                Total: R$ {custoTotalSubReceitas.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {subReceitas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma sub-receita adicionada</p>
                <p className="text-sm">Busque e selecione receitas acima</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-foreground min-w-[200px]">Receita</TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[100px]">Quantidade</TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[120px]">Custo Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subReceitas.map((subReceita) => (
                    <TableRow key={subReceita.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{subReceita.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {subReceita.custo_unitario.toFixed(2)} / {subReceita.unidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={subReceita.quantidade}
                          onChange={(e) => atualizarQuantidade(subReceita.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">R$ {subReceita.custo_total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerSubReceita(subReceita.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
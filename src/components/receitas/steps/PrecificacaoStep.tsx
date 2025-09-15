import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Weight, Calculator, Target, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  marcas?: string[];
}

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface MaoObraItem {
  id: string;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
    custo_por_hora: number;
  };
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface MarkupData {
  id: string;
  nome: string;
  tipo: string;
  periodo: string;
  margem_lucro: number;
  gasto_sobre_faturamento: number;
  encargos_sobre_venda: number;
  markup_ideal: number;
  markup_aplicado: number;
  preco_sugerido: number;
  ativo: boolean;
}

interface ReceitaData {
  ingredientes: Ingrediente[];
  subReceitas: SubReceita[];
  embalagens: Embalagem[];
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
}

interface PrecificacaoStepProps {
  receitaData: ReceitaData;
  receitaId?: string;
}

export function PrecificacaoStep({ receitaData, receitaId }: PrecificacaoStepProps) {
  const [precoVenda, setPrecoVenda] = useState('');
  const [pesoUnitario, setPesoUnitario] = useState('');
  const [markups, setMarkups] = useState<MarkupData[]>([]);
  const [markupSelecionado, setMarkupSelecionado] = useState<string>('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Função para salvar markup selecionado
  const salvarMarkupSelecionado = async (markupId: string) => {
    if (!receitaId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('receitas')
        .update({ markup_id: markupId })
        .eq('id', receitaId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao salvar markup:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o markup selecionado",
          variant: "destructive",
        });
        return;
      }

      setMarkupSelecionado(markupId);
      toast({
        title: "Sucesso",
        description: "Markup selecionado salvo com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar markup:', error);
    }
  };
  
  // Fetch markups from database
  useEffect(() => {
    const fetchMarkups = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('markups')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar markups:', error);
          return;
        }
        
        // Remove duplicados por ID para evitar renderização dupla
        const uniqueMarkups = (data || []).filter((markup, index, self) => 
          index === self.findIndex(m => m.id === markup.id)
        );
        
        // Verificar se há sub-receitas na receita para adicionar bloco de sub-receita
        const hasSubReceitas = receitaData.subReceitas && receitaData.subReceitas.length > 0;
        
        // Se há sub-receitas, adicionar o bloco fixo de sub-receita
        if (hasSubReceitas) {
          const subReceitaMarkup = {
            id: 'subreceita-fixo',
            nome: 'sub-receitas',
            tipo: 'sub_receita',
            periodo: 'todos',
            margem_lucro: 20,
            gasto_sobre_faturamento: 0,
            encargos_sobre_venda: 0,
            markup_ideal: 1.2500,
            markup_aplicado: 1.2500,
            preco_sugerido: 0,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: user.id,
            despesas_fixas_selecionadas: [],
            encargos_venda_selecionados: [],
            folha_pagamento_selecionada: []
          };
          
          // Adicionar o markup de sub-receita apenas se não existir já
          if (!uniqueMarkups.find(m => m.id === 'subreceita-fixo')) {
            uniqueMarkups.unshift(subReceitaMarkup);
          }
        }
        
        setMarkups(uniqueMarkups);
      } catch (error) {
        console.error('Erro ao buscar markups:', error);
      }
    };
    
    // Só buscar se ainda não tem markups ou se o user mudou
    if (user?.id && markups.length === 0) {
      fetchMarkups();
    }
  }, [user?.id, receitaData.subReceitas]);

  // Buscar markup selecionado da receita
  useEffect(() => {
    const fetchReceitaMarkup = async () => {
      if (!receitaId || !user?.id) return;

      try {
        const { data, error } = await supabase
          .from('receitas')
          .select('markup_id')
          .eq('id', receitaId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar markup da receita:', error);
          return;
        }

        if (data?.markup_id) {
          setMarkupSelecionado(data.markup_id);
        }
      } catch (error) {
        console.error('Erro ao buscar markup da receita:', error);
      }
    };

    fetchReceitaMarkup();
  }, [receitaId, user?.id]);
  
  // Function to format currency
  const formatCurrency = (value: string) => {
    // Remove all non-digits
    const numericValue = value.replace(/\D/g, '');
    
    if (!numericValue) return '';
    
    // Convert to number and divide by 100 to get decimal places
    const number = parseInt(numericValue) / 100;
    
    // Format as Brazilian currency
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(number);
  };
  
  // Function to get numeric value from formatted currency
  const getNumericValue = (formattedValue: string) => {
    const numericValue = formattedValue.replace(/\D/g, '');
    if (!numericValue) return 0;
    return parseInt(numericValue) / 100;
  };
  
  const handlePrecoVendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setPrecoVenda(formatted);
  };
  
  // Calculate real costs from the recipe data
  const custoIngredientes = receitaData.ingredientes.reduce((total, item) => total + item.custo_total, 0);
  const custoSubReceitas = receitaData.subReceitas.reduce((total, item) => total + item.custo_total, 0);
  const custoEmbalagens = receitaData.embalagens.reduce((total, item) => total + item.custo_total, 0);
  const valorTotalMaoObra = receitaData.maoObra.reduce((total, item) => total + item.valorTotal, 0);
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens + valorTotalMaoObra;
  
  const { rendimentoValor, rendimentoUnidade } = receitaData;

  // Calculate price per KG and unit cost
  const custoUnitario = custoTotal / (parseFloat(rendimentoValor) || 1);
  const precoNumerico = getNumericValue(precoVenda);
  const pesoNumerico = parseFloat(pesoUnitario) || 0;
  const precoKg = (precoNumerico && pesoNumerico) 
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(precoNumerico / (pesoNumerico / 1000))
    : 'R$ 0,00';

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'quilo', label: 'Quilo (KG)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Precificação</h3>
          <p className="text-muted-foreground">Analise os custos e defina o preço final do produto</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Última Atualização</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumo de Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ingredientes</span>
              <Badge variant="outline">R$ {custoIngredientes.toFixed(2)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sub-receitas</span>
              <Badge variant="outline">R$ {custoSubReceitas.toFixed(2)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Embalagens</span>
              <Badge variant="outline">R$ {custoEmbalagens.toFixed(2)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Mão de Obra</span>
              <Badge variant="outline">R$ {valorTotalMaoObra.toFixed(2)}</Badge>
            </div>
            
            <hr className="my-3" />
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Custo Total</span>
              <Badge className="text-base font-bold">R$ {custoTotal.toFixed(2)}</Badge>
            </div>
          </div>

          {rendimentoValor && (
            <div className="pt-3 border-t">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Custo por Unidade</Label>
                <p className="text-lg font-bold text-primary">
                  R$ {(custoTotal / (parseFloat(rendimentoValor) || 1)).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baseado no rendimento: {rendimentoValor} {unidadesRendimento.find(u => u.value === rendimentoUnidade)?.label}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preço de Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço de Venda (R$/un.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="R$ 0,00"
              value={precoVenda}
              onChange={handlePrecoVendaChange}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        {/* Peso Unitário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Peso Unitário (g)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="Ex: 500"
              value={pesoUnitario}
              onChange={(e) => setPesoUnitario(e.target.value)}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        {/* Preço por KG */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {precoKg}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Markups Section */}
      {markups.length > 0 && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Markups Configurados
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Selecione qual markup usar para precificar esta receita. Apenas um markup pode estar ativo por receita.
            </p>
          </div>

          <div className="grid gap-4">
            {markups.map((markup) => {
              // Calculate markup based on entered price
              const markupFinal = precoNumerico > 0 ? precoNumerico / custoUnitario : 0;
              const precoSugerido = custoUnitario * markup.markup_ideal;
              
              // Calculate profit metrics
              const lucroBrutoUnitario = precoNumerico - custoUnitario;
              const lucroLiquidoEsperado = lucroBrutoUnitario * (markup.margem_lucro / 100);
              const faturamentoBruto = precoNumerico;
              
              // Calculate percentages
              const lucroBrutoPercent = precoNumerico > 0 ? (lucroBrutoUnitario / precoNumerico) * 100 : 0;
              const lucroLiquidoPercent = precoNumerico > 0 ? (lucroLiquidoEsperado / precoNumerico) * 100 : 0;

              const isSelected = markupSelecionado === markup.id;

              return (
                <Card 
                  key={markup.id} 
                  className={`transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/20'}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base capitalize">{markup.nome}</CardTitle>
                      <div className="flex gap-2 items-center">
                        <Badge variant={markup.tipo === 'sub_receita' ? 'secondary' : 'outline'}>
                          {markup.tipo === 'sub_receita' ? 'Sub-receita' : 'Normal'}
                        </Badge>
                        <Badge variant="outline">
                          {markup.periodo} meses
                        </Badge>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => salvarMarkupSelecionado(markup.id)}
                          className="ml-2"
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Markup Values */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="text-center p-3 bg-background rounded-lg border">
                         <p className="text-sm text-muted-foreground mb-1">Markup da Categoria</p>
                         <p className="text-lg font-bold text-primary">
                           {markup.markup_ideal.toLocaleString('pt-BR', { 
                             minimumFractionDigits: 4, 
                             maximumFractionDigits: 4 
                           })}
                         </p>
                       </div>
                       
                       <div className="text-center p-3 bg-background rounded-lg border">
                         <p className="text-sm text-muted-foreground mb-1">Markup Final</p>
                         <p className="text-lg font-bold text-secondary">
                           {precoNumerico > 0 ? `${markupFinal.toLocaleString('pt-BR', { 
                             minimumFractionDigits: 3, 
                             maximumFractionDigits: 3 
                           })}` : '0,000'}
                         </p>
                       </div>
                      
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">
                          Sugestão de Preço 
                          <span className="text-xs ml-1">(encargos: R$ {markup.encargos_sobre_venda.toFixed(2)})</span>
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(precoSugerido)}
                        </p>
                      </div>
                    </div>

                    {/* Receitas Table */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-medium text-primary pb-2 border-b">
                        <span>Receitas</span>
                        <div className="flex gap-8">
                          <span>Valor</span>
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Lucro Bruto (un.):</span>
                        <div className="flex gap-8 text-right">
                          <span className="w-20">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(lucroBrutoUnitario)}
                          </span>
                          <span className="w-12">{lucroBrutoPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Lucro Líq. Esperado (un.):</span>
                        <div className="flex gap-8 text-right">
                          <span className="w-20">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(lucroLiquidoEsperado)}
                          </span>
                          <span className="w-12">{lucroLiquidoPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm font-medium pt-2 border-t">
                        <span className="text-primary">Faturamento Bruto (total):</span>
                        <div className="flex gap-8 text-right">
                          <span className="w-20 text-primary font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(faturamentoBruto)}
                          </span>
                          <span className="w-12 text-primary font-bold">100%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
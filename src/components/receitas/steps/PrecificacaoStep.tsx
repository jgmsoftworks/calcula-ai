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
import { useToast } from '@/hooks/use-toast';

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
  markupSelecionado: string | null;
  precoVenda?: number; // Adicionar campo para preço de venda
}

interface PrecificacaoStepProps {
  receitaData: ReceitaData;
  receitaId?: string | null;
  onReceitaDataChange?: (data: ReceitaData | ((prev: ReceitaData) => ReceitaData)) => void;
}

export function PrecificacaoStep({ receitaData, receitaId, onReceitaDataChange }: PrecificacaoStepProps) {
  const [precoVenda, setPrecoVenda] = useState('');
  const [pesoUnitario, setPesoUnitario] = useState('');
  const [markups, setMarkups] = useState<MarkupData[]>([]);
  const [markupSelecionado, setMarkupSelecionado] = useState<string>('');
  const [markupsLoaded, setMarkupsLoaded] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Inicializar estado com markup da receita se estiver editando
  useEffect(() => {
    if (receitaData.markupSelecionado && receitaData.markupSelecionado !== markupSelecionado) {
      setMarkupSelecionado(receitaData.markupSelecionado);
    }
  }, [receitaData.markupSelecionado]);

  const salvarMarkupSelecionado = async (markupId: string) => {
    if (!user?.id) return;

    console.log('🎯 Selecionando markup:', markupId);
    console.log('📊 Estado atual - custoUnitario:', custoUnitario);
    console.log('📊 Estado atual - markups:', markups);
    console.log('📊 Estado atual - receitaId:', receitaId);
    
    try {
      const markupSelecionadoData = markups.find(m => m.id === markupId);
      console.log('📊 Dados do markup selecionado:', markupSelecionadoData);
      
      let precoCalculado = 0;
      
      // Calcular preço baseado no tipo de markup
      if (markupSelecionadoData) {
        console.log('🎯 Markup selecionado encontrado:', markupSelecionadoData.nome, 'Tipo:', markupSelecionadoData.tipo);
        
        if (custoUnitario > 0) {
          console.log('💰 Custo unitário:', custoUnitario);
          
          if (markupSelecionadoData.tipo === 'sub_receita') {
            // Para sub-receitas, preço = custo (sem lucro)
            precoCalculado = custoUnitario;
            console.log('🏷️ Sub-receita: Preço = Custo (sem lucro):', precoCalculado);
          } else {
            // Para outros markups, aplicar o markup_ideal
            console.log('📈 Markup ideal:', markupSelecionadoData.markup_ideal);
            precoCalculado = custoUnitario * markupSelecionadoData.markup_ideal;
            console.log('💲 Preço calculado com markup:', precoCalculado);
          }
          console.log('✅ Preço > 0?', precoCalculado > 0);
          
          // Formatar e definir o preço de venda
          const precoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(precoCalculado);
          
          console.log('🎨 Preço formatado:', precoFormatado);
          setPrecoVenda(precoFormatado);
        }
      }

      // Preparar dados para salvamento
      const updateData: { markup_id: string; preco_venda?: number } = {
        markup_id: markupId
      };
      
      // Para sub-receitas, sempre salvar o preço calculado
      if (markupSelecionadoData?.tipo === 'sub_receita') {
        updateData.preco_venda = precoCalculado;
        console.log('💾 Preparando para salvar preço de sub-receita:', precoCalculado);
        console.log('🔍 Condições para salvar - receitaId existe?', !!receitaId, 'precoCalculado > 0?', precoCalculado > 0);
      }

      // Se estamos editando uma receita existente, salvar no banco
      if (receitaId) {
        console.log('📝 Editando receita existente, ID:', receitaId);
        console.log('📦 Dados para atualização:', updateData);
        
        const { data, error } = await supabase
          .from('receitas')
          .update(updateData)
          .eq('id', receitaId)
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('❌ Erro ao salvar markup:', error);
          toast({
            title: "Erro",
            description: "Não foi possível salvar o markup selecionado",
            variant: "destructive",
          });
          return;
        }
        
        console.log('✅ Markup e preço salvos no banco:', data);
      } else {
        console.log('⚠️ Não é edição (receitaId é null), dados preparados para salvamento futuro');
      }
      
      // Para receitas novas, atualizar o estado compartilhado com o preço calculado
      if (!receitaId && onReceitaDataChange && markupSelecionadoData?.tipo === 'sub_receita') {
        onReceitaDataChange(prev => ({
          ...prev,
          markupSelecionado: markupId,
          precoVenda: precoCalculado // Adicionar preço ao estado compartilhado
        }));
        console.log('📤 Preço de sub-receita adicionado ao estado compartilhado:', precoCalculado);
      }

      // Sempre atualizar o estado local (tanto para criação quanto edição)
      setMarkupSelecionado(markupId);
      
      // Se houver callback, atualizar o estado compartilhado também
      if (onReceitaDataChange) {
        onReceitaDataChange(prev => ({
          ...prev,
          markupSelecionado: markupId
        }));
      }
      
      toast({
        title: "Sucesso",
        description: "Markup selecionado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar markup:', error);
    }
  };
  
  // Fetch markups from database
  useEffect(() => {
    const fetchMarkups = async () => {
      if (!user?.id || markupsLoaded) return;
      
      console.log('🔍 Buscando markups do banco...');
      setMarkupsLoaded(true);
      
      try {
        // Verificar se há sub-receitas na receita
        const hasSubReceitas = receitaData.subReceitas && receitaData.subReceitas.length > 0;
        console.log('🔄 Tem sub-receitas?', hasSubReceitas, 'Quantidade:', receitaData.subReceitas?.length);
        
        // SEMPRE criar/verificar markup de sub-receitas no banco (para aparecer na lista mesmo sem sub-receitas)
        {
          console.log('🔍 Verificando markup de sub-receitas existente...');
          const { data: existingSubMarkup, error: selectError } = await supabase
            .from('markups')
            .select('*')
            .eq('user_id', user.id)
            .eq('tipo', 'sub_receita')
            .eq('ativo', true)
            .maybeSingle();
            
          console.log('📋 Markup existente:', existingSubMarkup, 'Erro:', selectError);
            
          if (!existingSubMarkup) {
            console.log('➕ Criando markup de sub-receitas no banco...');
            const { data: newMarkup, error: insertError } = await supabase
              .from('markups')
              .insert({
                user_id: user.id,
                nome: 'Sub-receitas',
                tipo: 'sub_receita',
                periodo: 'todos',
                margem_lucro: 0,
                gasto_sobre_faturamento: 0,
                encargos_sobre_venda: 0,
                markup_ideal: 1.0000, // Sem lucro para sub-receitas
                markup_aplicado: 1.0000,
                preco_sugerido: 0,
                ativo: true,
                despesas_fixas_selecionadas: [],
                encargos_venda_selecionados: [],
                folha_pagamento_selecionada: []
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('❌ Erro ao criar markup de sub-receitas:', insertError);
            } else {
              console.log('✅ Markup de sub-receitas criado:', newMarkup);
            }
          } else {
            console.log('✅ Markup de sub-receitas já existe:', existingSubMarkup.nome);
            
            // Verificar e corrigir markup se estiver incorreto
            if (existingSubMarkup.markup_ideal !== 1.0000 || existingSubMarkup.margem_lucro !== 0) {
              console.log('🔧 Corrigindo markup de sub-receitas...');
              const { error: updateError } = await supabase
                .from('markups')
                .update({
                  margem_lucro: 0,
                  markup_ideal: 1.0000,
                  markup_aplicado: 1.0000
                })
                .eq('id', existingSubMarkup.id);
                
              if (updateError) {
                console.error('❌ Erro ao corrigir markup de sub-receitas:', updateError);
              } else {
                console.log('✅ Markup de sub-receitas corrigido');
              }
            }
          }
        }
        
        const { data, error } = await supabase
          .from('markups')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('tipo', { ascending: false }) // sub_receita primeiro
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar markups:', error);
          setMarkupsLoaded(false);
          return;
        }
        
        console.log('📦 Markups encontrados no banco:', data?.length || 0);
        console.log('📋 Detalhes dos markups:', data?.map(m => ({ nome: m.nome, tipo: m.tipo, id: m.id })));
        
        if (!data || data.length === 0) {
          console.log('⚠️ Nenhum markup encontrado no banco');
          setMarkups([]);
          return;
        }
        
        // Remove duplicados usando Map para garantir unicidade por nome
        const markupsMap = new Map();
        (data || []).forEach(markup => {
          if (!markupsMap.has(markup.nome)) {
            markupsMap.set(markup.nome, markup);
          }
        });
        
        const uniqueMarkups = Array.from(markupsMap.values());
        console.log('✨ Markups únicos após filtro:', uniqueMarkups.length, uniqueMarkups.map(m => `${m.nome} (${m.tipo})`));
        
        setMarkups(uniqueMarkups);
      } catch (error) {
        console.error('Erro ao buscar markups:', error);
        setMarkupsLoaded(false);
      }
    };
    
    fetchMarkups();
  }, [user?.id, receitaData.subReceitas?.length, markupsLoaded]);

  // Reset loaded state when recipe data changes to force reload
  useEffect(() => {
    setMarkupsLoaded(false);
  }, [receitaId, receitaData.subReceitas?.length]);

  // Buscar markup e preço selecionado da receita
  useEffect(() => {
    const fetchReceitaMarkup = async () => {
      if (!receitaId || !user?.id) return;

      try {
        const { data, error } = await supabase
          .from('receitas')
          .select('markup_id, preco_venda')
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
        
        if (data?.preco_venda && data.preco_venda > 0) {
          console.log('📥 Carregando preço do banco:', data.preco_venda);
          const precoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(data.preco_venda);
          setPrecoVenda(precoFormatado);
          console.log('🎨 Preço formatado carregado:', precoFormatado);
        } else {
          console.log('⚠️ Nenhum preço salvo encontrado no banco');
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
      maximumFractionDigits: 2,
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

  // Calculate unit cost based on yield
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
                <Label className="text-sm font-medium">
                  {rendimentoUnidade === 'grama' ? 'Custo por Grama' : 'Custo por Unidade'}
                </Label>
                <p className="text-lg font-bold text-primary">
                  R$ {custoUnitario.toFixed(4)}
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
              disabled={markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita'}
              className={`text-lg font-medium ${markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita' ? 'bg-muted cursor-not-allowed' : ''}`}
            />
            {markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita' && (
              <p className="text-xs text-muted-foreground mt-1">
                Preço definido automaticamente pelo markup de sub-receitas. Selecione outro markup para editar.
              </p>
            )}
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
            {/* Filtro adicional durante render para garantir unicidade */}
            {markups.filter((markup, index, self) => 
              index === self.findIndex(m => m.nome === markup.nome)
            ).map((markup) => {
              // Calculate markup based on entered price - use only unit cost from yield
              const markupFinal = precoNumerico > 0 ? precoNumerico / custoUnitario : 0;
              const precoSugerido = custoUnitario * markup.markup_ideal;
              
              // Calculate profit metrics using unit cost (not affected by unit weight)
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
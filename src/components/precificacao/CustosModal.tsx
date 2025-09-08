import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUserConfigurations } from '@/hooks/useUserConfigurations';

interface MarkupBlock {
  id: string;
  nome: string;
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  lucroDesejado: number;
}

interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  ativo: boolean;
}

interface FolhaPagamento {
  id: string;
  nome: string;
  custo_por_hora: number;
  ativo: boolean;
  salario_base: number;
  horas_totais_mes: number;
}

interface EncargoVenda {
  id: string;
  nome: string;
  valor: number;
  tipo: string;
  valor_percentual: number;
  valor_fixo: number;
  ativo: boolean;
}

interface CustosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markupBlock?: MarkupBlock;
  onMarkupUpdate?: (markupData: Partial<MarkupBlock>) => void;
}

export function CustosModal({ open, onOpenChange, markupBlock, onMarkupUpdate }: CustosModalProps) {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>([]);
  const [encargosVenda, setEncargosVenda] = useState<EncargoVenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadConfiguration, saveConfiguration } = useUserConfigurations();

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Carregando dados para o usuário:', user.id);
      
      // Carregar despesas fixas
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas_fixas')
        .select('id, nome, valor, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (despesasError) {
        console.error('Erro ao carregar despesas fixas:', despesasError);
        throw despesasError;
      }
      console.log('Despesas fixas carregadas:', despesas);
      setDespesasFixas(despesas || []);

      // Carregar folha de pagamento (apenas mão de obra indireta)
      const { data: folha, error: folhaError } = await supabase
        .from('folha_pagamento')
        .select('id, nome, custo_por_hora, ativo, tipo_mao_obra, salario_base, horas_totais_mes')
        .eq('user_id', user.id)
        .eq('tipo_mao_obra', 'indireta')
        .eq('ativo', true)
        .order('nome');

      if (folhaError) {
        console.error('Erro ao carregar folha de pagamento:', folhaError);
        throw folhaError;
      }
      console.log('Folha de pagamento carregada:', folha);
      setFolhaPagamento(folha || []);

      // Carregar encargos sobre venda
      const { data: encargos, error: encargosError } = await supabase
        .from('encargos_venda')
        .select('id, nome, valor, tipo, valor_percentual, valor_fixo, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (encargosError) {
        console.error('Erro ao carregar encargos sobre venda:', encargosError);
        throw encargosError;
      }
      console.log('Encargos sobre venda carregados:', encargos);
      
      // Mapear os dados para incluir os novos campos
      const encargosFormatados = (encargos || []).map(encargo => ({
        ...encargo,
        valor_percentual: encargo.valor_percentual || 0,
        valor_fixo: encargo.valor_fixo || 0
      }));
      
      setEncargosVenda(encargosFormatados);

      // Carregar estados dos checkboxes salvos
      const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
      console.log('Carregando config com chave:', configKey);
      const savedStates = await loadConfiguration(configKey);
      console.log('Estados salvos carregados:', savedStates);
      
      if (savedStates && typeof savedStates === 'object') {
        console.log('Usando estados salvos');
        setCheckboxStates(savedStates as Record<string, boolean>);
      } else {
        // Inicializar com todos marcados por padrão
        console.log('Inicializando com estados padrão');
        const defaultStates: Record<string, boolean> = {};
        [...(despesas || []), ...(folha || []), ...encargosFormatados].forEach(item => {
          defaultStates[item.id] = true;
        });
        console.log('Estados padrão criados:', defaultStates);
        setCheckboxStates(defaultStates);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de custos",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open, user]);

  // Escutar mudanças em tempo real nas tabelas
  useEffect(() => {
    if (!user || !open) return;

    let timeoutId: NodeJS.Timeout;
    
    const debouncedReload = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        carregarDados();
      }, 300); // Debounce de 300ms
    };

    const channel = supabase
      .channel('custos-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'despesas_fixas', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'folha_pagamento', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'encargos_venda', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user, open]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCheckboxChange = async (itemId: string, checked: boolean) => {
    const newStates = { ...checkboxStates, [itemId]: checked };
    setCheckboxStates(newStates);
    
    // Salvar estados no banco
    const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
    await saveConfiguration(configKey, newStates);
    
    // Calcular e atualizar markup
    calcularMarkup(newStates);
  };

  const calcularMarkup = (states: Record<string, boolean>) => {
    if (!onMarkupUpdate) {
      console.log('onMarkupUpdate não existe');
      return;
    }

    console.log('Calculando markup com estados:', states);
    const encargosConsiderados = encargosVenda.filter(e => states[e.id]);
    console.log('Encargos considerados:', encargosConsiderados);
    
    // Calcular somas por categoria
    const categorias = {
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0
    };

    encargosConsiderados.forEach(encargo => {
      const categoria = getCategoriaByNome(encargo.nome);
      const valor = encargo.valor_percentual || 0;
      console.log(`${encargo.nome} -> categoria: ${categoria}, valor: ${valor}%`);
      
      switch (categoria) {
        case 'impostos':
          categorias.impostos += valor;
          break;
        case 'meios_pagamento':
          categorias.taxasMeiosPagamento += valor;
          break;
        case 'comissoes':
          categorias.comissoesPlataformas += valor;
          break;
        case 'outros':
          categorias.outros += valor;
          break;
      }
    });

    console.log('Categorias calculadas:', categorias);
    onMarkupUpdate(categorias);
  };

  const getCategoriaByNome = (nome: string): 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros' => {
    const impostos = ['ICMS', 'ISS', 'PIS/COFINS', 'IRPJ/CSLL', 'IPI'];
    const meiosPagamento = ['Cartão de débito', 'Cartão de crédito', 'Boleto bancário', 'PIX', 'Gateway de pagamento'];
    const comissoes = ['Marketing', 'Aplicativo de delivery', 'Plataforma SaaS', 'Colaboradores (comissão)'];

    if (impostos.includes(nome)) return 'impostos';
    if (meiosPagamento.includes(nome)) return 'meios_pagamento';
    if (comissoes.includes(nome)) return 'comissoes';
    return 'outros';
  };

  // Calcular markup sempre que os estados mudarem
  useEffect(() => {
    console.log('useEffect calcularMarkup - estados:', checkboxStates, 'encargos:', encargosVenda.length);
    if (Object.keys(checkboxStates).length > 0 && encargosVenda.length > 0) {
      calcularMarkup(checkboxStates);
    }
  }, [checkboxStates, encargosVenda]);

  const renderEncargosPorCategoria = (categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros', titulo: string) => {
    const encargosDaCategoria = encargosVenda.filter(e => getCategoriaByNome(e.nome) === categoria);
    
    if (encargosDaCategoria.length === 0) return null;

    return (
      <div key={categoria} className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {titulo}
        </h4>
        <div className="space-y-2">
           {encargosDaCategoria.map((encargo) => (
            <div key={encargo.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h5 className="font-medium">{encargo.nome}</h5>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {encargo.valor_percentual > 0 && encargo.valor_fixo > 0 ? (
                    <>
                      <span>{encargo.valor_percentual}%</span>
                      <span>{formatCurrency(encargo.valor_fixo)}</span>
                    </>
                  ) : encargo.valor_percentual > 0 ? (
                    <span>{encargo.valor_percentual}%</span>
                  ) : encargo.valor_fixo > 0 ? (
                    <span>{formatCurrency(encargo.valor_fixo)}</span>
                  ) : (
                    <span>0% / R$ 0,00</span>
                  )}
                </div>
              </div>
                       <div className="flex items-center gap-3">
                         <Checkbox 
                           id={`encargo-${encargo.id}`}
                           checked={checkboxStates[encargo.id] ?? true}
                           onCheckedChange={(checked) => handleCheckboxChange(encargo.id, checked as boolean)}
                         />
                         <Label 
                           htmlFor={`encargo-${encargo.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
            </div>
          ))}
                      </div>
        {categoria !== 'outros' && <Separator />}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurações de Custos
            {markupBlock && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {markupBlock.nome}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Visualize os custos que serão considerados no cálculo do markup
          </DialogDescription>
        </DialogHeader>

        {markupBlock && (
          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Valores do Bloco de Markup</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Gasto sobre faturamento</Label>
                <p className="text-lg font-semibold text-blue-600">{markupBlock.gastoSobreFaturamento}%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Impostos</Label>
                <p className="text-lg font-semibold text-blue-600">{markupBlock.impostos}%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Taxas de pagamento</Label>
                <p className="text-lg font-semibold text-blue-600">{markupBlock.taxasMeiosPagamento}%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Comissões</Label>
                <p className="text-lg font-semibold text-blue-600">{markupBlock.comissoesPlataformas}%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Outros</Label>
                <p className="text-lg font-semibold text-blue-600">{markupBlock.outros}%</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Lucro desejado</Label>
                <p className="text-lg font-semibold text-green-600">{markupBlock.lucroDesejado}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="despesas-fixas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="despesas-fixas">Despesas Fixas</TabsTrigger>
            <TabsTrigger value="folha-pagamento">Folha de Pagamento</TabsTrigger>
            <TabsTrigger value="encargos-venda">Encargos sobre Venda</TabsTrigger>
          </TabsList>

          <TabsContent value="despesas-fixas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Despesas Fixas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando despesas...
                  </p>
                ) : despesasFixas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhuma despesa fixa cadastrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione despesas na aba "Custos" para vê-las aqui
                    </p>
                  </div>
                ) : (
                  despesasFixas.map((despesa) => (
                    <div key={despesa.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{despesa.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(despesa.valor)}
                        </p>
                      </div>
                       <div className="flex items-center gap-3">
                         <Checkbox 
                           id={`despesa-${despesa.id}`}
                           checked={checkboxStates[despesa.id] ?? true}
                           onCheckedChange={(checked) => handleCheckboxChange(despesa.id, checked as boolean)}
                         />
                         <Label 
                           htmlFor={`despesa-${despesa.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folha-pagamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Folha de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando funcionários...
                  </p>
                ) : folhaPagamento.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhum funcionário cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione funcionários na aba "Custos" para vê-los aqui
                    </p>
                  </div>
                ) : (
                  folhaPagamento.map((funcionario) => (
                    <div key={funcionario.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{funcionario.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(funcionario.salario_base || 0)} total
                        </p>
                      </div>
                       <div className="flex items-center gap-3">
                         <Checkbox 
                           id={`funcionario-${funcionario.id}`}
                           checked={checkboxStates[funcionario.id] ?? true}
                           onCheckedChange={(checked) => handleCheckboxChange(funcionario.id, checked as boolean)}
                         />
                         <Label 
                           htmlFor={`funcionario-${funcionario.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="encargos-venda" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Encargos sobre Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando encargos...
                  </p>
                ) : encargosVenda.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhum encargo cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione encargos na aba "Custos" para vê-los aqui
                    </p>
                  </div>
                ) : (
                  <>
                    {renderEncargosPorCategoria('impostos', 'Impostos')}
                    {renderEncargosPorCategoria('meios_pagamento', 'Taxas de Meios de Pagamento')}
                    {renderEncargosPorCategoria('comissoes', 'Comissões e Plataformas')}
                    {renderEncargosPorCategoria('outros', 'Outros')}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
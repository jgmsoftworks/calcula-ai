import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MarkupBlockData {
  id: string;
  nome: string;
  lucroDesejado: number;
}

interface CustosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markupBlock?: MarkupBlockData | null;
  onSuccess?: (block: MarkupBlockData) => void;
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
  valor_percentual: number;
  valor_fixo: number;
  ativo: boolean;
}

export function CustosModal({ open, onOpenChange, markupBlock, onSuccess }: CustosModalProps) {
  const [loading, setLoading] = useState(false);
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>([]);
  const [encargosVenda, setEncargosVenda] = useState<EncargoVenda[]>([]);
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({});
  const [filtroPerido, setFiltroPerido] = useState<string>('12');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();

  // Carregar período salvo
  useEffect(() => {
    if (markupBlock && open) {
      loadConfiguration(`filtro-periodo-${markupBlock.id}`)
        .then(periodo => {
          if (periodo && typeof periodo === 'string') {
            setFiltroPerido(periodo);
          }
        })
        .catch(console.error);
    }
  }, [markupBlock, open, loadConfiguration]);

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!user || !open) return;
    
    setLoading(true);
    try {
      // Carregar dados das tabelas
      const [despesasRes, folhaRes, encargosRes] = await Promise.all([
        supabase
          .from('despesas_fixas')
          .select('id, nome, valor, ativo')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('folha_pagamento')
          .select('id, nome, custo_por_hora, ativo, salario_base, horas_totais_mes')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('encargos_venda')
          .select('id, nome, valor_percentual, valor_fixo, ativo')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome')
      ]);

      setDespesasFixas(despesasRes.data || []);
      setFolhaPagamento(folhaRes.data || []);
      setEncargosVenda(encargosRes.data || []);

      // Carregar configurações salvas
      if (markupBlock) {
        const configKey = `checkbox-states-${markupBlock.id}`;
        const savedStates = await loadConfiguration(configKey);
        
        if (savedStates && typeof savedStates === 'object') {
          setCheckboxStates(savedStates as Record<string, boolean>);
        } else {
          // Configuração padrão: todos desmarcados
          const defaultStates: Record<string, boolean> = {};
          [...(despesasRes.data || []), ...(folhaRes.data || []), ...(encargosRes.data || [])].forEach(item => {
            defaultStates[item.id] = false;
          });
          setCheckboxStates(defaultStates);
        }
      } else {
        // Para novo bloco: todos desmarcados por padrão
        const defaultStates: Record<string, boolean> = {};
        [...(despesasRes.data || []), ...(folhaRes.data || []), ...(encargosRes.data || [])].forEach(item => {
          defaultStates[item.id] = false;
        });
        setCheckboxStates(defaultStates);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de custos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, open, markupBlock, loadConfiguration, toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Função para alternar checkbox
  const toggleCheckbox = (id: string, checked: boolean) => {
    setCheckboxStates(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  // Função para selecionar/desselecionar todos
  const toggleSelectAll = (categoria: 'despesas' | 'folha' | 'encargos', checked: boolean) => {
    const items = categoria === 'despesas' ? despesasFixas :
                  categoria === 'folha' ? folhaPagamento : encargosVenda;
    
    const newStates = { ...checkboxStates };
    items.forEach(item => {
      newStates[item.id] = checked;
    });
    setCheckboxStates(newStates);
  };

  // Verificar se todos estão selecionados
  const isAllSelected = (categoria: 'despesas' | 'folha' | 'encargos') => {
    const items = categoria === 'despesas' ? despesasFixas :
                  categoria === 'folha' ? folhaPagamento : encargosVenda;
    
    return items.every(item => checkboxStates[item.id]);
  };

  // Salvar e fechar
  const handleSalvar = async () => {
    try {
      const blockToSave: MarkupBlockData = markupBlock || {
        id: Date.now().toString(),
        nome: `Markup ${Date.now()}`,
        lucroDesejado: 20
      };

      // Salvar configurações de checkboxes
      const configKey = `checkbox-states-${blockToSave.id}`;
      await saveConfiguration(configKey, checkboxStates);

      // Salvar período selecionado
      await saveConfiguration(`filtro-periodo-${blockToSave.id}`, filtroPerido);

      // Chamar callback de sucesso
      onSuccess?.(blockToSave);
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calcularCustoFolha = (funcionario: FolhaPagamento) => {
    return funcionario.custo_por_hora > 0 
      ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
      : funcionario.salario_base;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {markupBlock ? `Configurar ${markupBlock.nome}` : 'Novo Markup'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Seletor de Período */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Período de Cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={filtroPerido} onValueChange={setFiltroPerido}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Último mês</SelectItem>
                    <SelectItem value="3">Últimos 3 meses</SelectItem>
                    <SelectItem value="6">Últimos 6 meses</SelectItem>
                    <SelectItem value="12">Últimos 12 meses</SelectItem>
                    <SelectItem value="todos">Todos os períodos</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Tabs com custos */}
            <Tabs defaultValue="despesas" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="despesas">Despesas Fixas</TabsTrigger>
                <TabsTrigger value="folha">Folha de Pagamento</TabsTrigger>
                <TabsTrigger value="encargos">Encargos sobre Venda</TabsTrigger>
              </TabsList>

              <TabsContent value="despesas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Despesas Fixas</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-despesas"
                          checked={isAllSelected('despesas')}
                          onCheckedChange={(checked) => toggleSelectAll('despesas', checked as boolean)}
                        />
                        <label htmlFor="select-all-despesas" className="text-sm font-medium cursor-pointer">
                          Selecionar todos
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {despesasFixas.map((despesa) => (
                      <div key={despesa.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={checkboxStates[despesa.id] || false}
                            onCheckedChange={(checked) => toggleCheckbox(despesa.id, checked as boolean)}
                          />
                          <span className="text-sm">{despesa.nome}</span>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(despesa.valor)}
                        </Badge>
                      </div>
                    ))}
                    {despesasFixas.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma despesa fixa encontrada
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="folha" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Folha de Pagamento</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-folha"
                          checked={isAllSelected('folha')}
                          onCheckedChange={(checked) => toggleSelectAll('folha', checked as boolean)}
                        />
                        <label htmlFor="select-all-folha" className="text-sm font-medium cursor-pointer">
                          Selecionar todos
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {folhaPagamento.map((funcionario) => (
                      <div key={funcionario.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={checkboxStates[funcionario.id] || false}
                            onCheckedChange={(checked) => toggleCheckbox(funcionario.id, checked as boolean)}
                          />
                          <span className="text-sm">{funcionario.nome}</span>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(calcularCustoFolha(funcionario))}
                        </Badge>
                      </div>
                    ))}
                    {folhaPagamento.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum funcionário encontrado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="encargos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Encargos sobre Venda</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-encargos"
                          checked={isAllSelected('encargos')}
                          onCheckedChange={(checked) => toggleSelectAll('encargos', checked as boolean)}
                        />
                        <label htmlFor="select-all-encargos" className="text-sm font-medium cursor-pointer">
                          Selecionar todos
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {encargosVenda.map((encargo) => (
                      <div key={encargo.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={checkboxStates[encargo.id] || false}
                            onCheckedChange={(checked) => toggleCheckbox(encargo.id, checked as boolean)}
                          />
                          <span className="text-sm">{encargo.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {encargo.valor_percentual > 0 && (
                            <Badge variant="outline">{encargo.valor_percentual}%</Badge>
                          )}
                          {encargo.valor_fixo > 0 && (
                            <Badge variant="outline">{formatCurrency(encargo.valor_fixo)}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {encargosVenda.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum encargo encontrado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
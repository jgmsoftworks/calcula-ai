import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
}

interface EncargoVenda {
  id: string;
  nome: string;
  valor: number;
  tipo: string;
  ativo: boolean;
}

interface CustosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markupBlock?: MarkupBlock;
}

export function CustosModal({ open, onOpenChange, markupBlock }: CustosModalProps) {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>([]);
  const [encargosVenda, setEncargosVenda] = useState<EncargoVenda[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar despesas fixas
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas_fixas')
        .select('id, nome, valor, ativo')
        .eq('user_id', user.id)
        .order('nome');

      if (despesasError) throw despesasError;
      setDespesasFixas(despesas || []);

      // Carregar folha de pagamento
      const { data: folha, error: folhaError } = await supabase
        .from('folha_pagamento')
        .select('id, nome, custo_por_hora, ativo')
        .eq('user_id', user.id)
        .order('nome');

      if (folhaError) throw folhaError;
      setFolhaPagamento(folha || []);

      // Carregar encargos sobre venda
      const { data: encargos, error: encargosError } = await supabase
        .from('encargos_venda')
        .select('id, nome, valor, tipo, ativo')
        .eq('user_id', user.id)
        .order('nome');

      if (encargosError) throw encargosError;
      setEncargosVenda(encargos || []);

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

  const toggleDespesaFixa = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('despesas_fixas')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      setDespesasFixas(prev => 
        prev.map(item => item.id === id ? { ...item, ativo } : item)
      );

      toast({
        title: ativo ? "Item ativado" : "Item desativado",
        description: "Configuração atualizada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar despesa fixa:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o item",
        variant: "destructive"
      });
    }
  };

  const toggleFolhaPagamento = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('folha_pagamento')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      setFolhaPagamento(prev => 
        prev.map(item => item.id === id ? { ...item, ativo } : item)
      );

      toast({
        title: ativo ? "Item ativado" : "Item desativado",
        description: "Configuração atualizada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar folha de pagamento:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o item",
        variant: "destructive"
      });
    }
  };

  const toggleEncargoVenda = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      setEncargosVenda(prev => 
        prev.map(item => item.id === id ? { ...item, ativo } : item)
      );

      toast({
        title: ativo ? "Item ativado" : "Item desativado",
        description: "Configuração atualizada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar encargo sobre venda:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o item",
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
                {despesasFixas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma despesa fixa cadastrada
                  </p>
                ) : (
                  despesasFixas.map((despesa) => (
                    <div key={despesa.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{despesa.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(despesa.valor)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`despesa-${despesa.id}`}>
                          {despesa.ativo ? 'Ativo' : 'Inativo'}
                        </Label>
                        <Switch
                          id={`despesa-${despesa.id}`}
                          checked={despesa.ativo}
                          onCheckedChange={(checked) => toggleDespesaFixa(despesa.id, checked)}
                        />
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
                {folhaPagamento.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum funcionário cadastrado
                  </p>
                ) : (
                  folhaPagamento.map((funcionario) => (
                    <div key={funcionario.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{funcionario.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(funcionario.custo_por_hora)}/hora
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`funcionario-${funcionario.id}`}>
                          {funcionario.ativo ? 'Ativo' : 'Inativo'}
                        </Label>
                        <Switch
                          id={`funcionario-${funcionario.id}`}
                          checked={funcionario.ativo}
                          onCheckedChange={(checked) => toggleFolhaPagamento(funcionario.id, checked)}
                        />
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
              <CardContent className="space-y-4">
                {encargosVenda.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum encargo cadastrado
                  </p>
                ) : (
                  encargosVenda.map((encargo) => (
                    <div key={encargo.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{encargo.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {encargo.tipo === 'percentual' ? `${encargo.valor}%` : formatCurrency(encargo.valor)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`encargo-${encargo.id}`}>
                          {encargo.ativo ? 'Ativo' : 'Inativo'}
                        </Label>
                        <Switch
                          id={`encargo-${encargo.id}`}
                          checked={encargo.ativo}
                          onCheckedChange={(checked) => toggleEncargoVenda(encargo.id, checked)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
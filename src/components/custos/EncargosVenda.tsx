import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EncargoItem {
  id?: string;
  nome: string;
  valor: number;
  tipo: 'percentual' | 'fixo';
  categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros';
  ativo: boolean;
}

export const EncargosVenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [encargos, setEncargos] = useState<EncargoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Encargos padrão por categoria
  const encargosDefault = {
    impostos: [
      { nome: 'ICMS', valor: 0, tipo: 'percentual' as const },
      { nome: 'ISS', valor: 0, tipo: 'percentual' as const },
      { nome: 'PIS/COFINS', valor: 0, tipo: 'percentual' as const },
      { nome: 'IRPJ/CSLL', valor: 0, tipo: 'percentual' as const },
      { nome: 'IPI', valor: 0, tipo: 'percentual' as const },
    ],
    meios_pagamento: [
      { nome: 'Cartão de débito', valor: 0, tipo: 'percentual' as const },
      { nome: 'Cartão de crédito', valor: 0, tipo: 'percentual' as const },
      { nome: 'Boleto bancário', valor: 0, tipo: 'percentual' as const },
      { nome: 'PIX', valor: 0, tipo: 'percentual' as const },
      { nome: 'Gateway de pagamento', valor: 0, tipo: 'percentual' as const },
    ],
    comissoes: [
      { nome: 'Marketing', valor: 0, tipo: 'percentual' as const },
      { nome: 'Aplicativo de delivery', valor: 0, tipo: 'percentual' as const },
      { nome: 'Plataforma SaaS', valor: 0, tipo: 'percentual' as const },
      { nome: 'Colaboradores (comissão)', valor: 0, tipo: 'percentual' as const },
    ],
    outros: []
  };

  useEffect(() => {
    if (user) {
      carregarEncargos();
    }
  }, [user]);

  const carregarEncargos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('encargos_venda')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;

      console.log('Encargos carregados:', data);

      if (data && data.length > 0) {
        const encargosFormatados = data.map(item => ({
          id: item.id,
          nome: item.nome,
          valor: item.valor,
          tipo: item.tipo as 'percentual' | 'fixo',
          categoria: getCategoriaByNome(item.nome),
          ativo: item.ativo
        }));
        setEncargos(encargosFormatados);
      } else {
        // Se não há dados, inicializar com encargos padrão
        await inicializarEncargosDefault();
      }
    } catch (error) {
      console.error('Erro ao carregar encargos:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os encargos salvos",
        variant: "destructive"
      });
    }
    setLoading(false);
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

  const inicializarEncargosDefault = async () => {
    if (!user) return;

    const todosEncargos = [
      ...encargosDefault.impostos.map(e => ({ ...e, categoria: 'impostos' as const })),
      ...encargosDefault.meios_pagamento.map(e => ({ ...e, categoria: 'meios_pagamento' as const })),
      ...encargosDefault.comissoes.map(e => ({ ...e, categoria: 'comissoes' as const })),
    ];

    try {
      const { data, error } = await supabase
        .from('encargos_venda')
        .insert(
          todosEncargos.map(encargo => ({
            user_id: user.id,
            nome: encargo.nome,
            valor: encargo.valor,
            tipo: encargo.tipo,
            ativo: true
          }))
        )
        .select();

      if (error) throw error;

      if (data) {
        const encargosFormatados = data.map(item => ({
          id: item.id,
          nome: item.nome,
          valor: item.valor,
          tipo: item.tipo as 'percentual' | 'fixo',
          categoria: getCategoriaByNome(item.nome),
          ativo: item.ativo
        }));
        setEncargos(encargosFormatados);
      }
    } catch (error) {
      console.error('Erro ao inicializar encargos:', error);
    }
  };

  const salvarEncargo = async (encargo: EncargoItem) => {
    if (!user) return;

    try {
      if (encargo.id) {
        // Atualizar existente
        const { error } = await supabase
          .from('encargos_venda')
          .update({
            valor: encargo.valor,
            tipo: encargo.tipo,
            ativo: encargo.ativo
          })
          .eq('id', encargo.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('encargos_venda')
          .insert({
            user_id: user.id,
            nome: encargo.nome,
            valor: encargo.valor,
            tipo: encargo.tipo,
            ativo: encargo.ativo
          })
          .select()
          .single();

        if (error) throw error;

        // Atualizar o encargo com o ID retornado
        setEncargos(prev => 
          prev.map(e => 
            e.nome === encargo.nome ? { ...e, id: data.id } : e
          )
        );
      }

      toast({
        title: "Encargo salvo",
        description: "As alterações foram salvas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar encargo:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o encargo",
        variant: "destructive"
      });
    }
  };

  const atualizarEncargo = (nome: string, valor: number, tipo: 'percentual' | 'fixo') => {
    const encargoAtualizado = encargos.find(e => e.nome === nome);
    if (encargoAtualizado) {
      const novoEncargo = { ...encargoAtualizado, valor, tipo };
      setEncargos(prev => 
        prev.map(e => e.nome === nome ? novoEncargo : e)
      );
      salvarEncargo(novoEncargo);
    }
  };

  const atualizarNomeEncargo = async (id: string, novoNome: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ nome: novoNome })
        .eq('id', id);

      if (error) throw error;

      setEncargos(prev => 
        prev.map(e => e.id === id ? { ...e, nome: novoNome } : e)
      );
      
      toast({
        title: "Nome atualizado",
        description: "O nome do encargo foi alterado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar nome do encargo:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o nome do encargo",
        variant: "destructive"
      });
    }
  };

  const adicionarOutroEncargo = async () => {
    if (!user) return;

    const novoNome = `Novo encargo ${Date.now()}`;
    const novoEncargo: EncargoItem = {
      nome: novoNome,
      valor: 0,
      tipo: 'percentual',
      categoria: 'outros',
      ativo: true
    };

    try {
      const { data, error } = await supabase
        .from('encargos_venda')
        .insert({
          user_id: user.id,
          nome: novoEncargo.nome,
          valor: novoEncargo.valor,
          tipo: novoEncargo.tipo,
          ativo: novoEncargo.ativo
        })
        .select()
        .single();

      if (error) throw error;

      setEncargos(prev => [...prev, { ...novoEncargo, id: data.id }]);
      
      toast({
        title: "Encargo adicionado",
        description: "Novo encargo criado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao adicionar encargo:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o encargo",
        variant: "destructive"
      });
    }
  };

  const removerEncargo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('encargos_venda')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEncargos(prev => prev.filter(e => e.id !== id));
      
      toast({
        title: "Encargo removido",
        description: "Encargo removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover encargo:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o encargo",
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

  const renderEncargosPorCategoria = (categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros', titulo: string) => {
    const encargosDaCategoria = encargos.filter(e => e.categoria === categoria);

    return (
      <Card key={categoria}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{titulo}</CardTitle>
            {categoria === 'outros' && (
              <Button onClick={adicionarOutroEncargo} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div></div>
            <div className="text-center font-medium text-xs">Percentual (%)</div>
            <div className="text-center font-medium text-xs">Valor (R$)</div>
          </div>

          {encargosDaCategoria.map((encargo) => (
            <div key={encargo.nome} className="grid grid-cols-3 gap-2 items-center">
              <div className="flex items-center justify-between">
                {categoria === 'outros' ? (
                  <Input
                    value={encargo.nome}
                    onChange={(e) => {
                      const novoNome = e.target.value;
                      setEncargos(prev => 
                        prev.map(item => 
                          item.id === encargo.id ? { ...item, nome: novoNome } : item
                        )
                      );
                    }}
                    onBlur={(e) => {
                      if (encargo.id && e.target.value !== encargo.nome) {
                        atualizarNomeEncargo(encargo.id, e.target.value);
                      }
                    }}
                    className="text-xs h-6 w-32"
                    placeholder="Nome do encargo"
                  />
                ) : (
                  <Label className="text-xs">{encargo.nome}</Label>
                )}
                {categoria === 'outros' && (
                  <Button
                    onClick={() => encargo.id && removerEncargo(encargo.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  value={encargo.tipo === 'percentual' ? encargo.valor : 0}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    atualizarEncargo(encargo.nome, valor, 'percentual');
                  }}
                  className="text-right h-8 text-xs pr-6"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
              </div>
              
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                <Input
                  type="number"
                  value={encargo.tipo === 'fixo' ? encargo.valor : 0}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    atualizarEncargo(encargo.nome, valor, 'fixo');
                  }}
                  className="text-right h-8 text-xs pl-8"
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando encargos...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderEncargosPorCategoria('impostos', 'Impostos')}
      {renderEncargosPorCategoria('comissoes', 'Comissões e Plataformas')}
      {renderEncargosPorCategoria('meios_pagamento', 'Taxas de Meios de Pagamento')}
      {renderEncargosPorCategoria('outros', 'Outros')}
    </div>
  );
};
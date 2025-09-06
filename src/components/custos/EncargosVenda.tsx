import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EncargoItem {
  id?: string;
  nome: string;
  valor_percentual: number;
  valor_fixo: number;
  categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros';
  ativo: boolean;
}

export const EncargosVenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [encargos, setEncargos] = useState<EncargoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [encargoEditando, setEncargoEditando] = useState<EncargoItem | null>(null);
  const [nomeEditando, setNomeEditando] = useState('');

  // Encargos padrão por categoria
  const encargosDefault = {
    impostos: [
      { nome: 'ICMS', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'ISS', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'PIS/COFINS', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'IRPJ/CSLL', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'IPI', valor_percentual: 0, valor_fixo: 0 },
    ],
    meios_pagamento: [
      { nome: 'Cartão de débito', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Cartão de crédito', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Boleto bancário', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'PIX', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Gateway de pagamento', valor_percentual: 0, valor_fixo: 0 },
    ],
    comissoes: [
      { nome: 'Marketing', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Aplicativo de delivery', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Plataforma SaaS', valor_percentual: 0, valor_fixo: 0 },
      { nome: 'Colaboradores (comissão)', valor_percentual: 0, valor_fixo: 0 },
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

      if (data && data.length > 0) {
        const encargosFormatados = data.map(item => ({
          id: item.id,
          nome: item.nome,
          valor_percentual: item.tipo === 'percentual' ? item.valor : 0,
          valor_fixo: item.tipo === 'fixo' ? item.valor : 0,
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
            valor: 0,
            tipo: 'percentual',
            ativo: true
          }))
        )
        .select();

      if (error) throw error;

      if (data) {
        const encargosFormatados = data.map(item => ({
          id: item.id,
          nome: item.nome,
          valor_percentual: 0,
          valor_fixo: 0,
          categoria: getCategoriaByNome(item.nome),
          ativo: item.ativo
        }));
        setEncargos(encargosFormatados);
      }
    } catch (error) {
      console.error('Erro ao inicializar encargos:', error);
    }
  };

  const atualizarValorPercentual = async (nome: string, valor: number) => {
    const encargo = encargos.find(e => e.nome === nome);
    if (!encargo || !encargo.id) return;

    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ valor, tipo: 'percentual' })
        .eq('id', encargo.id);

      if (error) throw error;

      setEncargos(prev => 
        prev.map(e => e.nome === nome ? { ...e, valor_percentual: valor } : e)
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleValueChange = (inputValue: string, nome: string) => {
    // Remove tudo que não é dígito
    const numericValue = inputValue.replace(/\D/g, '');
    
    // Converte para número dividindo por 100 (para ter centavos)
    const numberValue = parseInt(numericValue || '0') / 100;
    
    // Formata como moeda brasileira
    const formattedValue = formatCurrencyInput(numberValue);
    
    // Atualiza o estado local
    setEncargos(prev => 
      prev.map(item => 
        item.nome === nome ? { ...item, valor_fixo: numberValue } : item
      )
    );
    
    return { formattedValue, numberValue };
  };

  const formatarMoeda = (valor: number | string): string => {
    if (!valor) return '';
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) : valor;
    if (isNaN(numero)) return '';
    return formatCurrencyInput(numero);
  };

  const limparFormatacao = (valor: string): number => {
    if (!valor) return 0;
    return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  const atualizarValorFixo = async (nome: string, valor: number) => {
    const encargo = encargos.find(e => e.nome === nome);
    if (!encargo || !encargo.id) return;

    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ valor, tipo: 'fixo' })
        .eq('id', encargo.id);

      if (error) throw error;

      setEncargos(prev => 
        prev.map(e => e.nome === nome ? { ...e, valor_fixo: valor } : e)
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const atualizarNomeEncargo = async (id: string, novoNome: string) => {
    if (!user || !novoNome.trim()) return;

    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ nome: novoNome.trim() })
        .eq('id', id);

      if (error) throw error;

      setEncargos(prev => 
        prev.map(e => e.id === id ? { ...e, nome: novoNome.trim() } : e)
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

  const iniciarEdicaoModal = (encargo: EncargoItem) => {
    setEncargoEditando(encargo);
    setNomeEditando(encargo.nome);
    setModalAberto(true);
  };

  const salvarEdicaoModal = async () => {
    if (!encargoEditando || !nomeEditando.trim()) return;

    await atualizarNomeEncargo(encargoEditando.id!, nomeEditando.trim());
    setModalAberto(false);
    setEncargoEditando(null);
    setNomeEditando('');
  };

  const cancelarEdicaoModal = () => {
    setModalAberto(false);
    setEncargoEditando(null);
    setNomeEditando('');
  };

  const adicionarOutroEncargo = async () => {
    if (!user) return;

    const novoNome = `Novo encargo ${Date.now()}`;
    const novoEncargo: EncargoItem = {
      nome: novoNome,
      valor_percentual: 0,
      valor_fixo: 0,
      categoria: 'outros',
      ativo: true
    };

    try {
      const { data, error } = await supabase
        .from('encargos_venda')
        .insert({
          user_id: user.id,
          nome: novoEncargo.nome,
          valor: 0,
          tipo: 'percentual',
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

  const renderEncargosPorCategoria = (categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros', titulo: string) => {
    const encargosDaCategoria = encargos.filter(e => e.categoria === categoria);

    return (
      <Card key={categoria} className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">{titulo}</CardTitle>
            {categoria === 'outros' && (
              <Button onClick={adicionarOutroEncargo} variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <div className={`grid gap-4 ${categoria === 'outros' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="text-sm font-medium text-muted-foreground">Nome</div>
              <div className="text-center text-sm font-medium text-muted-foreground">Percentual (%)</div>
              <div className="text-center text-sm font-medium text-muted-foreground">Valor Fixo (R$)</div>
              {categoria === 'outros' && (
                <div className="text-center text-sm font-medium text-muted-foreground">Ações</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {encargosDaCategoria.map((encargo) => (
              <div key={encargo.id || encargo.nome} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-foreground break-words">{encargo.nome}</Label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative w-20">
                        <Input
                          type="text"
                          value={encargo.valor_percentual || ''}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setEncargos(prev => 
                              prev.map(item => 
                                item.nome === encargo.nome ? { ...item, valor_percentual: valor } : item
                              )
                            );
                          }}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            atualizarValorPercentual(encargo.nome, valor);
                          }}
                          className="text-center h-8 text-sm pr-6 border-border focus:border-primary"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                      </div>
                      
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                        <Input
                          type="text"
                          value={formatarMoeda(encargo.valor_fixo)}
                          onChange={(e) => {
                            const { formattedValue, numberValue } = handleValueChange(e.target.value, encargo.nome);
                          }}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const valorLimpo = limparFormatacao(e.target.value);
                            atualizarValorFixo(encargo.nome, valorLimpo);
                          }}
                          className="text-center h-8 text-sm pl-7 border-border focus:border-primary"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {categoria === 'outros' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => iniciarEdicaoModal(encargo)}
                          className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => encargo.id && removerEncargo(encargo.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome do Encargo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome do encargo
              </Label>
              <Input
                id="nome"
                value={nomeEditando}
                onChange={(e) => setNomeEditando(e.target.value)}
                className="mt-1"
                placeholder="Digite o nome do encargo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') salvarEdicaoModal();
                  if (e.key === 'Escape') cancelarEdicaoModal();
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelarEdicaoModal}>
                Cancelar
              </Button>
              <Button onClick={salvarEdicaoModal}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
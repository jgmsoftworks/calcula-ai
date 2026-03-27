import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
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
          valor_percentual: item.valor_percentual || 0,
          valor_fixo: item.valor_fixo || 0,
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
            valor_percentual: 0,
            valor_fixo: 0,
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
        .update({ valor_percentual: valor })
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
        .update({ valor_fixo: valor })
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
          valor_percentual: 0,
          valor_fixo: 0,
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

  const categoryColors: Record<string, { gradient: string; bg: string; color: string }> = {
    impostos: { gradient: 'from-[#dd0b52] to-[#f96e0c]', bg: 'bg-[#dd0b52]/10', color: 'text-[#dd0b52]' },
    meios_pagamento: { gradient: 'from-[#0483e4] to-[#2c4dc7]', bg: 'bg-[#0483e4]/10', color: 'text-[#0483e4]' },
    comissoes: { gradient: 'from-[#7328b1] to-[#af1188]', bg: 'bg-[#7328b1]/10', color: 'text-[#7328b1]' },
    outros: { gradient: 'from-[#af1188] to-[#dd0b52]', bg: 'bg-[#af1188]/10', color: 'text-[#af1188]' },
  };

  const renderEncargosPorCategoria = (categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros', titulo: string) => {
    const encargosDaCategoria = encargos.filter(e => e.categoria === categoria);
    const colors = categoryColors[categoria];

    return (
      <Card key={categoria} className="glass-card overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${colors.gradient}`} />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display">{titulo}</CardTitle>
            {categoria === 'outros' && (
              <Button onClick={adicionarOutroEncargo} variant="outline" size="sm" className="gap-1.5 h-7 text-xs rounded-xl border-border/50">
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Header labels */}
          <div className={`grid gap-3 mb-3 ${categoria === 'outros' ? 'grid-cols-[1fr_80px_90px_56px]' : 'grid-cols-[1fr_80px_90px]'}`}>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Nome</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">%</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">R$</p>
            {categoria === 'outros' && <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">Ações</p>}
          </div>

          <div className="space-y-2">
            {encargosDaCategoria.map((encargo, i) => (
              <div 
                key={encargo.id || encargo.nome} 
                className="rounded-xl bg-muted/40 border border-border/30 p-3 hover:border-border/60 transition-all animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className={`grid gap-3 items-center ${categoria === 'outros' ? 'grid-cols-[1fr_80px_90px_56px]' : 'grid-cols-[1fr_80px_90px]'}`}>
                  <Label className="text-xs font-medium truncate">{encargo.nome}</Label>
                  
                  <NumericInputPtBr
                    tipo="percentual"
                    min={0}
                    max={100}
                    value={encargo.valor_percentual}
                    onChange={(valor) => {
                      setEncargos(prev => prev.map(item => item.nome === encargo.nome ? { ...item, valor_percentual: valor } : item));
                    }}
                    onBlur={() => atualizarValorPercentual(encargo.nome, encargo.valor_percentual)}
                    className="text-center h-8 text-xs rounded-lg"
                  />
                  
                  <NumericInputPtBr
                    tipo="valor"
                    min={0}
                    value={encargo.valor_fixo}
                    onChange={(valor) => {
                      setEncargos(prev => prev.map(item => item.nome === encargo.nome ? { ...item, valor_fixo: valor } : item));
                    }}
                    onBlur={() => atualizarValorFixo(encargo.nome, encargo.valor_fixo)}
                    className="text-center h-8 text-xs rounded-lg"
                  />

                  {categoria === 'outros' && (
                    <div className="flex gap-0.5 justify-center">
                      <Button size="sm" variant="ghost" onClick={() => iniciarEdicaoModal(encargo)} className="h-7 w-7 p-0 rounded-lg">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button onClick={() => encargo.id && removerEncargo(encargo.id)} variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
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
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Carregando encargos...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      {renderEncargosPorCategoria('impostos', 'Impostos')}
      {renderEncargosPorCategoria('comissoes', 'Comissões e Plataformas')}
      {renderEncargosPorCategoria('meios_pagamento', 'Taxas de Meios de Pagamento')}
      {renderEncargosPorCategoria('outros', 'Outros')}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Nome do Encargo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs">Nome do encargo</Label>
              <Input
                id="nome"
                value={nomeEditando}
                onChange={(e) => setNomeEditando(e.target.value)}
                placeholder="Digite o nome do encargo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') salvarEdicaoModal();
                  if (e.key === 'Escape') cancelarEdicaoModal();
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelarEdicaoModal} className="rounded-xl">Cancelar</Button>
              <Button onClick={salvarEdicaoModal} className="rounded-xl">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
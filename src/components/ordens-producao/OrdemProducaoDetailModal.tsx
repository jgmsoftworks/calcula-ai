import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, CheckCircle, Clock, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { OrdemProducao, OrdemProducaoItem, useOrdensProducao, TarefaAvulsa } from '@/hooks/useOrdensProducao';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  tarefasAvulsas: TarefaAvulsa[];
  onPersisted?: (ordem: OrdemProducao) => void;
}

interface ReceitaOpt {
  id: string;
  nome: string;
  rendimento_valor: number | null;
  rendimento_unidade: string | null;
  tipo_produto?: { nome: string } | null;
  ingredientes: { quantidade: number; produto: { nome: string; unidade_uso: string | null; unidade_compra: string } | null }[];
  embalagens: { quantidade: number; produto: { nome: string; unidade_uso: string | null; unidade_compra: string } | null }[];
  sub_receitas: { quantidade: number; sub_receita: { nome: string; rendimento_unidade: string | null } | null }[];
}
interface FuncionarioOpt { id: string; nome: string; cargo: string | null; }

const fmtQtd = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return r.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado',
};

export function OrdemProducaoDetailModal({ open, onOpenChange, ordem, tarefasAvulsas, onPersisted }: Props) {
  const { user } = useAuth();
  const { criarOrdem, atualizarOrdem, deletarOrdem, adicionarItem, atualizarItem, removerItem } = useOrdensProducao();
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOpt[]>([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeOrdem, setActiveOrdem] = useState<OrdemProducao | null>(ordem);
  const [titulo, setTitulo] = useState('');
  const [status, setStatus] = useState<OrdemProducao['status']>('pendente');
  const [dataPrevista, setDataPrevista] = useState('');

  useEffect(() => {
    setActiveOrdem(ordem);
    setTitulo(ordem?.titulo || '');
    setStatus((ordem?.status as OrdemProducao['status']) || 'pendente');
    setDataPrevista(ordem?.data_prevista || '');
    setConfirmCloseOpen(false);
  }, [ordem, open]);

  const isDraft = !activeOrdem || activeOrdem.id.startsWith('draft-');
  const hasItens = (activeOrdem?.itens?.length || 0) > 0;

  const ensurePersistedOrder = async (overrides?: Partial<Pick<OrdemProducao, 'titulo' | 'status' | 'data_prevista'>>) => {
    if (!activeOrdem) return null;

    if (!isDraft) return activeOrdem;

    if (savingOrder) return null;

    setSavingOrder(true);

    const nextTitulo = `OP #${String(activeOrdem.numero_sequencial).padStart(4, '0')}`;
    const nextDataPrevista = overrides?.data_prevista ?? dataPrevista ?? activeOrdem.data_prevista ?? undefined;
    const nextStatus = overrides?.status ?? status;

    const created = await criarOrdem({
      titulo: nextTitulo,
      data_prevista: nextDataPrevista || undefined,
      descricao: activeOrdem.descricao || undefined,
      observacoes: activeOrdem.observacoes || undefined,
    });

    if (!created) {
      setSavingOrder(false);
      return null;
    }

    let persisted: OrdemProducao = { ...(created as OrdemProducao), itens: [] };

    if (nextStatus !== 'pendente') {
      const updated = await atualizarOrdem(created.id, { status: nextStatus });
      if (!updated) {
        setSavingOrder(false);
        return null;
      }
      persisted = { ...persisted, status: nextStatus };
    }

    setActiveOrdem(persisted);
    onPersisted?.(persisted);
    setSavingOrder(false);

    return persisted;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !hasItens && activeOrdem) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const handleConfirmCancel = async () => {
    if (activeOrdem && !isDraft) {
      await deletarOrdem(activeOrdem.id);
    }
    setConfirmCloseOpen(false);
    onOpenChange(false);
  };

  const handleSaveOrder = async () => {
    await ensurePersistedOrder();
  };

  // form para adicionar item
  const [tipoItem, setTipoItem] = useState<'receita' | 'tarefa_avulsa' | 'custom'>('receita');
  const [refId, setRefId] = useState('');
  const [descCustom, setDescCustom] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [funcId, setFuncId] = useState('');
  const [inicioPrev, setInicioPrev] = useState('');
  const [fimPrev, setFimPrev] = useState('');

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const [{ data: r }, { data: f }] = await Promise.all([
        supabase.from('receitas').select('id, nome').eq('user_id', user.id).order('nome'),
        supabase.from('folha_pagamento').select('id, nome, cargo').eq('user_id', user.id).eq('ativo', true).order('nome'),
      ]);
      setReceitas((r as any) || []);
      setFuncionarios((f as any) || []);
    })();
  }, [user, open]);

  if (!activeOrdem) return null;

  const handleAddItem = async () => {
    if (!activeOrdem || isDraft) return;

    const func = funcionarios.find(x => x.id === funcId);
    const item: any = {
      tipo_item: tipoItem === 'custom' ? 'tarefa_avulsa' : tipoItem,
      receita_id: tipoItem === 'receita' ? refId : null,
      tarefa_avulsa_id: tipoItem === 'tarefa_avulsa' ? refId : null,
      descricao_customizada: tipoItem === 'custom' ? descCustom : null,
      quantidade: Number(quantidade) || 1,
      funcionario_id: funcId || null,
      funcionario_nome: func?.nome || null,
      hora_inicio_prevista: inicioPrev || null,
      hora_fim_prevista: fimPrev || null,
    };
    if (tipoItem !== 'custom' && !refId) return;
    if (tipoItem === 'custom' && !descCustom.trim()) return;

    await adicionarItem(activeOrdem.id, item);
    setRefId(''); setDescCustom(''); setQuantidade('1'); setFuncId(''); setInicioPrev(''); setFimPrev('');
  };

  const handleStart = async (item: OrdemProducaoItem) => {
    await atualizarItem(item.id, { status: 'em_andamento', hora_inicio_real: new Date().toISOString() } as any);
  };

  const handleFinish = async (item: OrdemProducaoItem) => {
    await atualizarItem(item.id, { status: 'concluido', hora_fim_real: new Date().toISOString() } as any);
  };

  const itemLabel = (item: OrdemProducaoItem) => {
    if (item.tipo_item === 'receita') return item.receita?.nome || 'Receita';
    if (item.tarefa_avulsa) return item.tarefa_avulsa.nome;
    return item.descricao_customizada || 'Tarefa';
  };

  const calcDuracao = (ini: string | null, fim: string | null) => {
    if (!ini || !fim) return null;
    const ms = new Date(fim).getTime() - new Date(ini).getTime();
    const min = Math.round(ms / 60000);
    return `${Math.floor(min/60)}h ${min%60}min`;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OP #{String(activeOrdem.numero_sequencial).padStart(4, '0')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Status da Ordem</Label>
              <Select value={status} onValueChange={async (v) => {
                const nextStatus = v as OrdemProducao['status'];
                setStatus(nextStatus);

                if (isDraft) return;
                if (nextStatus === activeOrdem.status) return;

                await atualizarOrdem(activeOrdem.id, { status: nextStatus });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                onBlur={async () => {
                  if (isDraft) return;
                  const nextDataPrevista = dataPrevista || null;
                  if ((activeOrdem.data_prevista || null) === nextDataPrevista) return;

                  await atualizarOrdem(activeOrdem.id, { data_prevista: nextDataPrevista });
                }}
              />
            </div>
          </div>

          {/* Adicionar item */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <h4 className="font-semibold text-sm">Adicionar item à ordem</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={tipoItem} onValueChange={(v: any) => { setTipoItem(v); setRefId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="custom">Tarefa avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tipoItem === 'receita' && (
                <div>
                  <Label>Receita</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {refId
                          ? receitas.find((r) => r.id === refId)?.nome
                          : 'Selecione ou digite...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digite o nome da receita..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma receita encontrada.</CommandEmpty>
                          <CommandGroup>
                            {receitas.map((r) => (
                              <CommandItem
                                key={r.id}
                                value={r.nome}
                                onSelect={() => setRefId(r.id)}
                              >
                                <Check className={cn('mr-2 h-4 w-4', refId === r.id ? 'opacity-100' : 'opacity-0')} />
                                {r.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {tipoItem === 'tarefa_avulsa' && (
                <div>
                  <Label>Tarefa</Label>
                  <Select value={refId} onValueChange={setRefId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {tarefasAvulsas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {tipoItem === 'custom' && (
                <div>
                  <Label>Descrição</Label>
                  <Input value={descCustom} onChange={(e) => setDescCustom(e.target.value)} placeholder="Ex: Limpar bancada" />
                </div>
              )}
              <div>
                <Label>Quantidade</Label>
                <Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
              <div>
                <Label>Funcionário</Label>
                <Select value={funcId} onValueChange={setFuncId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início previsto</Label>
                <Input type="datetime-local" value={inicioPrev} onChange={(e) => setInicioPrev(e.target.value)} />
              </div>
              <div>
                <Label>Fim previsto</Label>
                <Input type="datetime-local" value={fimPrev} onChange={(e) => setFimPrev(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddItem} className="w-full md:w-auto" disabled={isDraft}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar à ordem
            </Button>
          </div>

          {/* Lista de itens */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Itens da Ordem ({activeOrdem.itens?.length || 0})</h4>
            {(!activeOrdem.itens || activeOrdem.itens.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum item adicionado.</p>
            ) : activeOrdem.itens.map(item => {
              const dur = calcDuracao(item.hora_inicio_real, item.hora_fim_real);
              return (
                <div key={item.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{itemLabel(item)}</span>
                        <Badge variant="outline" className="text-xs">x{item.quantidade}</Badge>
                        <Badge variant="secondary" className="text-xs">{statusLabels[item.status]}</Badge>
                      </div>
                      {item.funcionario_nome && <p className="text-xs text-muted-foreground mt-1">👤 {item.funcionario_nome}</p>}
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        {item.hora_inicio_prevista && <span>Prev. {new Date(item.hora_inicio_prevista).toLocaleString('pt-BR')}</span>}
                        {item.hora_inicio_real && <span className="text-primary">Início real: {new Date(item.hora_inicio_real).toLocaleString('pt-BR')}</span>}
                        {item.hora_fim_real && <span className="text-primary">Fim real: {new Date(item.hora_fim_real).toLocaleString('pt-BR')}</span>}
                        {dur && <span className="font-semibold"><Clock className="h-3 w-3 inline" /> {dur}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {item.status === 'pendente' && (
                        <Button size="sm" variant="outline" onClick={() => handleStart(item)}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {item.status === 'em_andamento' && (
                        <Button size="sm" variant="outline" onClick={() => handleFinish(item)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removerItem(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isDraft && (
          <div className="flex justify-end pt-4 border-t mt-4 sticky bottom-0 bg-background">
            <Button onClick={handleSaveOrder} disabled={savingOrder}>
              {savingOrder ? 'Salvando...' : 'Salvar ordem'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar criação da ordem?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ordem ainda não tem itens adicionados. Se você sair agora, ela será descartada.
            Deseja realmente cancelar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sim, descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}


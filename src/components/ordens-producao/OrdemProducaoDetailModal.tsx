import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, CheckCircle, Clock, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { OrdemProducao, OrdemProducaoItem, TarefaAvulsa } from '@/hooks/useOrdensProducao';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  ordens: OrdemProducao[];
  tarefasAvulsas: TarefaAvulsa[];
  criarOrdem: (input: { titulo: string; descricao?: string; data_prevista?: string; observacoes?: string }) => Promise<(Omit<OrdemProducao, 'status'> & { status: string }) | null>;
  atualizarOrdem: (id: string, updates: Partial<OrdemProducao>) => Promise<boolean>;
  deletarOrdem: (id: string) => Promise<boolean>;
  adicionarItem: (ordemId: string, item: Partial<OrdemProducaoItem>) => Promise<boolean>;
  atualizarItem: (id: string, updates: Partial<OrdemProducaoItem>) => Promise<boolean>;
  removerItem: (id: string) => Promise<boolean>;
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

interface FuncionarioOpt {
  id: string;
  nome: string;
  cargo: string | null;
}

const fmtQtd = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return r.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const orderStatusToItemStatus: Record<OrdemProducao['status'], OrdemProducaoItem['status']> = {
  pendente: 'pendente',
  em_andamento: 'em_andamento',
  concluida: 'concluido',
  cancelada: 'cancelado',
};

const getStatusAdjustments = (nextStatus: OrdemProducaoItem['status'], currentItem: OrdemProducaoItem) => {
  if (nextStatus === 'pendente') {
    return {
      status: nextStatus,
      hora_inicio_real: null,
      hora_fim_real: null,
    } satisfies Partial<OrdemProducaoItem>;
  }

  if (nextStatus === 'em_andamento') {
    return {
      status: nextStatus,
      hora_inicio_real: currentItem.hora_inicio_real || new Date().toISOString(),
      hora_fim_real: null,
    } satisfies Partial<OrdemProducaoItem>;
  }

  if (nextStatus === 'concluido') {
    return {
      status: nextStatus,
      hora_inicio_real: currentItem.hora_inicio_real || new Date().toISOString(),
      hora_fim_real: new Date().toISOString(),
    } satisfies Partial<OrdemProducaoItem>;
  }

  return {
    status: nextStatus,
  } satisfies Partial<OrdemProducaoItem>;
};

export function OrdemProducaoDetailModal({ open, onOpenChange, ordem, ordens, tarefasAvulsas, criarOrdem, atualizarOrdem, deletarOrdem, adicionarItem, atualizarItem, removerItem, onPersisted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOpt[]>([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeOrdem, setActiveOrdem] = useState<OrdemProducao | null>(ordem);
  const [status, setStatus] = useState<OrdemProducao['status']>('pendente');
  const [dataPrevista, setDataPrevista] = useState('');

  const [tipoItem, setTipoItem] = useState<'receita' | 'tarefa_avulsa'>('receita');
  const [refId, setRefId] = useState('');
  const [descricaoTarefa, setDescricaoTarefa] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [funcId, setFuncId] = useState('');
  const [inicioPrev, setInicioPrev] = useState('');
  const [fimPrev, setFimPrev] = useState('');

  useEffect(() => {
    setActiveOrdem(ordem);
    setStatus((ordem?.status as OrdemProducao['status']) || 'pendente');
    setDataPrevista(ordem?.data_prevista || '');
    setConfirmCloseOpen(false);
    setTipoItem('receita');
    setRefId('');
    setDescricaoTarefa('');
    setQuantidade('1');
    setFuncId('');
    setInicioPrev('');
    setFimPrev('');
  }, [ordem, open]);

  useEffect(() => {
    if (!activeOrdem || activeOrdem.id.startsWith('draft-')) return;
    const latest = ordens.find((item) => item.id === activeOrdem.id);
    if (latest) setActiveOrdem(latest);
  }, [ordens, activeOrdem?.id]);

  const isDraft = !activeOrdem || activeOrdem.id.startsWith('draft-');
  const item = activeOrdem?.itens?.[0] || null;

  const handleOpenChange = (next: boolean) => {
    if (!next && isDraft && activeOrdem) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(next);
  };

  const handleConfirmCancel = () => {
    setConfirmCloseOpen(false);
    onOpenChange(false);
  };

  const handleSaveOrder = async () => {
    if (!activeOrdem || savingOrder) return;

    if (tipoItem === 'receita' && !refId) {
      toast({ title: 'Selecione uma receita', variant: 'destructive' });
      return;
    }
    if (tipoItem === 'tarefa_avulsa' && !descricaoTarefa.trim()) {
      toast({ title: 'Descreva a tarefa a ser realizada', variant: 'destructive' });
      return;
    }

    setSavingOrder(true);

    const titulo = `OP #${String(activeOrdem.numero_sequencial).padStart(4, '0')}`;
    const created = await criarOrdem({
      titulo,
      data_prevista: dataPrevista || undefined,
    });

    if (!created) {
      setSavingOrder(false);
      return;
    }

    if (status !== 'pendente') {
      await atualizarOrdem(created.id, { status });
    }

    const func = funcionarios.find((x) => x.id === funcId);
    const added = await adicionarItem(created.id, {
      tipo_item: tipoItem,
      receita_id: tipoItem === 'receita' ? refId : null,
      tarefa_avulsa_id: null,
      descricao_customizada: tipoItem === 'tarefa_avulsa' ? descricaoTarefa.trim() : null,
      quantidade: Number(quantidade) || 1,
      funcionario_id: funcId || null,
      funcionario_nome: func?.nome || null,
      hora_inicio_prevista: inicioPrev || null,
      hora_fim_prevista: fimPrev || null,
    });

    setSavingOrder(false);

    if (!added) {
      await deletarOrdem(created.id);
      return;
    }

    onPersisted?.({ ...(created as OrdemProducao), status, itens: [] });
    onOpenChange(false);
  };

  useEffect(() => {
    if (!user || !open) return;

    (async () => {
      const [{ data: r, error: receitasError }, { data: f, error: funcionariosError }] = await Promise.all([
        supabase
          .from('receitas')
          .select(`
            id, nome, rendimento_valor, rendimento_unidade,
            tipo_produto:tipos_produto(nome),
            ingredientes:receita_ingredientes(quantidade, produto:produtos(nome, unidade_uso, unidade_compra)),
            embalagens:receita_embalagens(quantidade, produto:produtos(nome, unidade_uso, unidade_compra)),
            sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(quantidade, sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(nome, rendimento_unidade))
          `)
          .eq('user_id', user.id)
          .order('nome'),
        supabase.from('folha_pagamento').select('id, nome, cargo').eq('user_id', user.id).eq('ativo', true).order('nome'),
      ]);

      if (receitasError) console.error('Erro ao carregar receitas da OP:', receitasError);
      if (funcionariosError) console.error('Erro ao carregar funcionários da OP:', funcionariosError);

      setReceitas((r as any) || []);
      setFuncionarios((f as any) || []);
    })();
  }, [user, open]);

  if (!activeOrdem) return null;

  const handleStart = async () => {
    if (!item) return;
    await atualizarItem(item.id, { status: 'em_andamento', hora_inicio_real: new Date().toISOString() } as any);
  };

  const handleFinish = async () => {
    if (!item) return;
    await atualizarItem(item.id, { status: 'concluido', hora_fim_real: new Date().toISOString() } as any);
  };

  const itemLabel = (it: OrdemProducaoItem) => {
    if (it.tipo_item === 'receita') return it.receita?.nome || 'Receita';
    if (it.tarefa_avulsa) return it.tarefa_avulsa.nome;
    return 'Tarefa';
  };

  const calcDuracao = (ini: string | null, fim: string | null) => {
    if (!ini || !fim) return null;
    const ms = new Date(fim).getTime() - new Date(ini).getTime();
    const min = Math.round(ms / 60000);
    return `${Math.floor(min / 60)}h ${min % 60}min`;
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
                <Select
                  value={status}
                  onValueChange={async (v) => {
                    const nextStatus = v as OrdemProducao['status'];
                    setStatus(nextStatus);
                    if (isDraft) return;
                    if (nextStatus === activeOrdem.status) return;
                    if (item) {
                      const itemOk = await atualizarItem(item.id, getStatusAdjustments(orderStatusToItemStatus[nextStatus], item));
                      if (!itemOk) {
                        setStatus(activeOrdem.status);
                        return;
                      }
                    }
                    await atualizarOrdem(activeOrdem.id, { status: nextStatus });
                  }}
                >
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

            {isDraft ? (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div>
                  <Label className="mb-2 block">Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setTipoItem('receita'); setRefId(''); }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                        tipoItem === 'receita'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                      )}
                    >
                      <span className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        tipoItem === 'receita' ? 'border-primary' : 'border-muted-foreground'
                      )}>
                        {tipoItem === 'receita' && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      Receita
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTipoItem('tarefa_avulsa'); setRefId(''); }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                        tipoItem === 'tarefa_avulsa'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                      )}
                    >
                      <span className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        tipoItem === 'tarefa_avulsa' ? 'border-primary' : 'border-muted-foreground'
                      )}>
                        {tipoItem === 'tarefa_avulsa' && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      Tarefa avulsa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tipoItem === 'receita' && (
                    <div className="md:col-span-2">
                      <Label>Receita</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {refId ? receitas.find((r) => r.id === refId)?.nome : 'Selecione ou digite...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command
                            filter={(value, search) => {
                              if (!search) return 1;
                              return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                            }}
                          >
                            <CommandInput placeholder="Digite o nome da receita..." />
                            <CommandList onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                              <CommandEmpty>Nenhuma receita encontrada.</CommandEmpty>
                              <CommandGroup>
                                {receitas.map((r) => (
                                  <CommandItem key={r.id} value={`${r.nome}__${r.id}`} onSelect={() => setRefId(r.id)}>
                                    <Check className={cn('mr-2 h-4 w-4 shrink-0', refId === r.id ? 'opacity-100 text-primary' : 'opacity-0')} />
                                    <span className="flex-1 truncate font-medium">{r.nome}</span>
                                    {r.tipo_produto?.nome && (
                                      <span className="ml-3 shrink-0 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                                        {r.tipo_produto.nome}
                                      </span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {tipoItem === 'receita' && refId && (() => {
                    const r = receitas.find((x) => x.id === refId);
                    if (!r) return null;
                    const qtd = Number(quantidade) || 1;
                    const rend = (r.rendimento_valor || 0) * qtd;

                    return (
                      <div className="md:col-span-2 p-3 rounded-lg bg-background border space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-sm font-semibold">{r.nome}</div>
                          {r.tipo_produto?.nome && <Badge variant="outline" className="text-xs">{r.tipo_produto.nome}</Badge>}
                        </div>

                        {r.rendimento_valor != null && (
                          <p className="text-xs text-muted-foreground">
                            Rendimento por receita:{' '}
                            <span className="font-medium text-foreground">{fmtQtd(r.rendimento_valor)} {r.rendimento_unidade || ''}</span>
                            {qtd > 1 && (
                              <>
                                {' '}• Total para {qtd}x:{' '}
                                <span className="font-semibold text-primary">{fmtQtd(rend)} {r.rendimento_unidade || ''}</span>
                              </>
                            )}
                          </p>
                        )}

                        {r.ingredientes?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mt-2 mb-1">Ingredientes</p>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              {r.ingredientes.map((i, idx) => i.produto && (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="truncate">{i.produto.nome}</span>
                                  <span className="font-medium text-foreground shrink-0">{fmtQtd(i.quantidade * qtd)} {i.produto.unidade_uso || i.produto.unidade_compra}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {r.embalagens?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mt-2 mb-1">Embalagens</p>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              {r.embalagens.map((e, idx) => e.produto && (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="truncate">{e.produto.nome}</span>
                                  <span className="font-medium text-foreground shrink-0">{fmtQtd(e.quantidade * qtd)} {e.produto.unidade_uso || e.produto.unidade_compra}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {r.sub_receitas?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mt-2 mb-1">Sub-receitas</p>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              {r.sub_receitas.map((s, idx) => s.sub_receita && (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="truncate">{s.sub_receita.nome}</span>
                                  <span className="font-medium text-foreground shrink-0">{fmtQtd(s.quantidade * qtd)} {s.sub_receita.rendimento_unidade || ''}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {tipoItem === 'tarefa_avulsa' && (
                    <div className="md:col-span-2">
                      <Label>Tarefa avulsa</Label>
                      <Select value={refId} onValueChange={setRefId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {tarefasAvulsas.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</SelectItem>
                        ))}
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
              </div>
            ) : item ? (
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{itemLabel(item)}</span>
                      <Badge variant="outline" className="text-xs">x{item.quantidade}</Badge>
                      <Badge variant="secondary" className="text-xs">{statusLabels[item.status]}</Badge>
                    </div>
                    {item.funcionario_nome && <p className="text-xs text-muted-foreground mt-1">👤 {item.funcionario_nome}</p>}
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                      {item.hora_inicio_prevista && <span>Prev. {new Date(item.hora_inicio_prevista).toLocaleString('pt-BR')}</span>}
                      {item.hora_inicio_real && <span className="text-primary">Início real: {new Date(item.hora_inicio_real).toLocaleString('pt-BR')}</span>}
                      {item.hora_fim_real && <span className="text-primary">Fim real: {new Date(item.hora_fim_real).toLocaleString('pt-BR')}</span>}
                      {(() => {
                        const dur = calcDuracao(item.hora_inicio_real, item.hora_fim_real);
                        return dur ? <span className="font-semibold"><Clock className="h-3 w-3 inline" /> {dur}</span> : null;
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {item.status === 'pendente' && (
                      <Button size="sm" variant="outline" onClick={handleStart}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.status === 'em_andamento' && (
                      <Button size="sm" variant="outline" onClick={handleFinish}>
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await removerItem(item.id);
                        await deletarOrdem(activeOrdem.id);
                        onOpenChange(false);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
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
              Esta ordem ainda não foi salva. Deseja realmente cancelar?
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

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Play, CheckCircle, Clock, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { OrdemProducao, OrdemProducaoItem, TarefaAvulsa } from '@/hooks/useOrdensProducao';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  ordem: OrdemProducao;
  tarefasAvulsas: TarefaAvulsa[];
  onUpdateOrder: (id: string, updates: Partial<OrdemProducao>) => Promise<boolean>;
  onDeleteOrder: (id: string) => Promise<boolean>;
  onUpdateItem: (id: string, updates: Partial<OrdemProducaoItem>) => Promise<boolean>;
}

interface ReceitaOption {
  id: string;
  nome: string;
  rendimento_valor: number | null;
  rendimento_unidade: string | null;
  tipo_produto?: { nome: string } | null;
  ingredientes?: { quantidade: number; produto: { nome: string; unidade_uso: string | null; unidade_compra: string } | null }[];
  embalagens?: { quantidade: number; produto: { nome: string; unidade_uso: string | null; unidade_compra: string } | null }[];
  sub_receitas?: { quantidade: number; sub_receita: { nome: string; rendimento_unidade: string | null } | null }[];
}

interface FuncionarioOption {
  id: string;
  nome: string;
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

const statusOrdemConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'border-border bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em andamento', className: 'border-primary/20 bg-primary/10 text-primary' },
  concluida: { label: 'Concluída', className: 'border-border bg-secondary text-secondary-foreground' },
  cancelada: { label: 'Cancelada', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
};

const itemLabel = (it: OrdemProducaoItem) => {
  if (it.tipo_item === 'receita') return it.receita?.nome || 'Receita';
  if (it.descricao_customizada) return it.descricao_customizada;
  if (it.tarefa_avulsa) return it.tarefa_avulsa.nome;
  return 'Tarefa';
};

const toDatetimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const calcDuracao = (ini: string | null, fim: string | null) => {
  if (!ini || !fim) return null;
  const ms = new Date(fim).getTime() - new Date(ini).getTime();
  const min = Math.round(ms / 60000);
  return `${Math.floor(min / 60)}h ${min % 60}min`;
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

const orderStatusToItemStatus: Record<OrdemProducao['status'], OrdemProducaoItem['status']> = {
  pendente: 'pendente',
  em_andamento: 'em_andamento',
  concluida: 'concluido',
  cancelada: 'cancelado',
};

const itemStatusToOrderStatus: Record<OrdemProducaoItem['status'], OrdemProducao['status']> = {
  pendente: 'pendente',
  em_andamento: 'em_andamento',
  concluido: 'concluida',
  cancelado: 'cancelada',
};

export function OrdemProducaoCardInline({
  ordem,
  tarefasAvulsas,
  onUpdateOrder,
  onDeleteOrder,
  onUpdateItem,
}: Props) {
  const { user } = useAuth();
  const item = ordem.itens?.[0] || null;
  const statusOrdem = statusOrdemConfig[ordem.status] || statusOrdemConfig.pendente;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receitas, setReceitas] = useState<ReceitaOption[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);

  const [draftOrderStatus, setDraftOrderStatus] = useState<OrdemProducao['status']>(ordem.status);
  const [draftItemType, setDraftItemType] = useState<'receita' | 'tarefa_avulsa'>(item?.tipo_item || 'receita');
  const [draftRefId, setDraftRefId] = useState(item?.receita_id || '');
  const [draftDescricaoTarefa, setDraftDescricaoTarefa] = useState(item?.descricao_customizada || '');
  const [draftQuantidade, setDraftQuantidade] = useState(String(item?.quantidade || 1));
  const [draftFuncionarioId, setDraftFuncionarioId] = useState(item?.funcionario_id || '');
  const [draftItemStatus, setDraftItemStatus] = useState<OrdemProducaoItem['status']>(item?.status || 'pendente');
  const [draftInicioPrev, setDraftInicioPrev] = useState(toDatetimeLocal(item?.hora_inicio_prevista || null));
  const [draftFimPrev, setDraftFimPrev] = useState(toDatetimeLocal(item?.hora_fim_prevista || null));

  useEffect(() => {
    setDraftOrderStatus(ordem.status);
    setDraftItemType(item?.tipo_item || 'receita');
    setDraftRefId(item?.receita_id || '');
    setDraftDescricaoTarefa(item?.descricao_customizada || '');
    setDraftQuantidade(String(item?.quantidade || 1));
    setDraftFuncionarioId(item?.funcionario_id || '');
    setDraftItemStatus(item?.status || 'pendente');
    setDraftInicioPrev(toDatetimeLocal(item?.hora_inicio_prevista || null));
    setDraftFimPrev(toDatetimeLocal(item?.hora_fim_prevista || null));
  }, [ordem, item]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const [{ data: receitasData }, { data: funcionariosData }] = await Promise.all([
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
        supabase.from('folha_pagamento').select('id, nome').eq('user_id', user.id).eq('ativo', true).order('nome'),
      ]);

      setReceitas((receitasData as any as ReceitaOption[]) || []);
      setFuncionarios((funcionariosData as FuncionarioOption[]) || []);
    })();
  }, [user]);

  const activeTipo = editing ? draftItemType : item?.tipo_item;
  const activeReceitaId = editing
    ? (draftItemType === 'receita' ? draftRefId : '')
    : (item?.tipo_item === 'receita' ? item?.receita_id : '');
  const activeDescricaoTarefa = editing
    ? (draftItemType === 'tarefa_avulsa' ? draftDescricaoTarefa : '')
    : (item?.tipo_item === 'tarefa_avulsa' ? item?.descricao_customizada : '');
  const receitaInfo = activeTipo === 'receita' && activeReceitaId
    ? receitas.find((r) => r.id === activeReceitaId)
    : null;
  const qtdReceita = editing
    ? Math.max(1, Number(draftQuantidade) || 1)
    : (item?.quantidade || 1);
  const rendTotal = (receitaInfo?.rendimento_valor || 0) * qtdReceita;
  const previewItemLabel = editing
    ? (activeTipo === 'receita' ? receitaInfo?.nome || 'Receita' : (activeDescricaoTarefa || 'Tarefa'))
    : (item ? itemLabel(item) : '');
  const previewItemStatus = editing ? draftItemStatus : item?.status;
  const previewFuncionarioNome = editing
    ? (funcionarios.find((funcionario) => funcionario.id === draftFuncionarioId)?.nome || null)
    : (item?.funcionario_nome || null);
  const previewInicioPrev = editing ? draftInicioPrev : toDatetimeLocal(item?.hora_inicio_prevista || null);

  const handleQuickStatus = async (nextStatus: OrdemProducaoItem['status']) => {
    if (!item) return;

    const ok = await onUpdateItem(item.id, getStatusAdjustments(nextStatus, item));
    if (!ok) return;

    await onUpdateOrder(ordem.id, { status: itemStatusToOrderStatus[nextStatus] });
  };

  const handleOrderStatusChange = async (nextStatus: OrdemProducao['status']) => {
    if (nextStatus === ordem.status) return;

    if (item) {
      const itemOk = await onUpdateItem(item.id, getStatusAdjustments(orderStatusToItemStatus[nextStatus], item));
      if (!itemOk) return;
    }

    await onUpdateOrder(ordem.id, { status: nextStatus });
  };

  const handleSaveEdit = async () => {
    if (!item || saving) return;
    if (draftItemType === 'receita' && !draftRefId) return;
    if (draftItemType === 'tarefa_avulsa' && !draftDescricaoTarefa.trim()) return;

    setSaving(true);
    const selectedFuncionario = funcionarios.find((funcionario) => funcionario.id === draftFuncionarioId);

    const itemUpdates: Partial<OrdemProducaoItem> = {
      tipo_item: draftItemType,
      receita_id: draftItemType === 'receita' ? draftRefId : null,
      tarefa_avulsa_id: null,
      descricao_customizada: draftItemType === 'tarefa_avulsa' ? draftDescricaoTarefa.trim() : null,
      quantidade: Number(draftQuantidade) || 1,
      funcionario_id: draftFuncionarioId || null,
      funcionario_nome: selectedFuncionario?.nome || null,
      hora_inicio_prevista: draftInicioPrev ? new Date(draftInicioPrev).toISOString() : null,
      hora_fim_prevista: draftFimPrev ? new Date(draftFimPrev).toISOString() : null,
      ...getStatusAdjustments(draftItemStatus, item),
    };

    const itemOk = await onUpdateItem(item.id, itemUpdates);
    if (!itemOk) {
      setSaving(false);
      return;
    }

    const orderOk = await onUpdateOrder(ordem.id, { status: draftOrderStatus });
    setSaving(false);

    if (orderOk) {
      setEditing(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-mono text-muted-foreground">
            OP #{String(ordem.numero_sequencial).padStart(4, '0')}
          </span>
          <Badge className={statusOrdem.className} variant="outline">
            {statusOrdem.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={ordem.status}
            onValueChange={(value) => handleOrderStatusChange(value as OrdemProducao['status'])}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          {item && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteOrder(ordem.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {item ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{previewItemLabel}</span>
                <Badge variant="outline" className="text-xs">x{qtdReceita}</Badge>
                {previewItemStatus && (
                  <Badge variant="secondary" className="text-xs">{statusLabels[previewItemStatus]}</Badge>
                )}
              </div>

              {previewFuncionarioNome && (
                <p className="mt-1 text-xs text-muted-foreground">👤 {previewFuncionarioNome}</p>
              )}

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {previewInicioPrev && (
                  <span>Prev. {new Date(previewInicioPrev).toLocaleString('pt-BR')}</span>
                )}
                {item.hora_inicio_real && (
                  <span className="text-primary">Início: {new Date(item.hora_inicio_real).toLocaleString('pt-BR')}</span>
                )}
                {item.hora_fim_real && (
                  <span className="text-primary">Fim: {new Date(item.hora_fim_real).toLocaleString('pt-BR')}</span>
                )}
                {(() => {
                  const dur = calcDuracao(item.hora_inicio_real, item.hora_fim_real);
                  return dur ? (
                    <span className="font-semibold">
                      <Clock className="inline h-3 w-3" /> {dur}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>

            {!editing && (
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                {item.status === 'pendente' && (
                  <Button size="sm" variant="outline" onClick={() => handleQuickStatus('em_andamento')}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                  </Button>
                )}
                {item.status === 'em_andamento' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleQuickStatus('pendente')}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Voltar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickStatus('concluido')}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Concluir
                    </Button>
                  </>
                )}
                {item.status === 'concluido' && (
                  <Button size="sm" variant="outline" onClick={() => handleQuickStatus('em_andamento')}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir
                  </Button>
                )}
                {item.status === 'cancelado' && (
                  <Button size="sm" variant="outline" onClick={() => handleQuickStatus('pendente')}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reativar
                  </Button>
                )}
              </div>
            )}
          </div>

          {receitaInfo && (
            <div className="space-y-2 rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-semibold">{receitaInfo.nome}</div>
                {receitaInfo.tipo_produto?.nome && (
                  <Badge variant="outline" className="text-xs">{receitaInfo.tipo_produto.nome}</Badge>
                )}
              </div>

              {receitaInfo.rendimento_valor != null && (
                <p className="text-xs text-muted-foreground">
                  Rendimento por receita:{' '}
                  <span className="font-medium text-foreground">
                    {fmtQtd(receitaInfo.rendimento_valor)} {receitaInfo.rendimento_unidade || ''}
                  </span>
                  {qtdReceita > 1 && (
                    <>
                      {' '}• Total para {qtdReceita}x:{' '}
                      <span className="font-semibold text-primary">
                        {fmtQtd(rendTotal)} {receitaInfo.rendimento_unidade || ''}
                      </span>
                    </>
                  )}
                </p>
              )}

              {receitaInfo.ingredientes && receitaInfo.ingredientes.length > 0 && (
                <div>
                  <p className="mb-1 mt-2 text-xs font-semibold">Ingredientes</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {receitaInfo.ingredientes.map((i, idx) => i.produto && (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{i.produto.nome}</span>
                        <span className="shrink-0 font-medium text-foreground">
                          {fmtQtd(i.quantidade * qtdReceita)} {i.produto.unidade_uso || i.produto.unidade_compra}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {receitaInfo.embalagens && receitaInfo.embalagens.length > 0 && (
                <div>
                  <p className="mb-1 mt-2 text-xs font-semibold">Embalagens</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {receitaInfo.embalagens.map((e, idx) => e.produto && (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{e.produto.nome}</span>
                        <span className="shrink-0 font-medium text-foreground">
                          {fmtQtd(e.quantidade * qtdReceita)} {e.produto.unidade_uso || e.produto.unidade_compra}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {receitaInfo.sub_receitas && receitaInfo.sub_receitas.length > 0 && (
                <div>
                  <p className="mb-1 mt-2 text-xs font-semibold">Sub-receitas</p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {receitaInfo.sub_receitas.map((s, idx) => s.sub_receita && (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{s.sub_receita.nome}</span>
                        <span className="shrink-0 font-medium text-foreground">
                          {fmtQtd(s.quantidade * qtdReceita)} {s.sub_receita.rendimento_unidade || ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={draftItemType}
                  onValueChange={(value: 'receita' | 'tarefa_avulsa') => {
                    setDraftItemType(value);
                    setDraftRefId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="tarefa_avulsa">Tarefa avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status do item</Label>
                <Select value={draftItemStatus} onValueChange={(value) => setDraftItemStatus(value as OrdemProducaoItem['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>{draftItemType === 'receita' ? 'Receita' : 'Descrição da tarefa'}</Label>
                {draftItemType === 'receita' ? (
                  <Select value={draftRefId} onValueChange={setDraftRefId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {receitas.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    value={draftDescricaoTarefa}
                    onChange={(e) => setDraftDescricaoTarefa(e.target.value)}
                    placeholder="Descreva o que deve ser feito (ex: Limpar bancadas e organizar utensílios)"
                    rows={3}
                  />
                )}
              </div>

              <div>
                <Label>Status da OP</Label>
                <Select value={draftOrderStatus} onValueChange={(value) => setDraftOrderStatus(value as OrdemProducao['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantidade</Label>
                <Input type="number" min="1" value={draftQuantidade} onChange={(e) => setDraftQuantidade(e.target.value)} />
              </div>

              <div>
                <Label>Funcionário</Label>
                <Select value={draftFuncionarioId} onValueChange={setDraftFuncionarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Início previsto</Label>
                <Input type="datetime-local" value={draftInicioPrev} onChange={(e) => setDraftInicioPrev(e.target.value)} />
              </div>

              <div>
                <Label>Fim previsto</Label>
                <Input type="datetime-local" value={draftFimPrev} onChange={(e) => setDraftFimPrev(e.target.value)} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving || (draftItemType === 'receita' ? !draftRefId : !draftDescricaoTarefa.trim())}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">Sem item vinculado.</p>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, ChefHat, User as UserIcon, Clock, Link2, Link2Off, ChevronsUpDown, Check, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { useProducaoAreas, ProducaoArea } from '@/hooks/useProducaoAreas';
import { useProducaoRecorrentes, ProducaoRecorrente, RecorrenteInput } from '@/hooks/useProducaoRecorrentes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const CORES = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b'];
// Ordem de exibição: Seg → Dom
const DIAS_ORDEM = [1, 2, 3, 4, 5, 6, 0];
const DIAS_LABEL: Record<number, { curto: string; mini: string; full: string }> = {
  0: { curto: 'Dom', mini: 'D', full: 'Domingo' },
  1: { curto: 'Seg', mini: 'S', full: 'Segunda' },
  2: { curto: 'Ter', mini: 'T', full: 'Terça' },
  3: { curto: 'Qua', mini: 'Q', full: 'Quarta' },
  4: { curto: 'Qui', mini: 'Q', full: 'Quinta' },
  5: { curto: 'Sex', mini: 'S', full: 'Sexta' },
  6: { curto: 'Sáb', mini: 'S', full: 'Sábado' },
};
const SEM_AREA_KEY = '__sem_area__';

interface ReceitaOpt { id: string; nome: string; imagem_url: string | null; rendimento_valor: number | null; rendimento_unidade: string | null }
interface FuncOpt { id: string; nome: string; cargo: string | null }

export default function CronogramaPage() {
  const { user } = useAuth();
  const areas = useProducaoAreas();
  const recorrentes = useProducaoRecorrentes(); // todas
  const hojeDow = new Date().getDay();

  const [areaModal, setAreaModal] = useState<{ open: boolean; area?: ProducaoArea }>({ open: false });
  const [confirmDelArea, setConfirmDelArea] = useState<ProducaoArea | null>(null);
  const [gerenciarAreas, setGerenciarAreas] = useState(false);
  const [tarefaModal, setTarefaModal] = useState<{
    open: boolean;
    tarefa?: ProducaoRecorrente;
    preAreaId?: string | null;
    preDia?: number;
  }>({ open: false });
  const [confirmDelTarefa, setConfirmDelTarefa] = useState<ProducaoRecorrente | null>(null);

  const [funcionarios, setFuncionarios] = useState<FuncOpt[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [f, r] = await Promise.all([
        supabase.from('folha_pagamento').select('id, nome, cargo').eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('receitas').select('id, nome, imagem_url, rendimento_valor, rendimento_unidade').eq('user_id', user.id).order('nome'),
      ]);
      setFuncionarios((f.data ?? []) as FuncOpt[]);
      setReceitas((r.data ?? []) as ReceitaOpt[]);
    })();
  }, [user?.id]);

  // Indexa recorrentes por área → dia
  const grid = useMemo(() => {
    const map: Record<string, Record<number, ProducaoRecorrente[]>> = {};
    for (const r of recorrentes.data ?? []) {
      const key = r.area_id ?? SEM_AREA_KEY;
      map[key] ??= {};
      for (const d of r.dias_semana ?? []) {
        (map[key][d] ??= []).push(r);
      }
    }
    return map;
  }, [recorrentes.data]);

  const linhas: Array<{ id: string; nome: string; cor: string | null; area?: ProducaoArea }> = [
    ...(areas.data ?? []).map((a) => ({ id: a.id, nome: a.nome, cor: a.cor, area: a })),
    { id: SEM_AREA_KEY, nome: 'Sem área', cor: null },
  ];

  const totalTarefas = recorrentes.data?.length ?? 0;

  return (
    <div className="space-y-4 xl:space-y-6 xl:p-6">
      {/* Header com faixa de gradiente da marca */}
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg,#0483e4,#4f6ed6,#8b5cf6,#c951b0,#ec4899,#f96e0c)' }}
        />
        <div className="flex flex-col items-stretch gap-4 p-4 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">Cronograma semanal</h1>
              <p className="text-sm text-muted-foreground">
                Grade viva das áreas × dias da semana. Toque em uma célula para criar, no cartão para editar.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <Badge variant="secondary" className="rounded-full h-8 px-3">
              {totalTarefas} {totalTarefas === 1 ? 'tarefa' : 'tarefas'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setGerenciarAreas(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> Gerenciar áreas
            </Button>
            <Button size="sm" onClick={() => setTarefaModal({ open: true })}>
              <Plus className="h-4 w-4 mr-2" /> Nova tarefa
            </Button>
          </div>
        </div>
      </div>

      {(areas.isLoading || recorrentes.isLoading) ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <>
          {/* GRADE - Desktop / Tablet */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card xl:block">
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                {/* Header dos dias */}
                <div className="grid sticky top-0 z-10 bg-muted/50 backdrop-blur border-b" style={{ gridTemplateColumns: '200px repeat(7, minmax(0, 1fr))' }}>
                  <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Área
                  </div>
                  {DIAS_ORDEM.map((d) => {
                    const hoje = d === hojeDow;
                    return (
                      <div
                        key={d}
                        className={cn(
                          'px-2 py-3 text-center border-l',
                          hoje && 'bg-primary/5'
                        )}
                      >
                        <div className={cn('text-[11px] font-semibold uppercase tracking-wider', hoje ? 'text-primary' : 'text-muted-foreground')}>
                          {DIAS_LABEL[d].curto}
                        </div>
                        {hoje && <div className="mx-auto mt-1 h-1 w-6 rounded-full bg-primary" />}
                      </div>
                    );
                  })}
                </div>

                {/* Linhas por área */}
                {linhas.map((linha) => {
                  const semArea = linha.id === SEM_AREA_KEY;
                  const porDia = grid[linha.id] ?? {};
                  const totalLinha = Object.values(porDia).reduce((acc, arr) => acc + arr.length, 0);
                  return (
                    <div
                      key={linha.id}
                      className={cn('grid border-b last:border-b-0 group/row', semArea && 'bg-muted/20')}
                      style={{ gridTemplateColumns: '200px repeat(7, minmax(0, 1fr))' }}
                    >
                      {/* Cabeçalho da linha */}
                      <div className="px-4 py-3 flex items-start gap-2 border-r bg-card/50">
                        {semArea ? (
                          <Link2Off className="h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0" />
                        ) : (
                          <span className="h-2.5 w-2.5 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: linha.cor ?? '#64748b' }} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight truncate">{linha.nome}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {totalLinha === 0 ? 'Sem tarefas' : `${totalLinha} ${totalLinha === 1 ? 'tarefa' : 'tarefas'}`}
                          </p>
                        </div>
                        {!semArea && linha.area && (
                          <button
                            onClick={() => setAreaModal({ open: true, area: linha.area })}
                            className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                            aria-label="Editar área"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Células dos dias */}
                      {DIAS_ORDEM.map((d) => {
                        const tarefas = porDia[d] ?? [];
                        const hoje = d === hojeDow;
                        return (
                          <div
                            key={d}
                            className={cn(
                              'border-l p-1.5 min-h-[92px] relative group/cell',
                              hoje && 'bg-primary/[0.03]'
                            )}
                          >
                            <div className="space-y-1.5">
                              {tarefas.map((t) => (
                                <MiniTarefaCard
                                  key={t.id}
                                  tarefa={t}
                                  cor={linha.cor}
                                  onClick={() => setTarefaModal({ open: true, tarefa: t })}
                                />
                              ))}
                            </div>
                            {tarefas.length === 0 ? (
                              <button
                                onClick={() => setTarefaModal({ open: true, preAreaId: semArea ? null : linha.id, preDia: d })}
                                className="absolute inset-1.5 rounded-lg border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all"
                                aria-label={`Adicionar tarefa em ${DIAS_LABEL[d].full}`}
                              >
                                <Plus className="h-4 w-4 text-primary/70" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setTarefaModal({ open: true, preAreaId: semArea ? null : linha.id, preDia: d })}
                                className="w-full mt-1 h-6 rounded-md text-[11px] text-muted-foreground/60 hover:text-primary hover:bg-primary/5 opacity-0 group-hover/cell:opacity-100 transition-all flex items-center justify-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> tarefa
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Rodapé: adicionar área */}
                <div className="p-3 border-t bg-muted/20">
                  <button
                    onClick={() => setAreaModal({ open: true })}
                    className="w-full py-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Nova área
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE: cada área é um card com scroll horizontal de dias */}
          <div className="space-y-3 xl:hidden">
            {linhas.map((linha) => {
              const semArea = linha.id === SEM_AREA_KEY;
              const porDia = grid[linha.id] ?? {};
              const totalLinha = Object.values(porDia).reduce((acc, arr) => acc + arr.length, 0);
              return (
                <div key={linha.id} className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      {semArea ? (
                        <Link2Off className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: linha.cor ?? '#64748b' }} />
                      )}
                      <p className="text-sm font-semibold truncate">{linha.nome}</p>
                      <Badge variant="secondary" className="rounded-full text-[10px] h-5">{totalLinha}</Badge>
                    </div>
                    {!semArea && linha.area && (
                      <button onClick={() => setAreaModal({ open: true, area: linha.area })} className="text-muted-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto md:overflow-visible">
                    <div className="flex min-w-max md:grid md:min-w-0 md:grid-cols-2 lg:grid-cols-3">
                      {DIAS_ORDEM.map((d) => {
                        const tarefas = porDia[d] ?? [];
                        const hoje = d === hojeDow;
                        return (
                          <div key={d} className={cn('w-[160px] border-r p-2 md:w-auto md:border-b lg:min-h-[132px]', hoje && 'bg-primary/[0.04]')}>
                            <div className={cn('text-[10px] font-semibold uppercase tracking-wider mb-2 text-center', hoje ? 'text-primary' : 'text-muted-foreground')}>
                              {DIAS_LABEL[d].curto}
                            </div>
                            <div className="space-y-1.5">
                              {tarefas.map((t) => (
                                <MiniTarefaCard key={t.id} tarefa={t} cor={linha.cor} onClick={() => setTarefaModal({ open: true, tarefa: t })} />
                              ))}
                              <button
                                onClick={() => setTarefaModal({ open: true, preAreaId: semArea ? null : linha.id, preDia: d })}
                                className="w-full h-8 rounded-md border border-dashed text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setAreaModal({ open: true })}
              className="w-full py-3 rounded-2xl border border-dashed text-sm text-muted-foreground hover:text-primary hover:border-primary/40 inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nova área
            </button>
          </div>
        </>
      )}

      {/* Modais */}
      <AreaModal
        open={areaModal.open}
        area={areaModal.area}
        onClose={() => setAreaModal({ open: false })}
        onSave={async (v) => {
          if (areaModal.area) await areas.atualizar.mutateAsync({ id: areaModal.area.id, ...v });
          else await areas.criar.mutateAsync(v);
          setAreaModal({ open: false });
        }}
      />

      <RecorrenteModal
        open={tarefaModal.open}
        tarefa={tarefaModal.tarefa}
        preAreaId={tarefaModal.preAreaId ?? null}
        preDia={tarefaModal.preDia}
        areas={areas.data ?? []}
        funcionarios={funcionarios}
        receitas={receitas}
        onClose={() => setTarefaModal({ open: false })}
        onDelete={tarefaModal.tarefa ? () => { setConfirmDelTarefa(tarefaModal.tarefa!); setTarefaModal({ open: false }); } : undefined}
        onSave={async (v) => {
          if (tarefaModal.tarefa) await recorrentes.atualizar.mutateAsync({ id: tarefaModal.tarefa.id, ...v });
          else await recorrentes.criar.mutateAsync(v);
          setTarefaModal({ open: false });
        }}
      />

      <GerenciarAreasModal
        open={gerenciarAreas}
        areas={areas.data ?? []}
        onClose={() => setGerenciarAreas(false)}
        onEdit={(a) => { setGerenciarAreas(false); setAreaModal({ open: true, area: a }); }}
        onDelete={(a) => setConfirmDelArea(a)}
        onCreate={() => { setGerenciarAreas(false); setAreaModal({ open: true }); }}
      />

      <AlertDialog open={!!confirmDelArea} onOpenChange={(o) => !o && setConfirmDelArea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área "{confirmDelArea?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As tarefas recorrentes desta área também serão removidas. Tarefas já criadas na Agenda não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelArea) areas.remover.mutate(confirmDelArea.id);
                setConfirmDelArea(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelTarefa} onOpenChange={(o) => !o && setConfirmDelTarefa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{confirmDelTarefa?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A partir de hoje esta tarefa recorrente não será mais criada na Agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelTarefa) recorrentes.remover.mutate(confirmDelTarefa.id);
                setConfirmDelTarefa(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Mini cartão de tarefa na grade ---------------- */

function MiniTarefaCard({ tarefa, cor, onClick }: { tarefa: ProducaoRecorrente; cor: string | null; onClick: () => void }) {
  const iniciais = (tarefa.funcionario?.nome ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full text-left group/card relative rounded-lg bg-card/80 backdrop-blur border border-border/60 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: cor ?? 'hsl(var(--muted-foreground))' }}
      />
      <div className="pl-2.5 pr-2 py-1.5 space-y-1">
        <div className="flex items-start gap-1.5">
          {tarefa.receita_id && <ChefHat className="h-3 w-3 mt-0.5 text-primary shrink-0" />}
          <p className="text-[11.5px] font-semibold leading-tight line-clamp-2 flex-1">
            {tarefa.titulo}
          </p>
        </div>
        <div className="flex items-center justify-between gap-1">
          {(tarefa.hora_inicio || tarefa.hora_fim) ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {tarefa.hora_inicio?.slice(0, 5) ?? '--:--'}
            </span>
          ) : <span />}
          <span
            className="h-4 w-4 rounded-full bg-primary/15 text-primary text-[8.5px] font-bold flex items-center justify-center"
            title={tarefa.funcionario?.nome ?? ''}
          >
            {iniciais}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ---------------- Área Modal ---------------- */

function AreaModal({ open, area, onClose, onSave }: {
  open: boolean;
  area?: ProducaoArea;
  onClose: () => void;
  onSave: (v: { nome: string; cor: string }) => void;
}) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  useEffect(() => {
    if (open) {
      setNome(area?.nome ?? '');
      setCor(area?.cor ?? CORES[0]);
    }
  }, [open, area]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{area ? 'Editar área' : 'Nova área'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da área *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Frios, Confeitaria, Salgados" autoFocus />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={cn('h-8 w-8 rounded-full transition-transform', cor === c && 'ring-2 ring-offset-2 ring-primary scale-110')}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!nome.trim()} onClick={() => onSave({ nome: nome.trim(), cor })}>
            {area ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Gerenciar Áreas ---------------- */

function GerenciarAreasModal({ open, areas, onClose, onEdit, onDelete, onCreate }: {
  open: boolean;
  areas: ProducaoArea[];
  onClose: () => void;
  onEdit: (a: ProducaoArea) => void;
  onDelete: (a: ProducaoArea) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar áreas</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {areas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma área ainda.</p>
          )}
          {areas.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: a.cor }} />
              <span className="text-sm font-medium flex-1 truncate">{a.nome}</span>
              <button onClick={() => onEdit(a)} className="text-muted-foreground hover:text-primary p-1" aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(a)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
          <Button onClick={onCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Nova área
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Recorrente Modal ---------------- */

function RecorrenteModal({
  open, tarefa, preAreaId, preDia, areas, funcionarios, receitas, onClose, onSave, onDelete,
}: {
  open: boolean;
  tarefa?: ProducaoRecorrente;
  preAreaId: string | null;
  preDia?: number;
  areas: ProducaoArea[];
  funcionarios: FuncOpt[];
  receitas: ReceitaOpt[];
  onClose: () => void;
  onSave: (v: RecorrenteInput) => void;
  onDelete?: () => void;
}) {
  const [areaId, setAreaId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [vincularReceita, setVincularReceita] = useState(false);
  const [receitaId, setReceitaId] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [popReceita, setPopReceita] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAreaId(tarefa ? (tarefa.area_id ?? null) : preAreaId);
    setTitulo(tarefa?.titulo ?? '');
    setVincularReceita(!!tarefa?.receita_id);
    setReceitaId(tarefa?.receita_id ?? '');
    setQuantidade(tarefa?.quantidade ?? 1);
    setFuncionarioId(tarefa?.funcionario_id ?? '');
    setDiasSemana(tarefa?.dias_semana ?? (preDia !== undefined ? [preDia] : []));
    setHoraInicio(tarefa?.hora_inicio?.slice(0, 5) ?? '');
    setHoraFim(tarefa?.hora_fim?.slice(0, 5) ?? '');
    setObservacoes(tarefa?.observacoes ?? '');
  }, [open, tarefa, preAreaId, preDia]);

  const receitaSel = receitas.find((r) => r.id === receitaId);
  const canSave = !!titulo.trim() && !!funcionarioId && diasSemana.length > 0 && (!vincularReceita || !!receitaId);

  const toggleDia = (d: number) =>
    setDiasSemana((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const submit = () => {
    if (!canSave) return;
    onSave({
      area_id: areaId,
      titulo: titulo.trim(),
      funcionario_id: funcionarioId,
      receita_id: vincularReceita ? receitaId : null,
      quantidade: vincularReceita ? quantidade : null,
      dias_semana: diasSemana,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
      observacoes: observacoes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa ? 'Editar tarefa recorrente' : 'Nova tarefa recorrente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Área</Label>
            <Select value={areaId ?? '__none__'} onValueChange={(v) => setAreaId(v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="inline-flex items-center gap-2"><Link2Off className="h-3.5 w-3.5" /> Sem área</span>
                </SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.cor }} />
                      {a.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Assar bolos" autoFocus />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <div className="flex items-center gap-2">
              {vincularReceita ? <Link2 className="h-4 w-4 text-primary" /> : <Link2Off className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">Vincular a uma receita</span>
            </div>
            <Switch checked={vincularReceita} onCheckedChange={setVincularReceita} />
          </div>

          {vincularReceita && (
            <>
              <div>
                <Label>Receita *</Label>
                <Popover open={popReceita} onOpenChange={setPopReceita}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {receitaSel ? receitaSel.nome : 'Selecione'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start" avoidCollisions collisionPadding={8}>
                    <Command>
                      <CommandInput placeholder="Buscar receita..." />
                      <CommandList className="max-h-[260px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                        <CommandEmpty>Nenhuma receita.</CommandEmpty>
                        <CommandGroup>
                          {receitas.map((r) => (
                            <CommandItem key={r.id} value={r.nome} onSelect={() => { setReceitaId(r.id); setPopReceita(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', receitaId === r.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex items-center gap-2 min-w-0">
                                {r.imagem_url ? <img src={r.imagem_url} alt="" className="h-7 w-7 rounded object-cover" /> : <div className="h-7 w-7 rounded bg-muted flex items-center justify-center"><ChefHat className="h-3.5 w-3.5 text-muted-foreground" /></div>}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{r.nome}</p>
                                  {r.rendimento_valor ? <p className="text-[11px] text-muted-foreground">Rende {r.rendimento_valor} {r.rendimento_unidade ?? ''}</p> : null}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Quantidade</Label>
                <NumericInputPtBr tipo="quantidade_continua" value={quantidade} onChange={(v) => setQuantidade(v)} />
              </div>
            </>
          )}

          <div>
            <Label>Funcionário responsável *</Label>
            {funcionarios.length === 0 ? (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                Nenhum funcionário. Cadastre em <a className="text-primary underline" href="/precificacao/folha-pagamento">Folha de Pagamento</a>.
              </div>
            ) : (
              <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Repetir nos dias *</Label>
            <div className="flex gap-1.5 mt-2">
              {DIAS_ORDEM.map((d) => {
                const on = diasSemana.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className={cn(
                      'h-9 flex-1 rounded-lg text-xs font-semibold transition-colors',
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                    title={DIAS_LABEL[d].full}
                  >
                    {DIAS_LABEL[d].curto}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hora início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hora fim</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDelete && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive w-full sm:w-auto sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={submit} disabled={!canSave} className="w-full sm:w-auto">{tarefa ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

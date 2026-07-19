import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Palette, Pencil, Trash2, ChefHat, User as UserIcon, Clock, Repeat, Link2, Link2Off, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
const DIAS = [
  { v: 0, l: 'D' }, { v: 1, l: 'S' }, { v: 2, l: 'T' },
  { v: 3, l: 'Q' }, { v: 4, l: 'Q' }, { v: 5, l: 'S' }, { v: 6, l: 'S' },
];
const DIAS_FULL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ReceitaOpt { id: string; nome: string; imagem_url: string | null; rendimento_valor: number | null; rendimento_unidade: string | null }
interface FuncOpt { id: string; nome: string; cargo: string | null }

export default function CronogramaPage() {
  const { user } = useAuth();
  const areas = useProducaoAreas();
  // 'sem-area' = tarefas sem vínculo com área. null antes de carregar.
  const [selectedAreaId, setSelectedAreaId] = useState<string | 'sem-area' | null>(null);
  const [areaModal, setAreaModal] = useState<{ open: boolean; area?: ProducaoArea }>({ open: false });
  const [confirmDelArea, setConfirmDelArea] = useState<ProducaoArea | null>(null);

  useEffect(() => {
    if (selectedAreaId === null) {
      // default: primeira área se existir, senão "sem-area"
      setSelectedAreaId(areas.data?.[0]?.id ?? 'sem-area');
      return;
    }
    if (selectedAreaId !== 'sem-area' && areas.data && !areas.data.some((a) => a.id === selectedAreaId)) {
      setSelectedAreaId(areas.data[0]?.id ?? 'sem-area');
    }
  }, [areas.data, selectedAreaId]);

  const isSemArea = selectedAreaId === 'sem-area';
  const recorrentes = useProducaoRecorrentes(
    isSemArea ? undefined : (selectedAreaId ?? undefined),
    { semArea: isSemArea },
  );
  const [tarefaModal, setTarefaModal] = useState<{ open: boolean; tarefa?: ProducaoRecorrente }>({ open: false });
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

  const areaSel = !isSemArea ? areas.data?.find((a) => a.id === selectedAreaId) ?? null : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-display">Cronograma</h1>
            <p className="text-sm text-muted-foreground">Áreas do negócio e tarefas que se repetem semanalmente. Áreas são opcionais.</p>
          </div>
        </div>
        <Button onClick={() => setAreaModal({ open: true })}>
          <Plus className="h-4 w-4 mr-2" /> Nova área
        </Button>
      </div>

      {areas.isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {areas.data?.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAreaId(a.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                  selectedAreaId === a.id
                    ? 'border-transparent shadow-sm text-white'
                    : 'border-border bg-card hover:bg-muted'
                )}
                style={selectedAreaId === a.id ? { backgroundColor: a.cor } : {}}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedAreaId === a.id ? 'rgba(255,255,255,0.9)' : a.cor }} />
                <span className="font-medium">{a.nome}</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedAreaId('sem-area')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed text-sm transition-all',
                isSemArea ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted'
              )}
            >
              <Link2Off className="h-3.5 w-3.5" />
              <span className="font-medium">Sem área</span>
            </button>
          </div>

          <Card className="rounded-2xl p-4 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {areaSel ? (
                  <>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: areaSel.cor }} />
                    <h2 className="text-lg font-semibold">{areaSel.nome}</h2>
                  </>
                ) : (
                  <>
                    <Link2Off className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Sem área</h2>
                  </>
                )}
                <Badge variant="secondary" className="rounded-full">
                  {recorrentes.data?.length ?? 0} tarefas
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {areaSel && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setAreaModal({ open: true, area: areaSel })}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelArea(areaSel)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => setTarefaModal({ open: true })}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova tarefa
                </Button>
              </div>
            </div>

            {recorrentes.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : !recorrentes.data?.length ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <Repeat className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isSemArea ? 'Nenhuma tarefa recorrente sem área.' : 'Nenhuma tarefa recorrente nesta área.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recorrentes.data.map((t) => (
                  <TarefaRecorrenteCard
                    key={t.id}
                    tarefa={t}
                    onEdit={() => setTarefaModal({ open: true, tarefa: t })}
                    onDelete={() => setConfirmDelTarefa(t)}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}



      <AreaModal
        open={areaModal.open}
        area={areaModal.area}
        onClose={() => setAreaModal({ open: false })}
        onSave={async (v) => {
          if (areaModal.area) await areas.atualizar.mutateAsync({ id: areaModal.area.id, ...v });
          else {
            const created = await areas.criar.mutateAsync(v);
            if (created) setSelectedAreaId((created as any).id);
          }
          setAreaModal({ open: false });
        }}
      />

      <RecorrenteModal
        open={tarefaModal.open}
        tarefa={tarefaModal.tarefa}
        areaIdAtual={isSemArea ? null : (selectedAreaId as string | null)}
        areas={areas.data ?? []}
        funcionarios={funcionarios}
        receitas={receitas}
        onClose={() => setTarefaModal({ open: false })}
        onSave={async (v) => {
          if (tarefaModal.tarefa) await recorrentes.atualizar.mutateAsync({ id: tarefaModal.tarefa.id, ...v });
          else await recorrentes.criar.mutateAsync(v);
          setTarefaModal({ open: false });
        }}
      />


      <AlertDialog open={!!confirmDelArea} onOpenChange={(o) => !o && setConfirmDelArea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área "{confirmDelArea?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as tarefas recorrentes desta área também serão removidas. Tarefas já criadas na Agenda não são afetadas.
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

/* ---------------- Cards ---------------- */

function TarefaRecorrenteCard({ tarefa, onEdit, onDelete }: { tarefa: ProducaoRecorrente; onEdit: () => void; onDelete: () => void }) {
  const diasStr = tarefa.dias_semana?.length
    ? tarefa.dias_semana.slice().sort().map((d) => DIAS_FULL[d]).join(', ')
    : 'Sem repetição';
  return (
    <div className="rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold leading-tight">{tarefa.titulo}</p>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary" aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {tarefa.receita?.nome && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <ChefHat className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{tarefa.receita.nome}{tarefa.quantidade ? ` × ${tarefa.quantidade}` : ''}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <UserIcon className="h-3.5 w-3.5" />
        <span className="truncate">{tarefa.funcionario?.nome ?? '—'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Repeat className="h-3.5 w-3.5 text-primary" />
        <span className="truncate">{diasStr}</span>
      </div>
      {(tarefa.hora_inicio || tarefa.hora_fim) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{tarefa.hora_inicio?.slice(0, 5) ?? '--'} → {tarefa.hora_fim?.slice(0, 5) ?? '--'}</span>
        </div>
      )}
    </div>
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

/* ---------------- Recorrente Modal ---------------- */

function RecorrenteModal({
  open, tarefa, areaId, funcionarios, receitas, onClose, onSave,
}: {
  open: boolean;
  tarefa?: ProducaoRecorrente;
  areaId: string;
  funcionarios: FuncOpt[];
  receitas: ReceitaOpt[];
  onClose: () => void;
  onSave: (v: RecorrenteInput) => void;
}) {
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
    setTitulo(tarefa?.titulo ?? '');
    setVincularReceita(!!tarefa?.receita_id);
    setReceitaId(tarefa?.receita_id ?? '');
    setQuantidade(tarefa?.quantidade ?? 1);
    setFuncionarioId(tarefa?.funcionario_id ?? '');
    setDiasSemana(tarefa?.dias_semana ?? []);
    setHoraInicio(tarefa?.hora_inicio?.slice(0, 5) ?? '');
    setHoraFim(tarefa?.hora_fim?.slice(0, 5) ?? '');
    setObservacoes(tarefa?.observacoes ?? '');
  }, [open, tarefa]);

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
              {DIAS.map((d) => {
                const on = diasSemana.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleDia(d.v)}
                    className={cn(
                      'h-9 w-9 rounded-full text-sm font-semibold transition-colors',
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                    title={DIAS_FULL[d.v]}
                  >
                    {d.l}
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSave}>{tarefa ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

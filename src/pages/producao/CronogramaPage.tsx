import { formatarRendimento, rendimentoPrevisto } from '@/lib/producaoRendimento';
import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, Pencil, Trash2, ChefHat, User as UserIcon, Clock, Link2Off, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProducaoAreas, ProducaoArea } from '@/hooks/useProducaoAreas';
import { useProducaoRecorrentes, ProducaoRecorrente } from '@/hooks/useProducaoRecorrentes';
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

export default function CronogramaPage() {
  usePortugalTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const areas = useProducaoAreas();
  const recorrentes = useProducaoRecorrentes(); // todas
  const hojeDow = new Date().getDay();
  const diaParam = searchParams.get('dia');
  const diaSelecionado = diaParam !== null && /^[0-6]$/.test(diaParam) ? Number(diaParam) : hojeDow;
  const abrirNovaTarefa = (areaId?: string) => {
    const params = new URLSearchParams({ dia: String(diaSelecionado) });
    if (areaId) params.set('area', areaId);
    navigate(`/producao/cronograma/nova?${params}`);
  };

  const [areaModal, setAreaModal] = useState<{ open: boolean; area?: ProducaoArea }>({ open: false });
  const [confirmDelArea, setConfirmDelArea] = useState<ProducaoArea | null>(null);
  const [gerenciarAreas, setGerenciarAreas] = useState(false);
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
    for (const porDia of Object.values(map)) {
      for (const tarefas of Object.values(porDia)) {
        tarefas.sort((a, b) => (a.hora_inicio || '99:99').localeCompare(b.hora_inicio || '99:99')
          || a.titulo.localeCompare(b.titulo));
      }
    }
    return map;
  }, [recorrentes.data]);

  const linhas: Array<{ id: string; nome: string; cor: string | null; area?: ProducaoArea }> = [
    ...(areas.data ?? []).map((a) => ({ id: a.id, nome: a.nome, cor: a.cor, area: a })),
    { id: SEM_AREA_KEY, nome: 'Sem área', cor: null },
  ];

  const totalPorDia = (dia: number) => linhas.reduce((total, linha) => total + (grid[linha.id]?.[dia]?.length ?? 0), 0);
  const totalTarefas = totalPorDia(diaSelecionado);

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
              <h1 className="text-xl font-bold tracking-tight font-display sm:text-2xl">Cronograma diário</h1>
              <p className="text-sm text-muted-foreground">
                Selecione um dia para ver as tarefas por área.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <Badge variant="secondary" className="rounded-full h-8 px-3">
              {totalTarefas} {totalTarefas === 1 ? 'tarefa no dia' : 'tarefas no dia'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setGerenciarAreas(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> Gerenciar áreas
            </Button>
            <Button size="sm" onClick={() => abrirNovaTarefa()}>
              <Plus className="h-4 w-4 mr-2" /> Nova tarefa
            </Button>
          </div>
        </div>
      </div>

      <nav aria-label="Dia do cronograma" className="grid grid-cols-7 gap-1 rounded-xl border bg-card p-1 sm:gap-2 sm:p-2">
        {DIAS_ORDEM.map(dia => (
          <button key={dia} type="button" onClick={() => setSearchParams({ dia: String(dia) }, { replace: true })}
            aria-label={`Ver ${DIAS_LABEL[dia].full}`} aria-pressed={diaSelecionado === dia}
            aria-current={dia === hojeDow ? 'date' : undefined}
            className={cn('flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              diaSelecionado === dia ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <span className="font-semibold">{DIAS_LABEL[dia].curto}</span>
            <span className="text-xs tabular-nums">{areas.isLoading || recorrentes.isLoading ? '—' : totalPorDia(dia)}</span>
          </button>
        ))}
      </nav>

      {(areas.isLoading || recorrentes.isLoading) ? (
        <div role="status" className="text-muted-foreground text-sm">{localizeText("Carregando...")}</div>
      ) : areas.isError || recorrentes.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm">
          <p>Não foi possível carregar o cronograma.</p>
          <Button variant="outline" onClick={() => { void areas.refetch(); void recorrentes.refetch(); }}>Tentar novamente</Button>
        </div>
      ) : (
        <section aria-label={`Cronograma de ${DIAS_LABEL[diaSelecionado].full}`} className="space-y-4">
          {linhas.map(linha => {
            const semArea = linha.id === SEM_AREA_KEY;
            const tarefas = grid[linha.id]?.[diaSelecionado] ?? [];
            return (
              <section key={linha.id} aria-label={linha.nome} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2">
                    {semArea ? <Link2Off aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: linha.cor ?? '#64748b' }} />}
                    <h2 className="break-words text-sm font-semibold">{linha.nome}</h2>
                    <span className="text-xs tabular-nums text-muted-foreground">{tarefas.length}</span>
                    {linha.area && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground"
                      aria-label={`Editar área ${linha.nome}`} onClick={() => setAreaModal({ open: true, area: linha.area })}>
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>}
                  </div>
                  <Button variant="ghost" size="sm" aria-label={`Adicionar tarefa em ${linha.nome}`}
                    onClick={() => abrirNovaTarefa(semArea ? undefined : linha.id)}>
                    <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" /> Adicionar tarefa
                  </Button>
                </div>
                {tarefas.length ? (
                  <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                    {tarefas.map(tarefa => <TarefaDiaCard key={tarefa.id} tarefa={tarefa} cor={linha.cor}
                      onClick={() => navigate(`/producao/cronograma/${tarefa.id}/editar?dia=${diaSelecionado}`)} />)}
                  </div>
                ) : <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">Nenhuma tarefa para este dia.</p>}
              </section>
            );
          })}
          <Button variant="outline" className="w-full border-dashed" onClick={() => setAreaModal({ open: true })}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Nova área
          </Button>
        </section>
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
            <AlertDialogTitle>{localizeText("Excluir área \"")}{confirmDelArea?.nome}"?</AlertDialogTitle>
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
            >{localizeText("Excluir")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

/* ---------------- Tarefa do dia ---------------- */

function TarefaDiaCard({ tarefa, cor, onClick }: { tarefa: ProducaoRecorrente; cor: string | null; onClick: () => void }) {
  usePortugalTranslation();
  const previsto = rendimentoPrevisto(tarefa.receita, tarefa.quantidade ?? 1);
  const inicio = tarefa.hora_inicio?.slice(0, 5);
  const fim = tarefa.hora_fim?.slice(0, 5);
  const horario = inicio && fim ? `${inicio} – ${fim}` : inicio || (fim ? `Até ${fim}` : 'Sem horário');
  return (
    <button type="button" onClick={onClick} aria-label={`Editar tarefa ${tarefa.titulo}`}
      className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-card p-4 pl-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: cor ?? 'hsl(var(--muted-foreground))' }} />
      <div className="flex items-start gap-3">
        {tarefa.receita?.imagem_url ? <img src={tarefa.receita.imagem_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          : tarefa.receita_id && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-5 w-5" /></span>}
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-snug">{tarefa.titulo}</p>
          {previsto !== null && <p className="mt-2 text-xs font-medium text-primary">Previsto: {formatarRendimento(previsto)} {tarefa.receita?.rendimento_unidade}</p>}
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 tabular-nums"><Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{horario}</p>
            <p className="flex items-start gap-1.5"><UserIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{tarefa.funcionario?.nome || 'Sem responsável'}</span></p>
          </div>
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
  usePortugalTranslation();
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
  usePortugalTranslation();
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
              <button onClick={() => onDelete(a)} className="text-muted-foreground hover:text-destructive p-1" aria-label={localizeText("Excluir")}>
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

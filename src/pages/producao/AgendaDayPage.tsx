import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Plus, Printer, ChefHat, User as UserIcon, Clock, Trash2, Share2, Copy, Link2 as Link2Icon, Loader2,
  CheckCircle2, PlayCircle, Circle, ChevronsUpDown, Check, Link2, Link2Off,
} from 'lucide-react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useProducaoTarefas, ProducaoStatus, ProducaoTarefa } from '@/hooks/useProducaoTarefas';
import { useProducaoAreas } from '@/hooks/useProducaoAreas';
import { useProducaoRecorrentes } from '@/hooks/useProducaoRecorrentes';
import { formatTimeBrasilia } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';

const COLUNAS: { id: ProducaoStatus; label: string; icon: any; color: string }[] = [
  { id: 'a_fazer', label: 'A fazer', icon: Circle, color: 'text-slate-500' },
  { id: 'em_producao', label: 'Em produção', icon: PlayCircle, color: 'text-blue-600' },
  { id: 'feito', label: 'Feito', icon: CheckCircle2, color: 'text-emerald-600' },
];

interface ReceitaOpt { id: string; nome: string; numero_sequencial: number; rendimento_valor: number | null; rendimento_unidade: string | null; imagem_url: string | null; }
interface FuncOpt { id: string; nome: string; cargo: string | null; }

export default function AgendaDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const parsedDate = useMemo(() => (date ? parseISO(date) : null), [date]);
  const dataStr = date ?? '';

  const { data: tarefas = [], isLoading, criar, mover, remover } = useProducaoTarefas(dataStr);
  const { data: areas = [] } = useProducaoAreas();
  const weekday = parsedDate ? parsedDate.getDay() : null;
  const { data: recorrentes = [] } = useProducaoRecorrentes();
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string | 'todas' | 'sem'>('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState<FuncOpt[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [materialized, setMaterialized] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [f, r] = await Promise.all([
        supabase.from('folha_pagamento').select('id, nome, cargo').eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('receitas').select('id, nome, numero_sequencial, rendimento_valor, rendimento_unidade, imagem_url').eq('user_id', user.id).order('nome'),
      ]);
      setFuncionarios((f.data ?? []) as FuncOpt[]);
      setReceitas((r.data ?? []) as ReceitaOpt[]);
    })();
  }, [user?.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Materialize recurring tasks for this weekday if not already created
  useEffect(() => {
    if (materialized || weekday === null || !user?.id || !dataStr) return;
    if (!recorrentes.length) { setMaterialized(true); return; }
    const doDay = recorrentes.filter((r) => (r.dias_semana ?? []).includes(weekday));
    if (!doDay.length) { setMaterialized(true); return; }
    (async () => {
      const { data: existentes } = await supabase
        .from('producao_tarefas')
        .select('recorrente_id')
        .eq('user_id', user.id)
        .eq('data_producao', dataStr)
        .not('recorrente_id', 'is', null);
      const jaCriados = new Set((existentes ?? []).map((e: any) => e.recorrente_id));
      const paraCriar = doDay.filter((r) => !jaCriados.has(r.id));
      for (const r of paraCriar) {
        const inicio = r.hora_inicio ? new Date(`${dataStr}T${r.hora_inicio}`).toISOString() : null;
        const fim = r.hora_fim ? new Date(`${dataStr}T${r.hora_fim}`).toISOString() : null;
        await criar.mutateAsync({
          titulo: r.titulo,
          funcionario_id: r.funcionario_id,
          receita_id: r.receita_id ?? null,
          quantidade: r.quantidade ?? null,
          observacoes: r.observacoes ?? null,
          area_id: r.area_id ?? null,
          recorrente_id: r.id,
          inicio_previsto: inicio,
          fim_previsto: fim,
        } as any);
      }
      setMaterialized(true);
    })();
  }, [materialized, weekday, recorrentes, user?.id, dataStr, criar]);


  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const tarefa = tarefas.find((t) => t.id === e.active.id);
    const novoStatus = e.over?.id as ProducaoStatus | undefined;
    if (!tarefa || !novoStatus) return;
    if (!['a_fazer', 'em_producao', 'feito'].includes(novoStatus)) return;
    if (tarefa.status === novoStatus) return;
    mover.mutate({ tarefa, novoStatus });
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const generateShareLink = async () => {
    setShareLoading(true);
    const { data, error } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'create', date: dataStr },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao gerar link', description: data?.error ?? error?.message, variant: 'destructive' });
    } else {
      setShareUrl(`${window.location.origin}/producao-compartilhada/${data.token}`);
      setShareExpiresAt(data.expiresAt);
      toast({ title: 'Link gerado por 24 horas' });
    }
    setShareLoading(false);
  };

  const revokeShareLink = async () => {
    setShareLoading(true);
    const { data, error } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'revoke', date: dataStr },
    });
    if (error || data?.error) toast({ title: 'Erro ao revogar link', description: data?.error ?? error?.message, variant: 'destructive' });
    else {
      setShareUrl('');
      setShareExpiresAt('');
      toast({ title: 'Link revogado' });
    }
    setShareLoading(false);
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copiado' });
  };

  const imprimir = () => {
    if (!parsedDate) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Producao do dia', w / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(format(parsedDate, "dd/MM/yyyy - EEEE", { locale: ptBR }), w / 2, 22, { align: 'center' });
    let y = 32;
    COLUNAS.forEach((col) => {
      const itens = tarefas.filter((t) => t.status === col.id);
      if (!itens.length) return;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.setFillColor(240, 240, 245); doc.rect(10, y - 5, w - 20, 7, 'F');
      doc.text(`${col.label} (${itens.length})`, 12, y);
      y += 8;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      itens.forEach((t) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(`- ${t.titulo}`, 12, y); y += 5;
        doc.setFont('helvetica', 'normal');
        const meta: string[] = [];
        meta.push(`Responsavel: ${t.funcionario?.nome ?? '-'}`);
        if (t.receita?.nome) meta.push(`Receita: ${t.receita.nome}${t.quantidade ? ` x${t.quantidade}` : ''}`);
        if (t.inicio_previsto || t.fim_previsto) {
          const ini = t.inicio_previsto ? format(new Date(t.inicio_previsto), 'dd/MM HH:mm') : '?';
          const fim = t.fim_previsto ? format(new Date(t.fim_previsto), 'dd/MM HH:mm') : '?';
          meta.push(`Previsto: ${ini} - ${fim}`);
        }
        if (t.iniciado_em) meta.push(`Inicio: ${formatTimeBrasilia(t.iniciado_em)}`);
        if (t.concluido_em) meta.push(`Fim: ${formatTimeBrasilia(t.concluido_em)}`);
        doc.text(meta.join('  |  '), 15, y); y += 5;
        if (t.observacoes) { doc.text(`Obs: ${t.observacoes}`, 15, y); y += 5; }
        y += 2;
      });
      y += 4;
    });
    doc.save(`producao-${dataStr}.pdf`);
  };

  if (!parsedDate || !isValid(parsedDate)) {
    return <div className="p-6">Data inválida. <Button variant="link" onClick={() => navigate('/producao/agenda')}>Voltar</Button></div>;
  }

  const activeTarefa = activeId ? tarefas.find((t) => t.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/producao/agenda')} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold font-display capitalize">
              {format(parsedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'} no total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShareModalOpen(true)} disabled={!tarefas.length}>
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar dia
          </Button>
          <Button variant="outline" onClick={imprimir} disabled={!tarefas.length}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova tarefa
          </Button>
        </div>
      </div>

      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAreaFilter('todas')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              selectedAreaFilter === 'todas' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted')}
          >Todas ({tarefas.length})</button>
          {areas.map((a) => {
            const count = tarefas.filter((t) => t.area_id === a.id).length;
            const on = selectedAreaFilter === a.id;
            return (
              <button key={a.id} onClick={() => setSelectedAreaFilter(a.id)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                  on ? 'text-white border-transparent' : 'bg-card hover:bg-muted')}
                style={on ? { backgroundColor: a.cor } : {}}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? 'rgba(255,255,255,0.9)' : a.cor }} />
                {a.nome} ({count})
              </button>
            );
          })}
          {tarefas.some((t) => !t.area_id) && (
            <button onClick={() => setSelectedAreaFilter('sem')}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                selectedAreaFilter === 'sem' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted')}
            >Sem área ({tarefas.filter((t) => !t.area_id).length})</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUNAS.map((col) => {
              const itens = tarefas.filter((t) => {
                if (t.status !== col.id) return false;
                if (selectedAreaFilter === 'todas') return true;
                if (selectedAreaFilter === 'sem') return !t.area_id;
                return t.area_id === selectedAreaFilter;
              });
              return <Coluna key={col.id} col={col} itens={itens} onRemove={(id) => remover.mutate(id)} />;
            })}
          </div>
          <DragOverlay>
            {activeTarefa ? <TarefaCard tarefa={activeTarefa} onRemove={() => {}} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <NovaTarefaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        funcionarios={funcionarios}
        receitas={receitas}
        areas={areas}
        dataStr={dataStr}
        onCreate={(v) => criar.mutate(v, { onSuccess: () => setModalOpen(false) })}
      />

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar produção do dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              Quem receber o link poderá visualizar as tarefas, filtrar por responsável e apenas avançar de <strong>A fazer</strong> para <strong>Em produção</strong> e depois para <strong>Feito</strong>. O link expira em 24 horas.
            </div>
            {shareUrl ? (
              <>
                <div className="space-y-2">
                  <Label>Link temporário</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="text-xs" />
                    <Button size="icon" variant="outline" onClick={copyShareLink} aria-label="Copiar link"><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Válido até {format(new Date(shareExpiresAt), 'dd/MM/yyyy HH:mm')}.</p>
                </div>
                <Button variant="destructive" className="w-full" onClick={revokeShareLink} disabled={shareLoading}>
                  {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revogar link agora'}
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={generateShareLink} disabled={shareLoading}>
                {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2Icon className="mr-2 h-4 w-4" />Gerar link válido por 24 horas</>}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ---------------- Coluna ---------------- */

function Coluna({
  col, itens, onRemove,
}: { col: { id: ProducaoStatus; label: string; icon: any; color: string }; itens: ProducaoTarefa[]; onRemove: (id: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });
  const Icon = col.icon;
  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'p-3 rounded-2xl min-h-[400px] transition-colors',
        isOver ? 'bg-primary/5 border-primary/50' : 'bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', col.color)} />
          <h3 className="text-sm font-semibold">{col.label}</h3>
        </div>
        <Badge variant="secondary" className="rounded-full">{itens.length}</Badge>
      </div>
      <div className="space-y-2">
        {itens.map((t) => (
          <TarefaCard key={t.id} tarefa={t} onRemove={() => onRemove(t.id)} />
        ))}
        {!itens.length && (
          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-xl">
            Arraste tarefas para cá
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Card ---------------- */

function TarefaCard({ tarefa, onRemove, dragging }: { tarefa: ProducaoTarefa; onRemove: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tarefa.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group bg-card border rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing',
        (isDragging || dragging) && 'opacity-60 rotate-1'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {tarefa.area?.cor && <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tarefa.area.cor }} title={tarefa.area?.nome} />}
          <p className="text-sm font-semibold leading-tight truncate">{tarefa.titulo}</p>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          aria-label="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {tarefa.receita?.nome && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <ChefHat className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{tarefa.receita.nome}{tarefa.quantidade ? ` × ${tarefa.quantidade}` : ''}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <UserIcon className="h-3.5 w-3.5" />
        <span className="truncate">{tarefa.funcionario?.nome ?? '—'}</span>
      </div>
      {(tarefa.inicio_previsto || tarefa.fim_previsto) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
          <Clock className="h-3 w-3 text-primary" />
          <span className="truncate">
            {tarefa.inicio_previsto ? format(new Date(tarefa.inicio_previsto), "dd/MM HH:mm") : '—'}
            {' → '}
            {tarefa.fim_previsto ? format(new Date(tarefa.fim_previsto), "dd/MM HH:mm") : '—'}
          </span>
        </div>
      )}
      {(tarefa.iniciado_em || tarefa.concluido_em) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
          {tarefa.iniciado_em && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5">
              <Clock className="h-2.5 w-2.5" /> Início {formatTimeBrasilia(tarefa.iniciado_em)}
            </Badge>
          )}
          {tarefa.concluido_em && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 border-emerald-300 text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" /> Fim {formatTimeBrasilia(tarefa.concluido_em)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */

function NovaTarefaModal({
  open, onOpenChange, funcionarios, receitas, areas, onCreate, dataStr,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  funcionarios: FuncOpt[];
  receitas: ReceitaOpt[];
  areas: { id: string; nome: string; cor: string }[];
  dataStr: string;
  onCreate: (v: { titulo: string; funcionario_id: string; receita_id?: string | null; quantidade?: number | null; observacoes?: string | null; inicio_previsto?: string | null; fim_previsto?: string | null; area_id?: string | null }) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [vincularReceita, setVincularReceita] = useState(false);
  const [receitaId, setReceitaId] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [inicioPrev, setInicioPrev] = useState('');
  const [fimPrev, setFimPrev] = useState('');
  const [popReceita, setPopReceita] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitulo(''); setVincularReceita(false); setReceitaId('');
      setQuantidade(1); setFuncionarioId(''); setAreaId(''); setObservacoes('');
      setInicioPrev(''); setFimPrev('');
    } else {
      setInicioPrev(`${dataStr}T08:00`);
      setFimPrev(`${dataStr}T10:00`);
    }
  }, [open, dataStr]);


  const receitaSel = receitas.find((r) => r.id === receitaId);
  const canSave = !!titulo.trim() && !!funcionarioId && (!vincularReceita || !!receitaId);

  const submit = () => {
    if (!canSave) return;
    if (inicioPrev && fimPrev && new Date(fimPrev) < new Date(inicioPrev)) {
      toast({ title: 'Horário inválido', description: 'Fim previsto deve ser após o início.', variant: 'destructive' });
      return;
    }
    onCreate({
      titulo: titulo.trim(),
      funcionario_id: funcionarioId,
      receita_id: vincularReceita ? receitaId : null,
      quantidade: vincularReceita ? quantidade : null,
      observacoes: observacoes.trim() || null,
      inicio_previsto: inicioPrev ? new Date(inicioPrev).toISOString() : null,
      fim_previsto: fimPrev ? new Date(fimPrev).toISOString() : null,
      area_id: areas.length > 0 && areaId ? areaId : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa de produção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título da tarefa *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Assar bolos do dia" autoFocus />
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
                      {receitaSel ? receitaSel.nome : 'Selecione uma receita'}
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
                Nenhum funcionário cadastrado. Cadastre em{' '}
                <a className="text-primary underline" href="/precificacao/folha-pagamento">Folha de Pagamento</a>.
              </div>
            ) : (
              <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                <SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}{f.cargo ? ` — ${f.cargo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {areas.length > 0 && (
            <div>
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma área (opcional)" /></SelectTrigger>
                <SelectContent>
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
          )}



          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início previsto</Label>
              <Input type="datetime-local" value={inicioPrev} onChange={(e) => setInicioPrev(e.target.value)} />
            </div>
            <div>
              <Label>Fim previsto</Label>
              <Input type="datetime-local" value={fimPrev} onChange={(e) => setFimPrev(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSave}>Criar tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

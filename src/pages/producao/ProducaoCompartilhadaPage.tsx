import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ChefHat, Circle, Clock, Loader2, PlayCircle, RefreshCw, Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Status = 'a_fazer' | 'em_producao' | 'feito';
type SharedTask = {
  id: string;
  titulo: string;
  quantidade: number | null;
  status: Status;
  observacoes: string | null;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  receita?: { nome: string } | null;
  funcionario?: { nome: string; cargo: string | null } | null;
  area?: { nome: string; cor: string | null } | null;
};

const columns: Array<{ id: Status; label: string; icon: typeof Circle; color: string }> = [
  { id: 'a_fazer', label: 'A fazer', icon: Circle, color: 'text-slate-500' },
  { id: 'em_producao', label: 'Em produção', icon: PlayCircle, color: 'text-blue-600' },
  { id: 'feito', label: 'Feito', icon: CheckCircle2, color: 'text-emerald-600' },
];

export default function ProducaoCompartilhadaPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [date, setDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [syncChannel, setSyncChannel] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const { data, error: invokeError } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'get', token },
    });
    if (invokeError || data?.error) {
      setError(data?.error ?? 'Este link é inválido ou expirou.');
    } else {
      setTasks(data.tasks ?? []);
      setDate(data.date);
      setExpiresAt(data.expiresAt);
      setSyncChannel(data.syncChannel ?? '');
      setError('');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (error) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 30_000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [error, load]);

  useEffect(() => {
    if (!syncChannel || error) return;

    const channel = supabase
      .channel(syncChannel)
      .on('broadcast', { event: 'refresh' }, () => {
        void load(true);
      })
      .subscribe();

    syncChannelRef.current = channel;

    return () => {
      if (syncChannelRef.current === channel) syncChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [error, load, syncChannel]);

  const visibleTasks = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase('pt-BR');
    if (!query) return tasks;
    return tasks.filter((task) => task.funcionario?.nome?.toLocaleLowerCase('pt-BR').includes(query));
  }, [filter, tasks]);

  const move = async (task: SharedTask) => {
    setMovingId(task.id);

    const nextStatus: Status | null = task.status === 'a_fazer'
      ? 'em_producao'
      : task.status === 'em_producao'
        ? 'feito'
        : null;

    const previousTasks = tasks;
    if (nextStatus) {
      const now = new Date().toISOString();
      const applyOptimisticMove = () => setTasks((current) => current.map((item) => {
        if (item.id !== task.id) return item;
        return {
          ...item,
          status: nextStatus,
          iniciado_em: nextStatus === 'em_producao' && !item.iniciado_em ? now : item.iniciado_em,
          concluido_em: nextStatus === 'feito' && !item.concluido_em ? now : item.concluido_em,
        };
      }));
      const transitionDocument = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
      };
      if (transitionDocument.startViewTransition) {
        transitionDocument.startViewTransition(() => flushSync(applyOptimisticMove));
      } else {
        applyOptimisticMove();
      }
    }

    const { data, error: invokeError } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'move', token, taskId: task.id },
    });
    if (invokeError || data?.error) {
      setTasks(previousTasks);
      setError(data?.error ?? 'Não foi possível avançar a tarefa.');
      await load(true);
    } else {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...data.task } : item));
      setError('');
      const channel = syncChannelRef.current;
      if (channel?.state === 'joined') {
        await channel.send({ type: 'broadcast', event: 'refresh', payload: { taskId: task.id } });
      }
    }
    setMovingId(null);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (error && !date) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <Card className="max-w-md space-y-4 rounded-3xl p-8 text-center">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Link indisponível</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><ChefHat className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">Produção do dia</p>
              <h1 className="text-xl font-bold capitalize">{date && format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h1>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Atualização automática</p>
            <p>Link válido até {expiresAt && format(new Date(expiresAt), 'dd/MM HH:mm')}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filtrar por responsável" className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
          <Badge variant="secondary" className="h-9 px-3">{visibleTasks.length} tarefas</Badge>
        </div>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const items = visibleTasks.filter((task) => task.status === column.id);
            const Icon = column.icon;
            return (
              <section key={column.id} className="min-h-[240px] rounded-2xl border bg-white p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className={cn('flex items-center gap-2 font-semibold', column.color)}><Icon className="h-5 w-5" />{column.label}</div>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((task) => (
                    <Card key={task.id} style={{ viewTransitionName: `task-${task.id}` }} className="space-y-3 rounded-xl p-4 shadow-sm transition-all duration-300">
                      <div className="flex items-start justify-between gap-3">
                        <div><h2 className="font-semibold leading-tight">{task.titulo}</h2>{task.receita?.nome && <p className="mt-1 text-xs text-muted-foreground">{task.receita.nome}{task.quantidade ? ` · ${task.quantidade}` : ''}</p>}</div>
                        {task.area && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.area.cor ?? '#64748b' }} />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /><span>{task.funcionario?.nome ?? 'Sem responsável'}</span></div>
                      {task.observacoes && <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{task.observacoes}</p>}
                      {task.status !== 'feito' && (
                        <Button className="w-full" onClick={() => move(task)} disabled={movingId === task.id}>
                          {movingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : task.status === 'a_fazer' ? 'Iniciar produção' : 'Marcar como feito'}
                        </Button>
                      )}
                    </Card>
                  ))}
                  {!items.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format, startOfMonth } from 'date-fns';
import { BarChart3, CalendarRange, CheckCircle2, Clock3, Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Status = 'a_fazer' | 'em_producao' | 'feito';

interface TarefaProdutividade {
  id: string;
  status: Status;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  funcionario_id: string;
  funcionario: { id: string; nome: string; cargo: string | null } | null;
}

interface ProdutividadeProfissional {
  id: string;
  nome: string;
  cargo: string | null;
  atividades: number;
  concluidas: number;
  minutosPrevistos: number;
  minutosRealizados: number;
  taxaConclusao: number;
}

const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');

const minutosEntreHorarios = (inicio: string | null, fim: string | null) => {
  if (!inicio || !fim) return 0;
  const [inicioHora, inicioMinuto] = inicio.split(':').map(Number);
  const [fimHora, fimMinuto] = fim.split(':').map(Number);
  if ([inicioHora, inicioMinuto, fimHora, fimMinuto].some(Number.isNaN)) return 0;
  const inicioTotal = inicioHora * 60 + inicioMinuto;
  let fimTotal = fimHora * 60 + fimMinuto;
  if (fimTotal < inicioTotal) fimTotal += 24 * 60;
  return Math.max(0, fimTotal - inicioTotal);
};

const minutosEntreDatas = (inicio: string | null, fim: string | null) => {
  if (!inicio || !fim) return 0;
  const inicioMs = new Date(inicio).getTime();
  const fimMs = new Date(fim).getTime();
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs <= inicioMs) return 0;
  return Math.round((fimMs - inicioMs) / 60_000);
};

const formatarDuracao = (minutos: number) => {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const minutosRestantes = total % 60;
  if (!horas) return `${minutosRestantes}min`;
  return minutosRestantes ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
};

export default function RelatoriosProdutividade() {
  const hoje = useMemo(() => new Date(), []);
  const { user } = useAuth();
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState(toDateInput(startOfMonth(hoje)));
  const [dataFim, setDataFim] = useState(toDateInput(hoje));
  const [periodoAplicado, setPeriodoAplicado] = useState({
    inicio: toDateInput(startOfMonth(hoje)),
    fim: toDateInput(hoje),
  });
  const [tarefas, setTarefas] = useState<TarefaProdutividade[]>([]);
  const [loading, setLoading] = useState(true);

  const validarPeriodo = () => {
    if (!dataInicio || !dataFim) {
      toast({ title: 'Informe as duas datas', variant: 'destructive' });
      return false;
    }
    const inicio = new Date(`${dataInicio}T12:00:00`);
    const fim = new Date(`${dataFim}T12:00:00`);
    const dias = differenceInCalendarDays(fim, inicio);
    if (dias < 0) {
      toast({ title: 'A data final deve ser posterior à inicial', variant: 'destructive' });
      return false;
    }
    if (dias > 59) {
      toast({ title: 'Período máximo de 60 dias', description: 'Escolha um intervalo menor para manter o relatório rápido.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const aplicarPeriodo = () => {
    if (validarPeriodo()) setPeriodoAplicado({ inicio: dataInicio, fim: dataFim });
  };

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const carregar = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('producao_tarefas')
        .select(`
          id, status, inicio_previsto, fim_previsto, iniciado_em, concluido_em, funcionario_id,
          funcionario:folha_pagamento!producao_tarefas_funcionario_id_fkey(id, nome, cargo)
        `)
        .eq('user_id', user.id)
        .gte('data_producao', periodoAplicado.inicio)
        .lte('data_producao', periodoAplicado.fim)
        .order('data_producao', { ascending: true });

      if (!active) return;
      if (error) {
        setTarefas([]);
        toast({ title: 'Não foi possível carregar o relatório', description: error.message, variant: 'destructive' });
      } else {
        setTarefas((data ?? []) as unknown as TarefaProdutividade[]);
      }
      setLoading(false);
    };

    void carregar();
    return () => { active = false; };
  }, [periodoAplicado, toast, user?.id]);

  const profissionais = useMemo<ProdutividadeProfissional[]>(() => {
    const agrupados = new Map<string, ProdutividadeProfissional>();
    tarefas.forEach((tarefa) => {
      if (!tarefa.funcionario) return;
      const atual = agrupados.get(tarefa.funcionario_id) ?? {
        id: tarefa.funcionario_id,
        nome: tarefa.funcionario.nome,
        cargo: tarefa.funcionario.cargo,
        atividades: 0,
        concluidas: 0,
        minutosPrevistos: 0,
        minutosRealizados: 0,
        taxaConclusao: 0,
      };
      atual.atividades += 1;
      if (tarefa.status === 'feito') atual.concluidas += 1;
      atual.minutosPrevistos += minutosEntreHorarios(tarefa.inicio_previsto, tarefa.fim_previsto);
      atual.minutosRealizados += minutosEntreDatas(tarefa.iniciado_em, tarefa.concluido_em);
      agrupados.set(tarefa.funcionario_id, atual);
    });
    return Array.from(agrupados.values())
      .map((item) => ({ ...item, taxaConclusao: item.atividades ? (item.concluidas / item.atividades) * 100 : 0 }))
      .sort((a, b) => b.minutosRealizados - a.minutosRealizados || b.concluidas - a.concluidas);
  }, [tarefas]);

  const totais = useMemo(() => {
    const atividades = profissionais.reduce((soma, item) => soma + item.atividades, 0);
    const concluidas = profissionais.reduce((soma, item) => soma + item.concluidas, 0);
    const minutos = profissionais.reduce((soma, item) => soma + item.minutosRealizados, 0);
    return {
      atividades,
      concluidas,
      minutos,
      taxaConclusao: atividades ? (concluidas / atividades) * 100 : 0,
    };
  }, [profissionais]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-semibold">Desempenho da equipe</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold font-display">Produtividade</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resultados calculados a partir das atividades da agenda de produção.</p>
        </div>

        <Card className="p-3 glass-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="produtividade-inicio" className="text-xs">De</Label>
              <Input id="produtividade-inicio" type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} className="sm:w-40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produtividade-fim" className="text-xs">Até</Label>
              <Input id="produtividade-fim" type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} className="sm:w-40" />
            </div>
            <Button onClick={aplicarPeriodo} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
              Aplicar
            </Button>
          </div>
          <p className="mt-2 text-right text-[11px] text-muted-foreground">Período máximo: 60 dias</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" /> Profissionais</div>
          <p className="mt-1 text-2xl font-bold">{profissionais.length}</p>
          <p className="text-[11px] text-muted-foreground">com atividades no período</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Horas trabalhadas</div>
          <p className="mt-1 text-2xl font-bold">{formatarDuracao(totais.minutos)}</p>
          <p className="text-[11px] text-muted-foreground">tempo real registrado</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-4 w-4" /> Atividades</div>
          <p className="mt-1 text-2xl font-bold">{totais.atividades}</p>
          <p className="text-[11px] text-muted-foreground">{totais.concluidas} concluídas</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Taxa de conclusão</div>
          <p className="mt-1 text-2xl font-bold">{totais.taxaConclusao.toFixed(1)}%</p>
          <p className="text-[11px] text-muted-foreground">{totais.concluidas} de {totais.atividades} atividades</p>
        </Card>
      </div>

      <Card className="overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 text-left">Profissional</th>
                <th className="p-4 text-center">Horas trabalhadas</th>
                <th className="p-4 text-center">Atividades realizadas</th>
                <th className="p-4 text-center">Previsto × realizado</th>
                <th className="p-4 text-center">Taxa de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /><p className="mt-2 text-muted-foreground">Calculando produtividade...</p></td></tr>
              ) : profissionais.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhum profissional teve atividades nesse período.</td></tr>
              ) : profissionais.map((profissional) => {
                const diferenca = profissional.minutosRealizados - profissional.minutosPrevistos;
                const usoDoTempo = profissional.minutosPrevistos > 0 && profissional.minutosRealizados > 0
                  ? (profissional.minutosRealizados / profissional.minutosPrevistos) * 100
                  : null;
                const dentroDoPrevisto = usoDoTempo !== null && usoDoTempo <= 100;
                return (
                  <tr key={profissional.id} className="border-t border-border/40 transition-colors hover:bg-muted/20">
                    <td className="p-4">
                      <p className="font-semibold">{profissional.nome}</p>
                      <p className="text-xs text-muted-foreground">{profissional.cargo || 'Profissional'}</p>
                    </td>
                    <td className="p-4 text-center font-semibold">{formatarDuracao(profissional.minutosRealizados)}</td>
                    <td className="p-4 text-center">
                      <span className="font-semibold">{profissional.concluidas}</span>
                      <span className="text-muted-foreground"> de {profissional.atividades}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium">{formatarDuracao(profissional.minutosPrevistos)}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className="font-medium">{formatarDuracao(profissional.minutosRealizados)}</span>
                      </div>
                      {usoDoTempo === null ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">Sem dados de tempo suficientes</p>
                      ) : dentroDoPrevisto ? (
                        <div className="mt-1.5 flex items-center justify-center gap-1.5">
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {usoDoTempo.toFixed(0)}% do tempo planejado
                          </Badge>
                          <span className="text-[11px] text-emerald-700">Dentro do previsto</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center justify-center gap-1.5">
                          <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50">
                            {(usoDoTempo - 100).toFixed(0)}% acima
                          </Badge>
                          <span className="text-[11px] text-amber-700">+{formatarDuracao(Math.abs(diferenca))}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-lg font-bold">{profissional.taxaConclusao.toFixed(0)}%</p>
                      <p className="text-[11px] text-muted-foreground">{profissional.concluidas} de {profissional.atividades} concluídas</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Horas realizadas usam o intervalo entre início e conclusão da atividade. Atividades sem os dois registros continuam na contagem, mas não somam horas.
      </p>
    </div>
  );
}


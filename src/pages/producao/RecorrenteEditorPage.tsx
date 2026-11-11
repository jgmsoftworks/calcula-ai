import { useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ReceitaProducaoFields } from '@/components/producao/ReceitaProducaoFields';
import { useProducaoAreas, type ProducaoArea } from '@/hooks/useProducaoAreas';
import { useProducaoRecorrentes, type ProducaoRecorrente, type RecorrenteInput } from '@/hooks/useProducaoRecorrentes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { rendimentoPrevisto, type ReceitaRendimento } from '@/lib/producaoRendimento';
import { cn } from '@/lib/utils';

const DIAS = [
  { valor: 1, curto: 'Seg', nome: 'Segunda' }, { valor: 2, curto: 'Ter', nome: 'Terça' },
  { valor: 3, curto: 'Qua', nome: 'Quarta' }, { valor: 4, curto: 'Qui', nome: 'Quinta' },
  { valor: 5, curto: 'Sex', nome: 'Sexta' }, { valor: 6, curto: 'Sáb', nome: 'Sábado' },
  { valor: 0, curto: 'Dom', nome: 'Domingo' },
];
interface FuncionarioOpt { id: string; nome: string; cargo: string | null }

export default function RecorrenteEditorPage() {
  useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const areas = useProducaoAreas();
  const recorrentes = useProducaoRecorrentes();
  const diaParam = params.get('dia');
  const dia = diaParam !== null && /^[0-6]$/.test(diaParam) ? Number(diaParam) : new Date().getDay();
  const voltar = () => navigate(`/producao/cronograma?dia=${dia}`, { replace: true });
  const opcoes = useQuery({
    queryKey: ['producao-editor-opcoes', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const funcionarios: FuncionarioOpt[] = [];
      const receitas: ReceitaRendimento[] = [];
      // Paginate so large recipe books remain searchable in full.
      await Promise.all([
        (async () => {
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from('folha_pagamento').select('id, nome, cargo')
              .eq('user_id', user!.id).eq('ativo', true).order('nome').order('id').range(offset, offset + 499);
            if (error) throw error;
            funcionarios.push(...(data ?? []));
            if (!data || data.length < 500) break;
          }
        })(),
        (async () => {
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from('receitas').select('id, nome, imagem_url, rendimento_valor, rendimento_unidade')
              .eq('user_id', user!.id).order('nome').order('id').range(offset, offset + 499);
            if (error) throw error;
            receitas.push(...(data ?? []));
            if (!data || data.length < 500) break;
          }
        })(),
      ]);
      return { funcionarios, receitas };
    },
  });
  const tarefa = id ? recorrentes.data?.find(item => item.id === id) : undefined;

  if (areas.isLoading || recorrentes.isLoading || opcoes.isPending) {
    return <p role="status" className="py-8 text-sm text-muted-foreground">Carregando tarefa…</p>;
  }
  if (areas.isError || recorrentes.isError || opcoes.isError) {
    return <div role="alert" className="space-y-4 py-8">
      <p>Não foi possível carregar os dados da tarefa.</p>
      <div className="flex gap-2"><Button variant="outline" onClick={voltar}>Voltar ao cronograma</Button>
        <Button onClick={() => { void areas.refetch(); void recorrentes.refetch(); void opcoes.refetch(); }}>Tentar novamente</Button></div>
    </div>;
  }
  if (id && !tarefa) {
    return <div className="space-y-4 py-8"><p>Tarefa não encontrada ou removida.</p><Button variant="outline" onClick={voltar}>Voltar ao cronograma</Button></div>;
  }

  return <RecorrenteForm key={id ?? 'nova'} tarefa={tarefa} preDia={dia}
    preAreaId={areas.data?.some(area => area.id === params.get('area')) ? params.get('area') : null}
    areas={areas.data ?? []} funcionarios={opcoes.data.funcionarios} receitas={opcoes.data.receitas}
    onCancel={voltar}
    onSave={async input => {
      if (id) await recorrentes.atualizar.mutateAsync({ id, ...input });
      else await recorrentes.criar.mutateAsync(input);
      voltar();
    }}
    onDelete={id ? async () => { await recorrentes.remover.mutateAsync(id); voltar(); } : undefined}
  />;
}

function RecorrenteForm({ tarefa, preDia, preAreaId, areas, funcionarios, receitas, onCancel, onSave, onDelete }: {
  tarefa?: ProducaoRecorrente; preDia: number; preAreaId: string | null;
  areas: ProducaoArea[]; funcionarios: FuncionarioOpt[]; receitas: ReceitaRendimento[];
  onCancel: () => void; onSave: (input: RecorrenteInput) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  // Initialize once per route. A background refetch must not overwrite the draft.
  const [areaId, setAreaId] = useState(tarefa ? tarefa.area_id : preAreaId);
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '');
  const [receitaId, setReceitaId] = useState(tarefa?.receita_id ?? '');
  const [quantidade, setQuantidade] = useState(tarefa?.quantidade ?? 1);
  const [funcionarioId, setFuncionarioId] = useState(tarefa?.funcionario_id ?? '');
  const [dias, setDias] = useState(tarefa?.dias_semana ?? [preDia]);
  const [inicio, setInicio] = useState(tarefa?.hora_inicio?.slice(0, 5) ?? '');
  const [fim, setFim] = useState(tarefa?.hora_fim?.slice(0, 5) ?? '');
  const [observacoes, setObservacoes] = useState(tarefa?.observacoes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef(false);
  const receita = receitas.find(item => item.id === receitaId);
  const canSave = !!titulo.trim() && !!funcionarioId && dias.length > 0
    && (!receitaId || rendimentoPrevisto(receita, quantidade) !== null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try {
      await onSave({ area_id: areaId, titulo: titulo.trim(), funcionario_id: funcionarioId,
        receita_id: receitaId || null, quantidade: receitaId ? quantidade : null, dias_semana: dias,
        hora_inicio: inicio || null, hora_fim: fim || null, observacoes: observacoes.trim() || null });
    } catch { setError('Não foi possível salvar a tarefa. Tente novamente.'); }
    finally { pending.current = false; setSaving(false); }
  };
  const excluir = async () => {
    if (!onDelete || pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try { await onDelete(); }
    catch { setError('Não foi possível excluir a tarefa. Tente novamente.'); setConfirmDelete(false); }
    finally { pending.current = false; setSaving(false); }
  };

  return <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-6">
    <header className="space-y-3">
      <Button type="button" variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={onCancel} disabled={saving}>
        <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Voltar ao cronograma
      </Button>
      <h1 id="tarefa-page-title" className="font-display text-2xl font-bold tracking-tight">{tarefa ? 'Editar tarefa recorrente' : 'Nova tarefa recorrente'}</h1>
    </header>

    <form aria-labelledby="tarefa-page-title" onSubmit={submit} className="space-y-6">
      <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="tarefa-dados-title" className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 id="tarefa-dados-title" className="font-semibold">Dados da tarefa</h2>
          <div className="space-y-2"><Label htmlFor="recorrente-titulo">Título da tarefa</Label><Input id="recorrente-titulo" value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Ex.: Assar bolos caseiros" required /></div>
          <div className="space-y-2">
            <Label htmlFor="recorrente-area">Área</Label>
            <Select value={areaId ?? '__none__'} onValueChange={value => setAreaId(value === '__none__' ? null : value)} disabled={saving}>
              <SelectTrigger id="recorrente-area"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">Sem área</SelectItem>
                {areaId && !areas.some(area => area.id === areaId) && <SelectItem value={areaId}>{tarefa?.area?.nome ?? 'Área indisponível'}</SelectItem>}
                {areas.map(area => <SelectItem key={area.id} value={area.id} textValue={area.nome}><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: area.cor }} />{area.nome}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recorrente-responsavel">Responsável</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId} disabled={saving}>
              <SelectTrigger id="recorrente-responsavel"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent searchable searchLabel="Buscar responsável">
                {funcionarioId && !funcionarios.some(item => item.id === funcionarioId) && <SelectItem value={funcionarioId}>{tarefa?.funcionario?.nome ?? 'Responsável indisponível'}</SelectItem>}
                {funcionarios.map(item => <SelectItem key={item.id} value={item.id} textValue={item.nome}>{item.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {!funcionarios.length && !funcionarioId && <p className="text-xs text-muted-foreground">Cadastre um responsável em Folha de Pagamento.</p>}
          </div>
        </section>

        <section aria-labelledby="tarefa-receita-title" className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 id="tarefa-receita-title" className="font-semibold">Receita e rendimento</h2>
          <ReceitaProducaoFields receitas={receitas} receitaId={receitaId} quantidade={quantidade}
            onQuantityChange={setQuantidade} onRecipeChange={value => { setReceitaId(value); setQuantidade(1); }} disabled={saving} />
        </section>

        <section aria-labelledby="tarefa-horarios-title" className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 id="tarefa-horarios-title" className="font-semibold">Dias e horários</h2>
          <div className="space-y-2"><Label id="recorrente-dias-label">Repetir nos dias</Label>
            <div role="group" aria-labelledby="recorrente-dias-label" className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {DIAS.map(dia => <button key={dia.valor} type="button" title={dia.nome} aria-pressed={dias.includes(dia.valor)}
                onClick={() => setDias(previous => previous.includes(dia.valor) ? previous.filter(value => value !== dia.valor) : [...previous, dia.valor])}
                className={cn('h-11 min-w-0 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', dias.includes(dia.valor) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}>
                {dia.curto}
              </button>)}
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2"><Label htmlFor="recorrente-inicio">Início</Label><Input id="recorrente-inicio" type="time" className="min-w-0" value={inicio} onChange={event => setInicio(event.target.value)} /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor="recorrente-fim">Fim</Label><Input id="recorrente-fim" type="time" className="min-w-0" value={fim} onChange={event => setFim(event.target.value)} /></div>
          </div>
        </section>

        <section aria-labelledby="tarefa-observacoes-title" className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 id="tarefa-observacoes-title" className="font-semibold">Observações</h2>
          <div className="space-y-2"><Label htmlFor="recorrente-observacoes">Observações (opcional)</Label>
            <Textarea id="recorrente-observacoes" rows={5} value={observacoes} onChange={event => setObservacoes(event.target.value)} />
          </div>
        </section>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
        {onDelete && <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={saving} className="mr-auto text-destructive hover:text-destructive"><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Excluir</Button>}
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={!canSave || saving}>{saving ? 'Salvando…' : tarefa ? 'Salvar alterações' : 'Criar tarefa'}</Button>
      </footer>
    </form>

    <AlertDialog open={confirmDelete} onOpenChange={value => { if (!saving) setConfirmDelete(value); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir tarefa recorrente?</AlertDialogTitle>
        <AlertDialogDescription>“{tarefa?.titulo}” deixará de ser criada na Agenda. As produções já registradas serão mantidas.</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
        <AlertDialogAction disabled={saving} className="bg-destructive hover:bg-destructive/90" onClick={event => { event.preventDefault(); void excluir(); }}>{saving ? 'Excluindo…' : 'Excluir tarefa'}</AlertDialogAction>
      </AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}

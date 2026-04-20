import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2, ClipboardList } from 'lucide-react';
import { useOrdensProducao, OrdemProducao } from '@/hooks/useOrdensProducao';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TarefasAvulsasModal } from '@/components/ordens-producao/TarefasAvulsasModal';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  concluida: { label: 'Concluída', className: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/15 text-destructive' },
};

export default function OrdensProducaoDia() {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const { ordens, tarefasAvulsas, loading, criarOrdem, deletarOrdem, criarTarefaAvulsa, deletarTarefaAvulsa } = useOrdensProducao();

  const [tarefasOpen, setTarefasOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrdemProducao | null>(null);

  const dateObj = useMemo(() => (data ? parseISO(data) : null), [data]);
  const isValidDate = dateObj && isValid(dateObj);

  const ordensDoDia = useMemo(
    () => (data ? ordens.filter(o => o.data_prevista === data) : []),
    [ordens, data]
  );

  const currentSelected = selected?.id.startsWith('draft-')
    ? selected
    : selected
      ? ordens.find(o => o.id === selected.id) || selected
      : null;

  const handleCreate = () => {
    if (!data || !isValidDate) return;
    const nextNumero = ordens.reduce((max, ordem) => Math.max(max, ordem.numero_sequencial), 0) + 1;

    setSelected({
      id: `draft-${data}-${Date.now()}`,
      user_id: '',
      numero_sequencial: nextNumero,
      titulo: `OP #${String(nextNumero).padStart(4, '0')}`,
      descricao: null,
      data_prevista: data,
      status: 'pendente',
      observacoes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      itens: [],
    });
    setDetailOpen(true);
  };

  const handleDetailOpenChange = (next: boolean) => {
    setDetailOpen(next);

    if (!next) {
      setSelected(null);
    }
  };

  if (!isValidDate) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Data inválida.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/ordens-producao')}>
          Voltar ao calendário
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ordens-producao')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg md:text-xl font-bold capitalize truncate">
            {format(dateObj!, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTarefasOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> Tarefas avulsas
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova OP
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : ordensDoDia.length === 0 ? (
        <Card className="p-8 text-center bg-muted/30 border-dashed">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma ordem para este dia. Clique em "Nova OP" para criar.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordensDoDia.map(o => {
            const status = statusConfig[o.status] || statusConfig.pendente;
            const total = o.itens?.length || 0;
            const concluidos = o.itens?.filter(i => i.status === 'concluido').length || 0;
            return (
              <div key={o.id} className="p-3 border rounded-lg hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">OP #{String(o.numero_sequencial).padStart(4, '0')}</span>
                      <Badge className={status.className} variant="secondary">{status.label}</Badge>
                    </div>
                    <h4 className="font-semibold truncate">{o.titulo}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{concluidos}/{total} itens concluídos</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletarOrdem(o.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelected(o); setDetailOpen(true); }}>
                  Gerenciar Ordem
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <OrdemProducaoDetailModal
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        ordem={currentSelected}
        tarefasAvulsas={tarefasAvulsas}
        onPersisted={setSelected}
      />

      <TarefasAvulsasModal
        open={tarefasOpen}
        onOpenChange={setTarefasOpen}
        tarefas={tarefasAvulsas}
        onCreate={criarTarefaAvulsa}
        onDelete={deletarTarefaAvulsa}
      />
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Sparkles, Loader2, ClipboardList } from 'lucide-react';
import { useOrdensProducao, OrdemProducao } from '@/hooks/useOrdensProducao';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TarefasAvulsasModal } from '@/components/ordens-producao/TarefasAvulsasModal';
import { OrdemProducaoCardInline } from '@/components/ordens-producao/OrdemProducaoCardInline';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrdensProducaoDia() {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const {
    ordens,
    tarefasAvulsas,
    loading,
    criarTarefaAvulsa,
    deletarTarefaAvulsa,
    atualizarOrdem,
    deletarOrdem,
    atualizarItem,
  } = useOrdensProducao();

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
          {ordensDoDia.map((o) => (
            <OrdemProducaoCardInline
              key={o.id}
              ordem={o}
              onUpdateOrder={atualizarOrdem}
              onDeleteOrder={deletarOrdem}
              onUpdateItem={atualizarItem}
              tarefasAvulsas={tarefasAvulsas}
            />
          ))}
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

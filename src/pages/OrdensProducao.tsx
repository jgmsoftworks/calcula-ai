import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useOrdensProducao, OrdemProducao } from '@/hooks/useOrdensProducao';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TarefasAvulsasModal } from '@/components/ordens-producao/TarefasAvulsasModal';
import { OrdensCalendario } from '@/components/ordens-producao/OrdensCalendario';
import { DiaOrdensModal } from '@/components/ordens-producao/DiaOrdensModal';
import { format } from 'date-fns';

export default function OrdensProducao() {
  const { ordens, tarefasAvulsas, loading, criarOrdem, deletarOrdem, criarTarefaAvulsa, deletarTarefaAvulsa } = useOrdensProducao();
  const [tarefasOpen, setTarefasOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrdemProducao | null>(null);

  const [diaOpen, setDiaOpen] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);

  const handleCreateForDay = async (date: Date) => {
    const dataStr = format(date, 'yyyy-MM-dd');
    const dataLabel = format(date, 'dd/MM/yyyy');
    const created = await criarOrdem({ titulo: `Produção ${dataLabel}`, data_prevista: dataStr });
    if (created) {
      setSelected(created as any);
      setDiaOpen(false);
      setDetailOpen(true);
    }
  };

  const handleSelectDay = (date: Date, ordensDoDia: OrdemProducao[]) => {
    setDiaSelecionado(date);
    setDiaOpen(true);
  };

  const ordensDoDiaSelecionado = diaSelecionado
    ? ordens.filter(o => o.data_prevista === format(diaSelecionado, 'yyyy-MM-dd'))
    : [];

  // Atualiza a ordem selecionada quando a lista é refetched
  const currentSelected = selected ? ordens.find(o => o.id === selected.id) || selected : null;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <OrdensCalendario
            ordens={ordens}
            onSelectDay={handleSelectDay}
          />

          {ordens.length === 0 && (
            <Card className="p-8 text-center bg-muted/30 border-dashed">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique em qualquer dia do calendário para visualizar e criar ordens de produção.
              </p>
            </Card>
          )}
        </>
      )}

      <DiaOrdensModal
        open={diaOpen}
        onOpenChange={setDiaOpen}
        date={diaSelecionado}
        ordens={ordensDoDiaSelecionado}
        onOpenOrdem={(o) => { setSelected(o); setDiaOpen(false); setDetailOpen(true); }}
        onCreateNew={() => diaSelecionado && handleCreateForDay(diaSelecionado)}
        onDelete={deletarOrdem}
        onOpenTarefasAvulsas={() => setTarefasOpen(true)}
      />

      <OrdemProducaoDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        ordem={currentSelected}
        tarefasAvulsas={tarefasAvulsas}
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

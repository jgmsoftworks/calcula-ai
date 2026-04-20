import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useOrdensProducao, OrdemProducao } from '@/hooks/useOrdensProducao';
import { OrdemProducaoCard } from '@/components/ordens-producao/OrdemProducaoCard';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TarefasAvulsasModal } from '@/components/ordens-producao/TarefasAvulsasModal';

export default function OrdensProducao() {
  const { ordens, tarefasAvulsas, loading, criarOrdem, deletarOrdem, criarTarefaAvulsa, deletarTarefaAvulsa } = useOrdensProducao();
  const [tarefasOpen, setTarefasOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrdemProducao | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateAndOpen = async () => {
    setCreating(true);
    const hoje = new Date().toLocaleDateString('pt-BR');
    const created = await criarOrdem({ titulo: `Produção ${hoje}` });
    setCreating(false);
    if (created) {
      setSelected(created as any);
      setDetailOpen(true);
    }
  };

  // Atualiza a ordem selecionada quando a lista é refetched
  const currentSelected = selected ? ordens.find(o => o.id === selected.id) || selected : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2">
        <Button variant="outline" onClick={() => setTarefasOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" /> Tarefas avulsas
        </Button>
        <Button onClick={handleCreateAndOpen} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Nova OP
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : ordens.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma ordem ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira ordem de produção para começar.</p>
          <Button onClick={handleCreateAndOpen} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar primeira OP
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordens.map(o => (
            <OrdemProducaoCard
              key={o.id}
              ordem={o}
              onView={(ord) => { setSelected(ord); setDetailOpen(true); }}
              onDelete={deletarOrdem}
            />
          ))}
        </div>
      )}

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

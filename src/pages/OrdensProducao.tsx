import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardList, Plus, Sparkles, Loader2 } from 'lucide-react';

import { useOrdensProducao, OrdemProducao } from '@/hooks/useOrdensProducao';
import { OrdemProducaoCard } from '@/components/ordens-producao/OrdemProducaoCard';
import { OrdemProducaoDetailModal } from '@/components/ordens-producao/OrdemProducaoDetailModal';
import { TarefasAvulsasModal } from '@/components/ordens-producao/TarefasAvulsasModal';

export default function OrdensProducao() {
  const { ordens, tarefasAvulsas, loading, criarOrdem, deletarOrdem, criarTarefaAvulsa, deletarTarefaAvulsa } = useOrdensProducao();
  const [createOpen, setCreateOpen] = useState(false);
  const [tarefasOpen, setTarefasOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<OrdemProducao | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');

  const handleCreate = async () => {
    if (!titulo.trim()) return;
    const created = await criarOrdem({ titulo: titulo.trim(), descricao, data_prevista: dataPrevista || undefined });
    if (created) {
      setTitulo(''); setDescricao(''); setDataPrevista('');
      setCreateOpen(false);
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova OP</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Produção do dia" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Data prevista</Label>
                <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!titulo.trim()}>Criar Ordem</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : ordens.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma ordem ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira ordem de produção para começar.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Criar primeira OP</Button>
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

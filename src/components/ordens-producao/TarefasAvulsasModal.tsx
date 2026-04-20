import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { TarefaAvulsa } from '@/hooks/useOrdensProducao';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaAvulsa[];
  onCreate: (input: { nome: string; descricao?: string; tempo_estimado_minutos?: number }) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

export function TarefasAvulsasModal({ open, onOpenChange, tarefas, onCreate, onDelete }: Props) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tempo, setTempo] = useState('');

  const handleCreate = async () => {
    if (!nome.trim()) return;
    await onCreate({ nome: nome.trim(), descricao: descricao.trim() || undefined, tempo_estimado_minutos: tempo ? Number(tempo) : 0 });
    setNome(''); setDescricao(''); setTempo('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tarefas Avulsas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Cadastre tarefas que não são receitas (ex: limpeza, organização).</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label>Nome da tarefa *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Limpar vasilhas" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tempo estimado (min)</Label>
                <Input type="number" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="30" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={!nome.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar tarefa
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {tarefas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa cadastrada.</p>
            ) : tarefas.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{t.nome}</p>
                  {t.descricao && <p className="text-xs text-muted-foreground truncate">{t.descricao}</p>}
                  {t.tempo_estimado_minutos > 0 && <p className="text-xs text-muted-foreground">⏱ {t.tempo_estimado_minutos} min</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

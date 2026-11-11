import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatarRendimento, parseRendimentoReal, rendimentoDaTarefa, type ProducaoRendimento } from '@/lib/producaoRendimento';

export function ConcluirProducaoModal({ tarefa, onClose, onConfirm }: {
  tarefa: ProducaoRendimento & { titulo: string }; onClose: () => void; onConfirm: (real: number) => Promise<unknown>;
}) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const { previsto, unidade } = rendimentoDaTarefa(tarefa);
  const real = parseRendimentoReal(input);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (real === null || pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try { await onConfirm(real); onClose(); }
    catch (cause) { setError((cause as { message?: string }).message || 'Não foi possível concluir. Tente novamente.'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !pending.current) onClose(); }}>
    <DialogContent className="max-w-md overflow-hidden p-0 sm:p-0" onEscapeKeyDown={event => { if (pending.current) event.preventDefault(); }} onPointerDownOutside={event => { if (pending.current) event.preventDefault(); }}>
      <form onSubmit={submit}>
        <DialogHeader className="p-6 pb-4 text-left"><DialogTitle className="pr-8">Finalizar produção</DialogTitle><DialogDescription className="break-words">{tarefa.titulo}</DialogDescription></DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 p-4 text-sm"><span>Rendimento previsto</span><strong className="text-primary">{previsto === null ? 'Não registrado' : `${formatarRendimento(previsto)} ${unidade}`}</strong></div>
          <div className="space-y-2"><Label htmlFor="rendimento-real">Quanto rendeu?{unidade ? ` (${unidade})` : ''}</Label>
            <Input id="rendimento-real" inputMode="decimal" value={input} placeholder="" autoFocus disabled={saving} onChange={event => { if (/^\d*(?:[,.]\d{0,3})?$/.test(event.target.value)) setInput(event.target.value); }} />
          </div>
          {real !== null && previsto !== null && <p className="text-sm text-muted-foreground">Diferença: <strong className="text-foreground">{real > previsto ? '+' : ''}{formatarRendimento(real - previsto)} {unidade}</strong></p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 border-t px-6 py-4"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving || real === null}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finalizar produção</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

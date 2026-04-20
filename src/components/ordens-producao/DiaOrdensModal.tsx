import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { OrdemProducao } from '@/hooks/useOrdensProducao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  ordens: OrdemProducao[];
  onOpenOrdem: (o: OrdemProducao) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  concluida: { label: 'Concluída', className: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/15 text-destructive' },
};

export function DiaOrdensModal({ open, onOpenChange, date, ordens, onOpenOrdem, onCreateNew, onDelete }: Props) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {ordens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ordem para este dia.</p>
          ) : (
            ordens.map(o => {
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
                    <Button variant="ghost" size="icon" onClick={() => onDelete(o.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenOrdem(o)}>
                    Gerenciar Ordem
                  </Button>
                </div>
              );
            })
          )}

          <Button onClick={onCreateNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Nova OP para este dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

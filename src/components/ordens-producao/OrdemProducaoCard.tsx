import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trash2, Edit, ChevronRight } from 'lucide-react';
import { OrdemProducao } from '@/hooks/useOrdensProducao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  ordem: OrdemProducao;
  onView: (ordem: OrdemProducao) => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  concluida: { label: 'Concluída', className: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/15 text-destructive' },
};

export function OrdemProducaoCard({ ordem, onView, onDelete }: Props) {
  const totalItens = ordem.itens?.length || 0;
  const concluidos = ordem.itens?.filter(i => i.status === 'concluido').length || 0;
  const funcionarios = new Set(ordem.itens?.filter(i => i.funcionario_nome).map(i => i.funcionario_nome));
  const status = statusConfig[ordem.status] || statusConfig.pendente;

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">OP #{String(ordem.numero_sequencial).padStart(4, '0')}</span>
            <Badge className={status.className} variant="secondary">{status.label}</Badge>
          </div>
          <h3 className="font-semibold text-foreground truncate">{ordem.titulo}</h3>
          {ordem.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{ordem.descricao}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(ordem.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
        {ordem.data_prevista && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(ordem.data_prevista + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {concluidos}/{totalItens} itens
        </span>
        {funcionarios.size > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {funcionarios.size} funcionário(s)
          </span>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => onView(ordem)}>
        <Edit className="h-3.5 w-3.5 mr-2" />
        Gerenciar Ordem
        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
      </Button>
    </Card>
  );
}

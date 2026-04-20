import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Play, CheckCircle, Clock } from 'lucide-react';
import { OrdemProducao, OrdemProducaoItem, useOrdensProducao } from '@/hooks/useOrdensProducao';

interface Props {
  ordem: OrdemProducao;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const statusOrdemConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  concluida: { label: 'Concluída', className: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/15 text-destructive' },
};

const itemLabel = (it: OrdemProducaoItem) => {
  if (it.tipo_item === 'receita') return it.receita?.nome || 'Receita';
  if (it.tarefa_avulsa) return it.tarefa_avulsa.nome;
  return 'Tarefa';
};

const calcDuracao = (ini: string | null, fim: string | null) => {
  if (!ini || !fim) return null;
  const ms = new Date(fim).getTime() - new Date(ini).getTime();
  const min = Math.round(ms / 60000);
  return `${Math.floor(min / 60)}h ${min % 60}min`;
};

export function OrdemProducaoCardInline({ ordem }: Props) {
  const { atualizarOrdem, deletarOrdem, atualizarItem } = useOrdensProducao();
  const item = ordem.itens?.[0] || null;
  const statusOrdem = statusOrdemConfig[ordem.status] || statusOrdemConfig.pendente;

  const handleStart = async () => {
    if (!item) return;
    console.log('[OP] Iniciar item', item.id);
    const ok = await atualizarItem(item.id, { status: 'em_andamento', hora_inicio_real: new Date().toISOString() });
    console.log('[OP] Iniciar resultado:', ok);
    if (ok) {
      await atualizarOrdem(ordem.id, { status: 'em_andamento' });
    }
  };

  const handleFinish = async () => {
    if (!item) return;
    console.log('[OP] Concluir item', item.id);
    const ok = await atualizarItem(item.id, { status: 'concluido', hora_fim_real: new Date().toISOString() });
    console.log('[OP] Concluir resultado:', ok);
    if (ok) {
      await atualizarOrdem(ordem.id, { status: 'concluida' });
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-mono text-muted-foreground">
            OP #{String(ordem.numero_sequencial).padStart(4, '0')}
          </span>
          <Badge className={statusOrdem.className} variant="secondary">
            {statusOrdem.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={ordem.status}
            onValueChange={async (v) => {
              await atualizarOrdem(ordem.id, { status: v as OrdemProducao['status'] });
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deletarOrdem(ordem.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {item ? (
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{itemLabel(item)}</span>
                <Badge variant="outline" className="text-xs">x{item.quantidade}</Badge>
                <Badge variant="secondary" className="text-xs">{statusLabels[item.status]}</Badge>
              </div>
              {item.funcionario_nome && (
                <p className="text-xs text-muted-foreground mt-1">👤 {item.funcionario_nome}</p>
              )}
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {item.hora_inicio_prevista && (
                  <span>Prev. {new Date(item.hora_inicio_prevista).toLocaleString('pt-BR')}</span>
                )}
                {item.hora_inicio_real && (
                  <span className="text-primary">Início: {new Date(item.hora_inicio_real).toLocaleString('pt-BR')}</span>
                )}
                {item.hora_fim_real && (
                  <span className="text-primary">Fim: {new Date(item.hora_fim_real).toLocaleString('pt-BR')}</span>
                )}
                {(() => {
                  const dur = calcDuracao(item.hora_inicio_real, item.hora_fim_real);
                  return dur ? (
                    <span className="font-semibold">
                      <Clock className="h-3 w-3 inline" /> {dur}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {item.status === 'pendente' && (
                <Button size="sm" variant="outline" onClick={handleStart}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                </Button>
              )}
              {item.status === 'em_andamento' && (
                <Button size="sm" variant="outline" onClick={handleFinish}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Concluir
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem item vinculado.</p>
      )}
    </div>
  );
}

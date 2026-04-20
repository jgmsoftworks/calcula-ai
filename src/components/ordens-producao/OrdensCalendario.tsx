import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { OrdemProducao } from '@/hooks/useOrdensProducao';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  ordens: OrdemProducao[];
  onSelectDay: (date: Date, ordensDoDia: OrdemProducao[]) => void;
}

const statusDot: Record<string, string> = {
  pendente: 'bg-muted-foreground',
  em_andamento: 'bg-blue-500',
  concluida: 'bg-green-500',
  cancelada: 'bg-destructive',
};

export function OrdensCalendario({ ordens, onSelectDay, onCreateForDay }: Props) {
  const [cursor, setCursor] = useState(new Date());

  const dias = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const ordensPorDia = useMemo(() => {
    const map = new Map<string, OrdemProducao[]>();
    ordens.forEach(o => {
      if (!o.data_prevista) return;
      const key = o.data_prevista;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [ordens]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold capitalize">
          {format(cursor, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map(dia => {
          const inMonth = isSameMonth(dia, cursor);
          const isToday = isSameDay(dia, new Date());
          const key = format(dia, 'yyyy-MM-dd');
          const dayOrders = ordensPorDia.get(key) || [];

          return (
            <button
              key={key}
              onClick={() => onSelectDay(dia, dayOrders)}
              className={cn(
                "group relative aspect-square rounded-lg border p-2 text-left transition-all hover:border-primary hover:shadow-sm flex flex-col",
                !inMonth && "opacity-30",
                isToday && "border-primary ring-1 ring-primary",
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("text-sm font-medium", !inMonth && "text-muted-foreground")}>
                  {format(dia, 'd')}
                </span>
                {inMonth && dayOrders.length === 0 && (
                  <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>

              {dayOrders.length > 0 && (
                <div className="mt-auto space-y-1 overflow-hidden">
                  {dayOrders.slice(0, 2).map(o => (
                    <div key={o.id} className="flex items-center gap-1 text-[10px] truncate">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDot[o.status])} />
                      <span className="truncate text-foreground">{o.titulo}</span>
                    </div>
                  ))}
                  {dayOrders.length > 2 && (
                    <div className="text-[10px] text-muted-foreground font-medium">
                      +{dayOrders.length - 2} mais
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

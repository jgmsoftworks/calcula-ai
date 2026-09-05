import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function AgendaPage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<Date>(new Date());


  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const monthLabel = useMemo(() => {
    const label = format(cursor, "MMMM 'de' yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl p-3 sm:p-5 xl:p-6">
        <div className="-mx-3 -mt-3 mb-4 h-1 bg-gradient-brand-horizontal sm:-mx-5 sm:-mt-5 xl:-mx-6 xl:-mt-6" />
        {/* Toolbar */}
        <div className="mb-4 flex flex-col items-stretch gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <h1 className="whitespace-nowrap text-lg font-semibold font-display sm:text-xl">
              {monthLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-[430px]:flex-none"
              onClick={() => setCursor(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCursor((d) => subMonths(d, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCursor((d) => addMonths(d, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="mb-1 grid grid-cols-7 gap-1 sm:mb-2 sm:gap-2">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => navigate(`/producao/agenda/${format(day, 'yyyy-MM-dd')}`)}
                className={`
                  group relative flex h-12 min-h-0 flex-col rounded-lg border p-1.5 text-left
                  sm:h-16 sm:aspect-auto sm:rounded-xl sm:p-2
                  xl:h-auto xl:min-h-[90px] xl:aspect-[4/3]
                  transition-all duration-150
                  ${inMonth ? 'bg-card' : 'bg-muted/30'}
                  ${today ? 'border-primary shadow-brand' : 'border-border/60'}
                  hover:border-primary hover:shadow-sm sm:hover:-translate-y-0.5
                `}
              >
                <span
                  className={`
                    text-xs sm:text-sm font-semibold
                    ${today ? 'text-primary' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                  `}
                >
                  {today ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
                      {format(day, 'd')}
                    </span>
                  ) : (
                    format(day, 'd')
                  )}
                </span>
                <div className="mt-auto" />
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

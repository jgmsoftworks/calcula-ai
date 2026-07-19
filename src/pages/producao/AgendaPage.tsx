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

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 rounded-2xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold font-display capitalize">
              {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
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
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
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
                  group relative aspect-square sm:aspect-[4/3] min-h-[60px] sm:min-h-[90px]
                  rounded-xl border text-left p-2 flex flex-col
                  transition-all duration-150
                  ${inMonth ? 'bg-card' : 'bg-muted/30'}
                  ${today ? 'border-primary shadow-brand' : 'border-border/60'}
                  hover:border-primary hover:shadow-sm hover:-translate-y-0.5
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


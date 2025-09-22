import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PeriodFilter } from '@/hooks/useDashboardData';

interface DashboardFiltersProps {
  currentPeriod: PeriodFilter;
  startDate?: Date;
  endDate?: Date;
  onPeriodChange: (period: PeriodFilter) => void;
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
}

export const DashboardFilters = ({
  currentPeriod,
  startDate,
  endDate,
  onPeriodChange,
  onDateRangeChange,
}: DashboardFiltersProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Ano' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const handlePeriodChange = (period: PeriodFilter) => {
    onPeriodChange(period);
    if (period !== 'custom') {
      onDateRangeChange(undefined, undefined);
    }
  };

  const handleApplyCustomDates = () => {
    if (tempStartDate && tempEndDate) {
      onDateRangeChange(tempStartDate, tempEndDate);
      setIsCalendarOpen(false);
    }
  };

  const getCurrentPeriodLabel = () => {
    const option = periodOptions.find(opt => opt.value === currentPeriod);
    if (currentPeriod === 'custom' && startDate && endDate) {
      return `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`;
    }
    return option?.label || 'Este Mês';
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Seletor de Período */}
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-48">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Calendário para período personalizado */}
      {currentPeriod === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-64 justify-start text-left font-normal",
                !startDate && !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate && endDate ? (
                `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
              ) : (
                "Selecione o período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                  <Calendar
                    mode="single"
                    selected={tempStartDate}
                    onSelect={setTempStartDate}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Final</label>
                  <Calendar
                    mode="single"
                    selected={tempEndDate}
                    onSelect={setTempEndDate}
                    locale={ptBR}
                    className="rounded-md border"
                    disabled={(date) => tempStartDate ? date < tempStartDate : false}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalendarOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDates}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Indicador do período atual */}
      <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
        {getCurrentPeriodLabel()}
      </div>
    </div>
  );
};
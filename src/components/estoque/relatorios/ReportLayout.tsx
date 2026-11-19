import type { ReactNode } from 'react';
import { useId } from 'react';
import { Info, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ReportHeading({ title, context, children }: { title: string; context?: string; children?: ReactNode }) {
  return <header className="report-heading">
    <div><h1>{title}</h1>{context && <p>{context}</p>}</div>
    {children}
  </header>;
}

export function ReportMetric({ label, value, icon: Icon, tone = 'neutral', note, hint }: {
  label: string; value: string; icon: LucideIcon; tone?: 'primary' | 'in' | 'out' | 'neutral'; note?: string; hint?: string;
}) {
  const { t } = useTranslation();
  return <div className={'report-metric metric-' + tone}>
    <div className="metric-label"><Icon size={17} aria-hidden="true" />{label}
      {hint && <Popover><PopoverTrigger asChild><button type="button" aria-label={t('stockReports.about', { label })} className="report-help">
        <Info size={15} /></button></PopoverTrigger><PopoverContent className="max-w-[85vw] text-sm">{hint}</PopoverContent></Popover>}
    </div>
    <strong>{value}</strong>{note && <small>{note}</small>}
  </div>;
}

export function ReportExports({ busy, disabled, excel, pdf }: {
  busy: 'excel' | 'pdf' | null; disabled: boolean; excel: () => void; pdf: () => void;
}) {
  const { t } = useTranslation();
  return <div className="report-exports" role="group" aria-label={t('stockReports.export')}>
    <Button variant="ghost" size="sm" disabled={disabled || !!busy} aria-busy={busy === 'excel'} onClick={excel}>
      <FileSpreadsheet size={15} />{busy === 'excel' ? t('stockReports.generating') : 'Excel'}
    </Button>
    <Button variant="ghost" size="sm" disabled={disabled || !!busy} aria-busy={busy === 'pdf'} onClick={pdf}>
      <FileText size={15} />{busy === 'pdf' ? t('stockReports.generating') : 'PDF'}
    </Button>
  </div>;
}

export function ReportPeriodFilters({ start, end, type, setStart, setEnd, setType, apply, children }: {
  start: string; end: string; type: string; setStart: (date: string) => void; setEnd: (date: string) => void;
  setType: (value: string) => void; apply: () => void; children: ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  return <form className="report-filters" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div><Label htmlFor={id + 'start'}>{t('stockReports.from')}</Label>
      <Input id={id + 'start'} type="date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)} /></div>
    <div><Label htmlFor={id + 'end'}>{t('stockReports.to')}</Label>
      <Input id={id + 'end'} type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} /></div>
    <div><Label htmlFor={id + 'type'}>{t('stockReports.type')}</Label>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger id={id + 'type'}><SelectValue /></SelectTrigger>
        <SelectContent>{['todos', 'entrada', 'saida'].map(value =>
          <SelectItem key={value} value={value}>{t('stockReports.' + value)}</SelectItem>)}</SelectContent>
      </Select></div>
    {children}
    <Button type="submit">{t('stockReports.apply', { defaultValue: 'Aplicar filtros' })}</Button>
  </form>;
}

export function ReportState({ loading, error, empty, retry }: {
  loading: boolean; error?: boolean; empty: string; retry?: () => void;
}) {
  const { t } = useTranslation();
  if (error) return <div className="report-state" role="alert">
    {t('stockReports.error', { defaultValue: 'Não foi possível carregar o relatório.' })}
    {retry && <Button variant="outline" size="sm" onClick={retry}>{t('home.retry', { defaultValue: 'Tentar novamente' })}</Button>}
  </div>;
  return <p className="report-state" role="status">{loading ? t('common.loading', { defaultValue: 'Carregando…' }) : empty}</p>;
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import './metric-card.css';

export function MetricCard({ label, value, icon: Icon, tone = 'azure', pending = false, to, details, detailsLabel, note }: {
  label: string; value?: string | number | null; icon: LucideIcon; tone?: 'azure' | 'blue' | 'purple' | 'orange'; pending?: boolean;
  to?: string; details?: ReactNode; detailsLabel?: string; note?: string;
}) {
  const { t } = useTranslation();
  const content = <>
    <div className="metric-card-label">
      <span className="metric-card-icon"><Icon aria-hidden="true" className="size-4" /></span>
      <span>{label}</span>
      {details && <Popover><PopoverTrigger asChild>
        <button type="button" className="metric-card-info" aria-label={detailsLabel ?? t('home.explainMetric', { label })}>
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
        <PopoverContent aria-label={label} className="space-y-2 text-sm leading-relaxed">
          <h3 className="font-semibold">{label}</h3>{details}
        </PopoverContent>
      </Popover>}
    </div>
    {pending ? <Skeleton className="h-7 w-16" /> : <strong className="metric-card-value">{value ?? '—'}</strong>}
    {note && <span className="text-xs text-muted-foreground">{note}</span>}
  </>;
  return to ? <Link className="metric-card" data-tone={tone} to={to}>{content}</Link>
    : <div className="metric-card" data-tone={tone}>{content}</div>;
}

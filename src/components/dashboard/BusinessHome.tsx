import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, CalendarDays, CheckCircle2, ChefHat,
  ChevronDown, ChevronRight, ListPlus, Package, Percent, Plus, RefreshCw, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, getBusinessRegion } from '@/lib/business-region';
import { assessMargins, fetchHomePricing } from '@/lib/homePricing';
import { cn } from '@/lib/utils';
import { PlanMascot } from '@/components/planos/PlanMascot';
import './business-home.css';

const PAGE_SIZE = 3;

export function BusinessHome({ userId, displayName }: { userId: string; displayName?: string }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [showDetails, setShowDetails] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const query = useQuery({
    queryKey: ['home-pricing', userId],
    queryFn: ({ signal }) => fetchHomePricing(userId, signal),
    refetchOnMount: 'always',
    retry: 1,
  });
  const data = query.data;
  const selectedId = params.get('markup');
  const selected = data?.channels.find(c => c.id === selectedId)?.id ?? 'saved';
  const summary = useMemo(() => data && assessMargins(data.recipes, data.channels, selected === 'saved' ? null : selected),
    [data, selected]);
  const today = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: getBusinessRegion().timeZone,
  }).format(new Date());
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2 });
  const pct = (n: number) => percent.format(n / 100);
  const stats = [
    { label: 'products', value: data?.products, icon: Package, tone: 'blue', to: '/estoque' },
    { label: 'assessedRecipes', value: summary?.assessed, icon: ChefHat, tone: 'violet', to: '/receitas' },
    { label: 'average', value: summary?.average != null ? pct(summary.average) : '—', icon: Percent, tone: 'blueRoyal' },
    { label: 'below', value: summary?.assessed ? summary.alerts.length : '—', icon: Target, tone: 'amber' },
  ];

  function changeMarkup(value: string) {
    const next = new URLSearchParams(params);
    if (value === 'saved') next.delete('markup');
    else next.set('markup', value);
    setParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  }

  return <div className="business-home mx-auto w-full max-w-[1320px]">
    <header className="home-welcome">
      <div className="home-greeting">
        <div className="home-calculeco"><PlanMascot mood="neutral" /></div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {displayName ? t('dashboard.hello', { name: displayName }) : t('home.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{today}</p>
        </div>
      </div>
      <div className="home-actions">
        <Button asChild size="sm" variant="outline" className="gap-1.5"><Link to="/producao/cronograma">
          <CalendarDays className="size-4" />{t('home.schedule')}
        </Link></Button>
        <Button asChild size="sm" className="gap-1.5"><Link to="/receitas/nova">
          <Plus className="size-4" />{t('home.newRecipe')}
        </Link></Button>
      </div>
    </header>

    <div className="home-stats">
      {stats.map(({ label, value, icon: Icon, tone, to }) => {
        const content = <><div className="home-stat-label"><span className="home-stat-icon"><Icon aria-hidden="true" className="size-4" /></span>
          <span>{t('home.' + label)}</span></div>
          {query.isPending ? <Skeleton className="mt-2 h-6 w-14" /> : <strong className="home-stat-value">{value ?? '—'}</strong>}</>;
        return to ? <Link className="home-stat" data-tone={tone} key={label} to={to}>{content}</Link>
          : <div className="home-stat" data-tone={tone} key={label}>{content}</div>;
      })}
    </div>

    {query.isError && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-card p-4 text-sm">
      {t(data ? 'home.refreshError' : 'home.loadError')}{' '}
      <button className="font-semibold text-primary underline" onClick={() => void query.refetch()}>{t('home.retry')}</button>
    </p>}

    <div className="mt-5">
      <section aria-labelledby="price-alerts" className="home-panel home-review">
        <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 id="price-alerts" className="font-display text-base font-bold tracking-tight sm:text-lg">{t('home.reviewTitle')}</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground" disabled={query.isFetching}
            aria-label={t('dashboard.refresh')} title={t('dashboard.refresh')} onClick={() => void query.refetch()}>
            <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} />
          </Button>
        </header>

        <div className="home-toolbar">
          <div className="home-filter">
            <label htmlFor="home-markup" className="text-xs font-semibold text-muted-foreground">{t('home.analysisMarkup')}</label>
            <Select value={selected} disabled={!data?.channels.length} onValueChange={changeMarkup}>
              <SelectTrigger id="home-markup" className="h-10 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="saved">{t('home.saved')}</SelectItem>
                {data?.channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!!summary?.alerts.length && <Button variant="ghost" size="sm" aria-pressed={showDetails}
            onClick={() => setShowDetails(!showDetails)} className="home-detail-button gap-1.5 font-medium">
            <ListPlus className="size-4" />{t('home.details')}
          </Button>}
        </div>

        {selected !== 'saved' && <p className="px-4 pt-3 text-xs text-muted-foreground sm:px-5">{t('home.simulationHint')}</p>}
        {query.isPending && <div role="status" aria-label={t('dashboard.loadingData')} className="space-y-3 p-5">
          {[0, 1, 2].map(n => <Skeleton key={n} className="h-11" />)}
        </div>}
        {summary && (summary.alerts.length ? <>
          <div className="home-row home-column-labels" aria-hidden="true">
            <span>{t('home.recipe')}</span><span>{t('home.price')}</span><span>{t('home.targetPrice')}</span>
          </div>
          <ul className="divide-y divide-border/70">
            {summary.alerts.slice(0, limit).map(row => <li key={row.id}>
              <Link className="home-row home-recipe group" to={`/receitas/${row.id}/editar#precificacao`}
                state={{ fromPricingHome: true, markup: selected }} aria-label={t('home.review', { name: row.name })}>
                <div className="home-identity">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-purple-dark/10 bg-purple-dark/5 text-purple-dark dark:text-foreground">
                    {row.image ? <img loading="lazy" src={row.image} alt="" className="size-full object-cover" /> : <ChefHat aria-hidden="true" className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-semibold group-hover:text-primary">{row.name}</p>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">{row.markup}</p>
                  </div>
                </div>
                <div className="home-amount">
                  <span className="home-small-label">{t('home.price')}</span>
                  <span className="font-medium">{formatMoney(row.price)}</span>
                  <span className={cn('home-caption', row.margin < 0 && 'text-destructive')}>{t('home.marginValue', { value: pct(row.margin) })}</span>
                  {showDetails && <span className="home-caption">{t('home.net', { price: formatMoney(row.net) })}</span>}
                </div>
                <div className="home-amount">
                  <span className="home-small-label">{t('home.targetPrice')}</span>
                  <strong className="font-bold">{formatMoney(row.targetPrice)}</strong>
                  <span className="home-caption">{t('home.target', { value: pct(row.target) })}</span>
                  {showDetails && <span className="home-caption">{t('home.increase', { value: formatMoney(row.targetPrice - row.price) })}</span>}
                </div>
                <ChevronRight aria-hidden="true" className="home-open size-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            </li>)}
          </ul>
          {summary.alerts.length > PAGE_SIZE && <Button variant="ghost" size="sm" className="mx-3 my-2 gap-1 text-primary"
            onClick={() => setLimit(limit < summary.alerts.length ? limit + PAGE_SIZE : PAGE_SIZE)}>
            {t(limit < summary.alerts.length ? 'home.more' : 'home.less')}
            <ChevronDown className={cn('size-4', limit >= summary.alerts.length && 'rotate-180')} />
          </Button>}
        </> : <div className="m-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:m-5">
          {summary.assessed ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <BookOpen className="size-5 shrink-0 text-muted-foreground" />}
          {t(summary.assessed ? 'home.onTarget' : summary.total ? 'home.noAssessment' : 'home.noRecipes')}
        </div>)}

        {summary && <footer className="space-y-1 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <p>{t('home.coverage', { assessed: summary.assessed, total: summary.total })}</p>
          {summary.skipped > 0 && <details className="home-pending">
            <summary>{t('home.pending', { count: summary.skipped })}</summary>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {summary.missingYield > 0 && <li>{t('home.missingYield', { count: summary.missingYield })}</li>}
              {summary.unconfirmedSale > 0 && <li>{t('home.unconfirmedSale', { count: summary.unconfirmedSale })}</li>}
              {summary.unconfirmedComposition > 0 && <li>{t('home.unconfirmedComposition', { count: summary.unconfirmedComposition })}</li>}
              {summary.skipped > summary.missingYield + summary.unconfirmedSale + summary.unconfirmedComposition && <li>{t('home.otherPending', {
                count: summary.skipped - summary.missingYield - summary.unconfirmedSale - summary.unconfirmedComposition,
              })}</li>}
            </ul>
          </details>}
        </footer>}
      </section>
    </div>
  </div>;
}

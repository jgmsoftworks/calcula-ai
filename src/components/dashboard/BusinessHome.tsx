import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChefHat, CircleAlert, Package, Percent, Plus, RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, getBusinessRegion } from '@/lib/business-region';
import { assessMargins, fetchHomePricing } from '@/lib/homePricing';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 5;

export function BusinessHome({ userId, displayName }: { userId: string; displayName?: string }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const markup = params.get('markup') ?? 'saved';
  const [limit, setLimit] = useState(PAGE_SIZE);
  const query = useQuery({
    queryKey: ['home-pricing', userId],
    queryFn: ({ signal }) => fetchHomePricing(userId, signal),
    refetchOnMount: 'always',
    retry: 1,
  });
  const data = query.data;
  const selected = data?.channels.some(c => c.id === markup) ? markup : 'saved';
  const summary = useMemo(() => data && assessMargins(data.recipes, data.channels, selected === 'saved' ? null : selected),
    [data, selected]);
  const today = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: getBusinessRegion().timeZone,
  }).format(new Date());
  const pct = (n: number) => new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2 }).format(n / 100);
  const stats = [
    { label: 'products', value: data?.products, icon: Package, color: 'text-primary bg-primary/10', to: '/estoque' },
    { label: 'recipes', value: data?.recipes.length, icon: ChefHat, color: 'text-purple-dark bg-purple-dark/10', to: '/receitas' },
    { label: 'average', value: summary?.average != null ? pct(summary.average) : '—', icon: Percent, color: 'text-blue-royal bg-blue-royal/10' },
    { label: 'below', value: summary?.assessed ? summary.alerts.length : '—', icon: Target, color: 'text-rose bg-rose/10' },
  ];

  return <div className="mx-auto w-full max-w-[1440px] space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="mb-1 text-sm text-muted-foreground first-letter:uppercase">{today}</p>
        <h1 className="break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {displayName ? t('dashboard.hello', { name: displayName }) : t('home.title')}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={query.isFetching} aria-label={t('dashboard.refresh')}
          title={t('dashboard.refresh')} onClick={() => void query.refetch()}>
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} />
        </Button>
        <Button asChild><Link to="/receitas/nova"><Plus className="size-4" />{t('home.newRecipe')}</Link></Button>
      </div>
    </header>

    {query.isError && <p role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm">
      {t(data ? 'home.refreshError' : 'home.loadError')}{' '}
      <button className="font-semibold text-primary underline" onClick={() => void query.refetch()}>{t('home.retry')}</button>
    </p>}

    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
      {stats.map(({ label, value, icon: Icon, color, to }) => {
        const content = <><div className="flex min-h-10 items-center gap-2.5">
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', color)}><Icon className="size-4" /></span>
          <span className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">{t('home.' + label)}</span>
        </div>{query.isPending ? <Skeleton className="mt-3 h-8 w-16" /> :
          <p className="mt-3 font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value ?? '—'}</p>}</>;
        const card = 'min-w-0 rounded-2xl border bg-card p-3.5 shadow-sm sm:p-5';
        return to ? <Link className={cn(card, 'hover:border-primary/40')} key={label} to={to}>{content}</Link> :
          <div key={label} className={card}>{content}</div>;
      })}
    </div>

    <section aria-labelledby="price-alerts" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 p-4 sm:p-6">
        <div>
          <h2 id="price-alerts" className="font-display text-lg font-bold tracking-tight sm:text-xl">{t('home.alertTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(selected === 'saved' ? 'home.savedHint' : 'home.simulationHint')}</p>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="home-markup" className="mb-1 block text-xs font-semibold">{t('home.analysisMarkup')}</label>
          <Select value={selected} disabled={!data?.channels.length} onValueChange={value => {
            const next = new URLSearchParams(params);
            if (value === 'saved') next.delete('markup');
            else next.set('markup', value);
            setParams(next, { replace: true });
            setLimit(PAGE_SIZE);
          }}>
            <SelectTrigger id="home-markup" className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="saved">{t('home.saved')}</SelectItem>
              {data?.channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isPending && <div role="status" aria-label={t('dashboard.loadingData')} className="space-y-3 px-5 pb-6">
        {[0, 1, 2].map(n => <Skeleton key={n} className="h-12" />)}
      </div>}
      {summary && (summary.alerts.length ? <>
        <div className="hidden grid-cols-[minmax(9rem,1.7fr)_repeat(3,minmax(5rem,1fr))_2rem] items-center gap-3 border-y bg-muted/40 px-6 py-2.5 text-xs font-medium text-muted-foreground lg:grid" aria-hidden="true">
          <span>{t('home.recipe')}</span><span>{t('home.price')}</span><span>{t('home.currentMargin')}</span><span>{t('home.targetPrice')}</span>
        </div>
        <ul className="divide-y border-y lg:border-t-0">
          {summary.alerts.slice(0, limit).map(row => <li key={row.id}>
            <Link to={`/receitas/${row.id}/editar#precificacao`} state={{ fromPricingHome: true, markup: selected }} aria-label={t('home.review', { name: row.name })}
              className="group grid grid-cols-3 items-center gap-x-3 gap-y-3 px-4 py-4 hover:bg-muted/30 focus-visible:outline-primary sm:px-6 lg:grid-cols-[minmax(9rem,1.7fr)_repeat(3,minmax(5rem,1fr))_2rem]">
              <div className="col-span-3 flex min-w-0 items-center gap-3 lg:col-span-1">
                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-purple-dark/10 text-purple-dark">
                  {row.image ? <img loading="lazy" src={row.image} alt="" className="size-full object-cover" /> : <ChefHat className="size-5" />}
                </div>
                <div className="min-w-0"><p className="break-words text-sm font-semibold group-hover:text-primary">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.markup}</p></div>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground lg:hidden" />
              </div>
              <div className="text-sm tabular-nums"><span className="block text-xs text-muted-foreground lg:sr-only">{t('home.price')}</span>
                <span className="font-medium">{formatMoney(row.price)}</span>
                <span className="block text-xs text-muted-foreground">{t('home.net', { price: formatMoney(row.net) })}</span></div>
              <div className="text-sm tabular-nums"><span className="block text-xs text-muted-foreground lg:sr-only">{t('home.currentMargin')}</span>
                <span className={cn('inline-flex rounded-md px-1.5 py-0.5 font-semibold', row.margin < 0 ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200')}>{pct(row.margin)}</span>
                <span className="block text-xs text-muted-foreground">{t('home.target', { value: pct(row.target) })}</span></div>
              <div className="text-sm tabular-nums"><span className="block text-xs text-muted-foreground lg:sr-only">{t('home.targetPrice')}</span>
                <span className="font-semibold">{formatMoney(row.targetPrice)}</span>
                <span className="block text-xs text-muted-foreground">+{formatMoney(row.targetPrice - row.price)}</span></div>
              <ArrowRight aria-hidden="true" className="hidden size-4 justify-self-end text-muted-foreground group-hover:text-primary lg:block" />
            </Link>
          </li>)}
        </ul>
        {summary.alerts.length > limit && <Button variant="ghost" className="mx-3 my-2" onClick={() => setLimit(limit + PAGE_SIZE)}>{t('home.more')}</Button>}
      </> : <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:mx-6 sm:mb-6">
        {summary.assessed ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <BookOpen className="size-5 shrink-0 text-muted-foreground" />}
        {t(summary.assessed ? 'home.onTarget' : data.recipes.length ? 'home.noAssessment' : 'home.noRecipes')}
      </div>)}

      {summary && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-xs text-muted-foreground sm:px-6">
        <div><p>{t('home.coverage', { assessed: summary.assessed, total: data.recipes.length })}</p>
          {summary.skipped > 0 && <p className="mt-1 flex items-center gap-1"><CircleAlert className="size-3.5 shrink-0" />{t('home.skipped', { count: summary.skipped })}</p>}</div>
        <Link to="/precificacao/markups" className="font-medium text-primary hover:underline">{t('home.manage')}</Link>
      </div>}
    </section>
    <nav aria-label={t('home.shortcuts')} className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {[
        { to: '/producao/cronograma', label: 'production', icon: CalendarDays },
        { to: '/estoque/movimentacoes', label: 'moveStock', icon: ArrowLeftRight },
        { to: '/receitas', label: 'openRecipes', icon: BookOpen },
      ].map(({ to, label, icon: Icon }) => <Link key={to} to={to}
        className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:border-primary/40 hover:text-primary">
        <Icon className="size-4 shrink-0 text-primary" />{t('home.' + label)}
        <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </Link>)}
    </nav>
  </div>;
}

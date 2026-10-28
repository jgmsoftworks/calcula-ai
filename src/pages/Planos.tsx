import { localizeText } from '@/i18n/localizeText';
import { getLegalStatus } from '@/lib/legal';
import { useNavigate } from 'react-router-dom';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { trackFunnel } from '@/lib/funnel-analytics';
import { useState, useEffect } from 'react';
import { ArrowRight, Check, ChevronDown, Loader2, LockKeyhole, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { usePlanos, formatPreco, planPriceAvailable, precoDoPlano, type Plano, type Billing } from '@/hooks/usePlanos';
import { useStripe } from '@/hooks/useStripe';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { planDisplayName } from '@/lib/plan-names';
import { annualSaving, comparisonRows, limitLabel, planBenefits, planPositioning } from '@/components/planos/plan-presentation';
import '@/components/planos/plans.css';

const Planos = () => {
  usePortugalTranslation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentPlan, loading, reloadPlan } = usePlanLimits();
  const access = useSubscriptionStatus();
  const manageSubscription = access.hasSubscription && access.status !== 'canceled';
  const { planos, loading: planosLoading, error: plansError, reload: reloadPlans } = usePlanos();
  const { createCheckout, openCustomerPortal, loading: stripeLoading } = useStripe();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing>('monthly');
  const busy = stripeLoading || processingPlan !== null;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({ title: t('plans.paymentSuccess'), description: t('plans.paymentSuccessDesc') });
      reloadPlan();
      window.history.replaceState({}, '', '/planos');
    }
    if (urlParams.get('canceled') === 'true') {
      toast({ title: t('plans.paymentCanceled'), description: t('plans.paymentCanceledDesc'), variant: 'destructive' });
      window.history.replaceState({}, '', '/planos');
    }
  }, [toast, reloadPlan, t]);

  useEffect(() => { trackFunnel('plans_view'); }, []);

  const handleSelectPlan = async (plano: Plano) => {
    if (!planPriceAvailable(plano, billing) && !manageSubscription) return;
    if (busy || access.loading || access.error) return;
    trackFunnel('plan_selected', { plan: plano.slug, billing, action: manageSubscription ? 'manage_subscription' : 'checkout' });
    setProcessingPlan(plano.slug);
    try {
      if (manageSubscription || precoDoPlano(plano, billing) === 0) {
        await openCustomerPortal();
      } else {
        const legal = await getLegalStatus();
        if (!legal.accepted) {
          navigate('/confirmar-documentos');
          return;
        }
        const affiliateCode = new URLSearchParams(window.location.search).get('ref');
        await createCheckout(plano.slug, billing, affiliateCode || undefined);
      }
    } catch (error) {
      console.error('Erro ao processar plano:', error);
      toast({ title: t('plans.error'), description: t('plans.planChangeError'), variant: 'destructive' });
    } finally { setProcessingPlan(null); }
  };

  const currentName = planDisplayName(currentPlan);
  const accountKnown = !access.loading && !access.error;
  const hasAnnualSaving = planos.some(plan => annualSaving(plan) > 0);

  return (
    <div className="plans-page mx-auto w-full max-w-6xl pb-8">
      <header className="plans-heading">
        <div>
          <p className="plans-eyebrow"><span aria-hidden="true" />PLANOS CALCULA AÍ</p>
          <h1 className="font-display">Precifique melhor.<br /><span>Abra espaço para crescer.</span></h1>
          <p className="plans-intro">Mais receitas, custos organizados e fichas técnicas para acompanhar sua produção.</p>
        </div>
        <aside className="plans-account" aria-label="Seu plano e acesso" data-compact={access.isTrial && !access.trialExpired}>
          {access.loading || loading ? <p role="status">Conferindo seu plano…</p> : access.error ? <>
            <p className="font-semibold">Não conseguimos conferir sua conta.</p>
            <Button variant="outline" size="sm" onClick={() => void access.refresh()}>Tentar novamente</Button>
          </> : <>
            <p className="plans-account-label">{access.isTrial ? 'Seu teste grátis' : 'Seu plano atual'}</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="font-display text-xl">{currentName}</strong>
              {access.isTrial && <span className="plans-account-tag">{access.trialExpired ? 'Teste encerrado' : `${access.daysRemaining} ${access.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}</span>}
            </div>
            <p className="plans-account-description text-sm leading-relaxed text-muted-foreground">{access.trialExpired
              ? 'Continue de onde parou. Suas receitas e seus dados estão salvos.'
              : access.isTrial ? 'Explore os recursos do Iniciante. Para continuar depois do teste, escolha um plano abaixo.'
              : access.isBlocked ? 'Escolha como continuar. Seus dados permanecem nesta conta.'
              : 'Seu negócio continua na mesma conta, mesmo quando o plano muda.'}</p>
            {manageSubscription && <button type="button" className="plans-text-link" onClick={() => void openCustomerPortal()} disabled={busy}>Gerenciar assinatura <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
          </>}
        </aside>
      </header>

      <section aria-labelledby="plans-options-title">
        <div className="plans-toolbar">
          <div><h2 id="plans-options-title" className="font-display text-lg font-bold">Qual é o momento do seu negócio?</h2><p className="plans-toolbar-description mt-1 text-sm text-muted-foreground">Compare os recursos e encontre seu próximo passo.</p></div>
          <div className="plans-billing" role="group" aria-label="Período de cobrança">
            {(['monthly', 'yearly'] as Billing[]).map(option => <button key={option} type="button" aria-label={option === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual'} aria-pressed={billing === option} onClick={() => setBilling(option)}>
              {option === 'monthly' ? 'Mensal' : 'Anual'}
              {option === 'yearly' && hasAnnualSaving && <span>Economize</span>}
            </button>)}
          </div>
        </div>

        {planosLoading ? <div role="status" className="plans-grid" aria-label={localizeText("Carregando planos")}>
          {[0, 1, 2].map(value => <div key={value} className="h-96 animate-pulse rounded-2xl border border-border bg-muted/40 motion-reduce:animate-none" />)}
          <span className="sr-only">{localizeText("Carregando planos…")}</span>
        </div> : plansError || planos.length === 0 ? <div role="alert" className="rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="font-semibold">Não foi possível carregar os planos agora.</h3><p className="mt-2 text-sm text-muted-foreground">Tente novamente para consultar os valores e continuar.</p>
          <Button variant="outline" className="mt-4" onClick={() => void reloadPlans()}>Carregar planos novamente</Button>
        </div> : <div className="plans-grid">
          {planos.map(plano => {
            const isCurrent = accountKnown && !loading && currentPlan === plano.slug;
            const featured = plano.slug === 'professional';
            const positioning = planPositioning[plano.slug];
            const saving = annualSaving(plano);
            const marketUnavailable = !planPriceAvailable(plano, billing);
            const annualUnavailable = billing === 'yearly' && plano.preco_centavos > 0 && plano.preco_anual_centavos <= 0;
            const price = precoDoPlano(plano, billing);
            return <article key={plano.id} className={`plans-card ${featured ? 'plans-card-featured' : ''}`} aria-labelledby={`plan-${plano.slug}`} data-current={isCurrent}>
              <div className="plans-card-heading">
                <p className="plans-card-audience">{positioning?.audience || 'Para o seu negócio'}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id={`plan-${plano.slug}`} className="font-display text-2xl font-bold">{plano.nome_publico}</h3>
                  {isCurrent && <span className="plans-current-tag">{access.isTrial ? 'Seu plano no teste' : 'Seu plano atual'}</span>}
                </div>
                <p className="plans-card-description">{positioning?.description || plano.descricao}</p>
              </div>
              <div className="plans-price-block" aria-live="polite" aria-atomic="true">
                <div className="plans-price">{marketUnavailable ? <strong className="text-xl">{t('regional.pricePending')}</strong> : annualUnavailable ? <strong className="text-xl">Anual indisponível</strong> : <><strong>{formatPreco(price, plano.moeda)}</strong>{price > 0 && <span>/{billing === 'yearly' ? 'ano' : 'mês'}</span>}</>}</div>
                <p className="plans-price-note">{marketUnavailable ? t('regional.billingPending') : annualUnavailable ? 'Você pode escolher a cobrança mensal.' : billing === 'yearly' && price > 0
                  ? `${formatPreco(price, plano.moeda)} cobrados por ano. Equivale a ${formatPreco(Math.round(price / 12), plano.moeda)}/mês.`
                  : price > 0 ? 'Cobrança mensal.' : 'Sem cobrança.'}</p>
                <p className="plans-saving">{saving > 0 && !annualUnavailable ? billing === 'yearly'
                  ? <>Economia de <strong>{formatPreco(saving, plano.moeda)}</strong> em relação a 12 mensalidades.</>
                  : <>No anual, economize <strong>{formatPreco(saving, plano.moeda)}</strong> por ano.</> : '\u00a0'}</p>
              </div>
              <Button className="plans-select-button" onClick={() => void handleSelectPlan(plano)} disabled={busy || loading || access.loading || access.error || annualUnavailable || (marketUnavailable && !manageSubscription)} aria-busy={processingPlan === plano.slug}>
                {processingPlan === plano.slug ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Abrindo…</>
                  : marketUnavailable && !manageSubscription ? t('regional.notAvailable') : annualUnavailable ? 'Indisponível no anual' : manageSubscription ? isCurrent ? 'Gerenciar meu plano' : 'Alterar assinatura'
                  : <>Escolher {plano.nome_publico}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </Button>
              <div className="plans-card-features">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider">O que você tem à mão</p>
                <ul className="space-y-3.5">
                  {planBenefits(plano).map(benefit => <li key={benefit.label} className="flex items-start gap-2.5 text-sm leading-relaxed" data-included={benefit.included}>
                    {benefit.included ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span>{benefit.label}</span>
                  </li>)}
                </ul>
              </div>
            </article>;
          })}
        </div>}
        {manageSubscription && <p className="mt-4 text-center text-sm text-muted-foreground">Ao alterar sua assinatura, você escolhe o novo plano e confere os valores na próxima tela.</p>}
        <div className="plans-reassurance"><span><LockKeyhole className="h-4 w-4" aria-hidden="true" />Pagamento seguro</span><span>Mesma conta, dados preservados</span><span>{localizeText("Sem refazer seus cadastros")}</span></div>
      </section>

      {!planosLoading && !plansError && planos.length > 0 && <section className="plans-comparison" aria-labelledby="plans-comparison-title">
        <div className="plans-section-heading"><p className="plans-section-kicker">CADA DETALHE CONTA</p><h2 id="plans-comparison-title" className="font-display text-2xl font-bold">Veja o que muda em cada plano.</h2><p className="mt-2 text-sm text-muted-foreground">Os limites abaixo valem para a sua conta.</p></div>
        <div className="plans-table-scroll" role="region" aria-label="Comparação de recursos dos planos" tabIndex={0}>
          <table className="plans-table">
            <caption className="sr-only">{localizeText("Limites de receitas, matérias-primas, precificação, fichas técnicas e estoque por plano.")}</caption>
            <thead><tr><th scope="col">Na sua rotina</th>{planos.map(plano => <th scope="col" key={plano.id} data-featured={plano.slug === 'professional'}>{plano.nome_publico}</th>)}</tr></thead>
            <tbody>{comparisonRows.map(row => <tr key={row.key}><th scope="row">{row.label}{row.explanation && <span>{row.explanation}</span>}</th>{planos.map(plano => <td key={plano.id} data-featured={plano.slug === 'professional'}>{limitLabel(plano.limites?.[row.key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="plans-table-hint">{localizeText("No celular, deslize a tabela para comparar todos os planos.")}</p>
      </section>}

      <section className="plans-faq" aria-labelledby="plans-faq-title">
        <div><p className="plans-section-kicker">ANTES DE ESCOLHER</p><h2 id="plans-faq-title" className="font-display text-2xl font-bold">Pode ficar tranquilo.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Você dá o próximo passo sem perder o trabalho que já fez.</p></div>
        <div>
          {[
            { question: 'O que acontece com minhas receitas quando eu assino?', answer: 'Você continua na mesma conta. Receitas, matérias-primas e histórico permanecem salvos. Os recursos do plano escolhido são liberados após a confirmação do pagamento.' },
            { question: 'Como funcionam os 7 dias grátis?', answer: 'O teste oferece os recursos e limites do plano Iniciante por 7 dias, sem cobrança automática. Fichas técnicas em PDF não estão incluídas. Ao terminar, escolha e pague um plano para continuar; seus dados ficam preservados.' },
            { question: 'Qual é a diferença entre mensal e anual?', answer: 'No mensal, a cobrança é a cada mês. No anual, o valor total exibido é cobrado uma vez por ano. A economia mostrada compara o anual com 12 mensalidades do mesmo plano.' },
            { question: 'Posso mudar de plano depois?', answer: 'Sim. Com uma assinatura ativa, use “Gerenciar assinatura” para consultar as opções de mudança. Você confere os valores e as condições antes de confirmar.' },
          ].map(item => <details key={item.question}><summary>{item.question}<ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /></summary><p>{item.answer}</p></details>)}
        </div>
      </section>
    </div>
  );
};

export default Planos;

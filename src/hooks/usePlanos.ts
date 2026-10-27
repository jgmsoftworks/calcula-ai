import { useBusinessRegion } from '@/contexts/BusinessRegionContext';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlanSlug = 'lite' | 'professional' | 'enterprise';

export interface PlanoLimites {
  produtos: number;
  receitas: number;
  markups: number;
  movimentacoes: number;
  pdf_exports: number;
}

export type Billing = 'monthly' | 'yearly';

export interface Plano {
  id: string;
  slug: PlanSlug;
  nome_publico: string;
  descricao: string | null;
  preco_centavos: number;
  preco_anual_centavos: number;
  moeda: string;
  periodicidade: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  versao_preco: number;
  versao_preco_anual: number;
  ativo: boolean;
  ordem: number;
  limites: PlanoLimites;
  features: string[];
  market_price_available?: boolean;
  market_annual_available?: boolean;
}

export const formatPreco = (centavos: number, currency = 'BRL') => {
  if (!centavos) return 'Grátis';
  return new Intl.NumberFormat(currency.toUpperCase() === 'EUR' ? 'pt-PT' : 'pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(centavos / 100).replace(/[\u00a0\u202f]/g, ' ');
};
export const planPriceAvailable = (plan: Plano, billing: Billing = 'monthly') =>
  billing === 'yearly' ? plan.market_annual_available !== false : plan.market_price_available !== false;

/** Preço do plano conforme a periodicidade escolhida. */
export const precoDoPlano = (plano: Plano, billing: Billing) =>
  billing === 'yearly' ? (plano.preco_anual_centavos ?? 0) : plano.preco_centavos;


/** Fonte central de planos — sempre vinda do banco (tabela public.planos). */
export const usePlanos = (incluirInativos = false) => {
  const { country } = useBusinessRegion();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('planos').select('*').order('ordem', { ascending: true });
      if (!incluirInativos) query = query.eq('ativo', true);
      const { data, error } = await query;
      if (error) throw error;
      let marketPrices: { plan_slug: string; billing: string; amount_cents: number; stripe_price_id: string }[] = [];
      if (country === 'PT' && !incluirInativos) {
        const result = await supabase.from('plan_market_prices').select('*').eq('country_code', country).eq('active', true);
        if (result.error) throw result.error;
        marketPrices = result.data || [];
      }
      const marketFields = (slug: string) => {
        if (country !== 'PT' || incluirInativos) return {};
        const monthly = marketPrices.find(p => p.plan_slug === slug && p.billing === 'monthly');
        const yearly = marketPrices.find(p => p.plan_slug === slug && p.billing === 'yearly');
        return { moeda: 'eur', preco_centavos: monthly?.amount_cents ?? 0, preco_anual_centavos: yearly?.amount_cents ?? 0,
          stripe_price_id: monthly?.stripe_price_id ?? null, stripe_price_id_anual: yearly?.stripe_price_id ?? null,
          market_price_available: !!monthly, market_annual_available: !!yearly };
      };
      setPlanos(
        (data || []).map((p: any) => ({
          ...p,
          ...marketFields(p.slug),
          limites: (p.limites || {}) as PlanoLimites,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        })) as Plano[],
      );
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar planos:', err);
      setError(err?.message ?? 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, [incluirInativos, country]);

  useEffect(() => {
    load();
  }, [load]);

  const getPlano = useCallback(
    (slug: string) => planos.find((p) => p.slug === (slug === 'free' ? 'lite' : slug)),
    [planos],
  );

  return { planos, loading, error, reload: load, getPlano };
};

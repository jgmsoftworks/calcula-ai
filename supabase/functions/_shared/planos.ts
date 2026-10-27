// Helpers compartilhados para leitura da fonte central de planos (public.planos).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface PlanoRow {
  slug: string;
  nome_publico: string;
  preco_centavos: number;
  preco_anual_centavos: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  versao_preco: number;
  versao_preco_anual: number;
  ativo: boolean;
  moeda: string;
}

export type Billing = "monthly" | "yearly";

export function normalizeBilling(billing?: string | null): Billing {
  return billing === "yearly" ? "yearly" : "monthly";
}

/** Preço vigente do plano para a periodicidade escolhida. */
export function precoDoPlano(plano: PlanoRow, billing: Billing) {
  return billing === "yearly"
    ? { priceId: plano.stripe_price_id_anual, centavos: plano.preco_anual_centavos ?? 0 }
    : { priceId: plano.stripe_price_id, centavos: plano.preco_centavos ?? 0 };
}


export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export function normalizeSlug(slug?: string | null) {
  const s = (slug ?? "").trim().toLowerCase();
  return s === "free" ? "lite" : s;
}

/** Busca o plano ativo pelo slug. Retorna null se não existir. */
export async function getPlano(slug: string, country = 'BR'): Promise<PlanoRow | null> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("planos")
    .select(
      "slug, nome_publico, preco_centavos, preco_anual_centavos, stripe_product_id, stripe_price_id, stripe_price_id_anual, versao_preco, versao_preco_anual, ativo, moeda",
    )

    .eq("slug", normalizeSlug(slug))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (country === 'BR') return data as PlanoRow;
  if (country !== 'PT') throw new Error('Unsupported business country');
  const { data: prices, error: priceError } = await supabase.from('plan_market_prices')
    .select('*').eq('plan_slug', normalizeSlug(slug)).eq('country_code', country).eq('active', true);
  if (priceError) throw priceError;
  const monthly = prices?.find(p => p.billing === 'monthly');
  const yearly = prices?.find(p => p.billing === 'yearly');
  return { ...data, moeda: 'eur', preco_centavos: monthly?.amount_cents ?? 0, preco_anual_centavos: yearly?.amount_cents ?? 0,
    stripe_price_id: monthly?.stripe_price_id ?? null, stripe_price_id_anual: yearly?.stripe_price_id ?? null } as PlanoRow;
}

/**
 * Descobre o slug do plano a partir de um product/price do Stripe.
 * Considera o preço vigente (planos) e todo o histórico (planos_precos_historico),
 * garantindo que assinantes legados continuem no plano correto.
 */
export async function slugFromStripe(
  productId?: string | null,
  priceId?: string | null,
): Promise<string | null> {
  const supabase = serviceClient();

  if (priceId) {
    const { data } = await supabase
      .from("planos")
      .select("slug")
      .or(`stripe_price_id.eq.${priceId},stripe_price_id_anual.eq.${priceId}`)
      .maybeSingle();
    if (data?.slug) return data.slug as string;


    const { data: market, error: marketError } = await supabase.from('plan_market_prices')
      .select('plan_slug').eq('stripe_price_id', priceId).maybeSingle();
    if (marketError) throw marketError;
    if (market?.plan_slug) return market.plan_slug;

    const { data: hist } = await supabase
      .from("planos_precos_historico")
      .select("plano_slug")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (hist?.plano_slug) return hist.plano_slug as string;
  }

  if (productId) {
    const { data } = await supabase
      .from("planos")
      .select("slug")
      .eq("stripe_product_id", productId)
      .maybeSingle();
    if (data?.slug) return data.slug as string;

    const { data: hist } = await supabase
      .from("planos_precos_historico")
      .select("plano_slug")
      .eq("stripe_product_id", productId)
      .maybeSingle();
    if (hist?.plano_slug) return hist.plano_slug as string;
  }

  return null;
}

export async function getAccountMarket(userId: string) {
  const { data, error } = await serviceClient().from('profiles')
    .select('business_country, preferred_locale, region_confirmed').eq('user_id', userId).single();
  if (error || !data?.region_confirmed || !['BR', 'PT'].includes(data.business_country)) {
    throw new Error('Confirme o país da sua conta antes de escolher um plano.');
  }
  return { country: data.business_country as 'BR' | 'PT', locale: data.preferred_locale === 'en' ? 'en' as const : data.business_country === 'PT' ? 'pt' as const : 'pt-BR' as const };
}

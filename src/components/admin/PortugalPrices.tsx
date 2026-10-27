import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatPreco } from '@/hooks/usePlanos';

type Price = { id: string; plan_slug: string; billing: string; amount_cents: number; stripe_price_id: string };
const planNames: Record<string, string> = { lite: 'Iniciante', professional: 'Profissional', enterprise: 'Empresarial' };
export function PortugalPrices() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [slug, setSlug] = useState('lite');
  const [billing, setBilling] = useState('monthly');
  const [priceId, setPriceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    const { data, error } = await supabase.functions.invoke('admin-planos', { body: { action: 'market_prices' } });
    if (error || data?.error) { setMessage('Não foi possível consultar os preços em euros.'); return; }
    setPrices(data.prices ?? []);
    setLoaded(true);
  };
  useEffect(() => { void load(); }, []);
  const attach = async () => {
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-planos', { body: { action: 'attach_portugal_price', slug, billing, price_id: priceId.trim() } });
      if (error || data?.error) throw new Error(data?.error || 'Confira se o preço está ativo, em EUR e pertence ao produto e período escolhidos.');
      setMessage(`Preço associado: ${formatPreco(data.amount_cents, 'EUR')}. As assinaturas existentes mantêm o valor contratado.`);
      setPriceId(''); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível associar o preço.'); }
    finally { setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Portugal · EUR</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Os preços de Portugal são independentes dos planos em reais. Após definir os valores e a configuração de impostos, associe um preço recorrente em EUR criado no Stripe para o mesmo produto.</p>
    {loaded && prices.length === 0 && <p className="text-sm">Nenhum preço em euros liberado. A cobrança em Portugal permanece indisponível.</p>}
    <ul className="space-y-1 text-sm">{prices.map(price => <li key={price.id}>{planNames[price.plan_slug] || price.plan_slug} · {price.billing === 'yearly' ? 'Anual' : 'Mensal'} · {formatPreco(price.amount_cents, 'EUR')}</li>)}</ul>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Plano<select className="h-10 w-full rounded-md border bg-background px-3" value={slug} onChange={e => setSlug(e.target.value)}>{Object.entries(planNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      <label className="space-y-1 text-sm">Período<select className="h-10 w-full rounded-md border bg-background px-3" value={billing} onChange={e => setBilling(e.target.value)}><option value="monthly">Mensal</option><option value="yearly">Anual</option></select></label>
    </div>
    <label className="block space-y-1 text-sm">Identificador do preço no Stripe<Input value={priceId} onChange={e => setPriceId(e.target.value)} placeholder="price_..." /></label>
    <Button disabled={busy || !loaded || !priceId.trim()} onClick={() => void attach()}>{busy ? 'Conferindo preço…' : 'Associar preço e liberar cobrança'}</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </CardContent></Card>;
}

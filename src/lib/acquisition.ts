const KEY = 'calculaai_acquisition_v1';
const PLANS = ['lite', 'professional', 'enterprise'];
export function parseAcquisition(search: string) {
  const input = new URLSearchParams(search);
  const out = new URLSearchParams();
  if (input.get('trial') === '1' || input.get('mode') === 'signup') out.set('trial', '1');
  if (['BR', 'PT'].includes(input.get('country') || '')) out.set('country', input.get('country')!);
  if (['pt-BR', 'pt-PT', 'en'].includes(input.get('lang') || '')) out.set('lang', input.get('lang')!);
  if (input.get('source') !== 'landing') return out;
  out.set('source', 'landing');
  const plan = input.get('plan');
  if (plan && PLANS.includes(plan)) {
    out.set('plan', plan);
    out.set('billing', input.get('billing') === 'yearly' ? 'yearly' : 'monthly');
  }
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = input.get(key);
    if (value) out.set(key, value.slice(0, 200));
  }
  return out;
}
function saved() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (value?.expires > Date.now() && typeof value.query === 'string') return value;
  } catch { /* storage is optional */ }
  return null;
}
export function rememberAcquisition(search: string) {
  const params = parseAcquisition(search);
  if (!params.has('source') && !params.has('trial') && !params.has('country')) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ query: params.toString(), pending: true, expires: Date.now() + 86400000 })); } catch { /* optional storage */ }
}
export function acquisitionContext() {
  return parseAcquisition(saved()?.query || '');
}
export function acquisitionDestination(search = '') {
  const current = parseAcquisition(search);
  const stored = saved();
  const params = current.has('source') || current.has('trial') || current.has('country') ? current : parseAcquisition(stored?.pending ? stored.query : '');
  return params.has('plan') && !params.has('trial') ? `/checkout?${params}` : '/';
}
export function consumeAcquisition() {
  const value = saved();
  if (value) { try { sessionStorage.setItem(KEY, JSON.stringify({ ...value, pending: false })); } catch { /* optional storage */ } }
}
export function authReturnUrl() {
  const current = parseAcquisition(window.location.search);
  const stored = saved();
  const params = current.has('source') || current.has('trial') || current.has('country') ? current : parseAcquisition(stored?.pending ? stored.query : '');
  return `${window.location.origin}/${params.size ? `?${params}` : ''}`;
}

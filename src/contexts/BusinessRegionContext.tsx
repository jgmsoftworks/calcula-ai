import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_REGIONS, initialBusinessCountry, isAppLanguage, isBusinessCountry, setBusinessRegion, type BusinessCountry, type BusinessRegion } from '@/lib/business-region';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';

const BusinessRegionContext = createContext<BusinessRegion>(BUSINESS_REGIONS.BR);
export const useBusinessRegion = () => useContext(BusinessRegionContext);

export function BusinessRegionProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useTranslation();
  const userId = user?.id;
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const [account, setAccount] = useState<{ userId: string; country: BusinessCountry; confirmed: boolean } | null>(null);
  const [country, setCountry] = useState<BusinessCountry>(() => initialBusinessCountry());
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setAccount(null);
    setError(false);
    setBusinessRegion('BR');
    if (!userId) return;
    void (async () => {
      const { data, error: loadError } = await supabase.from('profiles')
        .select('business_country, region_confirmed, preferred_locale').eq('user_id', userId).single();
      if (!active) return;
      if (loadError || !data || !isBusinessCountry(data.business_country)) { setError(true); return; }
      setBusinessRegion(data.business_country);
      // An explicit entry link may preselect Portugal for a new Google account.
      setCountry(data.region_confirmed ? data.business_country : initialBusinessCountry());
      if (data.region_confirmed && isAppLanguage(data.preferred_locale)) await i18n.changeLanguage(data.preferred_locale);
      if (active) setAccount({ userId, country: data.business_country, confirmed: data.region_confirmed });
    })();
    return () => { active = false; };
  }, [userId, retry]);

  useEffect(() => {
    if (!account?.confirmed || account.userId !== userId) return;
    const onLanguage = (language: string) => {
      if (isAppLanguage(language)) void supabase.from('profiles').update({ preferred_locale: language }).eq('user_id', account.userId).then(({ error }) => {
        if (error) console.error('Não foi possível guardar a preferência de idioma.');
      });
    };
    i18n.on('languageChanged', onLanguage);
    return () => { i18n.off('languageChanged', onLanguage); };
  }, [account, userId]);

  const confirmRegion = async () => {
    if (!userId || saving) return;
    setSaving(true);
    const region = BUSINESS_REGIONS[country];
    const { data: saved, error: saveError } = await supabase.from('profiles').update({
      business_country: country, region_confirmed: true, preferred_locale: region.locale, pais: region.name,
    }).eq('user_id', userId).select('business_country, region_confirmed').single();
    if (activeUserId.current !== userId) return;
    setSaving(false);
    if (saveError || !saved?.region_confirmed || saved.business_country !== country) { setError(true); return; }
    setBusinessRegion(country);
    await i18n.changeLanguage(region.locale);
    setAccount({ userId, country, confirmed: true });
  };

  if (authLoading || (user && (!account || account.userId !== user.id) && !error)) {
    return <div role="status" className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t('regional.loading')}</div>;
  }
  if (user && (error || !account?.confirmed)) return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-lg space-y-6 rounded-3xl border bg-card p-8 shadow-sm">
      <LanguageSelector />
      <h1 className="text-2xl font-bold">{t('regional.welcome')}</h1>
      {error ? <div role="alert" className="space-y-4"><p>{t('regional.error')}</p><Button onClick={() => { setError(false); setRetry(n => n + 1); }}>{t('common.tryAgain')}</Button></div> : <>
        <p className="text-muted-foreground">{t('regional.explanation')}</p>
        <label className="block space-y-2"><span className="text-sm font-medium">{t('regional.country')}</span>
          <select className="h-12 w-full rounded-xl border bg-background px-3" value={country} onChange={e => { if (isBusinessCountry(e.target.value)) setCountry(e.target.value); }}>
            <option value="BR">Brasil · BRL (R$)</option><option value="PT">Portugal · EUR (€)</option>
          </select>
        </label>
        <p className="rounded-xl bg-muted p-4 text-sm">{t('regional.fixedCurrency')}</p>
        <Button className="w-full" disabled={saving} onClick={() => void confirmRegion()}>{saving ? t('common.saving') : t('regional.continue')}</Button>
      </>}
      <Button variant="ghost" className="w-full" onClick={() => void signOut()}>{t('nav.sair')}</Button>
    </section>
  </main>;
  return <BusinessRegionContext.Provider value={account ? BUSINESS_REGIONS[account.country] : BUSINESS_REGIONS.BR}>{children}</BusinessRegionContext.Provider>;
}

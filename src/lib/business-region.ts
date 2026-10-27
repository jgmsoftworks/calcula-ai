export type BusinessCountry = 'BR' | 'PT';
export type AppLanguage = 'pt-BR' | 'pt-PT' | 'en';

export const BUSINESS_REGIONS = {
  BR: { country: 'BR', currency: 'BRL', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', name: 'Brasil' },
  PT: { country: 'PT', currency: 'EUR', locale: 'pt-PT', timeZone: 'Europe/Lisbon', name: 'Portugal' },
} as const;
export type BusinessRegion = (typeof BUSINESS_REGIONS)[BusinessCountry];
export const isBusinessCountry = (value: unknown): value is BusinessCountry => value === 'BR' || value === 'PT';
export const isAppLanguage = (value: unknown): value is AppLanguage => ['pt-BR', 'pt-PT', 'en'].includes(String(value));

// Set only after reading the authenticated account. Browser language never changes money.
let currentRegion: BusinessRegion = BUSINESS_REGIONS.BR;
export const getBusinessRegion = () => currentRegion;
export const setBusinessRegion = (country: BusinessCountry) => { currentRegion = BUSINESS_REGIONS[country]; };

export function formatMoney(value: number, options: Intl.NumberFormatOptions = {}, region = getBusinessRegion()) {
  return new Intl.NumberFormat(region.locale, { style: 'currency', currency: region.currency, ...options }).format(value);
}
export function currencySymbol(region = getBusinessRegion()) {
  return new Intl.NumberFormat(region.locale, { style: 'currency', currency: region.currency })
    .formatToParts(0).find(part => part.type === 'currency')!.value;
}
export function formatRegionalDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = {}) {
  const region = getBusinessRegion();
  return new Intl.DateTimeFormat(region.locale, { timeZone: region.timeZone, ...options }).format(new Date(value));
}
export function initialBusinessCountry(search = typeof location === 'undefined' ? '' : location.search): BusinessCountry {
  const country = new URLSearchParams(search).get('country');
  return isBusinessCountry(country) ? country : 'BR';
}

export function formatPortuguesePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  const national = (digits.startsWith('351') ? digits.slice(3) : digits).slice(0, 9);
  return national ? '+351 ' + national.match(/.{1,3}/g)!.join(' ') : '';
}
export function formatPortuguesePostcode(input: string) {
  return input.replace(/\D/g, '').slice(0, 7).replace(/^(\d{4})(\d)/, '$1-$2');
}

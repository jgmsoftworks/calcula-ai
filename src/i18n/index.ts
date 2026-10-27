import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';
import ptPTCopy from './locales/pt-PT-copy.json';
import { isAppLanguage } from '@/lib/business-region';

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const entryLanguage = params.get('lang') || (params.get('country') === 'PT' ? 'pt-PT' : undefined);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en': { translation: en },
      'pt-PT': { translation: ptPT, copy: ptPTCopy },
    },
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'pt-PT', 'en'],
    load: 'currentOnly',
    lng: isAppLanguage(entryLanguage) ? entryLanguage : undefined,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

function updateDocumentLanguage(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}
i18n.on('languageChanged', updateDocumentLanguage);
updateDocumentLanguage(i18n.resolvedLanguage || 'pt-BR');

export default i18n;

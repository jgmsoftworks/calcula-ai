import { useTranslation } from 'react-i18next';
import { isAppLanguage } from '@/lib/business-region';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  return <select aria-label="Idioma / Language" className="h-9 max-w-[180px] rounded-lg border border-border bg-background px-2 text-xs"
    value={isAppLanguage(i18n.language) ? i18n.language : 'pt-BR'}
    onChange={event => { if (isAppLanguage(event.target.value)) void i18n.changeLanguage(event.target.value); }}>
    <option value="pt-BR">Português (Brasil)</option>
    <option value="pt-PT">Português (Portugal)</option>
    <option value="en">English</option>
  </select>;
}

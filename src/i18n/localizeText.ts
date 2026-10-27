import i18n from 'i18next';

/** Existing Portuguese copy uses explicit translations; database values are never translated. */
export function localizeText(text: string): string {
  return i18n.isInitialized ? i18n.t(text, { ns: 'copy', keySeparator: false, nsSeparator: false, defaultValue: text }) : text;
}

import { readFileSync } from 'node:fs';

const enJson = JSON.parse(
  readFileSync(new URL('../../locales/en.json', import.meta.url), 'utf8')
);
const trJson = JSON.parse(
  readFileSync(new URL('../../locales/tr.json', import.meta.url), 'utf8')
);

export const LOCALES = {
  en: enJson,
  tr: trJson,
};

/**
 * Get locale data for a language code. Defaults to 'en'.
 * @param {string} [lang='en']
 * @returns {typeof enJson}
 */
export function getLocale(lang = 'en') {
  const code = (lang || 'en').toLowerCase().slice(0, 2);
  return LOCALES[code] || LOCALES.en;
}

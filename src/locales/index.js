import { readFileSync } from 'node:fs';

const enJson = JSON.parse(
  readFileSync(new URL('../../locales/en.json', import.meta.url), 'utf8')
);
const trJson = JSON.parse(
  readFileSync(new URL('../../locales/tr.json', import.meta.url), 'utf8')
);

const deJson = JSON.parse(
  readFileSync(new URL('../../locales/de.json', import.meta.url), 'utf8')
);
const esJson = JSON.parse(
  readFileSync(new URL('../../locales/es.json', import.meta.url), 'utf8')
);

export const LOCALES = {
  en: enJson,
  tr: trJson,
  de: deJson,
  es: esJson,
};

/** Language codes accepted by `--lang` and the `lang` option. */
export const SUPPORTED_LANGUAGES = Object.keys(LOCALES);

/**
 * Normalize a language tag such as "de-AT" to a supported code, or null.
 * @param {string} [lang]
 * @returns {string | null}
 */
export function resolveLanguage(lang = 'en') {
  const code = String(lang || 'en').toLowerCase().slice(0, 2);
  return LOCALES[code] ? code : null;
}

/**
 * Get locale data for a language code. Defaults to 'en'.
 * @param {string} [lang='en']
 * @returns {typeof enJson}
 */
export function getLocale(lang = 'en') {
  const code = (lang || 'en').toLowerCase().slice(0, 2);
  return LOCALES[code] || LOCALES.en;
}

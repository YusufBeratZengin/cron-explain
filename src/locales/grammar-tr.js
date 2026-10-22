/**
 * Turkish grammar helpers for ordinal numbers, case suffixes (-de/-da/-te/-ta),
 * and idiomatic expression formatting.
 */

const HARD_CONSONANTS = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p']);
const BACK_VOWELS = new Set(['a', 'ı', 'o', 'u']);
const FRONT_VOWELS = new Set(['e', 'i', 'ö', 'ü']);

/**
 * Returns the Turkish ordinal suffix for a positive integer.
 * e.g. 1 -> "'inci", 2 -> "'nci", 3 -> "'üncü", 4 -> "'üncü", 6 -> "'ncı", etc.
 *
 * @param {number} n Positive integer
 * @param {'suffix' | 'dot'} [style='suffix']
 * @returns {string}
 */
export function turkishOrdinal(n, style = 'suffix') {
  if (style === 'dot') {
    return `${n}.`;
  }

  const num = Math.abs(Math.trunc(n));
  const rem10 = num % 10;
  const rem100 = num % 100;

  if (num === 0) return `${n}'ıncı`;

  if (rem10 !== 0) {
    switch (rem10) {
      case 1: return `${n}'inci`;
      case 2: return `${n}'nci`;
      case 3: return `${n}'üncü`;
      case 4: return `${n}'üncü`;
      case 5: return `${n}'inci`;
      case 6: return `${n}'ncı`;
      case 7: return `${n}'nci`;
      case 8: return `${n}'inci`;
      case 9: return `${n}'uncu`;
    }
  }

  // Multiples of 10
  switch (rem100) {
    case 10: return `${n}'uncu`;
    case 20: return `${n}'nci`;
    case 30: return `${n}'uncu`;
    case 40: return `${n}'ıncı`;
    case 50: return `${n}'nci`;
    case 60: return `${n}'ıncı`;
    case 70: return `${n}'inci`;
    case 80: return `${n}'inci`;
    case 90: return `${n}'ıncı`;
  }

  if (num % 1000 === 0) return `${n}'inci`;
  if (num % 100 === 0) return `${n}'üncü`;

  return `${n}.`;
}

/**
 * Returns the locative suffix (-de, -da, -te, -ta) for a number, time string (HH:MM), or word.
 * e.g.
 *   "14:00" -> "14:00'te" (on dörtte)
 *   "14:30" -> "14:30'da" (otuzda)
 *   "09:15" -> "09:15'te" (on beşte)
 *   "Ocak"  -> "Ocak'ta"
 *   "Eylül" -> "Eylül'de"
 *
 * @param {string | number} input
 * @returns {string} The input followed by an apostrophe and the correct locative suffix.
 */
export function turkishLocative(input) {
  const str = String(input).trim();

  // If time in HH:MM or HH:MM:SS format
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(str);
  if (timeMatch) {
    const min = parseInt(timeMatch[2], 10);
    const sec = timeMatch[3] !== undefined ? parseInt(timeMatch[3], 10) : null;

    if (sec !== null && sec !== 0) {
      return `${str}'${getNumberLocativeSuffix(sec)}`;
    }
    if (min !== 0) {
      return `${str}'${getNumberLocativeSuffix(min)}`;
    }
    const hr = parseInt(timeMatch[1], 10);
    return `${str}'${getNumberLocativeSuffix(hr)}`;
  }

  // If pure integer
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return `${str}'${getNumberLocativeSuffix(num)}`;
  }

  // General word suffix by vowel harmony and consonant assimilation
  const suffix = getWordLocativeSuffix(str);
  return `${str}'${suffix}`;
}

/**
 * Helper to determine locative suffix for numbers 0-99 (and larger).
 * @param {number} n
 * @returns {'de' | 'da' | 'te' | 'ta'}
 */
export function getNumberLocativeSuffix(n) {
  const num = Math.abs(Math.trunc(n));
  const rem10 = num % 10;
  const rem100 = num % 100;

  if (rem10 !== 0) {
    switch (rem10) {
      case 1:
      case 2:
      case 7:
      case 8:
        return 'de';
      case 3:
      case 4:
      case 5:
        return 'te';
      case 6:
      case 9:
        return 'da';
    }
  }

  // Ending in 0
  switch (rem100) {
    case 0:
    case 10:
    case 30:
    case 90:
      return 'da';
    case 20:
    case 50:
    case 80:
      return 'de';
    case 40:
    case 60:
      return 'ta';
    case 70:
      return 'te';
  }

  if (num % 1000 === 0) return 'de'; // bin'de
  if (num % 100 === 0) return 'de';  // yüz'de

  return 'de';
}

/**
 * Helper to determine locative suffix for an alphabetic word.
 * @param {string} word
 * @returns {'de' | 'da' | 'te' | 'ta'}
 */
export function getWordLocativeSuffix(word) {
  const clean = word.toLowerCase().replace(/[^a-zçğıöşü]/g, '');
  if (!clean) return 'de';

  const lastChar = clean[clean.length - 1];
  const isHardConsonant = HARD_CONSONANTS.has(lastChar);

  // Find last vowel
  let lastVowel = '';
  for (let i = clean.length - 1; i >= 0; i--) {
    const ch = clean[i];
    if (BACK_VOWELS.has(ch) || FRONT_VOWELS.has(ch)) {
      lastVowel = ch;
      break;
    }
  }

  const vowel = BACK_VOWELS.has(lastVowel) ? 'a' : 'e';
  const consonant = isHardConsonant ? 't' : 'd';

  return `${consonant}${vowel}`;
}

/**
 * Returns the Turkish step phrase for an interval.
 * e.g. "minute" -> "dakikada bir", "hour" -> "saatte bir"
 *
 * @param {'second' | 'minute' | 'hour' | 'day' | 'month' | 'year'} unit
 * @returns {string}
 */
export function turkishStepSuffix(unit) {
  switch (unit) {
    case 'second':
      return 'saniyede bir';
    case 'minute':
      return 'dakikada bir';
    case 'hour':
      return 'saatte bir';
    case 'day':
      return 'günde bir';
    case 'month':
      return 'ayda bir';
    case 'year':
      return 'yılda bir';
    default:
      return `${unit}'de bir`;
  }
}

/**
 * Joins a list of items using Turkish conjunctions (", " and " ve ").
 * @param {string[]} items
 * @returns {string}
 */
export function formatListTr(items) {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ve ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}

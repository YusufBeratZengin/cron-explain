import { parseCron } from './parser.js';
import { getLocale } from './locales/index.js';
import {
  turkishOrdinal,
  turkishLocative,
  turkishStepSuffix,
  formatListTr,
} from './locales/grammar-tr.js';

/**
 * Explain a cron expression in human-readable English or Turkish.
 *
 * @param {string | Object} expression Raw cron expression or parsed cron object.
 * @param {Object} [options]
 * @param {'en' | 'tr'} [options.lang='en'] Target language.
 * @returns {string} Human-readable explanation.
 */
export function explainCron(expression, options = {}) {
  const lang = (options.lang || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  const locale = getLocale(lang);

  const parsed = typeof expression === 'string' ? parseCron(expression) : expression;

  // Handle aliases
  if (parsed.alias) {
    if (locale.aliases[parsed.alias]) {
      return locale.aliases[parsed.alias];
    }
  }

  if (parsed.isReboot) {
    return locale.aliases['@reboot'] || 'At system startup';
  }

  return lang === 'tr' ? explainTr(parsed, locale) : explainEn(parsed, locale);
}

// -------------------------------------------------------------
// English Explainer
// -------------------------------------------------------------

function explainEn(parsed, locale) {
  const f = parsed.fields;

  // Check simple full wildcards
  const isEverySecond = f.second.raw === '*';
  const isEveryMinute = f.minute.raw === '*';
  const isEveryHour = f.hour.raw === '*';
  const isEveryDom = f.dayOfMonth.isWildcard || f.dayOfMonth.isQuestion;
  const isEveryMonth = f.month.isWildcard;
  const isEveryDow = f.dayOfWeek.isWildcard || f.dayOfWeek.isQuestion;
  const isEveryYear = f.year.isWildcard;

  // Pattern: * * * * *
  if (isEveryMinute && isEveryHour && isEveryDom && isEveryMonth && isEveryDow && isEveryYear) {
    if (isEverySecond) return 'Every second';
    if (f.second.raw === '0') return 'Every minute';
  }

  // Pattern: */N * * * * (Every N minutes)
  if (
    f.minute.items.length === 1 &&
    f.minute.items[0].type === 'step' &&
    f.minute.items[0].min === 0 &&
    isEveryHour &&
    isEveryDom &&
    isEveryMonth &&
    isEveryDow &&
    isEveryYear
  ) {
    return `Every ${f.minute.items[0].step} minutes`;
  }

  // Pattern: */N * * * * * (Every N seconds)
  if (
    f.second.items.length === 1 &&
    f.second.items[0].type === 'step' &&
    f.second.items[0].min === 0 &&
    isEveryMinute &&
    isEveryHour &&
    isEveryDom &&
    isEveryMonth &&
    isEveryDow &&
    isEveryYear
  ) {
    return `Every ${f.second.items[0].step} seconds`;
  }

  const parts = [];

  // Time explanation
  const timeDesc = formatTimePartEn(f);
  if (timeDesc) parts.push(timeDesc);

  // Day of Month / Quartz specials
  const domDesc = formatDomPartEn(f.dayOfMonth, locale);
  if (domDesc) parts.push(domDesc);

  // Month
  const monthDesc = formatMonthPartEn(f.month, locale);
  if (monthDesc) parts.push(monthDesc);

  // Day of Week
  const dowDesc = formatDowPartEn(f.dayOfWeek, locale, parsed.type);
  if (dowDesc) parts.push(dowDesc);

  // Year
  const yearDesc = formatYearPartEn(f.year);
  if (yearDesc) parts.push(yearDesc);

  if (parts.length === 0) return 'Every minute';

  return parts.join(', ');
}

function formatTimePartEn(f) {
  const sec = f.second;
  const min = f.minute;
  const hr = f.hour;

  // Single step minute: e.g. */15
  if (min.items.length === 1 && min.items[0].type === 'step') {
    const step = min.items[0].step;
    let base = `Every ${step} minutes`;
    if (hr.raw !== '*') {
      const hrDesc = formatHourPartEn(hr);
      base += `, ${hrDesc}`;
    }
    return base;
  }

  // Single step second: e.g. */30
  if (sec.items.length === 1 && sec.items[0].type === 'step') {
    const step = sec.items[0].step;
    let base = `Every ${step} seconds`;
    if (hr.raw !== '*' || min.raw !== '*') {
      base += `, ${formatHourPartEn(hr)}`;
    }
    return base;
  }

  // Single exact time (HH:MM or HH:MM:SS)
  if (
    hr.values && hr.values.length === 1 &&
    min.values && min.values.length === 1 &&
    sec.values && sec.values.length === 1
  ) {
    const h = String(hr.values[0]).padStart(2, '0');
    const m = String(min.values[0]).padStart(2, '0');
    if (sec.values[0] !== 0) {
      const s = String(sec.values[0]).padStart(2, '0');
      return `At ${h}:${m}:${s}`;
    }
    return `At ${h}:${m}`;
  }

  // Every hour at minute X
  if (hr.raw === '*' && min.values && min.values.length > 0) {
    if (min.values.length === 1) {
      return `At minute ${min.values[0]} of every hour`;
    }
    return `At minutes ${formatListEn(min.values)} of every hour`;
  }

  // Minute lists / ranges with hour ranges / lists
  const hrDesc = formatHourPartEn(hr);
  const minDesc = formatMinPartEn(min);

  if (minDesc && hrDesc) {
    return `${minDesc}, ${hrDesc}`;
  }
  return minDesc || hrDesc || 'Every minute';
}

function formatHourPartEn(hr) {
  if (hr.raw === '*') return '';
  if (hr.items.length === 1 && hr.items[0].type === 'step') {
    return `every ${hr.items[0].step} hours`;
  }
  if (hr.items.length === 1 && hr.items[0].type === 'range') {
    const start = String(hr.items[0].min).padStart(2, '0') + ':00';
    const end = String(hr.items[0].max).padStart(2, '0') + ':59';
    return `between ${start} and ${end}`;
  }
  if (hr.values && hr.values.length > 0) {
    const formatted = hr.values.map((h) => String(h).padStart(2, '0') + ':00');
    return `at ${formatListEn(formatted)}`;
  }
  return `hour ${hr.raw}`;
}

function formatMinPartEn(min) {
  if (min.raw === '*') return 'every minute';
  if (min.items.length === 1 && min.items[0].type === 'step') {
    return `every ${min.items[0].step} minutes`;
  }
  if (min.values && min.values.length > 0) {
    return `at minute ${formatListEn(min.values)}`;
  }
  return `minute ${min.raw}`;
}

function formatDomPartEn(dom, locale) {
  if (dom.isWildcard || dom.isQuestion) return '';

  const item = dom.items[0];
  if (dom.items.length === 1) {
    if (item.type === 'lastDayOfMonth') return 'on the last day of the month';
    if (item.type === 'lastWeekdayOfMonth') return 'on the last weekday of the month';
    if (item.type === 'daysBeforeEndOfMonth') {
      return `${item.offset} days before the end of the month`;
    }
    if (item.type === 'nearestWeekday') {
      return `on the nearest weekday to day ${item.day} of the month`;
    }
    if (item.type === 'range') {
      return `on days ${item.min} through ${item.max} of the month`;
    }
  }

  if (dom.values && dom.values.length > 0) {
    if (dom.values.length === 1) {
      return `on day ${dom.values[0]} of the month`;
    }
    return `on days ${formatListEn(dom.values)} of the month`;
  }

  return `on day ${dom.raw} of the month`;
}

function formatMonthPartEn(month, locale) {
  if (month.isWildcard) return '';

  if (month.items.length === 1 && month.items[0].type === 'range') {
    const start = locale.months[month.items[0].min];
    const end = locale.months[month.items[0].max];
    return `in ${start} through ${end}`;
  }

  if (month.values && month.values.length > 0) {
    const names = month.values.map((m) => locale.months[m]);
    return `in ${formatListEn(names)}`;
  }

  return `in month ${month.raw}`;
}

function formatDowPartEn(dow, locale, cronType) {
  if (dow.isWildcard || dow.isQuestion) return '';

  const item = dow.items[0];
  if (dow.items.length === 1) {
    if (item.type === 'lastWeekdayOccurrence') {
      const dayName = getDowName(item.dayOfWeek, locale, cronType);
      return `on the last ${dayName} of the month`;
    }
    if (item.type === 'nthWeekdayOccurrence') {
      const dayName = getDowName(item.dayOfWeek, locale, cronType);
      const ord = getOrdinalEn(item.nth);
      return `on the ${ord} ${dayName} of the month`;
    }
    if (item.type === 'range') {
      const start = getDowName(item.min, locale, cronType);
      const end = getDowName(item.max, locale, cronType);
      return `${start} through ${end}`;
    }
  }

  if (dow.values && dow.values.length > 0) {
    const names = dow.values.map((d) => getDowName(d, locale, cronType));
    // Remove duplicates if Unix 0 and 7 are both present
    const unique = Array.from(new Set(names));
    return formatListEn(unique);
  }

  return `on ${dow.raw}`;
}

function formatYearPartEn(year) {
  if (year.isWildcard) return '';
  if (year.items.length === 1 && year.items[0].type === 'range') {
    return `in ${year.items[0].min} through ${year.items[0].max}`;
  }
  if (year.values && year.values.length > 0) {
    return `in ${formatListEn(year.values)}`;
  }
  return `in ${year.raw}`;
}

// -------------------------------------------------------------
// Turkish Explainer
// -------------------------------------------------------------

function explainTr(parsed, locale) {
  const f = parsed.fields;

  const isEverySecond = f.second.raw === '*';
  const isEveryMinute = f.minute.raw === '*';
  const isEveryHour = f.hour.raw === '*';
  const isEveryDom = f.dayOfMonth.isWildcard || f.dayOfMonth.isQuestion;
  const isEveryMonth = f.month.isWildcard;
  const isEveryDow = f.dayOfWeek.isWildcard || f.dayOfWeek.isQuestion;
  const isEveryYear = f.year.isWildcard;

  // Pattern: * * * * *
  if (isEveryMinute && isEveryHour && isEveryDom && isEveryMonth && isEveryDow && isEveryYear) {
    if (isEverySecond) return 'Her saniye';
    if (f.second.raw === '0') return 'Her dakika';
  }

  // Pattern: */N * * * *
  if (
    f.minute.items.length === 1 &&
    f.minute.items[0].type === 'step' &&
    f.minute.items[0].min === 0 &&
    isEveryHour &&
    isEveryDom &&
    isEveryMonth &&
    isEveryDow &&
    isEveryYear
  ) {
    return `Her ${f.minute.items[0].step} dakikada bir`;
  }

  // Pattern: */N * * * * *
  if (
    f.second.items.length === 1 &&
    f.second.items[0].type === 'step' &&
    f.second.items[0].min === 0 &&
    isEveryMinute &&
    isEveryHour &&
    isEveryDom &&
    isEveryMonth &&
    isEveryDow &&
    isEveryYear
  ) {
    return `Her ${f.second.items[0].step} saniyede bir`;
  }

  const dateParts = [];

  // Year
  const yearDesc = formatYearPartTr(f.year);
  if (yearDesc) dateParts.push(yearDesc);

  // Month
  const monthDesc = formatMonthPartTr(f.month, locale);
  if (monthDesc) dateParts.push(monthDesc);

  // Day of Month / Quartz specials
  const domDesc = formatDomPartTr(f.dayOfMonth, locale);
  if (domDesc) dateParts.push(domDesc);

  // Day of Week
  const dowDesc = formatDowPartTr(f.dayOfWeek, locale, parsed.type);
  if (dowDesc) dateParts.push(dowDesc);

  // Time
  const timeDesc = formatTimePartTr(f);

  if (dateParts.length === 0) {
    // Pure time expression (e.g. "0 12 * * *")
    if (timeDesc.startsWith('saat ')) {
      return `Her gün ${timeDesc}`;
    }
    return timeDesc;
  }

  const prefix = dateParts.join(', ');
  if (timeDesc) {
    return `${prefix}, ${timeDesc}`;
  }
  return prefix;
}

function formatTimePartTr(f) {
  const sec = f.second;
  const min = f.minute;
  const hr = f.hour;

  // Single step minute: e.g. */15
  if (min.items.length === 1 && min.items[0].type === 'step') {
    const step = min.items[0].step;
    const stepPhrase = `her ${step} dakikada bir`;
    if (hr.raw !== '*') {
      const hrRange = formatHourRangeTr(hr);
      return hrRange ? `${hrRange} ${stepPhrase}` : stepPhrase;
    }
    return stepPhrase;
  }

  // Single step second: e.g. */30
  if (sec.items.length === 1 && sec.items[0].type === 'step') {
    const step = sec.items[0].step;
    return `her ${step} saniyede bir`;
  }

  // Exact time (HH:MM or HH:MM:SS)
  if (
    hr.values && hr.values.length === 1 &&
    min.values && min.values.length === 1 &&
    sec.values && sec.values.length === 1
  ) {
    const h = String(hr.values[0]).padStart(2, '0');
    const m = String(min.values[0]).padStart(2, '0');
    let timeStr = `${h}:${m}`;
    if (sec.values[0] !== 0) {
      const s = String(sec.values[0]).padStart(2, '0');
      timeStr = `${h}:${m}:${s}`;
    }
    return `saat ${turkishLocative(timeStr)}`;
  }

  // Every hour at minute X: e.g. 0 * * * * -> Her saatin başında
  if (hr.raw === '*' && min.values && min.values.length === 1 && min.values[0] === 0) {
    return 'her saatin başında';
  }

  if (hr.raw === '*' && min.values && min.values.length > 0) {
    const minList = min.values.map((m) => turkishOrdinal(m, 'dot'));
    return `her saatin ${formatListTr(minList)} dakikasında`;
  }

  // Hour range with minutes
  if (hr.items.length === 1 && hr.items[0].type === 'range') {
    const hrRange = formatHourRangeTr(hr);
    if (min.items.length === 1 && min.items[0].type === 'step') {
      return `${hrRange} her ${min.items[0].step} dakikada bir`;
    }
    if (min.values && min.values.length > 0) {
      const minList = min.values.map((m) => turkishOrdinal(m, 'dot'));
      return `${hrRange} ${formatListTr(minList)} dakikasında`;
    }
    return hrRange;
  }

  return 'her dakika';
}

function formatHourRangeTr(hr) {
  if (hr.items.length === 1 && hr.items[0].type === 'range') {
    const start = String(hr.items[0].min).padStart(2, '0') + ':00';
    const end = String(hr.items[0].max).padStart(2, '0') + ':59';
    return `${start} - ${end} saatleri arasında`;
  }
  if (hr.items.length === 1 && hr.items[0].type === 'step') {
    return `her ${hr.items[0].step} saatte bir`;
  }
  if (hr.values && hr.values.length > 0) {
    const times = hr.values.map((h) => `saat ${turkishLocative(String(h).padStart(2, '0') + ':00')}`);
    return formatListTr(times);
  }
  return '';
}

function formatDomPartTr(dom, locale) {
  if (dom.isWildcard || dom.isQuestion) return '';

  const item = dom.items[0];
  if (dom.items.length === 1) {
    if (item.type === 'lastDayOfMonth') return 'ayın son gününde';
    if (item.type === 'lastWeekdayOfMonth') return 'ayın son iş gününde';
    if (item.type === 'daysBeforeEndOfMonth') {
      return `ayın bitiminden ${item.offset} gün önce`;
    }
    if (item.type === 'nearestWeekday') {
      return `ayın ${item.day}. gününe en yakın iş gününde`;
    }
    if (item.type === 'range') {
      return `ayın ${item.min}. ile ${item.max}. günleri arasında`;
    }
  }

  if (dom.values && dom.values.length > 0) {
    if (dom.values.length === 1) {
      return `ayın ${dom.values[0]}. gününde`;
    }
    const daysStr = dom.values.map((d) => `${d}.`).join(' ve ');
    return `ayın ${daysStr} günlerinde`;
  }

  return `ayın ${dom.raw}. gününde`;
}

function formatMonthPartTr(month, locale) {
  if (month.isWildcard) return '';

  if (month.items.length === 1 && month.items[0].type === 'range') {
    const start = locale.months[month.items[0].min];
    const end = locale.months[month.items[0].max];
    return `${start} ile ${end} ayları arasında`;
  }

  if (month.values && month.values.length > 0) {
    if (month.values.length === 1) {
      return `${turkishLocative(locale.months[month.values[0]])}`;
    }
    const names = month.values.map((m) => locale.months[m]);
    return `${formatListTr(names)} aylarında`;
  }

  return `${month.raw}. ayda`;
}

function formatDowPartTr(dow, locale, cronType) {
  if (dow.isWildcard || dow.isQuestion) return '';

  const item = dow.items[0];
  if (dow.items.length === 1) {
    if (item.type === 'lastWeekdayOccurrence') {
      const dayName = getDowName(item.dayOfWeek, locale, cronType);
      return `ayın son ${dayName} gününde`;
    }
    if (item.type === 'nthWeekdayOccurrence') {
      const dayName = getDowName(item.dayOfWeek, locale, cronType);
      return `ayın ${item.nth}. ${dayName} gününde`;
    }
    if (item.type === 'range') {
      const start = getDowName(item.min, locale, cronType);
      const end = getDowName(item.max, locale, cronType);
      return `${start} ile ${end} arasında`;
    }
  }

  if (dow.values && dow.values.length > 0) {
    const names = dow.values.map((d) => getDowName(d, locale, cronType));
    const unique = Array.from(new Set(names));
    if (unique.length === 1) {
      return `her ${unique[0]}`;
    }
    return `${formatListTr(unique)} günlerinde`;
  }

  return `${dow.raw} gününde`;
}

function formatYearPartTr(year) {
  if (year.isWildcard) return '';
  if (year.items.length === 1 && year.items[0].type === 'range') {
    return `${year.items[0].min} - ${year.items[0].max} yılları arasında`;
  }
  if (year.values && year.values.length > 0) {
    return `${formatListTr(year.values.map(String))} yıllarında`;
  }
  return `${year.raw} yılında`;
}

// -------------------------------------------------------------
// Shared Utilities
// -------------------------------------------------------------

function getDowName(dayNum, locale, cronType) {
  // In Unix: 0 = Sun, 1 = Mon, ..., 6 = Sat, 7 = Sun
  // In Quartz: 1 = Sun, 2 = Mon, ..., 7 = Sat
  let index;
  if (cronType === 'quartz') {
    index = (dayNum - 1) % 7;
  } else {
    index = dayNum % 7;
  }
  return locale.daysOfWeek[index];
}

function getOrdinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatListEn(items) {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return String(items[0]);
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// Phrase-table explainer used by locales described entirely by JSON.
// English and Turkish keep dedicated explainers for their grammar rules.

function fill(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function capitalizeFirst(text) {
  return text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text;
}

function dowName(dayNum, locale, cronType) {
  const index = cronType === 'quartz' ? (dayNum - 1) % 7 : dayNum % 7;
  return locale.daysOfWeek[index];
}

function dowPluralName(dayNum, locale, cronType) {
  const index = cronType === 'quartz' ? (dayNum - 1) % 7 : dayNum % 7;
  return (locale.daysOfWeekPlural || locale.daysOfWeek)[index];
}

function excludedDay(dow, locale, cronType) {
  if (!dow.values) return null;
  const names = new Set(dow.values.map((day) => dowName(day, locale, cronType)));
  return names.size === 6 ? locale.daysOfWeek.find((day) => !names.has(day)) : null;
}

function makeHelpers(locale) {
  const p = locale.phrases;
  const t = (key, vars) => fill(p[key], vars);
  const list = (items) => {
    const values = items.map(String);
    if (values.length <= 1) return values.join('');
    return `${values.slice(0, -1).join(p.listSeparator)}${p.and}${values[values.length - 1]}`;
  };
  const day = (n) => t('dayNumber', { n });
  const ordinal = (n) => {
    const word = locale.ordinals && locale.ordinals[n];
    return word || t('ordinal', { n });
  };
  const pad = (n) => String(n).padStart(2, '0');
  return { p, t, list, day, ordinal, pad };
}

function hourPart(hr, h) {
  if (hr.raw === '*') return '';
  if (hr.items.length === 1 && hr.items[0].type === 'step') {
    return h.t('everyNHours', { step: hr.items[0].step });
  }
  if (hr.items.length === 1 && hr.items[0].type === 'range') {
    return h.t('betweenHours', {
      start: `${h.pad(hr.items[0].min)}:00`,
      end: `${h.pad(hr.items[0].max)}:59`,
    });
  }
  if (hr.values && hr.values.length > 0) {
    return h.t('atHours', { hours: h.list(hr.values.map((v) => `${h.pad(v)}:00`)) });
  }
  return h.t('hourRaw', { raw: hr.raw });
}

function minutePart(min, h) {
  if (min.raw === '*') return h.p.everyMinuteLower;
  if (min.items.length === 1 && min.items[0].type === 'step') {
    return h.t('everyNMinutesLower', { step: min.items[0].step });
  }
  if (min.values && min.values.length > 0) {
    const key = min.values.length === 1 ? 'atMinute' : 'atMinutes';
    return h.t(key, { minutes: h.list(min.values) });
  }
  return h.t('minuteRaw', { raw: min.raw });
}

function timePart(f, h) {
  const { second: sec, minute: min, hour: hr } = f;

  if (min.items.length === 1 && min.items[0].type === 'step') {
    const base = h.t('everyNMinutes', { step: min.items[0].step });
    return hr.raw !== '*' ? `${base}, ${hourPart(hr, h)}` : base;
  }
  if (sec.items.length === 1 && sec.items[0].type === 'step') {
    const base = h.t('everyNSeconds', { step: sec.items[0].step });
    return hr.raw !== '*' || min.raw !== '*' ? `${base}, ${hourPart(hr, h)}` : base;
  }
  if (hr.values?.length === 1 && min.values?.length === 1 && sec.values?.length === 1) {
    const clock = `${h.pad(hr.values[0])}:${h.pad(min.values[0])}`;
    const time = sec.values[0] !== 0 ? `${clock}:${h.pad(sec.values[0])}` : clock;
    return h.t('atTime', { time });
  }
  if (hr.raw === '*' && min.values && min.values.length > 0) {
    const key = min.values.length === 1 ? 'atMinuteOfEveryHour' : 'atMinutesOfEveryHour';
    return h.t(key, { minutes: h.list(min.values) });
  }
  const hours = hourPart(hr, h);
  const minutes = minutePart(min, h);
  if (minutes && hours) return `${minutes}, ${hours}`;
  return minutes || hours || h.p.everyMinute;
}

function domPart(dom, h) {
  if (dom.isWildcard || dom.isQuestion) return '';
  const item = dom.items[0];
  if (dom.items.length === 1) {
    if (item.type === 'lastDayOfMonth') return h.p.lastDayOfMonth;
    if (item.type === 'lastWeekdayOfMonth') return h.p.lastWeekdayOfMonth;
    if (item.type === 'daysBeforeEndOfMonth') {
      return h.t('daysBeforeEndOfMonth', { offset: item.offset });
    }
    if (item.type === 'nearestWeekday') {
      return h.t('nearestWeekday', { day: h.day(item.day) });
    }
    if (item.type === 'range') {
      return h.t('onDaysRangeOfMonth', { start: h.day(item.min), end: h.day(item.max) });
    }
  }
  if (dom.values && dom.values.length > 0) {
    if (dom.values.length === 1) return h.t('onDayOfMonth', { day: h.day(dom.values[0]) });
    return h.t('onDaysOfMonth', { days: h.list(dom.values.map((v) => h.day(v))) });
  }
  return h.t('onDayOfMonth', { day: dom.raw });
}

function monthPart(month, locale, h) {
  if (month.isWildcard) return '';
  if (month.items.length === 1 && month.items[0].type === 'range') {
    return h.t('inMonthRange', {
      start: locale.months[month.items[0].min],
      end: locale.months[month.items[0].max],
    });
  }
  if (month.values && month.values.length > 0) {
    return h.t('inMonths', { months: h.list(month.values.map((m) => locale.months[m])) });
  }
  return h.t('inMonths', { months: month.raw });
}

function dowPart(dow, locale, cronType, h) {
  if (dow.isWildcard || dow.isQuestion) return '';
  const excluded = excludedDay(dow, locale, cronType);
  if (excluded) return h.t('everyDayExcept', { day: excluded });

  const item = dow.items[0];
  if (dow.items.length === 1) {
    if (item.type === 'lastWeekdayOccurrence') {
      return h.t('lastWeekdayOccurrence', { dayOfWeek: dowName(item.dayOfWeek, locale, cronType) });
    }
    if (item.type === 'nthWeekdayOccurrence') {
      return h.t('nthWeekdayOccurrence', {
        ordinal: h.ordinal(item.nth),
        dayOfWeek: dowName(item.dayOfWeek, locale, cronType),
      });
    }
    if (item.type === 'range') {
      return h.t('onDaysOfWeekRange', {
        start: dowName(item.min, locale, cronType),
        end: dowName(item.max, locale, cronType),
      });
    }
  }
  if (dow.values && dow.values.length > 0) {
    const names = [...new Set(dow.values.map((d) => dowName(d, locale, cronType)))];
    if (names.length === 1) return h.t('onDayOfWeek', { day: names[0] });
    const plural = [...new Set(dow.values.map((d) => dowPluralName(d, locale, cronType)))];
    return h.t('onDaysOfWeek', { days: h.list(plural) });
  }
  return h.t('onDayOfWeek', { day: dow.raw });
}

function yearPart(year, h) {
  if (year.isWildcard) return '';
  if (year.items.length === 1 && year.items[0].type === 'range') {
    return h.t('inYearRange', { start: year.items[0].min, end: year.items[0].max });
  }
  if (year.values && year.values.length > 0) return h.t('inYears', { years: h.list(year.values) });
  return h.t('inYears', { years: year.raw });
}

/**
 * Explain a parsed expression using only the phrase table of `locale`.
 * @param {Object} parsed Parsed cron object (non-alias, non-reboot).
 * @param {Object} locale Locale JSON with `months`, `daysOfWeek` and `phrases`.
 * @returns {string}
 */
export function explainWithPhrases(parsed, locale) {
  const f = parsed.fields;
  const h = makeHelpers(locale);
  const everyDom = f.dayOfMonth.isWildcard || f.dayOfMonth.isQuestion;
  const everyDow = f.dayOfWeek.isWildcard || f.dayOfWeek.isQuestion;
  const wholeDay =
    f.minute.raw === '*' && f.hour.raw === '*' && everyDom && f.month.isWildcard && everyDow &&
    f.year.isWildcard;

  if (wholeDay && f.second.raw === '*') return h.p.everySecond;
  if (wholeDay && f.second.raw === '0') return h.p.everyMinute;
  const single = (field) =>
    field.items.length === 1 && field.items[0].type === 'step' && field.items[0].min === 0;
  if (single(f.minute) && f.hour.raw === '*' && everyDom && f.month.isWildcard && everyDow &&
      f.year.isWildcard) {
    return h.t('everyNMinutes', { step: f.minute.items[0].step });
  }
  if (single(f.second) && f.minute.raw === '*' && f.hour.raw === '*' && everyDom &&
      f.month.isWildcard && everyDow && f.year.isWildcard) {
    return h.t('everyNSeconds', { step: f.second.items[0].step });
  }

  const parts = [
    timePart(f, h),
    domPart(f.dayOfMonth, h),
    monthPart(f.month, locale, h),
    dowPart(f.dayOfWeek, locale, parsed.type, h),
    yearPart(f.year, h),
  ].filter(Boolean);
  return capitalizeFirst(parts.length > 0 ? parts.join(h.p.separator) : h.p.everyMinute);
}

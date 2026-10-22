import { parseCron } from './parser.js';
import {
  isValidTimeZone,
  getZonedParts,
  localToUtc,
} from './timezones.js';

/**
 * Compute the next N execution dates for a cron expression in a given timezone.
 *
 * @param {string | Object} expression Raw cron expression or parsed cron object.
 * @param {Object} [options]
 * @param {Date | string | number} [options.startDate=new Date()] Reference start date.
 * @param {number} [options.count=5] Number of future run times to compute.
 * @param {string} [options.timeZone] IANA time zone identifier (default: system timezone or UTC).
 * @param {'shift' | 'skip'} [options.dstPolicy='shift'] How to handle spring-forward DST gap.
 * @returns {Date[]} Array of Date objects for next run times.
 */
export function getNextRunTimes(expression, options = {}) {
  const parsed = typeof expression === 'string' ? parseCron(expression) : expression;

  if (parsed.isReboot) {
    return [];
  }

  const {
    count = 5,
    dstPolicy = 'shift',
  } = options;

  let timeZone = options.timeZone;
  if (!timeZone) {
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      timeZone = 'UTC';
    }
  }

  if (!isValidTimeZone(timeZone)) {
    throw new Error(`Invalid IANA time zone: '${timeZone}'`);
  }

  const refDate = options.startDate ? new Date(options.startDate) : new Date();
  if (isNaN(refDate.getTime())) {
    throw new Error(`Invalid startDate: '${options.startDate}'`);
  }

  const results = [];
  const startParts = getZonedParts(refDate, timeZone);

  const startYear = startParts.year;
  const maxYear = Math.min(startYear + 10, 2099);

  const f = parsed.fields;
  const cronType = parsed.type;

  // Extract allowed arrays
  const allowedYears = f.year.values
    ? f.year.values.filter((y) => y >= startYear && y <= maxYear)
    : null;

  const allowedMonths = f.month.values || range(1, 12);
  const allowedHours = f.hour.values || range(0, 23);
  const allowedMinutes = f.minute.values || range(0, 59);
  const allowedSeconds = f.second.values || [0];

  const yearList = allowedYears || range(startYear, maxYear);

  for (const year of yearList) {
    if (year < startYear) continue;

    for (const month of allowedMonths) {
      if (year === startYear && month < startParts.month) continue;

      const daysInMonth = getDaysInMonth(year, month);
      const startDay =
        year === startYear && month === startParts.month ? startParts.day : 1;

      for (let day = startDay; day <= daysInMonth; day++) {
        if (!matchesDay(day, month, year, f.dayOfMonth, f.dayOfWeek, cronType, daysInMonth)) {
          continue;
        }

        const isToday =
          year === startYear && month === startParts.month && day === startParts.day;
        const startHour = isToday ? startParts.hour : 0;

        for (const hour of allowedHours) {
          if (isToday && hour < startHour) continue;

          const isThisHour = isToday && hour === startHour;
          const startMin = isThisHour ? startParts.minute : 0;

          for (const minute of allowedMinutes) {
            if (isThisHour && minute < startMin) continue;

            const isThisMin = isThisHour && minute === startMin;
            const startSec = isThisMin ? startParts.second : -1;

            for (const second of allowedSeconds) {
              if (isThisMin && second <= startSec) continue;

              const candidateDate = localToUtc(
                year,
                month,
                day,
                hour,
                minute,
                second,
                timeZone,
                dstPolicy
              );

              if (!candidateDate) continue; // skipped by DST policy

              if (candidateDate.getTime() > refDate.getTime()) {
                // Ensure no duplicate timestamps (e.g. from DST shift)
                if (
                  results.length === 0 ||
                  results[results.length - 1].getTime() !== candidateDate.getTime()
                ) {
                  results.push(candidateDate);
                  if (results.length >= count) {
                    return results;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * Check if day of month and day of week match according to Unix / Quartz rules.
 */
function matchesDay(day, month, year, dom, dow, cronType, daysInMonth) {
  const dowUtc = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sun
  const quartzDow = dowUtc === 0 ? 1 : dowUtc + 1; // 1 = Sun, 7 = Sat

  const domMatch = matchesDom(day, month, year, dom, daysInMonth);
  const dowMatch = matchesDow(dowUtc, quartzDow, day, daysInMonth, dow, cronType);

  const domRestricted = !dom.isWildcard && !dom.isQuestion;
  const dowRestricted = !dow.isWildcard && !dow.isQuestion;

  if (dom.isQuestion) return dowMatch;
  if (dow.isQuestion) return domMatch;

  if (domRestricted && dowRestricted) {
    // Standard Unix rule: if both DOM and DOW are specified, it matches if EITHER matches (OR)
    return domMatch || dowMatch;
  }

  if (domRestricted) return domMatch;
  if (dowRestricted) return dowMatch;

  return true; // both are wildcards
}

function matchesDom(day, month, year, dom, daysInMonth) {
  if (dom.isWildcard || dom.isQuestion) return true;

  if (dom.values) {
    return dom.values.includes(day);
  }

  for (const item of dom.items) {
    if (item.type === 'lastDayOfMonth') {
      if (day === daysInMonth) return true;
    } else if (item.type === 'lastWeekdayOfMonth') {
      const lastWeekday = getLastWeekdayOfMonth(year, month, daysInMonth);
      if (day === lastWeekday) return true;
    } else if (item.type === 'daysBeforeEndOfMonth') {
      if (day === daysInMonth - item.offset) return true;
    } else if (item.type === 'nearestWeekday') {
      const targetDay = item.day > daysInMonth ? daysInMonth : item.day;
      const nearest = getNearestWeekday(year, month, targetDay, daysInMonth);
      if (day === nearest) return true;
    }
  }

  return false;
}

function matchesDow(dowUtc, quartzDow, day, daysInMonth, dow, cronType) {
  if (dow.isWildcard || dow.isQuestion) return true;

  if (dow.values) {
    if (cronType === 'quartz') {
      return dow.values.includes(quartzDow);
    }
    // Unix: 0 and 7 are both Sunday
    if (dowUtc === 0 && (dow.values.includes(0) || dow.values.includes(7))) {
      return true;
    }
    return dow.values.includes(dowUtc);
  }

  for (const item of dow.items) {
    if (item.type === 'lastWeekdayOccurrence') {
      const targetDow = item.dayOfWeek;
      const targetUtc = cronType === 'quartz' ? (targetDow === 1 ? 0 : targetDow - 1) : targetDow % 7;
      if (dowUtc === targetUtc && day + 7 > daysInMonth) {
        return true;
      }
    } else if (item.type === 'nthWeekdayOccurrence') {
      const targetDow = item.dayOfWeek;
      const targetUtc = cronType === 'quartz' ? (targetDow === 1 ? 0 : targetDow - 1) : targetDow % 7;
      if (dowUtc === targetUtc) {
        const firstOccurrence = getFirstWeekdayOccurrence(year, month, targetUtc);
        const nthDay = firstOccurrence + (item.nth - 1) * 7;
        if (day === nthDay) return true;
      }
    }
  }

  return false;
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getLastWeekdayOfMonth(year, month, daysInMonth) {
  const lastDow = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  if (lastDow === 6) return daysInMonth - 1; // Saturday -> Friday
  if (lastDow === 0) return daysInMonth - 2; // Sunday -> Friday
  return daysInMonth;
}

function getNearestWeekday(year, month, targetDay, daysInMonth) {
  const dow = new Date(Date.UTC(year, month - 1, targetDay)).getUTCDay();
  if (dow >= 1 && dow <= 5) return targetDay; // Mon-Fri
  if (dow === 6) {
    // Saturday: nearest is Friday, unless target is day 1
    if (targetDay === 1) return 3; // Monday 3rd
    return targetDay - 1;
  }
  // Sunday: nearest is Monday, unless target is last day
  if (targetDay === daysInMonth) return targetDay - 2; // Friday
  return targetDay + 1;
}

function getFirstWeekdayOccurrence(year, month, targetUtcDow) {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const diff = (targetUtcDow - firstDow + 7) % 7;
  return 1 + diff;
}

function range(min, max) {
  const res = [];
  for (let i = min; i <= max; i++) res.push(i);
  return res;
}

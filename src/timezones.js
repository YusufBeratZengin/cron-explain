/**
 * Time zone utilities using standard ECMAScript Intl API.
 * Zero external runtime dependencies.
 */

const formatterCache = new Map();

/**
 * Returns a cached Intl.DateTimeFormat instance for a given time zone.
 * @param {string} timeZone
 * @returns {Intl.DateTimeFormat}
 */
function getFormatter(timeZone) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/**
 * Validate whether a timezone identifier is supported by Intl.
 * @param {string} timeZone
 * @returns {boolean}
 */
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get date parts (year, month 1-12, day 1-31, hour 0-23, minute 0-59, second 0-59, dayOfWeek 0-6 Sun=0)
 * in the specified time zone.
 *
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, dayOfWeek: number }}
 */
export function getZonedParts(date, timeZone) {
  const f = getFormatter(timeZone);
  const parts = {};
  for (const { type, value } of f.formatToParts(date)) {
    if (type !== 'literal') {
      parts[type] = parseInt(value, 10);
    }
  }

  // Calculate day of week using UTC timestamp of this zoned date
  const dow = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    dayOfWeek: dow,
  };
}

/**
 * Get the time zone offset string (e.g. "+03:00", "-04:00", "Z") for a date in a time zone.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {string}
 */
export function getTimeZoneOffsetString(date, timeZone) {
  try {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const parts = f.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) {
      const match = /(GMT|UTC)([+-]\d{2}:\d{2})/.exec(tzPart.value);
      if (match) return match[2];
      if (tzPart.value.includes('GMT') || tzPart.value.includes('UTC')) return '+00:00';
    }
  } catch {
    // fallback
  }

  // Fallback: difference between zoned parts and UTC
  const p = getZonedParts(date, timeZone);
  const localMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const diffMin = Math.round((localMs - date.getTime()) / 60000);
  const sign = diffMin >= 0 ? '+' : '-';
  const abs = Math.abs(diffMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

/**
 * Format a Date object into human-readable ISO-like local representation:
 * e.g. "2026-10-23 09:00:00 (+03:00)"
 *
 * @param {Date} date
 * @param {string} timeZone
 * @returns {string}
 */
export function formatZonedDate(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  const y = String(p.year).padStart(4, '0');
  const mo = String(p.month).padStart(2, '0');
  const d = String(p.day).padStart(2, '0');
  const h = String(p.hour).padStart(2, '0');
  const mi = String(p.minute).padStart(2, '0');
  const s = String(p.second).padStart(2, '0');
  const offset = getTimeZoneOffsetString(date, timeZone);

  return `${y}-${mo}-${d} ${h}:${mi}:${s} (${offset})`;
}

/**
 * Convert local wall-clock components in a timezone to a UTC Date.
 * Handles DST transitions:
 *  - Fall Back (overlap): chooses the first occurrence (daylight saving time).
 *  - Spring Forward (gap): shifts to the transition instant (start of valid hour) if dstPolicy === 'shift',
 *    or returns null if dstPolicy === 'skip'.
 *
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @param {number} second 0-59
 * @param {string} timeZone
 * @param {'shift' | 'skip'} [dstPolicy='shift']
 * @returns {Date | null}
 */
export function localToUtc(
  year,
  month,
  day,
  hour,
  minute,
  second,
  timeZone,
  dstPolicy = 'shift'
) {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const p1 = getZonedParts(new Date(guessUtc), timeZone);
  const offset1 =
    Date.UTC(p1.year, p1.month - 1, p1.day, p1.hour, p1.minute, p1.second) - guessUtc;

  let candidateUtc = guessUtc - offset1;
  const p2 = getZonedParts(new Date(candidateUtc), timeZone);
  const offset2 =
    Date.UTC(p2.year, p2.month - 1, p2.day, p2.hour, p2.minute, p2.second) - candidateUtc;

  if (offset1 !== offset2) {
    candidateUtc = guessUtc - offset2;
  }

  const check = getZonedParts(new Date(candidateUtc), timeZone);
  const isExactMatch =
    check.year === year &&
    check.month === month &&
    check.day === day &&
    check.hour === hour &&
    check.minute === minute &&
    check.second === second;

  if (isExactMatch) {
    return new Date(candidateUtc);
  }

  // Non-existent wall-clock time (spring-forward gap)
  if (dstPolicy === 'skip') {
    return null;
  }

  // Spring forward: the hour jumped (e.g. 02:00 -> 03:00).
  // Find the boundary instant where the clock resumes (start of next valid hour).
  const nextTargetUtc = Date.UTC(year, month - 1, day, hour + 1, 0, 0);
  const pNext1 = getZonedParts(new Date(nextTargetUtc), timeZone);
  const offNext1 =
    Date.UTC(pNext1.year, pNext1.month - 1, pNext1.day, pNext1.hour, pNext1.minute, pNext1.second) -
    nextTargetUtc;

  let boundaryCandidate = nextTargetUtc - offNext1;
  const pNext2 = getZonedParts(new Date(boundaryCandidate), timeZone);
  const offNext2 =
    Date.UTC(pNext2.year, pNext2.month - 1, pNext2.day, pNext2.hour, pNext2.minute, pNext2.second) -
    boundaryCandidate;

  if (offNext1 !== offNext2) {
    boundaryCandidate = nextTargetUtc - offNext2;
  }

  return new Date(boundaryCandidate);
}

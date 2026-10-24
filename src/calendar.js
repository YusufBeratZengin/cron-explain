import { getNextRunTimes } from './schedule.js';
import { getZonedParts } from './timezones.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Group exactly the next `count` runs by their local calendar date.
 * Options are the same as getNextRunTimes (count defaults to 5).
 * Returns only dates with runs; @reboot and exhausted schedules return no days.
 * @param {string | Object} expression
 * @param {Object} [options]
 * @returns {{ days: { date: string, weekday: number, runs: number }[], capped: boolean }}
 */
export function getCalendar(expression, options = {}) {
  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const runs = getNextRunTimes(expression, { ...options, timeZone });
  const dates = new Map();
  const pad = (n) => String(n).padStart(2, '0');
  for (const run of runs) {
    const parts = getZonedParts(run, timeZone);
    const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    if (!dates.has(date)) {
      dates.set(date, { date, weekday: (parts.dayOfWeek + 6) % 7, runs: 0 });
    }
    dates.get(date).runs += 1;
  }
  return { days: [...dates.values()], capped: false };
}

/**
 * Render Monday-first month grids. `dd:n` counts selected runs (not a whole day).
 * Each month containing a selected run has its own heading and full grid.
 * @param {{ days: { date: string, weekday: number, runs: number }[] }} calendar
 * @param {Object} [options]
 * @param {string[]} [options.weekdays] Seven short weekday names, Monday first.
 * @returns {string} Empty string if there are no selected runs.
 */
export function renderCalendar(calendar, options = {}) {
  const weekdays = options.weekdays || WEEKDAYS;
  const counts = new Map(calendar.days.map((day) => [day.date, day.runs]));
  const months = [...new Set(calendar.days.map((day) => day.date.slice(0, 7)))].sort();
  const width = Math.max(7, ...weekdays.map((day) => day.length + 1),
    ...calendar.days.map((day) => String(day.runs).length + 4));
  const cell = (text) => text.padEnd(width, ' ');
  const blocks = months.map((month) => {
    const [year, number] = month.split('-').map(Number);
    const first = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const lines = [month, weekdays.map(cell).join('').trimEnd()];
    let row = Array(first).fill(cell(''));
    for (let day = 1; day <= length; day++) {
      const dd = String(day).padStart(2, '0');
      const runs = counts.get(`${month}-${dd}`) || 0;
      row.push(cell(runs ? `${dd}:${runs}` : `${dd} .`));
      if (row.length === 7 || day === length) {
        lines.push(row.join('').trimEnd());
        row = [];
      }
    }
    return lines.join('\n');
  });
  return blocks.join('\n\n');
}

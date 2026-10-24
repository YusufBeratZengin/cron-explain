import { parseCron } from './parser.js';
import { getNextRunTimes } from './schedule.js';

const CHUNK = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compare the next N distinct run instants in the union of two schedules.
 * Each event has a Date and source 'a', 'b' or 'both'. Start is exclusive.
 * @param {string | Object} a
 * @param {string | Object} b
 * @param {Object} [options] getNextRunTimes options, plus optional `days` window.
 * @returns {{ runs: { date: Date, source: 'a' | 'b' | 'both' }[], windowEnd: Date | null }}
 */
export function compareSchedules(a, b, options = {}) {
  const { count = 5, days } = options;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('count must be a nonnegative integer.');
  }
  if (days !== undefined && (!Number.isFinite(days) || days <= 0)) {
    throw new Error('days must be a positive number.');
  }
  const startDate = options.startDate !== undefined ? new Date(options.startDate) : new Date();
  if (!Number.isFinite(startDate.getTime())) throw new Error('Invalid startDate.');
  const windowEnd = days === undefined ? null : new Date(startDate.getTime() + days * DAY_MS);
  if (windowEnd && !Number.isFinite(windowEnd.getTime())) throw new Error('Invalid days window.');
  const shared = { ...options, startDate, count };
  const runsA = getNextRunTimes(a, shared);
  const runsB = getNextRunTimes(b, shared);
  const runs = [];
  let i = 0;
  let j = 0;
  while (runs.length < count && (i < runsA.length || j < runsB.length)) {
    const ta = runsA[i]?.getTime() ?? Infinity;
    const tb = runsB[j]?.getTime() ?? Infinity;
    const next = Math.min(ta, tb);
    if (windowEnd && next > windowEnd.getTime()) break;
    const source = ta === tb ? 'both' : ta < tb ? 'a' : 'b';
    runs.push({ date: new Date(next), source });
    if (ta === next) i++;
    if (tb === next) j++;
  }
  return { runs, windowEnd };
}

/**
 * Lazily yield run times of a parsed expression, in order, until `until`.
 * The schedule API is start-exclusive, so each chunk continues from the last run.
 */
function* runStream(parsed, { startDate, timeZone, dstPolicy, until, maxRuns }, state) {
  if (parsed.isReboot) return;
  let cursor = startDate;
  let produced = 0;
  for (;;) {
    const chunk = getNextRunTimes(parsed, { startDate: cursor, timeZone, dstPolicy, count: CHUNK });
    if (chunk.length === 0) return;
    for (const date of chunk) {
      if (date.getTime() > until) return;
      if (produced >= maxRuns) {
        state.capped = true;
        return;
      }
      produced += 1;
      yield date;
    }
    if (chunk.length < CHUNK) return;
    cursor = chunk[chunk.length - 1];
  }
}

/**
 * Find run times shared by two cron expressions.
 *
 * @param {string | Object} a First expression (raw or parsed).
 * @param {string | Object} b Second expression (raw or parsed).
 * @param {Object} [options]
 * @param {Date | string | number} [options.startDate=new Date()] Exclusive start.
 * @param {string} [options.timeZone] IANA time zone used for both expressions.
 * @param {'shift' | 'skip'} [options.dstPolicy='shift']
 * @param {number} [options.days=365] Look-ahead window in days.
 * @param {number} [options.limit=10] Keep this many common run times in `overlaps`.
 * @param {number} [options.maxRuns=200000] Safety cap on runs scanned per expression.
 * @returns {{ overlaps: Date[], total: number, capped: boolean, windowEnd: Date }}
 *   `total` counts every common run found; `overlaps` holds the first `limit`.
 *   `capped` is true when the per-expression scan cap ended the search early.
 */
export function findOverlaps(a, b, options = {}) {
  const { timeZone, dstPolicy = 'shift', days = 365, limit = 10, maxRuns = 200000 } = options;
  if (!Number.isFinite(days) || days <= 0) throw new Error('days must be a positive number.');
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error('limit must be a nonnegative integer.');
  if (!Number.isSafeInteger(maxRuns) || maxRuns < 1) throw new Error('maxRuns must be a positive integer.');
  const parsedA = typeof a === 'string' ? parseCron(a) : a;
  const parsedB = typeof b === 'string' ? parseCron(b) : b;
  const startDate = options.startDate !== undefined ? new Date(options.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid startDate: '${options.startDate}'`);
  }
  const until = startDate.getTime() + days * DAY_MS;
  if (!Number.isFinite(new Date(until).getTime())) throw new Error('Invalid days window.');
  const shared = { startDate, timeZone, dstPolicy, until, maxRuns };
  const stateA = { capped: false };
  const stateB = { capped: false };
  const streamA = runStream(parsedA, shared, stateA);
  const streamB = runStream(parsedB, shared, stateB);
  const overlaps = [];
  let total = 0;
  let nextA = streamA.next();
  let nextB = streamB.next();
  while (!nextA.done && !nextB.done) {
    const ta = nextA.value.getTime();
    const tb = nextB.value.getTime();
    if (ta === tb) {
      total += 1;
      if (overlaps.length < limit) overlaps.push(nextA.value);
      nextA = streamA.next();
      nextB = streamB.next();
    } else if (ta < tb) {
      nextA = streamA.next();
    } else {
      nextB = streamB.next();
    }
  }
  const capped = stateA.capped || stateB.capped;
  return { overlaps, total, capped, windowEnd: new Date(until) };
}

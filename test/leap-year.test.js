import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getNextRunTimes } from '../src/schedule.js';
import { formatZonedDate } from '../src/timezones.js';

describe('Leap Year Scheduling', () => {
  test('0 0 29 2 * only executes on February 29 in leap years', () => {
    const runs = getNextRunTimes('0 0 29 2 *', {
      startDate: new Date('2026-01-01T00:00:00Z'),
      timeZone: 'UTC',
      count: 3,
    });

    assert.equal(runs.length, 3);
    assert.equal(runs[0].toISOString(), '2028-02-29T00:00:00.000Z');
    assert.equal(runs[1].toISOString(), '2032-02-29T00:00:00.000Z');
    assert.equal(runs[2].toISOString(), '2036-02-29T00:00:00.000Z');

    runs.forEach((d) => {
      assert.equal(d.getUTCMonth(), 1); // February (0-indexed)
      assert.equal(d.getUTCDate(), 29);
      const y = d.getUTCFullYear();
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      assert.equal(isLeap, true);
    });
  });

  test('last day of month (L) matches Feb 28 in non-leap year and Feb 29 in leap year', () => {
    // 2027 is non-leap (Feb has 28 days)
    const runs2027 = getNextRunTimes('0 0 L 2 ?', {
      startDate: new Date('2027-01-01T00:00:00Z'),
      timeZone: 'UTC',
      count: 1,
    });
    assert.equal(runs2027[0].toISOString(), '2027-02-28T00:00:00.000Z');

    // 2028 is leap (Feb has 29 days)
    const runs2028 = getNextRunTimes('0 0 L 2 ?', {
      startDate: new Date('2028-01-01T00:00:00Z'),
      timeZone: 'UTC',
      count: 1,
    });
    assert.equal(runs2028[0].toISOString(), '2028-02-29T00:00:00.000Z');
  });
});

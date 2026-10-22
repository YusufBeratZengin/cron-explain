import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getNextRunTimes } from '../src/schedule.js';
import { formatZonedDate } from '../src/timezones.js';
import { performance } from 'node:perf_hooks';

for (const [expression, expected] of [
  ['0 0 12 ? * 2#3', ['2026-11-16T12:00:00.000Z', '2026-12-21T12:00:00.000Z']],
  ['0 12 ? * 2#3', ['2026-11-16T12:00:00.000Z', '2026-12-21T12:00:00.000Z']],
  ['0 15 10 ? * 6L', ['2026-10-30T10:15:00.000Z', '2026-11-27T10:15:00.000Z']],
  ['0 0 12 ? * 1#1', ['2026-11-01T12:00:00.000Z', '2026-12-06T12:00:00.000Z']],
  ['0 0 12 ? * 7#5', ['2026-10-31T12:00:00.000Z', '2027-01-30T12:00:00.000Z']],
]) {
  test(`Quartz occurrences: ${expression}`, () => {
    const runs = getNextRunTimes(expression, {
      startDate: '2026-10-22T00:00:00Z', timeZone: 'UTC', count: 2,
    });
    assert.deepEqual(runs.map((date) => date.toISOString()), expected);
  });
}

for (const [expression, expected] of [
  ['0 0 29 2 *', '2028-02-29T00:00:00.000Z'],
  ['0 0 0 1 1 ? 2099', '2099-01-01T00:00:00.000Z'],
]) {
  test(`sparse schedule jumps through calendar fields: ${expression}`, () => {
    const start = performance.now();
    const runs = getNextRunTimes(expression, {
      startDate: '2026-10-22T00:00:00Z', timeZone: 'UTC', count: 1,
    });
    assert.deepEqual(runs.map((date) => date.toISOString()), [expected]);
    assert.ok(performance.now() - start < 2000, 'sparse lookup must finish within 2 seconds');
  });
}

describe('Schedule Engine', () => {
  test('calculates next 5 runs for standard 15-minute weekday schedule', () => {
    const runs = getNextRunTimes('*/15 9-17 * * 1-5', {
      startDate: new Date('2026-10-22T08:00:00Z'),
      timeZone: 'Europe/Istanbul',
      count: 5,
    });

    assert.equal(runs.length, 5);
    const formatted = runs.map((r) => formatZonedDate(r, 'Europe/Istanbul'));
    assert.deepEqual(formatted, [
      '2026-10-22 11:15:00 (+03:00)',
      '2026-10-22 11:30:00 (+03:00)',
      '2026-10-22 11:45:00 (+03:00)',
      '2026-10-22 12:00:00 (+03:00)',
      '2026-10-22 12:15:00 (+03:00)',
    ]);
  });

  test('calculates daily schedule at specific time', () => {
    const runs = getNextRunTimes('0 12 * * *', {
      startDate: new Date('2026-05-01T15:00:00Z'),
      timeZone: 'UTC',
      count: 3,
    });

    assert.equal(runs.length, 3);
    assert.equal(runs[0].toISOString(), '2026-05-02T12:00:00.000Z');
    assert.equal(runs[1].toISOString(), '2026-05-03T12:00:00.000Z');
    assert.equal(runs[2].toISOString(), '2026-05-04T12:00:00.000Z');
  });

  test('returns empty array for @reboot', () => {
    const runs = getNextRunTimes('@reboot');
    assert.deepEqual(runs, []);
  });

  test('throws on invalid IANA time zone', () => {
    assert.throws(
      () => getNextRunTimes('* * * * *', { timeZone: 'Mars/Curiosity' }),
      /Invalid IANA time zone/
    );
  });

  test('throws on invalid startDate', () => {
    assert.throws(
      () => getNextRunTimes('* * * * *', { startDate: 'not-a-date' }),
      /Invalid startDate/
    );
  });

  test('calculates Quartz last Friday (6L) accurately', () => {
    const runs = getNextRunTimes('0 4 ? * 6L', {
      startDate: new Date('2026-01-01T00:00:00Z'),
      timeZone: 'UTC',
      count: 3,
    });

    assert.equal(runs.length, 3);
    // Jan 2026 last Friday is Jan 30
    assert.equal(runs[0].toISOString(), '2026-01-30T04:00:00.000Z');
    // Feb 2026 last Friday is Feb 27
    assert.equal(runs[1].toISOString(), '2026-02-27T04:00:00.000Z');
    // Mar 2026 last Friday is Mar 27
    assert.equal(runs[2].toISOString(), '2026-03-27T04:00:00.000Z');
  });

  test('calculates Quartz nearest weekday 15W', () => {
    // Aug 15, 2026 is Saturday -> nearest weekday in August is Friday Aug 14
    const runs = getNextRunTimes('0 0 15W 8 ?', {
      startDate: new Date('2026-01-01T00:00:00Z'),
      timeZone: 'UTC',
      count: 1,
    });

    assert.equal(runs.length, 1);
    assert.equal(runs[0].toISOString(), '2026-08-14T00:00:00.000Z');
  });
});

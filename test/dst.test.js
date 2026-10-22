import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getNextRunTimes } from '../src/schedule.js';
import { formatZonedDate } from '../src/timezones.js';

describe('DST Edge Cases', () => {
  test('Spring Forward (Gap) in America/New_York shifts to boundary by default', () => {
    // Clocks jump from 02:00 EST to 03:00 EDT on 2026-03-08
    const runs = getNextRunTimes('30 2 * * *', {
      startDate: new Date('2026-03-07T12:00:00Z'),
      timeZone: 'America/New_York',
      dstPolicy: 'shift',
      count: 2,
    });

    assert.equal(runs.length, 2);
    // Boundary shift: fires at 03:00 EDT (07:00 UTC)
    assert.equal(runs[0].toISOString(), '2026-03-08T07:00:00.000Z');
    assert.equal(formatZonedDate(runs[0], 'America/New_York'), '2026-03-08 03:00:00 (-04:00)');

    // Next day runs at normal 02:30 EDT (06:30 UTC)
    assert.equal(runs[1].toISOString(), '2026-03-09T06:30:00.000Z');
    assert.equal(formatZonedDate(runs[1], 'America/New_York'), '2026-03-09 02:30:00 (-04:00)');
  });

  test('Spring Forward (Gap) in America/New_York skips when dstPolicy is skip', () => {
    const runs = getNextRunTimes('30 2 * * *', {
      startDate: new Date('2026-03-07T12:00:00Z'),
      timeZone: 'America/New_York',
      dstPolicy: 'skip',
      count: 2,
    });

    assert.equal(runs.length, 2);
    // 2026-03-08 is skipped because 02:30 does not exist
    assert.equal(runs[0].toISOString(), '2026-03-09T06:30:00.000Z');
    assert.equal(runs[1].toISOString(), '2026-03-10T06:30:00.000Z');
  });

  test('Fall Back (Overlap) in America/New_York fires on first occurrence without duplicate', () => {
    // Clocks jump back from 02:00 EDT to 01:00 EST on 2026-11-01
    const runs = getNextRunTimes('30 1 * * *', {
      startDate: new Date('2026-10-31T12:00:00Z'),
      timeZone: 'America/New_York',
      count: 2,
    });

    assert.equal(runs.length, 2);
    // First occurrence: EDT (UTC-4) at 05:30:00Z
    assert.equal(runs[0].toISOString(), '2026-11-01T05:30:00.000Z');
    assert.equal(formatZonedDate(runs[0], 'America/New_York'), '2026-11-01 01:30:00 (-04:00)');

    // Next day: EST (UTC-5) at 06:30:00Z
    assert.equal(runs[1].toISOString(), '2026-11-02T06:30:00.000Z');
    assert.equal(formatZonedDate(runs[1], 'America/New_York'), '2026-11-02 01:30:00 (-05:00)');
  });

  test('Europe/London DST Spring Forward gap handling', () => {
    // On 2026-03-29 in London, clocks jump from 01:00 to 02:00
    const runs = getNextRunTimes('30 1 * * *', {
      startDate: new Date('2026-03-28T12:00:00Z'),
      timeZone: 'Europe/London',
      dstPolicy: 'shift',
      count: 2,
    });

    assert.equal(runs.length, 2);
    // Boundary shift: fires at 02:00 BST (01:00 UTC)
    assert.equal(runs[0].toISOString(), '2026-03-29T01:00:00.000Z');
    assert.equal(formatZonedDate(runs[0], 'Europe/London'), '2026-03-29 02:00:00 (+01:00)');

    // Next day at 01:30 BST (00:30 UTC)
    assert.equal(runs[1].toISOString(), '2026-03-30T00:30:00.000Z');
  });
});

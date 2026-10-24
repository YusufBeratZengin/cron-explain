import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as cron from '../src/index.js';

const startDate = '2026-10-30T00:00:00Z';
const options = { startDate, timeZone: 'UTC', count: 4 };
const iso = (dates) => dates.map((date) => date.toISOString());

test('EventBridge accepts wrapped and explicitly selected six-field expressions', () => {
  for (const parsed of [cron.parseCron('cron(0 12 ? * MON-FRI *)'),
    cron.parseCron('0 12 ? * MON-FRI *', { type: 'eventbridge' })]) {
    assert.equal(parsed.dialect, 'eventbridge');
    assert.deepEqual(parsed.fields.second.values, [0]);
    assert.deepEqual(parsed.fields.dayOfWeek.values, [2, 3, 4, 5, 6]);
    assert.deepEqual(iso(cron.getNextRunTimes(parsed, { ...options, count: 2 })),
      ['2026-10-30T12:00:00.000Z', '2026-11-02T12:00:00.000Z']);
  }
});

test('EventBridge supports its full year range without changing Unix limits', () => {
  assert.deepEqual(iso(cron.getNextRunTimes('cron(0 0 1 1 ? 2199)', options)),
    ['2199-01-01T00:00:00.000Z']);
  assert.equal(cron.validateCron('0 0 0 1 1 ? 2100').valid, false);
});

test('EventBridge rejects invalid arity, day constraints and weekday syntax', () => {
  for (const expr of ['cron(0 12 * * *)', 'cron(0 0 12 * * ? *)',
    'cron(0 12 * * * *)', 'cron(0 12 ? * ? *)', 'cron(0 12 ? * 0 *)',
    'cron(0 12 ? * MON#1,FRI#3 *)', 'cron(0 12 ? * MON/2 *)',
    'cron(0 12 * * ? 2200)']) {
    assert.equal(cron.validateCron(expr).valid, false, expr);
  }
  const expr = '  cron(0 25 * * ? *)  ';
  const { error } = cron.validateCron(expr);
  assert.equal(error.startCol, expr.indexOf('25'));
});

test('Quartz lowercase specials, seconds and month boundary weekday rules', () => {
  for (const [expression, expected] of [
    ['15 0 9 l * ?', '2026-01-31T09:00:15.000Z'],
    ['0 0 9 lw * ?', '2026-01-30T09:00:00.000Z'],
    ['0 0 9 1w 8 ? 2026', '2026-08-03T09:00:00.000Z'],
    ['0 0 9 ? * fri#3', '2026-01-16T09:00:00.000Z'],
    ['0 0 9 ? * fril', '2026-01-30T09:00:00.000Z'],
  ]) {
    assert.deepEqual(iso(cron.getNextRunTimes(expression, {
      startDate: '2026-01-01T00:00:00Z', timeZone: 'UTC', count: 1,
    })), [expected]);
  }
});

test('Unix names do not accidentally enable Quartz numbering', () => {
  assert.equal(cron.parseCron('0 9 * JUL WED').type, 'unix');
  assert.deepEqual(cron.parseCron('0 9 * JUL WED').fields.dayOfWeek.values, [3]);
  assert.equal(cron.parseCron('0 9 * jul wed').fields.month.items[0].raw, 'jul');
  assert.equal(cron.parseCron('0 0 9 lw * ?').fields.dayOfMonth.items[0].raw, 'lw');
});

test('Quartz W does not invent missing dates and # skips months without a fifth occurrence', () => {
  assert.deepEqual(iso(cron.getNextRunTimes('0 0 9 31W * ?', {
    startDate: '2026-02-01T00:00:00Z', timeZone: 'UTC', count: 1,
  })), ['2026-03-31T09:00:00.000Z']);
  assert.deepEqual(iso(cron.getNextRunTimes('0 0 9 ? * MON#5', {
    startDate: '2026-02-01T00:00:00Z', timeZone: 'UTC', count: 1,
  })), ['2026-03-30T09:00:00.000Z']);
  const quartz = cron.parseCron('0 0 12 * * *', { type: 'quartz' });
  assert.deepEqual(quartz.fields.dayOfWeek.values, [1, 2, 3, 4, 5, 6, 7]);
});

test('EventBridge special days and weekday numbering match Quartz without a seconds field', () => {
  for (const [expression, expected] of [
    ['cron(0 9 L * ? *)', '2026-10-31T09:00:00.000Z'],
    ['cron(0 9 1W 8 ? 2026)', '2026-08-03T09:00:00.000Z'],
    ['cron(0 9 ? * 1 *)', '2026-10-04T09:00:00.000Z'],
    ['cron(0 9 ? * FRI#3 *)', '2026-10-16T09:00:00.000Z'],
  ]) {
    const start = expression.includes('1W') ? '2026-01-01T00:00:00Z' : '2026-10-01T00:00:00Z';
    assert.deepEqual(iso(cron.getNextRunTimes(expression, {
      startDate: start, timeZone: 'UTC', count: 1,
    })), [expected]);
  }
});

test('diff classifies the next N distinct events as only A, only B or both', () => {
  const result = cron.compareSchedules('*/15 * * * *', '*/20 * * * *', options);
  assert.deepEqual(result.runs.map(({ date, source }) => [date.toISOString(), source]), [
    ['2026-10-30T00:15:00.000Z', 'a'], ['2026-10-30T00:20:00.000Z', 'b'],
    ['2026-10-30T00:30:00.000Z', 'a'], ['2026-10-30T00:40:00.000Z', 'b'],
  ]);
  const same = cron.compareSchedules('@daily', '0 0 * * *', { ...options, count: 2 });
  assert.deepEqual(same.runs.map((run) => run.source), ['both', 'both']);
});

test('diff handles exhausted, reboot, sparse and second-resolution schedules', () => {
  assert.deepEqual(cron.compareSchedules('@reboot', '0 0 31 2 *', options).runs, []);
  const result = cron.compareSchedules('@reboot', '* * * * * ?', { ...options, count: 2 });
  assert.deepEqual(result.runs.map((run) => run.source), ['b', 'b']);
  assert.deepEqual(iso(result.runs.map((run) => run.date)),
    ['2026-10-30T00:00:01.000Z', '2026-10-30T00:00:02.000Z']);
  assert.deepEqual(cron.compareSchedules('@yearly', '@daily', { ...options, days: 1 }).runs
    .map((run) => run.source), ['b']);
});

test('calendar counts exactly next N runs and renders separate months', () => {
  const calendar = cron.getCalendar('@daily', { ...options, count: 3 });
  assert.deepEqual(calendar.days.map(({ date, runs }) => [date, runs]),
    [['2026-10-31', 1], ['2026-11-01', 1], ['2026-11-02', 1]]);
  const rendered = cron.renderCalendar(calendar);
  assert.match(rendered, /2026-10/);
  assert.match(rendered, /2026-11/);
  assert.match(rendered, /31:1/);
  assert.match(rendered, /02:1/);
});

test('calendar uses zoned dates, leap days, zero counts and reboot', () => {
  const calendar = cron.getCalendar('0 0 29 2 *', {
    startDate: '2026-01-01T00:00:00Z', timeZone: 'Europe/Istanbul', count: 2,
  });
  assert.deepEqual(calendar.days.map((day) => day.date), ['2028-02-29', '2032-02-29']);
  assert.equal(cron.getCalendar('@hourly', { ...options, count: 0 }).days.length, 0);
  assert.equal(cron.getCalendar('@reboot', options).days.length, 0);
});

test('diff merges shared and disjoint runs, including a depleted side', () => {
  const result = cron.compareSchedules('*/15 * * * *', '*/20 * * * *', { ...options, count: 8 });
  assert.deepEqual(result.runs.map((run) => run.source),
    ['a', 'b', 'a', 'b', 'a', 'both', 'a', 'b']);
  assert.equal(result.runs[5].date.toISOString(), '2026-10-30T01:00:00.000Z');
  assert.equal(result.windowEnd, null);
  assert.deepEqual(cron.compareSchedules('@daily', '@daily', { ...options, count: 0 }).runs, []);
  const depleted = cron.compareSchedules('cron(0 0 31 10 ? 2026)', '@daily', { ...options, count: 3 });
  assert.deepEqual(depleted.runs.map((run) => run.source), ['both', 'b', 'b']);
});

test('diff and calendar respect the shared DST and time zone policy', () => {
  for (const [dstPolicy, first] of [
    ['shift', '2027-03-14T07:00:00.000Z'], ['skip', '2027-03-15T06:30:00.000Z'],
  ]) {
    const opts = { startDate: '2027-03-13T12:00:00Z', timeZone: 'America/New_York', count: 2, dstPolicy };
    const result = cron.compareSchedules('30 2 * * *', '30 2 * * *', opts);
    assert.equal(result.runs[0].date.toISOString(), first);
    assert.deepEqual(result.runs.map((run) => run.source), ['both', 'both']);
    const calendar = cron.getCalendar('30 2 * * *', opts);
    assert.equal(calendar.days[0].date, dstPolicy === 'shift' ? '2027-03-14' : '2027-03-15');
  }
  const east = cron.getCalendar('0 0 * * *', {
    startDate: '2026-10-30T20:00:00Z', timeZone: 'Europe/Istanbul', count: 1,
  });
  assert.deepEqual(east.days, [{ date: '2026-10-31', weekday: 5, runs: 1 }]);
});

test('calendar keeps large daily counts and full Monday-first grids', () => {
  const calendar = cron.getCalendar('* * * * *', { ...options, count: 150 });
  assert.equal(calendar.days.length, 1);
  assert.equal(calendar.days[0].runs, 150);
  const rendered = cron.renderCalendar(calendar);
  assert.match(rendered, /^2026-10\nMon\s+Tue\s+Wed\s+Thu\s+Fri\s+Sat\s+Sun/);
  assert.match(rendered, /30:150/);
  assert.match(rendered, /01 \.\s+02 \.\s+03 \.\s+04 \./);
  assert.equal(cron.renderCalendar({ days: [] }), '');
});

test('new scheduling APIs reject invalid counts and comparison windows', () => {
  for (const count of [-1, 1.5, NaN, Infinity, '2']) {
    assert.throws(() => cron.compareSchedules('@daily', '@daily', { ...options, count }), /count/);
    assert.throws(() => cron.getCalendar('@daily', { ...options, count }), /count/);
  }
  for (const days of [0, -1, NaN, Infinity, '7']) {
    assert.throws(() => cron.compareSchedules('@daily', '@daily', { ...options, days }), /days/);
  }
  assert.throws(() => cron.compareSchedules('@daily', '@daily', { startDate: 'bad' }), /startDate/);
  assert.deepEqual(iso(cron.getNextRunTimes('@daily', { startDate: 0, timeZone: 'UTC', count: 1 })),
    ['1970-01-02T00:00:00.000Z']);
});

test('bounded overlap helper reports exact and capped counts honestly', () => {
  const exact = cron.findOverlaps('@daily', '@daily', { ...options, days: 2, limit: 1, maxRuns: 2 });
  assert.equal(exact.total, 2);
  assert.equal(exact.overlaps.length, 1);
  assert.equal(exact.capped, false);
  const capped = cron.findOverlaps('@daily', '@daily', { ...options, days: 3, maxRuns: 2 });
  assert.equal(capped.total, 2);
  assert.equal(capped.capped, true);
  const disjoint = cron.findOverlaps('0 9 * * *', '0 10 * * *', { ...options, days: 2 });
  assert.equal(disjoint.total, 0);
});

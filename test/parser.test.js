import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseCron } from '../src/parser.js';

describe('Cron Parser', () => {
  test('parses standard 5-field Unix cron', () => {
    const p = parseCron('*/15 9-17 1,15 * 1-5');
    assert.equal(p.fieldsCount, 5);
    assert.equal(p.type, 'unix');
    assert.deepEqual(p.fields.minute.values, [0, 15, 30, 45]);
    assert.deepEqual(p.fields.hour.values, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
    assert.deepEqual(p.fields.dayOfMonth.values, [1, 15]);
    assert.equal(p.fields.month.isWildcard, true);
    assert.deepEqual(p.fields.dayOfWeek.values, [1, 2, 3, 4, 5]);
    assert.deepEqual(p.fields.second.values, [0]);
    assert.equal(p.fields.year.isWildcard, true);
  });

  test('parses 6-field cron with seconds', () => {
    const p = parseCron('30 */5 12 * * *');
    assert.equal(p.fieldsCount, 6);
    assert.deepEqual(p.fields.second.values, [30]);
    assert.deepEqual(p.fields.minute.values, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    assert.deepEqual(p.fields.hour.values, [12]);
  });

  test('parses 6-field cron with year at end', () => {
    const p = parseCron('0 12 1 1 * 2026');
    assert.equal(p.fieldsCount, 6);
    assert.deepEqual(p.fields.minute.values, [0]);
    assert.deepEqual(p.fields.hour.values, [12]);
    assert.deepEqual(p.fields.dayOfMonth.values, [1]);
    assert.deepEqual(p.fields.month.values, [1]);
    assert.deepEqual(p.fields.year.values, [2026]);
  });

  test('parses 7-field Quartz cron', () => {
    const p = parseCron('0 30 9 ? * MON-FRI 2026-2030');
    assert.equal(p.fieldsCount, 7);
    assert.equal(p.type, 'quartz');
    assert.deepEqual(p.fields.second.values, [0]);
    assert.deepEqual(p.fields.minute.values, [30]);
    assert.deepEqual(p.fields.hour.values, [9]);
    assert.equal(p.fields.dayOfMonth.isQuestion, true);
    assert.equal(p.fields.month.isWildcard, true);
    assert.deepEqual(p.fields.dayOfWeek.values, [2, 3, 4, 5, 6]); // Quartz MON=2, FRI=6
    assert.equal(p.fields.year.values.length, 5);
  });

  test('parses standard aliases', () => {
    assert.equal(parseCron('@yearly').alias, '@yearly');
    assert.equal(parseCron('@annually').alias, '@annually');
    assert.equal(parseCron('@monthly').alias, '@monthly');
    assert.equal(parseCron('@weekly').alias, '@weekly');
    assert.equal(parseCron('@daily').alias, '@daily');
    assert.equal(parseCron('@midnight').alias, '@midnight');
    assert.equal(parseCron('@hourly').alias, '@hourly');
  });

  test('parses @reboot alias', () => {
    const p = parseCron('@reboot');
    assert.equal(p.isReboot, true);
    assert.equal(p.fields, null);
  });

  test('parses case-insensitive month and day names', () => {
    const p = parseCron('0 0 1 JAN,jun,DEC mon,wed,fri');
    assert.deepEqual(p.fields.month.values, [1, 6, 12]);
    assert.deepEqual(p.fields.dayOfWeek.values, [1, 3, 5]);
  });

  test('parses Quartz Day-of-Month specials: L, LW, L-offset, nW', () => {
    const pL = parseCron('0 0 L * ?');
    assert.equal(pL.fields.dayOfMonth.items[0].type, 'lastDayOfMonth');

    const pLW = parseCron('0 0 LW * ?');
    assert.equal(pLW.fields.dayOfMonth.items[0].type, 'lastWeekdayOfMonth');

    const pOffset = parseCron('0 0 L-3 * ?');
    assert.equal(pOffset.fields.dayOfMonth.items[0].type, 'daysBeforeEndOfMonth');
    assert.equal(pOffset.fields.dayOfMonth.items[0].offset, 3);

    const pW = parseCron('0 0 15W * ?');
    assert.equal(pW.fields.dayOfMonth.items[0].type, 'nearestWeekday');
    assert.equal(pW.fields.dayOfMonth.items[0].day, 15);
  });

  test('parses Quartz Day-of-Week specials: dL, d#k', () => {
    const pDL = parseCron('0 0 ? * 5L');
    assert.equal(pDL.fields.dayOfWeek.items[0].type, 'lastWeekdayOccurrence');
    assert.equal(pDL.fields.dayOfWeek.items[0].dayOfWeek, 5);

    const pHash = parseCron('0 0 ? * 2#3');
    assert.equal(pHash.fields.dayOfWeek.items[0].type, 'nthWeekdayOccurrence');
    assert.equal(pHash.fields.dayOfWeek.items[0].dayOfWeek, 2);
    assert.equal(pHash.fields.dayOfWeek.items[0].nth, 3);
  });
});

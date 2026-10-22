import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { explainCron } from '../src/explainer.js';

describe('English Explainer', () => {
  test('explains simple wildcards', () => {
    assert.equal(explainCron('* * * * *'), 'Every minute');
    assert.equal(explainCron('* * * * * *'), 'Every second');
  });

  test('explains step minutes and seconds', () => {
    assert.equal(explainCron('*/15 * * * *'), 'Every 15 minutes');
    assert.equal(explainCron('*/30 * * * * *'), 'Every 30 seconds');
  });

  test('explains compound expression with hours and day range', () => {
    assert.equal(
      explainCron('*/15 9-17 * * 1-5'),
      'Every 15 minutes, between 09:00 and 17:59, on Monday through Friday'
    );
  });

  test('uses on for named days and concise single-day complements', () => {
    assert.equal(explainCron('0 0 * * mon-fri,sun'), 'At 00:00, every day except Saturday');
    assert.equal(explainCron('0 0 * * mon'), 'At 00:00, on Monday');
    assert.equal(explainCron('0 0 * * mon,wed,fri'), 'At 00:00, on Monday, Wednesday, and Friday');
    assert.equal(explainCron('0 0 * * 0-5,7'), 'At 00:00, every day except Saturday');
    assert.equal(explainCron('0 0 0 ? * 1-6'), 'At 00:00, every day except Saturday');
  });

  test('explains exact time of day', () => {
    assert.equal(explainCron('0 12 * * *'), 'At 12:00');
    assert.equal(explainCron('30 9 1 * *'), 'At 09:30, on day 1 of the month');
    assert.equal(explainCron('15 0 0 * * *'), 'At 00:00:15');
  });

  test('explains aliases', () => {
    assert.equal(explainCron('@daily'), 'At 00:00 every day');
    assert.equal(explainCron('@midnight'), 'At 00:00 every day');
    assert.equal(explainCron('@hourly'), 'At minute 0 of every hour');
    assert.equal(explainCron('@reboot'), 'At system startup');
  });

  test('explains Quartz Day-of-Month specials', () => {
    assert.equal(explainCron('0 0 L * ?'), 'At 00:00, on the last day of the month');
    assert.equal(explainCron('0 0 LW * ?'), 'At 00:00, on the last weekday of the month');
    assert.equal(explainCron('0 0 L-3 * ?'), 'At 00:00, 3 days before the end of the month');
    assert.equal(
      explainCron('0 0 15W * ?'),
      'At 00:00, on the nearest weekday to day 15 of the month'
    );
  });

  test('explains Quartz Day-of-Week specials', () => {
    assert.equal(
      explainCron('0 4 ? * 6L'),
      'At 04:00, on the last Friday of the month'
    );
    assert.equal(
      explainCron('30 9 ? * 2#3'),
      'At 09:30, on the 3rd Monday of the month'
    );
  });

  test('explains year range', () => {
    assert.equal(
      explainCron('0 0 1 1 * 2026-2030'),
      'At 00:00, on day 1 of the month, in January, in 2026 through 2030'
    );
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseCron } from '../src/parser.js';
import { validateCron } from '../src/validator.js';
import { CronValidationError } from '../src/errors.js';

describe('Cron Validator', () => {
  test('rejects non-string input', () => {
    assert.throws(() => parseCron(null), {
      name: 'CronValidationError',
      message: 'Expression must be a string.',
    });
  });

  test('rejects empty string', () => {
    assert.throws(() => parseCron('   '), {
      name: 'CronValidationError',
      message: 'Cron expression cannot be empty.',
    });
  });

  test('rejects invalid field counts', () => {
    assert.throws(() => parseCron('* * *'), (err) => {
      assert(err instanceof CronValidationError);
      assert.match(err.message, /Expected 5, 6, or 7 fields/);
      return true;
    });

    assert.throws(() => parseCron('* * * * * * * *'), (err) => {
      assert(err instanceof CronValidationError);
      assert.match(err.message, /Expected 5, 6, or 7 fields/);
      return true;
    });
  });

  test('rejects out-of-range values with correct field position markers', () => {
    try {
      parseCron('*/15 25 * * *');
      assert.fail('Should have thrown');
    } catch (err) {
      assert(err instanceof CronValidationError);
      assert.equal(err.fieldName, 'hour');
      assert.match(err.message, /Hour '25' is out of range \(0-23\)/);
      const visual = err.formatVisualMarker();
      assert(visual.includes('*/15 25 * * *'));
      assert(visual.includes('     ^^'));
    }
  });

  test('rejects reversed range (min > max)', () => {
    try {
      parseCron('0 18-9 * * *');
      assert.fail('Should have thrown');
    } catch (err) {
      assert(err instanceof CronValidationError);
      assert.match(err.message, /Range start '18' is greater than range end '9'/);
    }
  });

  test('rejects invalid step value', () => {
    assert.throws(() => parseCron('*/0 * * * *'), {
      name: 'CronValidationError',
      message: /Step '0' must be a positive integer/,
    });

    assert.throws(() => parseCron('*/abc * * * *'), {
      name: 'CronValidationError',
      message: /Step 'abc' must be a positive integer/,
    });
  });

  test('rejects question mark in non-date fields', () => {
    assert.throws(() => parseCron('? * * * *'), {
      name: 'CronValidationError',
      message: /'\?' is only allowed in Day-of-Month or Day-of-Week/,
    });
  });

  test('rejects empty comma item', () => {
    assert.throws(() => parseCron('1,,2 * * * *'), {
      name: 'CronValidationError',
      message: /Empty list item in minute field/,
    });
  });

  test('validateCron helper returns error object when throwOnError is false', () => {
    const res = validateCron('*/15 25 * * *');
    assert.equal(res.valid, false);
    assert.notEqual(res.error, null);
    assert.notEqual(res.visualMarker, null);
    assert.equal(res.parsed, null);
  });

  test('validateCron helper returns parsed data when valid', () => {
    const res = validateCron('0 12 * * *');
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
    assert.notEqual(res.parsed, null);
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const binPath = join(__dirname, '..', 'bin', 'cron-explain.js');

describe('CLI Execution', () => {
  test('prints version with --version', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, '--version']);
    assert.equal(stderr, '');
    assert.equal(stdout.trim(), '0.1.0');
  });

  test('prints help with --help', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, '--help']);
    assert.equal(stderr, '');
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /--next <n>/);
  });

  test('executes Turkish output with next runs and timezone', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      binPath,
      '*/15 9-17 * * 1-5',
      '--next',
      '3',
      '--tz',
      'Europe/Istanbul',
      '--lang',
      'tr',
    ]);

    assert.equal(stderr, '');
    assert.match(stdout, /İfade: \*\/\d+ 9-17 \* \* 1-5/);
    assert.match(stdout, /Açıklama: Hafta içi her gün/);
    assert.match(stdout, /Zaman Dilimi: Europe\/Istanbul/);
    assert.match(stdout, /Sonraki 3 Çalışma Zamanı:/);
  });

  test('executes English output with JSON format', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      binPath,
      '0 0 1 1 *',
      '--next',
      '2',
      '--tz',
      'UTC',
      '--format',
      'json',
    ]);

    assert.equal(stderr, '');
    const data = JSON.parse(stdout);
    assert.equal(data.expression, '0 0 1 1 *');
    assert.equal(data.timeZone, 'UTC');
    assert.equal(data.neverMatches, false);
    assert.equal(data.nextRuns.length, 2);
  });

  test('handles @reboot cleanly in CLI', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      binPath,
      '@reboot',
      '--lang',
      'tr',
    ]);

    assert.equal(stderr, '');
    assert.match(stdout, /Sistem başlangıcında/);
    assert.match(stdout, /Yalnızca sistem yeniden başlatıldığında çalışır/);
  });

  test('prints visual error marker and exits with code 1 on invalid cron', async () => {
    try {
      await execFileAsync(process.execPath, [binPath, '*/15 25 * * *']);
      assert.fail('Should have failed with non-zero exit code');
    } catch (err) {
      assert.equal(err.code, 1);
      assert.match(err.stderr, /Invalid cron expression:/);
      assert.match(err.stderr, /\*\/15 25 \* \* \*/);
      assert.match(err.stderr, /Hour '25' is out of range \(0-23\)/);
    }
  });
});

test('CLI lists the third Monday without a calculation error', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
    '0 0 12 ? * 2#3', '--next', '2', '--tz', 'UTC', '--start', '2026-10-22T00:00:00Z',
  ]);
  assert.equal(stderr, '');
  assert.match(stdout, /Next 2 run times:/);
  assert.match(stdout, /1\. 2026-11-16 12:00:00/);
  assert.match(stdout, /2\. 2026-12-21 12:00:00/);
});

for (const expression of ['0 0 31 2 *', '0 0 30 2 *', '0 0 31 4,6,9,11 *', '0 0 0 1 1 ? 2020']) {
  for (const format of ['text', 'json']) {
    test(`never-matching ${expression} (${format}) warns and exits 0`, async () => {
      const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, expression,
        '--start', '2026-10-22T00:00:00Z', '--tz', 'UTC', '--format', format,
      ]);
      assert.equal(stderr.trim(), 'Warning: This expression never matches any date');
      if (format === 'json') {
        const data = JSON.parse(stdout);
        assert.equal(data.neverMatches, true);
        assert.deepEqual(data.nextRuns, []);
      } else {
        assert.match(stdout, /Next 0 run times:/);
      }
    });
  }
}

for (const [args, message] of [
  [['--nxt', '3'], 'Error: Unknown option: --nxt'],
  [['--next', 'abc'], 'Error: --next must be an integer between 0 and 1000.'],
  [['--next', '-1'], 'Error: --next must be an integer between 0 and 1000.'],
  [['--next', '100000'], 'Error: --next must be an integer between 0 and 1000.'],
  [['--next=3oops'], 'Error: --next must be an integer between 0 and 1000.'],
  [['--start', 'not-a-date'], 'Error: --start must be a valid date.'],
  [['--lang', 'xx'], 'Error: --lang must be one of: en, tr, de, es.'],
  [['--next'], 'Error: Missing value for --next.'],
  [['--tz'], 'Error: Missing value for --tz.'],
  [['--dst', 'invalid'], 'Error: --dst must be shift or skip.'],
  [['--format', 'xml'], 'Error: --format must be text or json.'],
]) {
  test(`CLI rejects ${args.join(' ')} with one English error line`, async () => {
    await assert.rejects(execFileAsync(process.execPath, [binPath, '* * * * *', ...args]), (err) => {
      assert.equal(err.code, 1);
      assert.equal(err.stdout, '');
      assert.equal(err.stderr.trim(), message);
      assert.equal(err.stderr.trim().split(/\r?\n/).length, 1);
      return true;
    });
  });
}

for (const [expression, count, neverMatches] of [
  ['0 0 31 2 *', '0', true],
  ['0 0 * * *', '0', false],
  ['0 0 31 2 MON', '2', false], // Unix OR permits Mondays in February.
  ['0 0 0 1 1 ? 2099', '2', false],
  ['@reboot', '2', false],
]) {
  test(`neverMatches distinguishes ${expression} with --next ${count}`, async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, expression,
      '--next', count, '--format', 'json', '--tz', 'UTC', '--start', '2026-10-22T00:00:00Z',
    ]);
    const data = JSON.parse(stdout);
    assert.equal(data.neverMatches, neverMatches);
    assert.equal(stderr.trim(), neverMatches ? 'Warning: This expression never matches any date' : '');
    if (count === '0' || expression === '@reboot') assert.deepEqual(data.nextRuns, []);
    else assert.ok(data.nextRuns.length > 0);
  });
}

for (const [expression, start, expected] of [
  ['30 2 * * *', '2027-03-13T12:00:00Z', ['2027-03-15T06:30:00.000Z', '2027-03-16T06:30:00.000Z']],
  ['30 2 * * *', '2026-10-31T12:00:00Z', ['2026-11-01T07:30:00.000Z', '2026-11-02T07:30:00.000Z']],
  ['30 1 * * *', '2026-10-31T12:00:00Z', ['2026-11-01T05:30:00.000Z', '2026-11-02T06:30:00.000Z']],
]) {
  test(`CLI --dst skip: ${expression} from ${start}`, async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, expression,
      '--dst', 'skip', '--start', start, '--tz', 'America/New_York', '--next', '2', '--format', 'json',
    ]);
    assert.equal(stderr, '');
    assert.deepEqual(JSON.parse(stdout).nextRuns.map((run) => run.utc), expected);
  });
}

const fixed = ['--tz', 'UTC', '--start', '2026-10-30T00:00:00Z'];

test('diff JSON classifies merged next N runs including shared instants', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
    'diff', '*/15 * * * *', '*/20 * * * *', '--next', '8', '--format', 'json', ...fixed,
  ]);
  assert.equal(stderr, '');
  const data = JSON.parse(stdout);
  assert.deepEqual(data.runs.map((run) => run.source), ['a', 'b', 'a', 'b', 'a', 'both', 'a', 'b']);
  assert.equal(data.runs[5].utc, '2026-10-30T01:00:00.000Z');
  assert.equal(data.runs[5].formatted, '2026-10-30 01:00:00 (+00:00)');
  assert.equal(data.windowEnd, null);
  assert.equal(data.a.expression, '*/15 * * * *');
});

test('diff text labels A, B and shared runs in Turkish', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
    'diff', '*/15 * * * *', '*/20 * * * *', '--next', '6', '--lang', 'tr', ...fixed,
  ]);
  assert.equal(stderr, '');
  assert.match(stdout, /\[yalnız A\]/);
  assert.match(stdout, /\[yalnız B\]/);
  assert.match(stdout, /\[ikisi de\]/);
});

test('diff accepts a day window, empty schedules and zero selected runs', async () => {
  for (const [a, b, next, days, count] of [
    ['@daily', '@daily', '5', '1', 1], ['@reboot', '0 0 31 2 *', '5', '7', 0],
    ['@daily', '@hourly', '0', '1', 0],
  ]) {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
      'diff', a, b, '--next', next, '--days', days, '--format', 'json', ...fixed,
    ]);
    const data = JSON.parse(stdout);
    assert.equal(stderr, '');
    assert.equal(data.runs.length, count);
    assert.equal(data.days, Number(days));
    assert.ok(data.windowEnd);
  }
});

test('calendar JSON groups the selected next N runs across months', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
    '@daily', '--calendar', '--next', '3', '--format', 'json', ...fixed,
  ]);
  assert.equal(stderr, '');
  const data = JSON.parse(stdout);
  assert.equal(data.nextRuns.length, 3);
  assert.deepEqual(data.calendar, [
    { date: '2026-10-31', runs: 1 }, { date: '2026-11-01', runs: 1 }, { date: '2026-11-02', runs: 1 },
  ]);
});

test('calendar text has month headings and localized weekday labels', async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
    '@daily', '--calendar', '--next=3', '--lang', 'de', ...fixed,
  ]);
  assert.equal(stderr, '');
  assert.match(stdout, /Kalender \(UTC\), nächste 3 Ausführungen/);
  assert.match(stdout, /2026-10\nMo\s+Di\s+Mi\s+Do\s+Fr\s+Sa\s+So/);
  assert.match(stdout, /2026-11/);
  assert.match(stdout, /31:1/);
});

test('empty calendars handle --next 0 and reboot without crashing', async () => {
  for (const args of [['@daily', '--next', '0'], ['@reboot']]) {
    for (const format of ['text', 'json']) {
      const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
        ...args, '--calendar', '--format', format, ...fixed,
      ]);
      assert.equal(stderr, '');
      if (format === 'json') assert.deepEqual(JSON.parse(stdout).calendar, []);
      else assert.match(stdout, /No upcoming runs/);
    }
  }
});

test('CLI accepts wrapped EventBridge, explicit bare dialects and new languages', async () => {
  for (const [expr, args, explanation] of [
    ['cron(0 12 ? * MON-FRI *)', ['--lang', 'de'], 'Um 12:00 Uhr, von Montag bis Freitag'],
    ['0 12 ? * MON-FRI *', ['--type=eventbridge', '--lang', 'es'], 'A las 12:00, de lunes a viernes'],
    ['15 0 9 lw * ?', ['--type', 'quartz', '--lang', 'es'], 'A las 09:00:15, el último día laborable del mes'],
  ]) {
    const { stdout, stderr } = await execFileAsync(process.execPath, [binPath,
      expr, ...args, '--next', '1', '--format', 'json', ...fixed,
    ]);
    assert.equal(stderr, '');
    assert.equal(JSON.parse(stdout).explanation, explanation);
    assert.equal(JSON.parse(stdout).nextRuns.length, 1);
  }
});

for (const args of [
  ['diff'], ['diff', '@daily'], ['diff', '@daily', '@hourly', '@yearly'],
  ['diff', '@daily', '@hourly', '--calendar'],
  ['diff', '@daily', '@hourly', '--days', '0'],
  ['diff', '@daily', '@hourly', '--days=1.5'],
  ['diff', '@daily', '@hourly', '--days=3651'],
  ['@daily', '--days', '2'], ['@daily', '--type', 'unknown'], ['@daily', '--type'],
]) {
  test(`new CLI usage rejects ${args.join(' ')}`, async () => {
    await assert.rejects(execFileAsync(process.execPath, [binPath, ...args, ...fixed]), (err) => {
      assert.equal(err.code, 1);
      assert.equal(err.stdout, '');
      assert.match(err.stderr, /^Error: /);
      return true;
    });
  });
}

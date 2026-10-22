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
    assert.match(stdout, /Açıklama: Pazartesi ile Cuma arasında/);
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

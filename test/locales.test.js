import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainCron, parseCron } from '../src/index.js';
import { getLocale, SUPPORTED_LANGUAGES } from '../src/locales/index.js';

test('German and Spanish translate basic schedules, aliases and Quartz specials', () => {
  for (const [expression, de, es] of [
    ['* * * * *', 'Jede Minute', 'Cada minuto'],
    ['* * * * * *', 'Jede Sekunde', 'Cada segundo'],
    ['*/15 * * * *', 'Alle 15 Minuten', 'Cada 15 minutos'],
    ['*/30 * * * * *', 'Alle 30 Sekunden', 'Cada 30 segundos'],
    ['0 30 9 ? * MON', 'Um 09:30 Uhr, am Montag', 'A las 09:30, el lunes'],
    ['15 30 9 * * ?', 'Um 09:30:15 Uhr', 'A las 09:30:15'],
    ['0 0 L * ?', 'Um 00:00 Uhr, am letzten Tag des Monats', 'A las 00:00, el último día del mes'],
    ['0 0 LW * ?', 'Um 00:00 Uhr, am letzten Werktag des Monats', 'A las 00:00, el último día laborable del mes'],
    ['0 0 ? * FRIL', 'Um 00:00 Uhr, am letzten Freitag des Monats', 'A las 00:00, el último viernes del mes'],
    ['0 0 ? * MON#3', 'Um 00:00 Uhr, am 3. Montag des Monats', 'A las 00:00, el tercer lunes del mes'],
    ['@daily', 'Jeden Tag um 00:00', 'Cada día a las 00:00'],
    ['@reboot', 'Beim Systemstart', 'Al iniciar el sistema'],
  ]) {
    assert.equal(explainCron(expression, { lang: 'de' }), de, expression);
    assert.equal(explainCron(expression, { lang: 'es' }), es, expression);
  }
});

test('new locales cover ranges, lists, weekday boundaries and years', () => {
  const expressions = ['*/15 9-17 * * 1-5', '0 9 1,15 JAN,MAR *',
    '0 9 1-3 JAN-MAR *', '0 0 L-3 * ?', '0 0 15W * ?',
    '0 0 * * MON,WED,FRI', '0 0 * * 0-5', '0 0 1 1 * 2026-2030'];
  for (const expression of expressions) {
    for (const lang of ['de', 'es']) {
      const explanation = explainCron(parseCron(expression), { lang });
      assert.doesNotMatch(explanation, /undefined|null|\{\w+\}/, `${lang}: ${expression}`);
      assert.ok(explanation.length > 5);
    }
  }
  assert.equal(explainCron('@daily', { lang: 'de-AT' }), 'Jeden Tag um 00:00');
  assert.equal(explainCron('@daily', { lang: 'es-MX' }), 'Cada día a las 00:00');
  assert.equal(explainCron('@daily', { lang: 'xx' }), explainCron('@daily'));
});

test('every locale supplies all CLI labels and all new phrase keys', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const locale = getLocale(lang);
    assert.deepEqual(Object.keys(locale.cli).sort(), Object.keys(getLocale('en').cli).sort());
    assert.equal(locale.cli.weekdaysShort.length, 7);
    assert.equal(locale.months.length, 13);
    assert.equal(locale.daysOfWeek.length, 7);
  }
  assert.deepEqual(Object.keys(getLocale('de').phrases).sort(),
    Object.keys(getLocale('es').phrases).sort());
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { explainCron } from '../src/explainer.js';

describe('Turkish Explainer', () => {
  test('explains simple wildcards', () => {
    assert.equal(explainCron('* * * * *', { lang: 'tr' }), 'Her dakika');
    assert.equal(explainCron('* * * * * *', { lang: 'tr' }), 'Her saniye');
  });

  test('explains step minutes and seconds', () => {
    assert.equal(explainCron('*/15 * * * *', { lang: 'tr' }), 'Her 15 dakikada bir');
    assert.equal(explainCron('*/30 * * * * *', { lang: 'tr' }), 'Her 30 saniyede bir');
  });

  test('explains compound expression with hours and day range', () => {
    assert.equal(
      explainCron('*/15 9-17 * * 1-5', { lang: 'tr' }),
      'Pazartesi ile Cuma arasında, 09:00 - 17:59 saatleri arasında her 15 dakikada bir'
    );
  });

  test('explains exact time of day with proper Turkish locative case', () => {
    assert.equal(explainCron('0 12 * * *', { lang: 'tr' }), 'Her gün saat 12:00\'de');
    assert.equal(explainCron('0 14 * * *', { lang: 'tr' }), 'Her gün saat 14:00\'te');
    assert.equal(explainCron('30 9 * * *', { lang: 'tr' }), 'Her gün saat 09:30\'da');
    assert.equal(explainCron('15 0 0 * * *', { lang: 'tr' }), 'Her gün saat 00:00:15\'te');
  });

  test('explains date with day of month and month', () => {
    assert.equal(
      explainCron('0 12 1 * *', { lang: 'tr' }),
      'ayın 1. gününde, saat 12:00\'de'
    );
    assert.equal(
      explainCron('0 0 29 2 *', { lang: 'tr' }),
      'Şubat\'ta, ayın 29. gününde, saat 00:00\'da'
    );
  });

  test('explains aliases in Turkish', () => {
    assert.equal(explainCron('@daily', { lang: 'tr' }), 'Her gün saat 00:00\'da');
    assert.equal(explainCron('@hourly', { lang: 'tr' }), 'Her saatin başında');
    assert.equal(explainCron('@reboot', { lang: 'tr' }), 'Sistem başlangıcında');
  });

  test('explains Quartz Day-of-Month specials in Turkish', () => {
    assert.equal(
      explainCron('0 0 L * ?', { lang: 'tr' }),
      'ayın son gününde, saat 00:00\'da'
    );
    assert.equal(
      explainCron('0 0 LW * ?', { lang: 'tr' }),
      'ayın son iş gününde, saat 00:00\'da'
    );
    assert.equal(
      explainCron('0 0 L-3 * ?', { lang: 'tr' }),
      'ayın bitiminden 3 gün önce, saat 00:00\'da'
    );
    assert.equal(
      explainCron('0 0 15W * ?', { lang: 'tr' }),
      'ayın 15. gününe en yakın iş gününde, saat 00:00\'da'
    );
  });

  test('explains Quartz Day-of-Week specials in Turkish', () => {
    assert.equal(
      explainCron('0 4 ? * 6L', { lang: 'tr' }),
      'ayın son Cuma gününde, saat 04:00\'te'
    );
    assert.equal(
      explainCron('30 9 ? * 2#3', { lang: 'tr' }),
      'ayın 3. Pazartesi gününde, saat 09:30\'da'
    );
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  turkishOrdinal,
  turkishLocative,
  turkishStepSuffix,
  formatListTr,
} from '../src/locales/grammar-tr.js';

describe('Turkish Grammar Helpers', () => {
  test('turkishOrdinal with style suffix covers cardinal numbers properly', () => {
    assert.equal(turkishOrdinal(1), "1'inci");
    assert.equal(turkishOrdinal(2), "2'nci");
    assert.equal(turkishOrdinal(3), "3'üncü");
    assert.equal(turkishOrdinal(4), "4'üncü");
    assert.equal(turkishOrdinal(5), "5'inci");
    assert.equal(turkishOrdinal(6), "6'ncı");
    assert.equal(turkishOrdinal(7), "7'nci");
    assert.equal(turkishOrdinal(8), "8'inci");
    assert.equal(turkishOrdinal(9), "9'uncu");
    assert.equal(turkishOrdinal(10), "10'uncu");
    assert.equal(turkishOrdinal(20), "20'nci");
    assert.equal(turkishOrdinal(21), "21'inci");
    assert.equal(turkishOrdinal(30), "30'uncu");
    assert.equal(turkishOrdinal(40), "40'ıncı");
    assert.equal(turkishOrdinal(50), "50'nci");
    assert.equal(turkishOrdinal(60), "60'ıncı");
    assert.equal(turkishOrdinal(70), "70'inci");
    assert.equal(turkishOrdinal(80), "80'inci");
    assert.equal(turkishOrdinal(90), "90'ıncı");
    assert.equal(turkishOrdinal(100), "100'üncü");
  });

  test('turkishOrdinal with style dot', () => {
    assert.equal(turkishOrdinal(1, 'dot'), '1.');
    assert.equal(turkishOrdinal(15, 'dot'), '15.');
    assert.equal(turkishOrdinal(31, 'dot'), '31.');
  });

  test('turkishLocative handles all 24 clock hours', () => {
    assert.equal(turkishLocative('00:00'), "00:00'da");
    assert.equal(turkishLocative('01:00'), "01:00'de");
    assert.equal(turkishLocative('02:00'), "02:00'de");
    assert.equal(turkishLocative('03:00'), "03:00'te");
    assert.equal(turkishLocative('04:00'), "04:00'te");
    assert.equal(turkishLocative('05:00'), "05:00'te");
    assert.equal(turkishLocative('06:00'), "06:00'da");
    assert.equal(turkishLocative('07:00'), "07:00'de");
    assert.equal(turkishLocative('08:00'), "08:00'de");
    assert.equal(turkishLocative('09:00'), "09:00'da");
    assert.equal(turkishLocative('10:00'), "10:00'da");
    assert.equal(turkishLocative('11:00'), "11:00'de");
    assert.equal(turkishLocative('12:00'), "12:00'de");
    assert.equal(turkishLocative('13:00'), "13:00'te");
    assert.equal(turkishLocative('14:00'), "14:00'te");
    assert.equal(turkishLocative('15:00'), "15:00'te");
    assert.equal(turkishLocative('16:00'), "16:00'da");
    assert.equal(turkishLocative('17:00'), "17:00'de");
    assert.equal(turkishLocative('18:00'), "18:00'de");
    assert.equal(turkishLocative('19:00'), "19:00'da");
    assert.equal(turkishLocative('20:00'), "20:00'de");
    assert.equal(turkishLocative('21:00'), "21:00'de");
    assert.equal(turkishLocative('22:00'), "22:00'de");
    assert.equal(turkishLocative('23:00'), "23:00'te");
  });

  test('turkishLocative handles minute suffixes in times', () => {
    assert.equal(turkishLocative('09:15'), "09:15'te"); // on beş -> te
    assert.equal(turkishLocative('09:30'), "09:30'da"); // otuz -> da
    assert.equal(turkishLocative('09:40'), "09:40'ta"); // kırk -> ta
    assert.equal(turkishLocative('09:45'), "09:45'te"); // kırk beş -> te
    assert.equal(turkishLocative('09:50'), "09:50'de"); // elli -> de
  });

  test('turkishLocative handles all 12 month names', () => {
    assert.equal(turkishLocative('Ocak'), "Ocak'ta");
    assert.equal(turkishLocative('Şubat'), "Şubat'ta");
    assert.equal(turkishLocative('Mart'), "Mart'ta");
    assert.equal(turkishLocative('Nisan'), "Nisan'da");
    assert.equal(turkishLocative('Mayıs'), "Mayıs'ta");
    assert.equal(turkishLocative('Haziran'), "Haziran'da");
    assert.equal(turkishLocative('Temmuz'), "Temmuz'da");
    assert.equal(turkishLocative('Ağustos'), "Ağustos'ta");
    assert.equal(turkishLocative('Eylül'), "Eylül'de");
    assert.equal(turkishLocative('Ekim'), "Ekim'de");
    assert.equal(turkishLocative('Kasım'), "Kasım'da");
    assert.equal(turkishLocative('Aralık'), "Aralık'ta");
  });

  test('turkishStepSuffix formats interval phrases', () => {
    assert.equal(turkishStepSuffix('second'), 'saniyede bir');
    assert.equal(turkishStepSuffix('minute'), 'dakikada bir');
    assert.equal(turkishStepSuffix('hour'), 'saatte bir');
    assert.equal(turkishStepSuffix('day'), 'günde bir');
    assert.equal(turkishStepSuffix('month'), 'ayda bir');
    assert.equal(turkishStepSuffix('year'), 'yılda bir');
  });

  test('formatListTr handles zero, single, pair and multiple elements', () => {
    assert.equal(formatListTr([]), '');
    assert.equal(formatListTr(['Pazartesi']), 'Pazartesi');
    assert.equal(formatListTr(['Pazartesi', 'Salı']), 'Pazartesi ve Salı');
    assert.equal(formatListTr(['Pazartesi', 'Salı', 'Çarşamba']), 'Pazartesi, Salı ve Çarşamba');
  });
});

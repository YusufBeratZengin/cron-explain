# cron-explain
[![CI](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml/badge.svg)](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml) [![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![npm](https://img.shields.io/npm/v/cron-explain)](https://www.npmjs.com/package/cron-explain) ![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-green.svg) ![Dependencies: 0](https://img.shields.io/badge/dependencies-0-blue.svg)
[English](README.md) | Türkçe

Cron ifadelerini Türkçe veya İngilizce açıklar, doğrular ve seçtiğiniz zaman diliminde sonraki çalışma zamanlarını hesaplar.
Node.js >=20 üzerinde ESM ile çalışır; bağımlılığı yoktur ve internet bağlantısı kullanmaz.
Kurulum: `npm install cron-explain` (CLI için: `npm install --global cron-explain`).

## Demo

<!-- check-readme -->
```console
$ cron-explain "*/15 9-17 * * 1-5" --next 2 --tz UTC --lang tr --start 2026-10-22T08:00:00Z
İfade: */15 9-17 * * 1-5
Açıklama: Hafta içi her gün 09:00 ile 17:59 arasında her 15 dakikada bir
Zaman Dilimi: UTC

Sonraki 2 Çalışma Zamanı:
1. 2026-10-22 09:00:00 (+00:00)
2. 2026-10-22 09:15:00 (+00:00)
```

Çıktıyı tekrar üretebilmek için başlangıç tarihi sabittir. İngilizce çıktı için `--lang en` kullanın:

<!-- check-readme -->
```console
$ cron-explain "*/15 9-17 * * 1-5" --next 2 --tz UTC --lang en --start 2026-10-22T08:00:00Z
Expression: */15 9-17 * * 1-5
Explanation: Every 15 minutes, between 09:00 and 17:59, on Monday through Friday
Time Zone: UTC

Next 2 run times:
1. 2026-10-22 09:00:00 (+00:00)
2. 2026-10-22 09:15:00 (+00:00)
```

## Kurulum

Kütüphane için yukarıdaki kurulum komutunu, CLI için global kurulumu kullanın.
Repoyu kurulum yapmadan denemek için örneklerdeki `cron-explain` yerine `node bin/cron-explain.js` yazın.

## Kullanım

5 alanlı (dakika, saat, ayın günü, ay, haftanın günü), 6 alanlı
(saniye eklenmiş veya sonunda dört basamaklı yıl/yıl aralığı olan) ve 7 alanlı
(saniyeden yıla kadar) ifadeleri destekler.
Quartz için `?`, `L`, `LW`, `L-n`, `nW`, `dL` ve `d#n` kullanılabilir.
Takma adlar: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, `@reboot`.

### Kütüphane API'si

```js
import { validateCron, parseCron, explainCron, getNextRunTimes, formatZonedDate } from 'cron-explain';

const expression = '*/15 9-17 * * 1-5';
const validation = validateCron(expression);
const parsed = parseCron(expression);
const explanation = explainCron(parsed, { lang: 'tr' });
const runs = getNextRunTimes(parsed, {
  startDate: '2026-10-22T08:00:00Z',
  timeZone: 'Europe/Istanbul',
  count: 2,
  dstPolicy: 'skip',
});
const formatted = runs.map((date) => formatZonedDate(date, 'Europe/Istanbul'));
```

`getNextRunTimes`, `Date[]` döndürür; başlangıç anı sonuçlara dahil edilmez.
`parseCron` hatalı ifadede `CronValidationError` verir; `validateCron` doğrulama sonucu döndürür.
Zaman dilimi ve Türkçe ek yardımcıları da dışa aktarılır; [src/index.js](src/index.js) dosyasına bakın.

### JSON çıktısı

<!-- check-readme -->
```console
$ cron-explain "0 0 1 1 *" --next 1 --tz UTC --lang tr --format json --start 2026-10-22T00:00:00Z
{
  "expression": "0 0 1 1 *",
  "explanation": "Ocak'ta, ayın 1. gününde, saat 00:00'da",
  "timeZone": "UTC",
  "isReboot": false,
  "neverMatches": false,
  "nextRuns": [
    {
      "utc": "2027-01-01T00:00:00.000Z",
      "formatted": "2027-01-01 00:00:00 (+00:00)"
    }
  ]
}
```

## Örnekler

[examples/basic.mjs](examples/basic.mjs) doğrulama, açıklama ve sonraki çalışma zamanlarını gösterir:

<!-- check-readme -->
```console
$ node examples/basic.mjs
Valid: true
Every 15 minutes, between 09:00 and 17:59, on Monday through Friday
Hafta içi her gün 09:00 ile 17:59 arasında her 15 dakikada bir
2026-10-22T09:00:00.000Z
2026-10-22T09:15:00.000Z
```

[examples/quartz.mjs](examples/quartz.mjs) aşağıdaki üç özel takvimi birlikte gösterir:

<!-- check-readme -->
```console
$ node examples/quartz.mjs
0 0 12 ? * 2#3: At 12:00, on the 3rd Monday of the month
2026-11-16T12:00:00.000Z
0 0 L * ?: At 00:00, on the last day of the month
2026-10-31T00:00:00.000Z
0 15 10 ? * 6L: At 10:15, on the last Friday of the month
2026-10-30T10:15:00.000Z
```

### Quartz örnekleri

Quartz'ta 1=Pazar, 7=Cumartesi'dir. Beşinci günün istendiği ifadelerde o günün beş kez geçmediği aylar atlanır.

<!-- check-readme -->
```console
$ cron-explain "0 0 12 ? * 2#3" --next 2 --tz UTC --lang tr --start 2026-10-22T00:00:00Z
İfade: 0 0 12 ? * 2#3
Açıklama: ayın 3. Pazartesi gününde, saat 12:00'de
Zaman Dilimi: UTC

Sonraki 2 Çalışma Zamanı:
1. 2026-11-16 12:00:00 (+00:00)
2. 2026-12-21 12:00:00 (+00:00)
```

<!-- check-readme -->
```console
$ cron-explain "0 0 L * ?" --next 2 --tz UTC --lang tr --start 2026-10-22T00:00:00Z
İfade: 0 0 L * ?
Açıklama: ayın son gününde, saat 00:00'da
Zaman Dilimi: UTC

Sonraki 2 Çalışma Zamanı:
1. 2026-10-31 00:00:00 (+00:00)
2. 2026-11-30 00:00:00 (+00:00)
```

<!-- check-readme -->
```console
$ cron-explain "0 15 10 ? * 6L" --next 2 --tz UTC --lang tr --start 2026-10-22T00:00:00Z
İfade: 0 15 10 ? * 6L
Açıklama: ayın son Cuma gününde, saat 10:15'te
Zaman Dilimi: UTC

Sonraki 2 Çalışma Zamanı:
1. 2026-10-30 10:15:00 (+00:00)
2. 2026-11-27 10:15:00 (+00:00)
```

## Seçenekler

| Seçenek | İşlev | Varsayılan |
| --- | --- | --- |
| `--next <n>` | 0–1000 arasında tam sayı; daha büyük değerler reddedilir | 5 |
| `--tz <zone>`, `--timezone <zone>` | IANA zaman dilimi | Sistem dilimi veya UTC |
| `--lang <en\|tr>` | Açıklama dili | en |
| `--start <date>` | Başlangıç; saat farkı içeren ISO 8601 kullanın | Şu an |
| `--dst <shift\|skip>` | İleri saat geçişinde olmayan saatin nasıl ele alınacağı | shift |
| `--format <text\|json>` | Çıktı biçimi | text |
| `-h`, `--help` | Yardım | |
| `-v`, `--version` | Sürüm | |

### Çıkış kodları

| Kod | Anlamı |
| --- | --- |
| 0 | Geçerli ifade; gelecekte eşleşen tarihi olmayan ifadeler de buna dahildir |
| 1 | Hatalı ifade veya yanlış CLI kullanımı |

`0 0 31 2 *`, `0 0 30 2 *`, `0 0 31 4,6,9,11 *`
ve geçmiş bir Quartz yılı (`0 0 0 1 1 ? 2020`) için stderr'e
`Warning: This expression never matches any date` yazılır.
Çalışma listesi boş olur; JSON çıktısında `"neverMatches": true` bulunur.
Çıkış kodu **0** kalır. Burada “eşleşmiyor”, `--start` sonrasından desteklenen
son yıl olan 2099'a kadar gelecek bir tarih bulunamadığı anlamına gelir;
geçmişte hiç çalışmadığı anlamına gelmez.
Bu kontrol `--next 0` ile de yapılır. `@reboot` için tarih hesaplanmaz ve
eşleşmiyor uyarısı verilmez. JSON her zaman `neverMatches` boolean alanını içerir.

## Nasıl çalışır?

Parser alanları ayrıştırır, izin verilen değerleri çıkarır ve aralıkları doğrular.
Hesaplama her dakikayı taramak yerine yıl, ay, eşleşen gün ve saatler üzerinden ilerler.
Uzak yıllar ve 29 Şubat da bu yolla hesaplanır.
İngilizce gün adlarının önüne “on” gelir; altı günlük kümeler “every day except Saturday”
gibi açıklanır. Türkçede yalnızca Pazartesi–Cuma kümesi “Hafta içi her gün” olarak kısaltılır.

Unix ifadelerinde ayın günü ve haftanın günü birlikte kısıtlıysa birinin
eşleşmesi yeterlidir (OR). Quartz `?` ilgili alanı serbest bırakır.

### DST politikası

Zaman dilimi kuralları Node'un `Intl` verisinden alınır.
İleri saat geçişinde olmayan bir yerel saat için `shift`, çalışmayı sonraki
geçerli saatin başına taşır; `skip` o çalışmayı atlar.
Geri saat geçişinde tekrarlanan bir yerel saat, her iki politikada da ilk
geçişte bir kez kullanılır. New York'ta tekrarlanan aralık 01:00–01:59'dur;
02:30, değişimden sonra bir kez yaşanır.

## Sınırlar ve gizlilik

Yıl alanı 1970–2099 aralığını destekler; gelecek tarih araması 2099'da biter ve
istenenden az sonuç döndürebilir. `@reboot` açıklanabilir ancak sonraki tarihleri hesaplanmaz.
Paket takvim hesaplar, görev çalıştırmaz.
Tüm işlemler yereldir; ağ isteği yapılmaz. Zaman dilimi doğruluğu,
kullandığınız Node.js sürümünün zaman dilimi verisine bağlıdır.

## Geliştirme

Yerel repoda şu komutları çalıştırın:

```bash
npm ci
npm run lint
npm test
npm pack --dry-run
```

Lint, JavaScript sözdizimi ve stil kontrollerinin yanında işaretli README
örneklerini sabit başlangıçlarla çalıştırır; stdout ve çıkış kodunu karşılaştırır.
CI, bu kontrolleri ve iki çevrimdışı örneği Windows ve Linux’ta Node 20, 22 ve 24 ile çalıştırır.

## Katkıda bulunma

Kurulum, commit biçimi ve güvenilir yayıncı ayarları için
[CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.
[Davranış kurallarına](CODE_OF_CONDUCT.md) uyun.
Güvenlik açığı bildirimleri için [SECURITY.md](SECURITY.md) yolunu izleyin.

## Lisans

[MIT](LICENSE) — Copyright (c) 2026 Yusuf Berat Zengin.

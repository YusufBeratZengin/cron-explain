# cron-explain

[![CI](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml/badge.svg)](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml) [![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![npm](https://img.shields.io/npm/v/cron-explain)](https://www.npmjs.com/package/cron-explain) ![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-green.svg) ![Dependencies: 0](https://img.shields.io/badge/dependencies-0-blue.svg)

[English](README.md) | Türkçe

Cron ifadelerini Türkçe, İngilizce, Almanca veya İspanyolca açıklar, doğrular ve seçtiğiniz zaman diliminde sonraki çalışma zamanlarını hesaplar.
Node.js >=20 üzerinde ESM ile çalışır; bağımlılığı yoktur ve internet bağlantısı kullanmaz.

![Hafta içi cron ifadesinin İngilizce açıklaması ve UTC ile sonraki on çalışma zamanı](docs/demo.svg)

## Neden cron-explain?

- Türkçe ek kuralları dahil dört dilde açıklamalar üretir.
- Unix, Quartz ve AWS EventBridge sözdizimini, takvim karşılaştırmasını ve terminal takvimini tek bir CLI ve ESM kütüphanesinde sunar.
- Çalışma zamanı bağımlılığı olmadan çevrimdışı çalışır; tekrarlanabilir metin veya JSON çıktısı verir.

## Hızlı başlangıç

Node.js >=20 ile herkese açık repoyu deneyin; paket kurulumu gerekmez:

```bash
git clone https://github.com/YusufBeratZengin/cron-explain.git
cd cron-explain
node bin/cron-explain.js "*/15 9-17 * * 1-5" --next 10 --tz UTC --lang en --start 2026-10-23T08:00:00Z
```

Bu komut görseldeki İngilizce çıktıyı üretir. Türkçe çıktı için `--lang tr` kullanın.
npm üzerinden dağıtım bilgisi [Kurulum](#kurulum) bölümündedir.

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
$ cron-explain "*/15 9-17 * * 1-5" --next 10 --tz UTC --lang en --start 2026-10-23T08:00:00Z
Expression: */15 9-17 * * 1-5
Explanation: Every 15 minutes, between 09:00 and 17:59, on Monday through Friday
Time Zone: UTC

Next 10 run times:
1. 2026-10-23 09:00:00 (+00:00)
2. 2026-10-23 09:15:00 (+00:00)
3. 2026-10-23 09:30:00 (+00:00)
4. 2026-10-23 09:45:00 (+00:00)
5. 2026-10-23 10:00:00 (+00:00)
6. 2026-10-23 10:15:00 (+00:00)
7. 2026-10-23 10:30:00 (+00:00)
8. 2026-10-23 10:45:00 (+00:00)
9. 2026-10-23 11:00:00 (+00:00)
10. 2026-10-23 11:15:00 (+00:00)
```

## Kurulum

Paket npm'de yayımlandığında:

```bash
npm install cron-explain
# CLI için global kurulum:
npm install --global cron-explain
```

npm sürüm rozeti kayıt defterindeki durumu gösterir; ilk yayımdan önce sürüm bilgisi görünmeyebilir.
Repoyu kurulum yapmadan denemek için örneklerdeki `cron-explain` yerine `node bin/cron-explain.js` yazın.

## Kullanım

5 alanlı (dakika, saat, ayın günü, ay, haftanın günü), 6 alanlı
(saniye eklenmiş veya sonunda dört basamaklı yıl/yıl aralığı olan) ve 7 alanlı
(saniyeden yıla kadar) ifadeleri destekler.
Quartz için `?`, `L`, `LW`, `L-n`, `nW`, `dL` ve `d#n` kullanılabilir.
Takma adlar: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, `@reboot`.

### EventBridge ve Quartz

AWS EventBridge biçimi `cron(dakika saat ayın-günü ay haftanın-günü yıl)` şeklindedir:
altı alanlıdır, saniye içermez, 1970–2199 yıllarını destekler ve iki gün alanından
tam biri `?` olmalıdır. Haftanın günleri 1=Pazar ile 7=Cumartesi arasındadır.
Sarmalayıcı olmadan `--type eventbridge` veya `parseCron(metin, { type: 'eventbridge' })`
kullanın. `cron(...)` otomatik tanınır; yalın ifadelerde mevcut otomatik yorum korunur.
EventBridge haftanın gününde adım ve `#` içeren liste kabul etmez.

Quartz'ta ilk alan saniyedir; isteğe bağlı yedinci alan yıldır (1970–2099).
Açık seçim için `--type quartz` kullanın. Büyük/küçük harf duyarsız özel işaretler:
`L` (son gün), `LW` (son iş günü), `L-3`, `15W` (ay sınırını aşmadan en yakın iş günü),
`FRIL` (son Cuma) ve `MON#3` (üçüncü Pazartesi).
[AWS sözdizimi](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)
ve [Quartz kılavuzuna](https://www.quartz-scheduler.org/documentation/quartz-2.2.2/tutorials/crontrigger) bakın.
Hesaplama kütüphanenin mevcut yerel DST politikasını kullanır; barındırılan servisin
tüm davranışlarını taklit etmez. UTC tabanlı EventBridge kuralları için `--tz UTC` kullanın.

```bash
cron-explain "cron(0 12 ? * MON-FRI *)" --lang de --tz UTC --start 2026-10-30T00:00:00Z
cron-explain "0 12 ? * MON-FRI *" --type eventbridge --lang es --tz UTC --start 2026-10-30T00:00:00Z
cron-explain "15 0 9 LW * ?" --type quartz --next 3 --tz UTC --start 2026-10-30T00:00:00Z
```

### İki takvimi karşılaştırma

`diff`, iki takvimin sonraki `--next N` **farklı çalışma anını** birleştirerek zaman
sırasıyla gösterir: `yalnız A`, `yalnız B`, `ikisi de`. N, yalnız farklı olanları
değil birleşik sonuç sayısını sınırlar; aynı takvimlerde `ikisi de` görünür.
İfadeleri ayrı ayrı tırnaklayın. `--start`, `--tz`, `--dst` ve `--type` ikisine de uygulanır.
İsteğe bağlı `--days N`, aramayı `(başlangıç, başlangıç + N × 24 saat]` aralığıyla
sınırlar. Verilmezse her sözdiziminin desteklediği son yıla kadar hesaplanır.

```bash
cron-explain diff "*/15 * * * *" "*/20 * * * *" --next 8 --lang tr --tz UTC --start 2026-10-30T00:00:00Z
cron-explain diff "@daily" "0 12 * * *" --days 7 --format json --tz UTC --start 2026-10-30T00:00:00Z
```

<!-- check-readme -->
```console
$ cron-explain diff "*/15 * * * *" "*/20 * * * *" --next 6 --lang tr --tz UTC --start 2026-10-30T00:00:00Z
İfade A: */15 * * * *
Açıklama A: Her 15 dakikada bir
İfade B: */20 * * * *
Açıklama B: Her 20 dakikada bir
Zaman Dilimi: UTC

Sonraki 6 Çalışma Zamanı:
1. [yalnız A] 2026-10-30 00:15:00 (+00:00)
2. [yalnız B] 2026-10-30 00:20:00 (+00:00)
3. [yalnız A] 2026-10-30 00:30:00 (+00:00)
4. [yalnız B] 2026-10-30 00:40:00 (+00:00)
5. [yalnız A] 2026-10-30 00:45:00 (+00:00)
6. [ikisi de] 2026-10-30 01:00:00 (+00:00)
```

JSON alanları: `a`, `b`, `timeZone`, `days`, `windowStart`, `windowEnd`, `runs`.
Her çalışmada `source` (`a`, `b`, `both`), `utc` ve `formatted` bulunur.
Aralık verilmezse `days` ve `windowEnd` null olur. Gelecek çalışma yoksa boş liste
ve çıkış kodu 0 döner; sonuçlar gösterilen aralık dışında eşitlik iddiası taşımaz.

### Aylık terminal takvimi

```bash
cron-explain "@daily" --calendar --next 10 --tz Europe/Istanbul --lang tr --start 2026-10-30T00:00:00Z
```

`--calendar`, metin çalışma listesini sonraki `--next N` çalışma için Pazartesi
başlangıçlı ay ızgaralarıyla değiştirir. Her ilgili ayın `YYYY-MM` başlığı vardır.
`GG:n`, seçilen çalışmalardan o yerel güne düşen sayıyı; `GG .`, o gün seçilen
çalışma olmadığını gösterir. Tüm günün çalışma sayısı anlamına gelmez.
99'dan büyük sayılar da tam yazılır. Seyrek takvimler yıllara yayılabilir;
yalnız seçilen çalışmaların bulunduğu aylar gösterilir.
`--next 0`, `@reboot` ve tükenmiş takvimlerde sonuç boştur.
JSON'da `nextRuns` korunur, `calendar: [{ date: 'YYYY-MM-DD', runs: n }]` eklenir.
`--calendar` ve `diff` birlikte kullanılamaz.

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

```js
import { parseCron, explainCron, compareSchedules, getCalendar, renderCalendar, findOverlaps } from 'cron-explain';

const options = { startDate: '2026-10-30T00:00:00Z', timeZone: 'UTC', count: 8 };
const aws = parseCron('0 12 ? * MON-FRI *', { type: 'eventbridge' });
const german = explainCron(aws, { lang: 'de' }); // en, tr, de, es; bilinmeyen dil en olur
const comparison = compareSchedules('*/15 * * * *', '*/20 * * * *', options);
// comparison.runs: [{ date: Date, source: 'a' | 'b' | 'both' }]; windowEnd: Date | null
const calendar = getCalendar('@daily', options);
// calendar.days: [{ date: 'YYYY-MM-DD', weekday: 0..6 (Pazartesi ilk), runs: number }]
const text = renderCalendar(calendar);
const common = findOverlaps('@daily', '0 0 * * *', { ...options, days: 7, limit: 3 });
// common: { overlaps: Date[], total, capped, windowEnd: Date }
```

`compareSchedules` ve `getCalendar`, metin veya ayrıştırılmış ifade ve
`getNextRunTimes` seçeneklerini kabul eder. Başlangıç hariçtir; `count` varsayılanı
5'tir ve sıfır olabilir. Karşılaştırmada isteğe bağlı pozitif `days` aralığı vardır.
`findOverlaps`, bir aralıktaki ortak çalışmaları sayar (varsayılan 365 gün), ilk
`limit` adedini saklar (varsayılan 10); `maxRuns`, ifade başına taramayı sınırlar
(varsayılan 200000). `capped: true` olduğunda `total` kısmi sayımdır.
`getCalendar`, sabit sayıda çalışmayı grupladığı için `capped: false` döndürür.
Mevcut API imzaları ile varsayılan İngilizce/Türkçe çıktı uyumluluğu korunur.

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
| `--lang <en\|tr\|de\|es>` | Açıklama ve çıktı etiketlerinin dili | en |
| `--type <auto\|unix\|quartz\|eventbridge>` | Cron sözdizimi | auto |
| `--calendar` | Sonraki `--next N` çalışmanın aylık takvimi | kapalı |
| `--days <n>` | İsteğe bağlı diff aralığı, 1–3650 gün | yok |
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
son yıla (2099, EventBridge için 2199) kadar gelecek bir tarih bulunamadığı anlamına gelir;
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

## Sık sorulan sorular ve sınırlar

**Görevlerimi çalıştırır mı?** Takvim hesaplar ve açıklar. Görevleri çalıştırmak için bir zamanlayıcı kullanın.

**Altı alanlı ifadeler neden farklı yorumlanabiliyor?** İlk dakika alanı açıkça
belirtildiğinde, sondaki dört basamaklı sayı veya yıl aralığı yıl olarak yorumlanır.
Diğer durumlarda ilk alan saniyedir. Saniyeden yıla kadar tüm alanları açıkça
belirtmek için yedi alan kullanın. Desteklenen biçimler [Kullanım](#kullanım) bölümündedir.

**Yaz saati geçişinde sonuçlar neden değişiyor?** `--dst shift`, olmayan yerel
saatleri sonraki geçerli saatin başına taşır; `--dst skip` bu çalışmaları atlar.
Tekrarlanan saatlerde ilk geçiş kullanılır. Sonuçları karşılaştırırken `--start`
ve `--tz` değerlerini sabitleyin.

### Sınırlar ve gizlilik

Yıl alanı 1970–2099 (EventBridge için 1970–2199) aralığını destekler;
gelecek tarih araması ilgili sözdiziminin son desteklenen yılında biter ve
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
npm run demo
npm pack --dry-run
```

`npm test`, Node'un yerleşik satır, dal ve fonksiyon kapsam raporunu yazdırır;
harici kapsam servisi veya token gerekmez. `npm run demo`, gerçek CLI çıktısını
[scripts/make-demo.mjs](scripts/make-demo.mjs) üreticisine aktararak SVG'yi yeniler.
CI, üretilen görselin repodaki dosyayla aynı olduğunu kontrol eder.

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

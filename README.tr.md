# cron-explain

Cron ifadelerini ayrıştıran, doğrulayan, doğal Türkçe ve İngilizce dillerinde açıklayan ve zaman dilimi desteğiyle sonraki çalışma zamanlarını hesaplayan Node.js kütüphanesi ve komut satırı aracı. Node.js >=20, ECMAScript Modules (ESM) ve sıfır çalışma zamanı bağımlılığı ile geliştirilmiştir.

## Özellikler

- 5 alanlı (Unix standardı), 6 alanlı (saniye veya yıl içeren) ve 7 alanlı (Quartz formatı) cron ifadelerini destekler.
- Quartz özel karakterlerini destekler: `?`, `L`, `LW`, `L-<fark>`, `<gün>W`, `<gün>L` ve `<gün>#<sıra>`.
- Standart takma adları destekler (`@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, `@reboot`).
- Yerel dosyalardan (`locales/tr.json`, `locales/en.json`) yüklenen doğal dil açıklamaları.
- Türkçe dilbilgisi kurallarına tam uyum: Büyük ünlü uyumu ve ünsüz benzeşmesi (Fıstıkçı Şahap) kurallarına göre üretilen sıra sayı ekleri (`1'inci`, `2'nci`, `3'üncü`, `6'ncı`, `20'nci`) ve bulunma durumu ekleri (`saat 14:00'te`, `09:30'da`, `Ocak'ta`, `Eylül'de`).
- Harici zaman dilimi veritabanlarına ihtiyaç duymadan doğrudan ECMAScript `Intl` API ile çalışan zaman dilimi hesaplaması.
- Yaz/Kış saati (DST) geçişlerinde öngörülebilir ve belgelenmiş çalışma politikası.
- Artık yıl duyarlılığı (örneğin `0 0 29 2 *` yalnızca artık yıllarda 29 Şubat için tetiklenir).
- Hatalı ifadelerde karakter konumunu gösteren görsel imleçli ASCII doğrulama hata çıktıları.
- Birleşik programatik API ve komut satırı arayüzü (`cron-explain`).
- Sıfır çalışma zamanı bağımlılığı.

## Kurulum

```bash
npm install cron-explain
```

Veya `npx` ile doğrudan çalıştırın:

```bash
npx cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
```

## CLI Kullanımı

Paket, `cron-explain` adında bir ikili çalıştırılabilir dosya sunar.

```
Kullanım:
  cron-explain "<ifade>" [seçenekler]

Argümanlar:
  <ifade>               Cron ifadesi (5, 6, 7 alan veya @daily, @hourly, @reboot)

Seçenekler:
  --next <n>            Hesaplanacak sonraki çalışma zamanı adedi (varsayılan: 5)
  --tz <zamanDilimi>    IANA zaman dilimi (varsayılan: sistem zaman dilimi veya UTC)
  --lang <en|tr>        Açıklama dili (varsayılan: en)
  --start <isoTarih>    Referans başlangıç zamanı (varsayılan: şu an)
  --dst <shift|skip>    DST ileri saat atlama yönetimi (varsayılan: shift)
  --format <text|json>  Çıktı formatı (varsayılan: text)
  -v, --version         Sürüm numarasını gösterir
  -h, --help            Yardım iletisini gösterir
```

### Örnekler

#### Türkçe Açıklama ve Sonraki Çalışma Zamanları
```bash
cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
```
Çıktı:
```
İfade: */15 9-17 * * 1-5
Açıklama: Pazartesi ile Cuma arasında, 09:00 - 17:59 saatleri arasında her 15 dakikada bir
Zaman Dilimi: Europe/Istanbul

Sonraki 5 Çalışma Zamanı:
1. 2026-10-23 09:00:00 (+03:00)
2. 2026-10-23 09:15:00 (+03:00)
3. 2026-10-23 09:30:00 (+03:00)
4. 2026-10-23 09:45:00 (+03:00)
5. 2026-10-23 10:00:00 (+03:00)
```

#### JSON Formatında Çıktı
```bash
cron-explain "0 0 1 1 *" --format json
```
Çıktı:
```json
{
  "expression": "0 0 1 1 *",
  "explanation": "At 00:00, on day 1 of the month, in January",
  "timeZone": "UTC",
  "isReboot": false,
  "nextRuns": [
    {
      "utc": "2027-01-01T00:00:00.000Z",
      "formatted": "2027-01-01 00:00:00 (+00:00)"
    }
  ]
}
```

#### Hatalı İfade Doğrulama Çıktısı
```bash
cron-explain "*/15 25 * * *"
```
Çıktı:
```
Invalid cron expression:
  */15 25 * * *
       ^^
Hour '25' is out of range (0-23).
```

## Programatik API

```javascript
import {
  parseCron,
  validateCron,
  explainCron,
  getNextRunTimes,
  formatZonedDate,
} from 'cron-explain';

// 1. Doğrulama
const validation = validateCron('*/15 9-17 * * 1-5');
if (!validation.valid) {
  console.error(validation.visualMarker);
}

// 2. Açıklama
const aciklama = explainCron('*/15 9-17 * * 1-5', { lang: 'tr' });
// "Pazartesi ile Cuma arasında, 09:00 - 17:59 saatleri arasında her 15 dakikada bir"

// 3. Sonraki Çalışma Zamanları
const calismaZamanlari = getNextRunTimes('*/15 9-17 * * 1-5', {
  count: 5,
  timeZone: 'Europe/Istanbul',
  startDate: new Date('2026-10-22T08:00:00Z'),
});

for (const tarih of calismaZamanlari) {
  console.log(formatZonedDate(tarih, 'Europe/Istanbul'));
}
```

## Yaz/Kış Saati (DST) Politikası

Yaz ve kış saati geçişleri yerel saatlerde çakışmalara veya eksik saatlere yol açabilir. `cron-explain` şu politikayı uygular:

1. **İleri Saat Geçişi (Boşluk / Gap)**:
   Saatler bir saat ileri alındığında (örneğin 02:00'den doğrudan 03:00'e), 02:00 - 02:59 arasındaki yerel saatler fiziksel olarak mevcut değildir.
   - `dstPolicy: 'shift'` (varsayılan): Görevin çalışması bir sonraki geçerli yerel saatin başlangıcına (03:00:00) kaydırılır. Böylece günlük yedekleme veya rapor görevleri atlanmaz.
   - `dstPolicy: 'skip'`: Olmayan yerel saatteki çalışma atlanır ve bir sonraki zaman aralığına geçilir.

2. **Geri Saat Geçişi (Çakışma / Overlap)**:
   Saatler bir saat geri alındığında (örneğin 02:00'den tekrar 01:00'e), 01:00 - 01:59 aralığı iki kez yaşanır.
   - `cron-explain` görevi ilk gerçekleşmede (Yaz saati / Daylight Time) bir kez çalıştırır; tekrarlanan saatte ikinci kez çalıştırmayarak mükerrer tetiklemeyi önler.

## Quartz Özel Karakter Tablosu

| Sözdizimi | Alan | Açıklama | Örnek |
| :--- | :--- | :--- | :--- |
| `?` | Ayın Günü, Haftanın Günü | Belirli bir değer yok (alanı yok say) | `0 0 12 ? * WED` |
| `L` | Ayın Günü | Ayın son günü | `0 0 L * ?` |
| `LW` | Ayın Günü | Ayın son iş günü (Pazartesi-Cuma) | `0 0 LW * ?` |
| `L-<n>` | Ayın Günü | Ayın bitiminden `n` gün önce | `0 0 L-3 * ?` |
| `<n>W` | Ayın Günü | `n`. güne en yakın iş günü | `0 0 15W * ?` |
| `<d>L` | Haftanın Günü | Ayın son `d` günü | `0 0 ? * 6L` (son Cuma) |
| `<d>#<k>` | Haftanın Günü | Ayın `k`. `d` günü | `0 0 ? * 2#3` (3. Pazartesi) |

## Lisans

MIT - Copyright (c) 2026 Yusuf Berat Zengin. Ayrıntılar için [LICENSE](https://github.com/YusufBeratZengin/cron-explain/blob/main/LICENSE) dosyasına bakabilirsiniz.

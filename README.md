# cron-explain

Parse, validate, and explain cron expressions in plain English and Turkish, with next run time calculation and time zone support. Built for Node.js >=20 with ECMAScript modules (ESM) and zero runtime dependencies.

## Features

- Supports 5-field (Unix standard), 6-field (with seconds or year), and 7-field (full Quartz syntax) cron expressions.
- Supports Quartz special characters: `?`, `L`, `LW`, `L-<offset>`, `<day>W`, `<day>L`, and `<day>#<nth>`.
- Supports standard aliases (`@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, `@reboot`).
- Natural language explanations in English and Turkish loaded from locale files (`locales/en.json`, `locales/tr.json`).
- Turkish grammatical correctness: proper consonant assimilation and vowel harmony for ordinal (`1'inci`, `2'nci`, `6'ncı`) and locative case suffixes (`saat 14:00'te`, `09:30'da`, `Ocak'ta`, `Eylül'de`).
- Next N run times calculated using standard ECMAScript `Intl` time zones without external timezone databases.
- Predictable Daylight Saving Time (DST) policy for spring-forward gaps and fall-back overlaps.
- Leap year awareness (e.g. `0 0 29 2 *` only schedules on February 29 in leap years).
- Descriptive validation errors with exact ASCII position markers and character pointers.
- Unified programmatic API and command-line interface (`cron-explain`).
- Zero runtime dependencies.

## Installation

```bash
npm install cron-explain
```

Or run directly via `npx`:

```bash
npx cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
```

## CLI Usage

The package provides a binary named `cron-explain`.

```
Usage:
  cron-explain "<expression>" [options]

Arguments:
  <expression>          Cron expression (5, 6, 7 fields or alias)

Options:
  --next <n>            Number of next run times to calculate (default: 5)
  --tz <timeZone>       IANA time zone (default: system time zone or UTC)
  --lang <en|tr>        Output language for explanations (default: en)
  --start <isoDate>     Reference start date/time (default: now)
  --dst <shift|skip>    DST spring-forward gap handling (default: shift)
  --format <text|json>  Output format (default: text)
  -v, --version         Show version number
  -h, --help            Show help message
```

### Examples

#### Turkish Output with Next Run Times
```bash
cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
```
Output:
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

#### English Output
```bash
cron-explain "0 12 1 * *" --next 3 --tz America/New_York --lang en
```
Output:
```
Expression: 0 12 1 * *
Explanation: At 12:00, on day 1 of the month
Time Zone: America/New_York

Next 3 run times:
1. 2026-11-01 12:00:00 (-05:00)
2. 2026-12-01 12:00:00 (-05:00)
3. 2027-01-01 12:00:00 (-05:00)
```

#### JSON Output
```bash
cron-explain "0 0 1 1 *" --format json
```
Output:
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

#### Position Marker on Validation Error
```bash
cron-explain "*/15 25 * * *"
```
Output:
```
Invalid cron expression:
  */15 25 * * *
       ^^
Hour '25' is out of range (0-23).
```

## Programmatic API

```javascript
import {
  parseCron,
  validateCron,
  explainCron,
  getNextRunTimes,
  formatZonedDate,
} from 'cron-explain';

// 1. Validation
const validation = validateCron('*/15 9-17 * * 1-5');
if (!validation.valid) {
  console.error(validation.visualMarker);
}

// 2. Explanation
const explanationEn = explainCron('*/15 9-17 * * 1-5', { lang: 'en' });
// "Every 15 minutes, between 09:00 and 17:59, Monday through Friday"

const explanationTr = explainCron('*/15 9-17 * * 1-5', { lang: 'tr' });
// "Pazartesi ile Cuma arasında, 09:00 - 17:59 saatleri arasında her 15 dakikada bir"

// 3. Next Run Times
const runs = getNextRunTimes('*/15 9-17 * * 1-5', {
  count: 5,
  timeZone: 'Europe/Istanbul',
  startDate: new Date('2026-10-22T08:00:00Z'),
});

for (const date of runs) {
  console.log(formatZonedDate(date, 'Europe/Istanbul'));
}
```

## Daylight Saving Time (DST) Policy

Daylight Saving Time transitions can create wall-clock ambiguities. `cron-explain` implements a deterministic policy without external timezone libraries:

1. **Spring Forward (Gap)**:
   When clocks jump forward (e.g. from 02:00:00 directly to 03:00:00 in North America), local times between 02:00:00 and 02:59:59 do not exist on the clock.
   - `dstPolicy: 'shift'` (default): Shifts execution to the start of the next valid local hour (03:00:00 local time). This guarantees that daily scheduled jobs (e.g. database backups or report generators) are not missed.
   - `dstPolicy: 'skip'`: Skips the missing wall-clock iteration and advances to the next scheduled interval.

2. **Fall Back (Overlap)**:
   When clocks fall back (e.g. from 02:00:00 back to 01:00:00), the local hour between 01:00:00 and 01:59:59 occurs twice.
   - `cron-explain` executes once on the first occurrence (Daylight Time) and suppresses duplicate execution during the repeated hour in Standard Time.

## Quartz Special Syntax Support

| Syntax | Field | Description | Example |
| :--- | :--- | :--- | :--- |
| `?` | DOM, DOW | No specific value (disregards field) | `0 0 12 ? * WED` |
| `L` | DOM | Last day of the month | `0 0 L * ?` |
| `LW` | DOM | Last weekday (Mon-Fri) of the month | `0 0 LW * ?` |
| `L-<n>` | DOM | `n` days before the end of the month | `0 0 L-3 * ?` |
| `<n>W` | DOM | Nearest weekday to day `n` | `0 0 15W * ?` |
| `<d>L` | DOW | Last day of week `d` in the month | `0 0 ? * 6L` (last Friday) |
| `<d>#<k>` | DOW | `k`-th occurrence of day `d` in the month | `0 0 ? * 2#3` (3rd Monday) |

## Turkish Grammar Helpers

The Turkish explanation engine relies on standalone phonetic helper functions exported from the package:

- `turkishOrdinal(n, style)`: Formats numbers with correct vowel harmony and consonant stems (`1'inci`, `2'nci`, `3'üncü`, `4'üncü`, `6'ncı`, `20'nci`, `40'ıncı`, etc.) or dot style (`1.`, `2.`).
- `turkishLocative(wordOrTime)`: Generates locative case suffixes (`-de`, `-da`, `-te`, `-ta`) according to vowel harmony and consonant assimilation rules (Fıstıkçı Şahap). Handles clock hours (`14:00'te`, `09:30'da`, `00:00'da`), months (`Ocak'ta`, `Eylül'de`), and generic words.
- `turkishStepSuffix(unit)`: Produces idiomatic interval phrases (`dakikada bir`, `saatte bir`, `günde bir`).

## Development

Run tests:
```bash
npm test
```

Run syntax validation:
```bash
npm run lint
```

## License

MIT - Copyright (c) 2026 Yusuf Berat Zengin. See [LICENSE](https://github.com/YusufBeratZengin/cron-explain/blob/main/LICENSE) for details.

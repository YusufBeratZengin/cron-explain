# cron-explain
[![CI](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml/badge.svg)](https://github.com/YusufBeratZengin/cron-explain/actions/workflows/ci.yml) [![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![npm](https://img.shields.io/npm/v/cron-explain)](https://www.npmjs.com/package/cron-explain) ![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-green.svg) ![Dependencies: 0](https://img.shields.io/badge/dependencies-0-blue.svg)
English | [Türkçe](README.tr.md)

Parse, validate, and explain cron expressions in English or Turkish, and list future runs in an IANA time zone.
Runs offline on Node.js >=20 with ESM and zero dependencies.
Install: `npm install cron-explain` (CLI: `npm install --global cron-explain`).

## Demo

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

The start date is fixed so you can reproduce the output. Use `--lang tr` for Turkish:

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

## Install

Use the install command above for the library, or the global install for the CLI.
To try the checkout without installing, replace `cron-explain` with `node bin/cron-explain.js` in the examples.

## Usage

Supports 5 fields (minute, hour, day of month, month, day of week), 6 fields
(with seconds, or a trailing four-digit year/range), and 7 fields (seconds through year).
Quartz syntax includes `?`, `L`, `LW`, `L-n`, `nW`, `dL`, and `d#n`.
Aliases: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@midnight`, `@hourly`, `@reboot`.

### Library API

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

`getNextRunTimes` returns `Date[]`; the start is exclusive. `parseCron` throws
`CronValidationError` for invalid input; `validateCron` returns a validation result.
Time zone utilities and Turkish grammar helpers are also exported; see [src/index.js](src/index.js).

### JSON output

<!-- check-readme -->
```console
$ cron-explain "0 0 1 1 *" --next 1 --tz UTC --lang en --format json --start 2026-10-22T00:00:00Z
{
  "expression": "0 0 1 1 *",
  "explanation": "At 00:00, on day 1 of the month, in January",
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

## Examples

[examples/basic.mjs](examples/basic.mjs) validates, explains, and calculates future runs:

<!-- check-readme -->
```console
$ node examples/basic.mjs
Valid: true
Every 15 minutes, between 09:00 and 17:59, on Monday through Friday
Hafta içi her gün 09:00 ile 17:59 arasında her 15 dakikada bir
2026-10-22T09:00:00.000Z
2026-10-22T09:15:00.000Z
```

[examples/quartz.mjs](examples/quartz.mjs) demonstrates the three special schedules below:

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

### Quartz examples

Quartz uses 1=Sunday through 7=Saturday. A fifth occurrence skips months that do not have one.

<!-- check-readme -->
```console
$ cron-explain "0 0 12 ? * 2#3" --next 2 --tz UTC --lang en --start 2026-10-22T00:00:00Z
Expression: 0 0 12 ? * 2#3
Explanation: At 12:00, on the 3rd Monday of the month
Time Zone: UTC

Next 2 run times:
1. 2026-11-16 12:00:00 (+00:00)
2. 2026-12-21 12:00:00 (+00:00)
```

<!-- check-readme -->
```console
$ cron-explain "0 0 L * ?" --next 2 --tz UTC --lang en --start 2026-10-22T00:00:00Z
Expression: 0 0 L * ?
Explanation: At 00:00, on the last day of the month
Time Zone: UTC

Next 2 run times:
1. 2026-10-31 00:00:00 (+00:00)
2. 2026-11-30 00:00:00 (+00:00)
```

<!-- check-readme -->
```console
$ cron-explain "0 15 10 ? * 6L" --next 2 --tz UTC --lang en --start 2026-10-22T00:00:00Z
Expression: 0 15 10 ? * 6L
Explanation: At 10:15, on the last Friday of the month
Time Zone: UTC

Next 2 run times:
1. 2026-10-30 10:15:00 (+00:00)
2. 2026-11-27 10:15:00 (+00:00)
```

## Configuration

| Option | Meaning | Default |
| --- | --- | --- |
| `--next <n>` | Integer from 0 to 1000; larger counts are rejected | 5 |
| `--tz <zone>`, `--timezone <zone>` | IANA time zone | System zone or UTC |
| `--lang <en\|tr>` | Explanation language | en |
| `--start <date>` | Reference date; use ISO 8601 with an offset | Now |
| `--dst <shift\|skip>` | Spring gap policy | shift |
| `--format <text\|json>` | Output format | text |
| `-h`, `--help` | Help | |
| `-v`, `--version` | Version | |

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Valid expression, including expressions with no future matching date |
| 1 | Invalid expression or CLI usage error |

Expressions such as `0 0 31 2 *`, `0 0 30 2 *`, `0 0 31 4,6,9,11 *`,
and a past Quartz year (`0 0 0 1 1 ? 2020`) produce
`Warning: This expression never matches any date` on stderr, an empty run list,
and `"neverMatches": true` in JSON. Exit code stays **0**.
Here “never matches” means no future date after `--start` through the supported
year 2099; it does not claim that a past-year schedule never ran.
The check still runs with `--next 0`. `@reboot` has no scheduled dates and is
not marked as never matching. JSON always includes the boolean `neverMatches`.

## How it works

The parser expands field values and validates ranges. The scheduler iterates years,
months, matching days, and allowed times, rather than scanning every minute.
Distant years and leap days use the same path.
English weekday phrases use “on”; six-day sets use “every day except Saturday”
(or the corresponding missing day). Turkish uses “Hafta içi her gün” for exactly Monday–Friday.

For Unix expressions with both day of month and day of week restricted, either
matching field is sufficient (OR). Quartz `?` leaves that field unspecified.

### DST policy

Rules come from Node's `Intl` data. For a missing local time during spring-forward,
`shift` moves the run to the next valid hour boundary; `skip` omits it.
During fall-back, an ambiguous local time runs once at its first occurrence under
either policy. In New York, the repeated hour is 01:00–01:59; 02:30 occurs once after the change.

## Limitations and privacy

Explicit years are 1970–2099; future searches stop at 2099 and can return fewer
dates than requested. `@reboot` can be explained but has no next dates.
This package calculates schedules; it does not execute jobs.
Processing is local and makes no network calls. Time zone accuracy depends on
the time zone data bundled with your Node.js runtime.

## Development

In a local checkout, run:

```bash
npm ci
npm run lint
npm test
npm pack --dry-run
```

Lint checks JavaScript syntax/style and executes the marked README examples with
fixed starts, comparing stdout and exit status. CI runs the checks and both offline
examples on Windows and Linux with Node 20, 22, and 24.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, commit style, and trusted
publishing setup. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
Report vulnerabilities using [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) — Copyright (c) 2026 Yusuf Berat Zengin.

#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import {
  parseCron,
  explainCron,
  getNextRunTimes,
  formatZonedDate,
  isValidTimeZone,
  CronValidationError,
} from '../src/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

function printHelp() {
  console.log(`cron-explain v${pkg.version}
Parse, validate and explain cron expressions in plain language, and list next run times.

Usage:
  cron-explain "<expression>" [options]

Arguments:
  <expression>          Cron expression (5, 6, 7 fields or alias like @daily, @hourly, @reboot)

Options:
  --next <n>            Number of next run times to calculate (default: 5)
  --tz <timeZone>       IANA time zone (default: system time zone or UTC)
  --lang <en|tr>        Output language for explanations (default: en)
  --start <isoDate>     Reference start date/time (default: now)
  --dst <shift|skip>    DST spring-forward gap handling (default: shift)
  --format <text|json>  Output format (default: text)
  -v, --version         Show version number
  -h, --help            Show this help message

Examples:
  cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
  cron-explain "0 0 1 1 *" --lang en
  cron-explain "0 0 12 ? * WED" --format json
  cron-explain "@hourly" --next 3
`);
}

function parseCliArgs(args) {
  const options = {
    expressionParts: [],
    next: 5,
    tz: null,
    lang: 'en',
    start: null,
    dst: 'shift',
    format: 'text',
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--next') {
      options.next = parseInt(args[++i], 10);
    } else if (arg.startsWith('--next=')) {
      options.next = parseInt(arg.slice(7), 10);
    } else if (arg === '--tz' || arg === '--timezone') {
      options.tz = args[++i];
    } else if (arg.startsWith('--tz=')) {
      options.tz = arg.slice(5);
    } else if (arg === '--lang') {
      options.lang = args[++i];
    } else if (arg.startsWith('--lang=')) {
      options.lang = arg.slice(7);
    } else if (arg === '--start') {
      options.start = args[++i];
    } else if (arg.startsWith('--start=')) {
      options.start = arg.slice(8);
    } else if (arg === '--dst') {
      options.dst = args[++i];
    } else if (arg.startsWith('--dst=')) {
      options.dst = arg.slice(6);
    } else if (arg === '--format') {
      options.format = args[++i];
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice(9);
    } else if (!arg.startsWith('-')) {
      options.expressionParts.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  if (options.expressionParts.length === 0) {
    console.error('Error: No cron expression provided.\n');
    printHelp();
    process.exit(1);
  }

  const rawExpression = options.expressionParts.join(' ').trim();
  const lang = (options.lang || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';

  let tz = options.tz;
  if (!tz) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      tz = 'UTC';
    }
  }

  if (!isValidTimeZone(tz)) {
    console.error(`Error: Invalid IANA time zone '${tz}'.`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = parseCron(rawExpression);
  } catch (err) {
    if (err instanceof CronValidationError) {
      console.error(err.formatVisualMarker());
    } else {
      console.error(`Validation error: ${err.message}`);
    }
    process.exit(1);
  }

  const explanation = explainCron(parsed, { lang });

  let nextRuns = [];
  if (!parsed.isReboot && options.next > 0) {
    try {
      nextRuns = getNextRunTimes(parsed, {
        count: options.next,
        timeZone: tz,
        startDate: options.start ? new Date(options.start) : new Date(),
        dstPolicy: options.dst,
      });
    } catch (err) {
      console.error(`Calculation error: ${err.message}`);
      process.exit(1);
    }
  }

  if (options.format === 'json') {
    const jsonOutput = {
      expression: rawExpression,
      explanation,
      timeZone: tz,
      isReboot: parsed.isReboot,
      nextRuns: nextRuns.map((d) => ({
        utc: d.toISOString(),
        formatted: formatZonedDate(d, tz),
      })),
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(0);
  }

  // Text output
  if (lang === 'tr') {
    console.log(`İfade: ${rawExpression}`);
    console.log(`Açıklama: ${explanation}`);
    console.log(`Zaman Dilimi: ${tz}`);

    if (parsed.isReboot) {
      console.log('\nYalnızca sistem yeniden başlatıldığında çalışır (zamanlanmış çalışma zamanı yok).');
    } else if (options.next > 0) {
      console.log(`\nSonraki ${nextRuns.length} Çalışma Zamanı:`);
      nextRuns.forEach((date, idx) => {
        console.log(`${idx + 1}. ${formatZonedDate(date, tz)}`);
      });
    }
  } else {
    console.log(`Expression: ${rawExpression}`);
    console.log(`Explanation: ${explanation}`);
    console.log(`Time Zone: ${tz}`);

    if (parsed.isReboot) {
      console.log('\nRuns only on system reboot (no scheduled run times).');
    } else if (options.next > 0) {
      console.log(`\nNext ${nextRuns.length} run times:`);
      nextRuns.forEach((date, idx) => {
        console.log(`${idx + 1}. ${formatZonedDate(date, tz)}`);
      });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

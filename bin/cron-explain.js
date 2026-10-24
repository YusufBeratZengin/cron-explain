#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import {
  parseCron,
  explainCron,
  getNextRunTimes,
  formatZonedDate,
  isValidTimeZone,
  compareSchedules,
  getCalendar,
  renderCalendar,
  CronValidationError,
} from '../src/index.js';
import { getLocale, resolveLanguage, SUPPORTED_LANGUAGES } from '../src/locales/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

function printHelp() {
  console.log(`cron-explain v${pkg.version}
Parse, validate and explain cron expressions in plain language, and list next run times.

Usage:
  cron-explain "<expression>" [options]
  cron-explain diff "<expression A>" "<expression B>" [options]

Arguments:
  <expression>          Cron expression (5, 6, 7 fields, alias like @daily, @hourly, @reboot,
                        or AWS EventBridge cron(m h dom mon dow year))
  diff                  Compare the next distinct run times (A only, B only, or both)

Options:
  --next <n>            Number of next run times to calculate (0-1000, default: 5)
  --tz <timeZone>       IANA time zone (default: system time zone or UTC)
  --lang <en|tr|de|es>  Output language for explanations (default: en)
  --start <isoDate>     Reference start date/time (default: now)
  --dst <shift|skip>    DST spring-forward gap handling (default: shift)
  --format <text|json>  Output format (default: text)
  --type <dialect>      auto, unix, quartz, or eventbridge (default: auto)
  --calendar            Show the next --next N runs in monthly terminal calendars
  --days <n>            Optional look-ahead window for diff (1-3650 days)
  -v, --version         Show version number
  -h, --help            Show this help message

Examples:
  cron-explain "*/15 9-17 * * 1-5" --next 5 --tz Europe/Istanbul --lang tr
  cron-explain "0 0 1 1 *" --lang en
  cron-explain "0 0 12 ? * WED" --format json
  cron-explain "@hourly" --next 3
  cron-explain "cron(0 12 * * ? *)" --lang de
  cron-explain "*/15 * * * *" --calendar --tz UTC
  cron-explain diff "0 9-17 * * 1-5" "*/30 * * * *" --days 7
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
    calendar: false,
    days: undefined,
    type: 'auto',
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const valueOptions = ['--next', '--tz', '--timezone', '--lang', '--start', '--dst', '--format', '--days', '--type'];
    if (valueOptions.includes(arg) && (args[i + 1] === undefined || args[i + 1].startsWith('--'))) {
      throw new Error(`Missing value for ${arg}.`);
    }

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--calendar') {
      options.calendar = true;
    } else if (arg === '--days') {
      options.days = args[++i];
    } else if (arg.startsWith('--days=')) {
      options.days = arg.slice(7);
    } else if (arg === '--type') {
      options.type = args[++i];
    } else if (arg.startsWith('--type=')) {
      options.type = arg.slice(7);
    } else if (arg === '--next') {
      options.next = args[++i];
    } else if (arg.startsWith('--next=')) {
      options.next = arg.slice(7);
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
      throw new Error(`Unknown option: ${arg}`);
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

  if (!/^\d+$/.test(String(options.next)) || !Number.isSafeInteger(Number(options.next)) || Number(options.next) > 1000) {
    throw new Error('--next must be an integer between 0 and 1000.');
  }
  options.next = Number(options.next);
  if (!SUPPORTED_LANGUAGES.includes(options.lang)) {
    throw new Error(`--lang must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`);
  }
  if (options.days !== undefined && (!/^\d+$/.test(String(options.days)) || Number(options.days) < 1 || Number(options.days) > 3650)) {
    throw new Error('--days must be an integer between 1 and 3650.');
  }
  if (options.days !== undefined) options.days = Number(options.days);
  if (!['auto', 'unix', 'quartz', 'eventbridge'].includes(options.type)) {
    throw new Error('--type must be auto, unix, quartz, or eventbridge.');
  }
  if (!['shift', 'skip'].includes(options.dst)) throw new Error('--dst must be shift or skip.');
  if (!['text', 'json'].includes(options.format)) throw new Error('--format must be text or json.');
  if (options.start !== null && !Number.isFinite(new Date(options.start).getTime())) {
    throw new Error('--start must be a valid date.');
  }

  const isDiff = options.expressionParts[0] === 'diff';
  if (options.expressionParts.length === 0) {
    console.error('Error: No cron expression provided.\n');
    printHelp();
    process.exit(1);
  }
  if (isDiff && options.expressionParts.length !== 3) {
    throw new Error('diff needs exactly two quoted expressions: cron-explain diff "<a>" "<b>".');
  }
  if (isDiff && options.calendar) throw new Error('--calendar cannot be combined with diff.');
  if (!isDiff && options.days !== undefined) throw new Error('--days is only supported with diff.');

  const lang = resolveLanguage(options.lang);
  const labels = getLocale(lang).cli;
  const fill = (template, vars) =>
    template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name]));

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

  const parseOrExit = (text) => {
    try {
      return parseCron(text, { type: options.type });
    } catch (err) {
      if (err instanceof CronValidationError) {
        console.error(err.formatVisualMarker());
      } else {
        console.error(`Validation error: ${err.message}`);
      }
      process.exit(1);
    }
  };

  const startDate = options.start ? new Date(options.start) : new Date();

  if (isDiff) {
    runDiff({ options, lang, labels, fill, tz, startDate, parseOrExit });
    return;
  }

  const rawExpression = options.expressionParts.join(' ').trim();
  const parsed = parseOrExit(rawExpression);
  const explanation = explainCron(parsed, { lang });

  let nextRuns = [];
  let neverMatches = false;
  if (!parsed.isReboot) {
    try {
      nextRuns = getNextRunTimes(parsed, {
        count: Math.max(1, options.next),
        timeZone: tz,
        startDate,
        dstPolicy: options.dst,
      });
      neverMatches = nextRuns.length === 0;
      if (options.next === 0) nextRuns = [];
    } catch (err) {
      console.error(`Calculation error: ${err.message}`);
      process.exit(1);
    }
  }

  if (neverMatches) console.error('Warning: This expression never matches any date');

  const calendar = options.calendar
    ? getCalendar(parsed, { startDate, timeZone: tz, dstPolicy: options.dst, count: options.next })
    : null;

  if (options.format === 'json') {
    const jsonOutput = {
      expression: rawExpression,
      explanation,
      timeZone: tz,
      isReboot: parsed.isReboot,
      neverMatches,
      nextRuns: nextRuns.map((d) => ({
        utc: d.toISOString(),
        formatted: formatZonedDate(d, tz),
      })),
    };
    if (calendar) jsonOutput.calendar = calendar.days.map(({ date, runs }) => ({ date, runs }));
    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(0);
  }

  console.log(`${labels.expression}: ${rawExpression}`);
  console.log(`${labels.explanation}: ${explanation}`);
  console.log(`${labels.timeZone}: ${tz}`);

  if (parsed.isReboot) {
    console.log(`\n${labels.reboot}`);
  } else if (options.next > 0 && !calendar) {
    console.log(`\n${fill(labels.nextRuns, { count: nextRuns.length })}`);
    nextRuns.forEach((date, idx) => {
      console.log(`${idx + 1}. ${formatZonedDate(date, tz)}`);
    });
  }

  if (calendar) {
    console.log(`\n${fill(labels.calendar, { timeZone: tz, count: nextRuns.length })}`);
    console.log(renderCalendar(calendar, { weekdays: labels.weekdaysShort }) || labels.noRuns);
    console.log(labels.calendarLegend);
  }
}

function runDiff({ options, lang, labels, fill, tz, startDate, parseOrExit }) {
  const [, rawA, rawB] = options.expressionParts.map((part) => part.trim());
  const parsedA = parseOrExit(rawA);
  const parsedB = parseOrExit(rawB);
  const result = compareSchedules(parsedA, parsedB, {
    startDate,
    timeZone: tz,
    dstPolicy: options.dst,
    days: options.days,
    count: options.next,
  });

  if (options.format === 'json') {
    console.log(
      JSON.stringify(
        {
          a: { expression: rawA, explanation: explainCron(parsedA, { lang }) },
          b: { expression: rawB, explanation: explainCron(parsedB, { lang }) },
          timeZone: tz,
          days: options.days ?? null,
          windowStart: startDate.toISOString(),
          windowEnd: result.windowEnd?.toISOString() ?? null,
          runs: result.runs.map(({ date, source }) => ({
            source, utc: date.toISOString(), formatted: formatZonedDate(date, tz),
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`${labels.expressionA}: ${rawA}`);
  console.log(`${labels.explanationA}: ${explainCron(parsedA, { lang })}`);
  console.log(`${labels.expressionB}: ${rawB}`);
  console.log(`${labels.explanationB}: ${explainCron(parsedB, { lang })}`);
  console.log(`${labels.timeZone}: ${tz}`);
  if (options.days !== undefined) {
    console.log(`${labels.window}: ${fill(labels.windowDays, {
      days: options.days, start: startDate.toISOString(),
    })}`);
  }
  console.log(`\n${fill(labels.nextRuns, { count: result.runs.length })}`);
  if (result.runs.length === 0) console.log(labels.noRuns);
  const sources = { a: labels.onlyA, b: labels.onlyB, both: labels.both };
  result.runs.forEach(({ date, source }, idx) => {
    console.log(`${idx + 1}. [${sources[source]}] ${formatZonedDate(date, tz)}`);
  });
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

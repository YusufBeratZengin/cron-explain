import { validateCron, explainCron, getNextRunTimes } from '../src/index.js';

const expression = '*/15 9-17 * * 1-5';
console.log(`Valid: ${validateCron(expression).valid}`);
console.log(explainCron(expression));
console.log(explainCron(expression, { lang: 'tr' }));
for (const date of getNextRunTimes(expression, {
  startDate: '2026-10-22T08:00:00Z', timeZone: 'UTC', count: 2,
})) {
  console.log(date.toISOString());
}

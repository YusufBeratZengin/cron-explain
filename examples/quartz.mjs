import { explainCron, getNextRunTimes } from '../src/index.js';

for (const expression of ['0 0 12 ? * 2#3', '0 0 L * ?', '0 15 10 ? * 6L']) {
  console.log(`${expression}: ${explainCron(expression)}`);
  const [next] = getNextRunTimes(expression, {
    startDate: '2026-10-22T00:00:00Z', timeZone: 'UTC', count: 1,
  });
  console.log(next.toISOString());
}

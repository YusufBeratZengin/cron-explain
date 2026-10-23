import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Feed real CLI stdout through stdin: npm run demo. No terminal emulator or
// image service is needed. The README is the source of the displayed command.
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const match = /<!-- demo-command -->\r?\n<!-- check-readme -->\r?\n```console\r?\n\$ ([^\r\n]+)\r?\n([\s\S]*?)\r?\n```/.exec(readme);
assert.ok(match, 'README.md must contain a marked demo command and output');
const [, command, expected] = match;
const output = readFileSync(0, 'utf8').replace(/\r\n/g, '\n').trimEnd();
assert.equal(output, expected.replace(/\r\n/g, '\n').trimEnd(),
  'CLI output differs from the README demo; update the documented output first');

const lines = [`$ ${command}`, '', ...output.split('\n')];
assert.ok(lines.length >= 15 && lines.length <= 25, 'Keep the demo between 15 and 25 lines');
const escape = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]);
const width = Math.max(960, Math.ceil(Math.max(...lines.map((line) => line.length)) * 8.5 + 64));
const height = 96 + lines.length * 24;
const text = lines.map((line, index) =>
  `    <text x="32" y="${86 + index * 24}" fill="${index === 0 ? '#7ee787' : '#e6edf3'}">${escape(line)}</text>`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">cron-explain terminal demo</title>
  <desc id="desc">A real CLI command explains a weekday schedule in English and lists ten future runs in UTC from a fixed start date. The full transcript is available in the README.</desc>
  <rect width="${width}" height="${height}" rx="16" fill="#0d1117"/>
  <path d="M16 0H${width - 16}Q${width} 0 ${width} 16V48H0V16Q0 0 16 0" fill="#161b22"/>
  <circle cx="28" cy="24" r="6" fill="#ff5f57"/>
  <circle cx="48" cy="24" r="6" fill="#febc2e"/>
  <circle cx="68" cy="24" r="6" fill="#28c840"/>
  <g font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="14" xml:space="preserve">
    <text x="${width / 2}" y="29" text-anchor="middle" fill="#8b949e">cron-explain · UTC · en</text>
${text}
  </g>
</svg>
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/demo.svg', import.meta.url), svg);
console.log(`Generated docs/demo.svg from ${output.split('\n').length} real CLI output lines.`);

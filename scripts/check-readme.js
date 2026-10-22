import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const normalize = (text) => text.replace(/\r\n/g, '\n').trimEnd();
let checked = 0;

function run(args) {
  return execFileSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

try {
  for (const name of ['README.md', 'README.tr.md']) {
    const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const blocks = [...source.matchAll(/<!-- check-readme -->\n```console\n\$ ([^\n]+)\n([\s\S]*?)\n```/g)];
    assert.ok(blocks.length > 0, `${name}: missing executable examples`);
    assert.equal(blocks.length, [...source.matchAll(/^```console$/gm)].length,
      `${name}: every console output block must be marked for checking`);

    for (const [, command, expected] of blocks) {
      // Tokenize the documented double-quoted arguments without invoking a shell.
      const tokens = command.match(/"(?:[^"\\]|\\.)*"|[^\s"]+/g).map((token) =>
        token.startsWith('"') ? JSON.parse(token) : token);
      const executable = tokens.shift();
      let args;
      if (executable === 'cron-explain') {
        assert.ok(tokens.includes('--start') && tokens.includes('--tz'),
          `${name}: CLI examples need fixed --start and --tz: ${command}`);
        args = ['bin/cron-explain.js', ...tokens];
      } else {
        assert.equal(executable, 'node', `${name}: unsupported example command`);
        assert.ok(tokens.length === 1 && ['examples/basic.mjs', 'examples/quartz.mjs'].includes(tokens[0]),
          `${name}: unsupported example script`);
        args = tokens;
      }
      assert.equal(normalize(run(args)), normalize(expected), `${name}: output differs for ${command}`);
      checked++;
    }

    // The API snippets use package self-reference and run offline in the checkout.
    for (const [, snippet] of source.matchAll(/```js\n([\s\S]*?)\n```/g)) {
      assert.equal(normalize(run(['--input-type=module', '--eval', snippet])), '',
        `${name}: API example should complete without printing`);
      checked++;
    }
  }
  console.log(`README checks passed for ${checked} command/API examples.`);
} catch (err) {
  console.error(`README check failed: ${err.message}`);
  process.exitCode = 1;
}

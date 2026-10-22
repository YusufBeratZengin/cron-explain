import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function getFiles(dir) {
  const files = [];
  try {
    for (const item of readdirSync(dir)) {
      const full = join(dir, item);
      if (statSync(full).isDirectory()) {
        files.push(...getFiles(full));
      } else if (/\.m?js$/.test(full)) {
        files.push(full);
      }
    }
  } catch {
    // dir doesn't exist
  }
  return files;
}

const targets = ['bin', 'src', 'test', 'scripts', 'examples'];
const allFiles = targets.flatMap((t) => getFiles(t));

for (const file of allFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  const source = readFileSync(file, 'utf8');
  // Small dependency-free style checks complement Node's syntax validation.
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (/\t|[ \t]+$/.test(line) || /^\s*(var\s|debugger\b)/.test(line)) {
      throw new Error(`${file}:${index + 1}: avoid tabs, trailing whitespace, var and debugger statements`);
    }
  }
}

console.log(`Syntax and style checks passed for ${allFiles.length} JavaScript files.`);

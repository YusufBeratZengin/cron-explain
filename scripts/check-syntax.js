import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function getFiles(dir) {
  const files = [];
  try {
    for (const item of readdirSync(dir)) {
      const full = join(dir, item);
      if (statSync(full).isDirectory()) {
        files.push(...getFiles(full));
      } else if (full.endsWith('.js')) {
        files.push(full);
      }
    }
  } catch {
    // dir doesn't exist
  }
  return files;
}

const targets = ['bin', 'src', 'test', 'scripts'];
const allFiles = targets.flatMap((t) => getFiles(t));

for (const file of allFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Syntax check passed for ${allFiles.length} JavaScript files.`);

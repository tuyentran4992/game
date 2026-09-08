// TB-03: verify every manifest entry exists and sha256 matches. Prints PASS/FAIL rows.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// manifest lives at M9-DeepCast/assets/manifest.json (one level above game/)
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(root, 'assets', 'manifest.json'), 'utf8'));

let ok = 0;
let fail = 0;
let totalBytes = 0;
const problems: string[] = [];

for (const [id, entry] of Object.entries(manifest.files as Record<string, { file: string; sha: string; bytes: number }>)) {
  // manifest paths ("assets/x.png") are nominal; the runtime copy lives in game/public/assets/
  const path = join(root, 'game', 'public', 'assets', `${id}.png`);
  if (!existsSync(path)) {
    fail++;
    problems.push(`MISSING: ${id} -> ${entry.file}`);
    continue;
  }
  const buf = readFileSync(path);
  const sha = createHash('sha256').update(buf).digest('hex').slice(0, 12);
  totalBytes += buf.length;
  if (sha !== entry.sha) {
    fail++;
    problems.push(`SHA MISMATCH: ${id} manifest=${entry.sha} actual=${sha}`);
  } else {
    ok++;
  }
}

console.log(`manifest check: ${ok} OK / ${fail} FAIL / ${Object.keys(manifest.files).length} entries`);
console.log(`total bytes: ${totalBytes} (${(totalBytes / 1024 / 1024).toFixed(2)} MB) < 4MB: ${totalBytes < 4 * 1024 * 1024}`);
for (const p of problems) console.log(p);
process.exit(fail > 0 ? 1 : 0);

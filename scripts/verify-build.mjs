// Post-build sanity check: fail loudly if the build produced a partial or empty
// artifact set, so a broken build never reaches `npm run start` in production.
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const required = ['dist/index.html', 'dist/server.cjs'];
const problems = [];

for (const rel of required) {
  const abs = resolve(process.cwd(), rel);
  try {
    const { size } = statSync(abs);
    if (size === 0) problems.push(`${rel} exists but is empty (0 bytes)`);
    else console.log(`ok  ${rel} (${size} bytes)`);
  } catch {
    problems.push(`${rel} is missing`);
  }
}

if (problems.length) {
  console.error('\nBuild verification FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('Build verification passed.');

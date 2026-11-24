// Fusionne les fichiers partiels de tools/route-check.mjs (--part=…) dans tests/fixtures/routes.json.
// Usage : node tools/route-merge.mjs part1.json part2.json …
import { readFileSync, writeFileSync } from 'node:fs';
import { ROUTES } from './route-check.mjs';

const merged = ROUTES.map((routes) => routes.map(([name]) => ({ name })));
for (const file of process.argv.slice(2)) {
  const part = JSON.parse(readFileSync(file, 'utf8'));
  for (const [li, list] of Object.entries(part)) merged[Number(li)] = list;
}
const out = new URL('../tests/fixtures/routes.json', import.meta.url);
writeFileSync(out, JSON.stringify(merged, null, 1));
const saved = merged.flat().filter((s) => s.script).length;
console.log(`${saved} solutions enregistrées sur ${merged.flat().length} passages → tests/fixtures/routes.json`);

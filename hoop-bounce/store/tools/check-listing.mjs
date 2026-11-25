// Vérifie les longueurs des textes de la fiche Google Play (store/LISTING.md) :
// nom ≤ 30, description courte ≤ 80, description complète ≤ 4 000 caractères, pour chaque langue.
//   node store/tools/check-listing.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'LISTING.md'), 'utf8');
const LIMITS = [30, 80, 4000];
const NAMES = ['nom', 'description courte', 'description complète'];
let ok = true;
for (const part of md.split(/\n## /).slice(1)) {
  const lang = part.split('\n')[0];
  const blocks = [...part.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  if (blocks.length < 3) continue;
  const lens = blocks.slice(0, 3).map((b) => [...b].length);
  const line = lens.map((n, i) => `${NAMES[i]} ${n}/${LIMITS[i]}${n > LIMITS[i] ? ' ❌' : ''}`).join(' · ');
  if (lens.some((n, i) => n > LIMITS[i])) ok = false;
  if (blocks[0] !== 'Hoop Bounce') {
    ok = false;
    console.log(`${lang} : le nom doit rester « Hoop Bounce »`);
  }
  console.log(`${lang} : ${line}`);
}
if (!ok) process.exit(1);
console.log('✅ longueurs conformes à Google Play');

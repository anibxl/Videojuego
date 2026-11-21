// Prépare le dossier `www/` copié dans l'application Android par Capacitor (`npm run android:sync`).
// Seuls les fichiers du jeu y vont : pas de tests, d'outils, de documentation ni de visuels de la fiche.

import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const ENTRIES = ['index.html', 'play.html', 'shop.html', 'worlds.html', 'trickshot.html', 'css', 'src', 'assets'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const e of ENTRIES) {
  const from = join(root, e);
  if (!existsSync(from)) throw new Error(`fichier manquant : ${e}`);
  cpSync(from, join(out, e), { recursive: true, filter: (p) => !p.endsWith('README.md') });
}
console.log(`www/ prêt (${ENTRIES.join(', ')})`);

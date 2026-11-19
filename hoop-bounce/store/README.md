# store/ — tout pour la fiche Google Play (version 1.0.0)

| Fichier / dossier | Contenu |
|---|---|
| `CHECKLIST.md` | ★ Checklist complète avant publication : fiche, contenu, classification, sécurité des données, pays, langues, version, AAB, AdMob, tests |
| `LISTING.md` | Titre, description courte, description complète, points forts, mots-clés (FR, EN, ES) |
| `SCREENSHOTS.md` | Liste des captures, ce que chacune doit montrer, ordre conseillé, vidéo |
| `icon/icon-512.png` | Icône Google Play (512 × 512) ; `icon-1024.png` en grand |
| `feature-graphic/` | Bannière 1024 × 500 en français, anglais et espagnol |
| `screenshots/{fr,en,es}/` | Captures « fiche » 1920 × 1080 (légende + capture) ; `raw/` : captures brutes |
| `privacy-policy.html` | Politique de confidentialité autonome à héberger (FR, EN, ES) |
| `src/` | Sources : `icon.svg` (icône), `feature-graphic.html` (bannière) |
| `tools/render-assets.mjs` | Régénère l'icône, la bannière, les icônes et écrans de démarrage Android |
| `tools/screenshots.mjs` | Régénère les captures dans le vrai jeu (`node store/tools/screenshots.mjs fr`) |

Les deux outils utilisent Playwright (Chromium) : `npx -y playwright@1 install chromium` une fois si besoin.

# store/ — tout pour la publication sur Google Play (version 1.0.0)

| Fichier / dossier | Contenu |
|---|---|
| `PUBLICATION.md` | ★ **À lire en premier** : ce qui est prêt, et les seules actions qui restent dans la Play Console |
| `CHECKLIST.md` | Checklist complète : fiche, contenu de l'application, classification, sécurité des données, version, AAB, tests |
| `LISTING.md` | Nom, description courte, description complète (FR, EN, ES), référencement (ASO), catégorie, tags |
| `BRAND.md` | Identité visuelle officielle : palette, typographie, boutons, cartes, effets, illustrations, icône |
| `SCREENSHOTS.md` | Les 8 captures, leurs titres, l'ordre conseillé, comment les refaire |
| `VIDEO.md` | Storyboard de la vidéo de 25 s |
| `icon/` | Icône Google Play 512 × 512 : `icon-512-winter.png` (saison de Noël), `icon-512.png` (intemporelle) |
| `feature-graphic/` | Bannière 1024 × 500 (FR, EN, ES) : `feature-graphic-winter-*.png` (Noël) et `feature-graphic-*.png` |
| `screenshots/{fr,en,es}/` | Captures « fiche » 1920 × 1080 (titre + capture) ; `raw/` : captures brutes |
| `privacy-policy.html` | Politique de confidentialité autonome à héberger en ligne (FR, EN, ES) |
| `src/` | Sources : `icon.svg`, `icon-winter.svg`, `feature-graphic.html` |
| `tools/render-assets.mjs` | Régénère icônes, bannières, icônes et écrans de démarrage Android |
| `tools/screenshots.mjs` | Régénère les captures dans le vrai jeu (`node store/tools/screenshots.mjs fr`) |
| `tools/make-ghost.mjs` | Enregistre un vrai fantôme (pilote expert) pour la capture du Mode Fantôme |
| `tools/check-listing.mjs` | Vérifie les longueurs des textes de la fiche |

Construction de la version publiée : `node tools/build-release.mjs` → `dist/HoopBounce-1.0.0-release.aab` (Google
Play) et `dist/HoopBounce-1.0.0-release.apk` (même version, pour tester). Les outils graphiques utilisent
Playwright (Chromium).

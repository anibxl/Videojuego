# Consignes du dépôt

Ce dépôt contient deux projets :
- à la racine : RascaManía (jeu web de tickets à gratter, en espagnol) ;
- `hoop-bounce/` : **Hoop Bounce**, jeu de plateforme mobile Android (basket), en français.

## Hoop Bounce — règles permanentes

- **`hoop-bounce/PROJECT.md` est la documentation officielle et la mémoire du projet.** Le lire avant de
  travailler sur Hoop Bounce.
- **Le mettre à jour automatiquement, sans qu'on le demande, après chaque étape importante** (nouvelle
  fonctionnalité, refonte, niveau ou monde, correction notable), en suivant la section « Comment tenir ce
  document à jour » : entrée datée en haut du journal (ajouté / modifié / reste à faire), roadmap
  ✅ 🟡 🔴, liste des tâches, sections touchées, optimisations, bugs connus, en-tête (date, version).
- Le porteur du projet valide chaque étape : construire une étape à la fois, puis attendre ses retours.
- Qualité avant quantité ; le jeu doit rester jouable et testable à chaque étape.
- Tests : `cd hoop-bounce && npm test`. Après une modification voulue d'un niveau :
  `node tools/route-check.mjs 400 --save`.

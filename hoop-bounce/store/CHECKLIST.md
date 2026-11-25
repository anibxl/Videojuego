# Hoop Bounce 1.0.0 — Checklist de publication Google Play

Légende : ✅ **prêt** dans le projet · ✍️ **à renseigner** dans la Play Console (réponse fournie ci-dessous) ·
🔑 **à faire par le porteur du projet** (compte, coordonnées, mise en ligne).

> Récapitulatif pas à pas : `store/PUBLICATION.md`. Rien n'est publié.

## Résumé

| Élément | Statut | Fichier / réponse |
|---|---|---|
| Fichier **AAB** signé (com.echospeed.hoopbounce, 1.0.0, versionCode 16) | ✅ | `dist/HoopBounce-1.0.0-16-release.aab` |
| APK release de la même version (tests) | ✅ | `dist/HoopBounce-1.0.0-16-release.apk` |
| Clé d'import (upload key) + mot de passe | ✅ 🔑 | `native/release/keys/` (non versionné) — **à copier en lieu sûr** |
| Icône 512 × 512 (Noël + intemporelle) | ✅ | `store/icon/icon-512-winter.png` · `icon-512.png` |
| Bannière 1024 × 500 (Noël + intemporelle, FR/EN/ES) | ✅ | `store/feature-graphic/` |
| 18 captures 1920 × 1080 (FR/EN/ES) : 5 mondes et leurs pièges, modes, Pass… | ✅ | `store/screenshots/{fr,en,es}/` |
| Nom, description courte, description complète (FR/EN/ES) | ✅ ✍️ | `store/LISTING.md` |
| Vidéo YouTube (facultative) | 🔑 | storyboard : `store/VIDEO.md` |
| Catégorie, tags | ✍️ | Jeux › Arcade ; tags : `store/LISTING.md` |
| Coordonnées (e-mail obligatoire) | 🔑 ✍️ | § 2 |
| Politique de confidentialité en ligne | 🔑 ✍️ | `store/privacy-policy.html` (mettre l'e-mail, héberger, coller l'adresse) |
| Accès à l'application | ✍️ | § 4 |
| Annonces | ✍️ | **Non** (§ 4) |
| Classification du contenu (IARC) | ✍️ | § 5 |
| Public cible | ✍️ | § 4 |
| Sécurité des données | ✍️ | **Aucune donnée collectée ni partagée** (§ 6) |
| Achats intégrés | ✅ | aucun dans la version 1.0.0 (§ 8) |
| Compatibilité Android | ✅ | Android 7.0 (API 24) → Android 16 (API 36 ciblée), paysage, sans code natif (§ 9) |
| Test fermé (compte personnel récent) | 🔑 | 12 testeurs pendant 14 jours (§ 10) |

---

## 1. Compte développeur 🔑

- [ ] Compte Google Play Console (frais uniques de 25 $), identité vérifiée.
- [ ] Nom du développeur affiché sur la fiche : **EchoSpeed**.
- [ ] **Statut de « professionnel » (DSA, Union européenne)** : la Console demande si tu es un professionnel
      (« trader »). Un développeur qui ne gagne pas d'argent avec le jeu peut répondre **non** ; s'il monétise plus
      tard (publicités, achats), il devra répondre **oui**, et son **adresse et son téléphone deviennent publics**
      sur la fiche dans l'UE.

## 2. Coordonnées de la fiche (Présence sur le Store › Fiche › Coordonnées) 🔑

| Champ | Obligatoire ? | À saisir |
|---|---|---|
| Adresse e-mail | **Obligatoire** (affichée publiquement) | une adresse dédiée au jeu, par ex. `hoopbounce.contact@…` (conseillé : pas l'adresse personnelle) |
| Site web | Facultatif | la page qui héberge la politique de confidentialité peut servir de site (GitHub Pages, Google Sites) |
| Téléphone | Facultatif (obligatoire et public pour un « professionnel » dans l'UE) | laisser vide sinon |
| Adresse postale | Seulement pour un « professionnel » (DSA) | — |

## 3. Créer l'application ✍️

- [ ] Nom : **Hoop Bounce** · langue par défaut : **Français (France) – fr-FR** · **Jeu** · **Gratuit**.
- [ ] Déclarations : respect des règles du programme pour les développeurs et des lois d'export américaines.
- [ ] L'identifiant **`com.echospeed.hoopbounce`** est lu dans l'AAB au premier import ; il devient **définitif**.

## 4. Contenu de l'application (Règles et programmes › Contenu de l'application) ✍️

| Formulaire | Réponse |
|---|---|
| Règles de confidentialité | l'adresse publique de `store/privacy-policy.html` (une fois hébergée) |
| Accès à l'application | **Toutes les fonctionnalités sont disponibles sans accès particulier** (pas de compte, pas de connexion) |
| Annonces | **Non, mon application ne contient pas d'annonces** (version 1.0.0 : aucun SDK publicitaire). Répondre « Oui » le jour où AdMob sera ajouté. |
| Public cible et contenu | tranches **13–15, 16–17, 18 ans et plus** ; « L'application pourrait-elle attirer involontairement les enfants ? » → **Non** (jeu d'adresse au style « néon de nuit », sans personnage enfantin, exigeant). Cible 13+ = pas d'obligations du programme Familles. |
| Applications d'actualités | Non |
| Applications liées à la COVID-19 | Non |
| Applications gouvernementales | Non |
| Fonctionnalités financières | Aucune |
| Santé | Aucune |
| Classification du contenu | questionnaire IARC (§ 5) |
| Sécurité des données | § 6 |

## 5. Classification du contenu (questionnaire IARC) ✍️

Catégorie de l'application : **Jeu**. Adresse e-mail pour le certificat : celle du § 2.

| Question | Réponse |
|---|---|
| Violence (dessin animé, fantastique, réaliste, sang) | **Non** — un ballon qui rebondit ; une chute fait simplement recommencer le niveau |
| Peur, horreur | Non |
| Sexualité, nudité | Non |
| Langage grossier | Non |
| Drogues, alcool, tabac | Non |
| Jeux d'argent simulés (casino, paris) | **Non** — la roulette quotidienne et les coffres donnent des récompenses de jeu gratuites, sans mise ni argent réel |
| Achat d'objets aléatoires avec de l'argent réel (« loot boxes ») | Non (aucun achat dans le jeu) |
| Interaction entre utilisateurs, partage de contenu, discussion | Non |
| Partage de la position | Non |
| Achats numériques | Non (version 1.0.0) |
| Contenu non filtré d'Internet | Non |

Classification attendue : **PEGI 3 · ESRB Everyone · USK 0 · ClassInd L · IARC 3+**.

## 6. Sécurité des données ✍️

| Question | Réponse |
|---|---|
| Votre application collecte-t-elle ou partage-t-elle des données utilisateur des types requis ? | **Non** |
| (en conséquence) | la fiche affichera « **Aucune donnée collectée** » et « **Aucune donnée partagée avec des tiers** » |

Justification (à garder) : la version 1.0.0 ne demande **pas la permission Internet** et n'embarque **aucun SDK
tiers** (ni publicité, ni statistiques, ni plantages) ; toutes les données (progression, pièces, réglages,
fantômes) restent dans le stockage local de l'application. La sauvegarde automatique d'Android est gérée par
Google et l'utilisateur : elle ne compte pas comme une collecte par le développeur.
⚠️ Quand AdMob sera ajouté : mettre à jour ce formulaire (identifiant publicitaire, interactions, diagnostics,
partagés avec Google pour la publicité) **avant** l'envoi de cette mise à jour.

## 7. Fiche du Store ✍️

- [ ] Nom, descriptions : `store/LISTING.md` (FR par défaut, puis Traductions › anglais (en-US), espagnol (es-ES)).
- [ ] Icône : `store/icon/icon-512-winter.png` pendant la saison de Noël, puis `icon-512.png`.
- [ ] Bannière : `store/feature-graphic/feature-graphic-winter-fr.png` (et `-en`, `-es` dans les traductions).
- [ ] Captures (8 au plus par appareil, répartition dans `store/SCREENSHOTS.md`) : téléphone 01, 02, 04, 07, 08, 03,
      05, 06 ; tablette 7" 16, 14, 09, 15, 10, 17, 11, 18 ; tablette 10" 01, 07, 08, 09, 12, 13, 11, 10.
- [ ] Vidéo : lien YouTube (facultatif, `store/VIDEO.md`).
- [ ] Paramètres du Store : catégorie **Arcade**, tags (`store/LISTING.md`), coordonnées (§ 2).

## 8. Monétisation

- Version 1.0.0 : **aucune publicité, aucun achat intégré** ; le jeu est **gratuit**. Le Premium du Hoop Pass
  s'obtient avec des gemmes gagnées en jouant.
- **Plus tard — achats intégrés** : créer un compte marchand (Play Console › Configurer un profil de paiement),
  créer le produit (identifiant `season.premium.productId`), brancher Google Play Billing (`src/shared/billing.js`,
  plugin Capacitor), déclarer « Achats numériques » dans l'IARC, mettre à jour la politique de confidentialité.
- **Plus tard — publicités** : projet Capacitor (`android/`) avec le plugin AdMob, identifiants dans
  `src/shared/ads-config.js`, `app-ads.txt` sur le site, formulaires « Annonces » et « Sécurité des données ».
  (Le changement de « Gratuit » à « Payant » est impossible ; l'inverse aussi : le jeu reste gratuit.)

## 9. Compatibilité Android ✅

| | |
|---|---|
| Android minimum | **7.0 (API 24)** |
| API ciblée | **36 (Android 16)** — exigence de Google Play pour les nouvelles applications |
| Format | Android App Bundle signé ; aucun code natif (fonctionne sur tous les processeurs, 32 et 64 bits) |
| Orientation | paysage (y compris sur tablette sous Android 16, propriété de compatibilité déclarée) |
| Permissions | **vibreur uniquement** |
| Appareils | téléphones et tablettes ; Chromebook possible (écran tactile non obligatoire) |
| Taille | ≈ 1 Mo |

## 10. Tests avant la production 🔑

- **Compte personnel créé après le 13 novembre 2023** : obligatoire avant la production — un **test fermé** avec
  **au moins 12 testeurs** inscrits **pendant 14 jours d'affilée**, puis la demande d'accès à la production.
  (Compte d'organisation : pas concerné.)
- Conseillé dans tous les cas : un test interne (jusqu'à 100 testeurs, disponible en quelques minutes) avec
  l'AAB, pour vérifier l'installation depuis Google Play.
- L'APK release (`dist/HoopBounce-1.0.0-16-release.apk`) permet de tester exactement la même version avant l'envoi
  (voir `store/PUBLICATION.md` § Tester avant de publier).

## 11. Le jour de la publication 🔑

- [ ] Production › Créer une release › importer `dist/HoopBounce-1.0.0-16-release.aab`.
- [ ] Signature d'application par Google Play : accepter (clé gérée par Google, clé d'import = la nôtre).
- [ ] Notes de version : « Première version de Hoop Bounce ! » (FR) · « The first release of Hoop Bounce! » (EN) ·
      « ¡La primera versión de Hoop Bounce! » (ES).
- [ ] Pays : tous ; lancement progressif conseillé (20 % puis 100 %).
- [ ] Envoyer pour examen (quelques heures à quelques jours pour une première application).

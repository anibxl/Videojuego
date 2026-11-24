# HoopBounce 1.0.0 — Checklist avant publication sur Google Play

Légende : ✅ prêt dans le projet · 🟡 prêt, à finaliser par le porteur du projet · 🔴 à faire dans la Play Console
ou la console AdMob (compte requis).

> Rien n'est publié. Ce document liste **tout** ce qu'il faut pour envoyer la version 1.0.0, dans l'ordre.

## Résumé

| Élément | Statut | Où |
|---|---|---|
| Icône 512 × 512 | ✅ | `store/icon/icon-512.png` (source : `store/src/icon.svg`) |
| Icônes de l'application (adaptative, ronde, classique) | ✅ | `android/app/src/main/res/mipmap-*` |
| Écran de démarrage natif | ✅ | `android/app/src/main/res/drawable*/splash.png` + thème (fond `#04070F`) |
| Feature graphic 1024 × 500 | ✅ | `store/feature-graphic/feature-graphic-{fr,en,es}.png` |
| Captures d'écran (10 × 3 langues) | ✅ | `store/screenshots/{fr,en,es}/` — choix des 8 par appareil : `SCREENSHOTS.md` |
| Titre, descriptions, points forts, mots-clés | ✅ | `store/LISTING.md` (FR, EN, ES) |
| Politique de confidentialité | 🟡 | `store/privacy-policy.html` : mettre l'e-mail de contact, puis l'héberger en ligne |
| Catégorie | 🔴 | Jeux › Arcade (voir § 4) |
| Classification par âge | 🔴 | questionnaire IARC (voir § 5) |
| Public cible | 🔴 | 13 ans et plus recommandé (voir § 5) |
| Sécurité des données | 🔴 | formulaire (réponses § 6) |
| Pays de diffusion | 🔴 | tous les pays (voir § 7) |
| Langues | ✅ / 🔴 | jeu en FR / EN / ES ; fiches à créer dans la console (§ 8) |
| Version | ✅ | `versionName 1.0.0` (`package.json`, `src/shared/version.js`, `android/app/build.gradle`) |
| Numéro de build | ✅ | `versionCode 1` — à augmenter à chaque envoi |
| Fichier AAB | 🟡 | à construire et signer (§ 10) |
| Publicités AdMob en production | 🔴 | vrais identifiants, `app-ads.txt`, message de consentement (§ 11) |
| Tests fermés | 🔴 | 12 testeurs pendant 14 jours si compte personnel récent (§ 12) |

---

## 1. Compte Google Play Console

- [ ] Compte développeur créé (frais uniques de 25 $), identité vérifiée.
- [ ] Nom du développeur affiché : **EchoSpeed**.
- [ ] Adresse e-mail de contact publique et, si possible, un site web : le site est nécessaire pour `app-ads.txt`.
- [ ] Compte **personnel** créé après novembre 2023 : un **test fermé** avec au moins 12 testeurs pendant
      14 jours est obligatoire avant la production (§ 12). Un compte d'organisation n'est pas concerné.

## 2. Créer l'application

- [ ] Nom : **Hoop Bounce** · langue par défaut : **français (France)** · type : **Jeu** · **Gratuit**.
- [ ] Identifiant du paquet : **`com.echospeed.hoopbounce`** (défini dans `capacitor.config.json` et `android/`).
      ⚠️ **Définitif** après le premier envoi : le confirmer avant.

## 3. Fiche du Store (Présence sur le Store › Fiche principale)

- [x] Titre, description courte, description complète : `store/LISTING.md`.
- [x] Icône 512 × 512 PNG 32 bits : `store/icon/icon-512.png`.
- [x] Feature graphic 1024 × 500 PNG 24 bits : `store/feature-graphic/feature-graphic-fr.png`.
- [x] Captures téléphone (8) et tablettes 7" et 10" (8 chacune) : `store/screenshots/fr/`, ordre dans
      `SCREENSHOTS.md`.
- [ ] Vidéo YouTube (facultative) : plan dans `SCREENSHOTS.md`.
- [ ] Fiches traduites : anglais (en-US) et espagnol (es-ES), avec leurs visuels `en/` et `es/`.
- [ ] Coordonnées : e-mail (obligatoire), site web, téléphone (facultatif).

## 4. Catégorie et tags

- **Catégorie : Jeux › Arcade.** Hoop Bounce est un jeu d'adresse en niveaux courts, ce qui correspond aux jeux de
  plateforme sur Google Play. Alternatives possibles : Action, ou Sport (le basket est le thème, mais pas un vrai
  match).
- Tags (jusqu'à 5) : Plateforme · Arcade · Hors ligne · Solo · Sport.

## 5. Contenu de l'application (Règles › Contenu de l'application)

- [ ] **Politique de confidentialité** : URL publique de `store/privacy-policy.html`. Avant de la mettre en ligne,
      remplacer `[E-MAIL DE CONTACT]` par l'adresse de contact.
      Hébergement simple : GitHub Pages (Paramètres du dépôt › Pages), ou le site du développeur.
      Une fois en ligne, mettre aussi l'adresse dans `src/shared/about.js` (`LINKS.privacy`) : le bouton de la
      page À propos ouvrira la page en ligne.
- [ ] **Annonces** : « Oui, mon application contient des annonces ». Ce sont uniquement des annonces
      récompensées et facultatives.
- [ ] **Accès à l'application** : aucune restriction (pas de compte, pas de code).
- [ ] **Identifiant publicitaire** : oui, utilisé pour la publicité (SDK Google Mobile Ads).
- [ ] **Classification du contenu** (questionnaire IARC) :
  - catégorie « Jeu » ;
  - violence : non (des obstacles, un ballon qui éclate, aucun personnage blessé) ;
  - peur, sexualité, langage, drogues, jeux d'argent : non ;
  - interactions entre utilisateurs : non ; partage de position : non ;
  - achats numériques : non (les coffres et la roue ne s'achètent pas, on ne peut pas y miser d'argent réel).
  - Classification attendue : **PEGI 3 · ESRB Everyone · USK 0**.
- [ ] **Public cible et contenu** : recommandation **13 ans et plus** (tranches 13–15, 16–17, 18+) pour la v1.0 :
  - pas d'obligations du programme Familles ;
  - publicités AdMob classées « PG » au maximum (`ads-config.js`).
  - Si le jeu doit viser aussi les moins de 13 ans : cocher ces tranches, respecter les règles Familles, et
    régler `childDirected: true` et `maxAdContentRating: 'G'` dans `ads-config.js`.
- [ ] Application d'actualités : non · Application gouvernementale : non · Fonctionnalités financières : non ·
      Santé : non.

## 6. Sécurité des données (réponses au formulaire)

Le jeu lui-même ne collecte rien (tout reste sur l'appareil). Seul le **SDK Google Mobile Ads** collecte des
données, quand le joueur choisit de regarder une publicité :

| Question | Réponse |
|---|---|
| L'application collecte ou partage-t-elle des données ? | **Oui** (via le SDK publicitaire) |
| Données chiffrées en transit ? | **Oui** |
| Les utilisateurs peuvent-ils demander la suppression ? | Les données du jeu sont locales ; pour la publicité, renvoyer vers Google |
| **Position** › position approximative | Collectée et partagée · Publicité, Prévention de la fraude |
| **Activité dans l'application** › interactions avec l'application | Collectée et partagée · Publicité, Analyse |
| **Infos et performances de l'application** › journaux de plantage, diagnostics | Collectés et partagés · Analyse |
| **Identifiants de l'appareil ou autres** › identifiant publicitaire | Collecté et partagé · Publicité, Prévention de la fraude |
| Collecte obligatoire ? | Facultative pour le joueur (publicités facultatives) |

À vérifier au moment de remplir : la page « Data disclosure » d'AdMob indique les catégories à jour du SDK.

## 7. Pays de diffusion

- [ ] **Tous les pays et régions** (≈ 175).
  - Le jeu est en FR / EN / ES et se joue sans texte essentiel.
  - Le consentement RGPD (EEE, Royaume-Uni, Suisse) est géré par le formulaire Google (UMP).
- Option prudente : lancer d'abord en France, Belgique, Suisse, Canada, Espagne et Amérique latine, puis
  élargir.

## 8. Langues

- [x] Jeu : **français, anglais, espagnol** (langue de l'appareil par défaut, réglable dans le jeu).
- [ ] Fiche par défaut **fr-FR** ; traductions **en-US** et **es-ES** à ajouter avec les textes de `LISTING.md`
      et les visuels `en/`, `es/`.

## 9. Version et numéro de build

| Champ | Valeur | Fichier |
|---|---|---|
| Version (visible) | **1.0.0** | `package.json`, `src/shared/version.js` (affichée dans Paramètres), `android/app/build.gradle` (`versionName`) |
| Numéro de build | **1** | `android/app/build.gradle` (`versionCode`) — **+1 à chaque envoi** (1.0.1 → 2…) |
| SDK cible | **Android 16 (API 36)** | `android/variables.gradle` (exigence Google Play pour les nouvelles applications) |
| SDK minimum | Android 7.0 (API 24) | `android/variables.gradle` |
| Nom de la version (console) | « 1.0.0 (1) — Première version » | à saisir dans la console |

## 10. Fichier AAB (Android App Bundle)

Prérequis : **Android Studio** (à jour, avec le SDK Android 36) et **JDK 21**.

```bash
cd hoop-bounce
npm install                 # Capacitor 8 et le plugin AdMob
npm run android:sync        # copie le jeu (www/) dans le projet Android
```

1. **Clé d'importation** (une seule fois). À garder précieusement, avec une copie de sauvegarde hors du dépôt :
   ```bash
   keytool -genkeypair -v -keystore hoopbounce-upload.jks -alias hoopbounce -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Copier `android/keystore.properties.example` en `android/keystore.properties` (ignoré par Git) et le remplir.
3. Construire :
   ```bash
   cd android && ./gradlew bundleRelease
   ```
   → `android/app/build/outputs/bundle/release/app-release.aab`. On peut aussi passer par Android Studio :
   Build › Generate Signed App Bundle.
4. Dans la console, accepter **la signature d'application par Google Play** (Play App Signing) : Google garde la
   clé de signature finale, la clé ci-dessus ne sert qu'à l'envoi.
5. Avant l'envoi, vérifier :
   - [ ] `ads-config.js` contient les vrais identifiants, et `useTestAds` vaut `false` (§ 11) ;
   - [ ] `versionCode` a bien été augmenté.

## 11. Publicités AdMob en production

- [ ] Console AdMob : créer l'application Android « Hoop Bounce » et la **relier à la fiche Play**.
- [ ] Créer **3 blocs « Avec récompense »** : `doubleCoins`, `checkpoint` et `wheelSpin`.
- [ ] `src/shared/ads-config.js` : remplacer les 3 identifiants `prod` et l'identifiant d'application, puis
      passer `useTestAds: false`. Garde-fou : tant qu'un `XXXX` reste, le jeu reste en mode test.
- [ ] `android/app/src/main/res/values/strings.xml` : `admob_app_id` = vrai identifiant d'application.
- [ ] **`app-ads.txt`** à la racine du site web indiqué dans la fiche. Le contenu est fourni par AdMob.
- [ ] « Confidentialité et messages » : publier un message **RGPD** (EEE, Royaume-Uni). Le jeu l'affiche avant
      la première annonce.
- [ ] Déclarer son téléphone comme **appareil de test** (`testDeviceIds`), et ne jamais cliquer sur ses propres
      annonces réelles.

## 12. Tests avant la production

- [ ] **Test interne** (jusqu'à 100 testeurs, disponible en quelques minutes) : installer depuis le Play Store
      et vérifier :
  - [ ] démarrage : écran natif puis écran de chargement, sans flash blanc ;
  - [ ] paysage forcé et plein écran ; encoche (notch) non gênante ;
  - [ ] boutons tactiles réactifs, multitouche ;
  - [ ] son, musique, vibrations ; pause quand l'application passe en arrière-plan ;
  - [ ] bouton Retour d'Android : il navigue dans le menu et ne quitte pas pendant une partie ;
  - [ ] publicités de test : doubler les pièces, reprendre au drapeau, coffre amélioré, roue ;
  - [ ] récompense reçue seulement à la fin de l'annonce, rien en cas de fermeture ;
  - [ ] formulaire de consentement (avec un VPN européen, ou un appareil en Europe) ;
  - [ ] progression conservée après fermeture puis relance ;
  - [ ] fluidité sur un téléphone d'entrée de gamme (qualité « Basse ») et sur un récent.
- [ ] **Rapport de pré-lancement** de la console : aucun plantage, aucune alerte d'accessibilité bloquante.
- [ ] **Test fermé** : au moins 12 testeurs inscrits pendant 14 jours consécutifs (compte personnel), puis
      demande d'accès à la production.

## 13. Publication (le jour J — pas maintenant)

- [ ] Version de production 1.0.0 (1), notes de version FR / EN / ES :
      « Première version : 50 niveaux, 5 mondes, boutique, récompenses quotidiennes, missions et succès. »
- [ ] **Déploiement progressif** : 20 %, puis 50 %, puis 100 % après 2–3 jours sans problème.
- [ ] Ensuite : surveiller Android Vitals (plantages, ANR) et les avis ; répondre aux premiers commentaires.

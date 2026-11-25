# Hoop Bounce — Publication sur Google Play

> **But** : il ne reste plus qu'à se connecter à la Google Play Console, importer le fichier `.aab` et remplir les
> derniers champs administratifs. Tout le reste est prêt dans le projet. Version : **1.0.0** (versionCode 16),
> identifiant **`com.echospeed.hoopbounce`**.

## 1. Ce qui est déjà fait ✅

| Domaine | Livrable | Où |
|---|---|---|
| **Build** | Android App Bundle signé, prêt pour Google Play | `dist/HoopBounce-1.0.0-16-release.aab` |
| | APK release de **la même version**, pour tester sur un téléphone | `dist/HoopBounce-1.0.0-16-release.apk` |
| | Script de construction et de vérification | `node tools/build-release.mjs` |
| | Clé d'import (upload key) + mot de passe | `native/release/keys/` — **non versionnée, à sauvegarder** |
| **Identité** | Charte : palette, typographie, boutons, cartes, effets, illustrations, icône | `store/BRAND.md` |
| **Icône** | 512 × 512 : version **Noël** (neige discrète) et version **intemporelle** | `store/icon/` |
| | Icônes de l'application (classique, ronde, adaptative) : version intemporelle | dans l'AAB |
| **Bannière** | 1024 × 500, FR / EN / ES, versions Noël et intemporelle | `store/feature-graphic/` |
| **Captures** | 18 captures 1920 × 1080 avec titres marketing, FR / EN / ES : les 5 mondes et leurs pièges (2 vues chacun), Trickshot, Hoop Pass, skins, fantôme, coffres, succès, collection | `store/screenshots/` |
| **Vidéo** | Storyboard de 25 s, plan par plan | `store/VIDEO.md` |
| **Textes** | Nom, description courte, description complète (FR / EN / ES), longueurs vérifiées | `store/LISTING.md` |
| **Référencement** | Mots-clés principaux et secondaires, catégorie, tags | `store/LISTING.md` § Référencement |
| **Confidentialité** | Politique conforme à la version 1.0.0 (FR / EN / ES) | `store/privacy-policy.html` |
| **Formulaires** | Réponses prêtes : accès, annonces, public cible, IARC, sécurité des données | `store/CHECKLIST.md` § 4 à 6 |
| **Qualité** | 664 tests automatiques ; jeu de l'APK release vérifié dans Chromium (0 erreur) | — |

### Ce que contient la version publiée

- Le jeu complet, **identique** à la dernière version de test (v14) : 50 niveaux, 50 Trickshots, Hoop Pass de
  Noël, Mode Fantôme, 62 succès, 63 objets, sons, musiques, finitions.
- **Aucune publicité** : la version publiée n'embarque pas le SDK AdMob (il demande le projet Capacitor et un
  compte AdMob). Les boutons « Regarder une publicité » sont masqués ; la reprise au drapeau est offerte, comme
  quand le jeu est hors ligne. Rien d'autre ne change.
- **Aucun achat intégré** (le Premium du Hoop Pass s'obtient avec des gemmes gagnées en jouant).
- **Aucune permission** sauf le vibreur ; aucune connexion à Internet ; aucune donnée collectée.
- Android 7.0 à Android 16 (API 36 ciblée), paysage, ≈ 1 Mo.

## 2. Ce qu'il reste à faire (manuellement) 🔑

Environ une heure dans la Play Console, puis 14 jours de test fermé si le compte est personnel et récent.

1. **Sauvegarder la clé d'import** : copier `native/release/keys/hoopbounce-release.jks` **et**
   `keystore.properties` (mot de passe) dans au moins deux endroits sûrs (gestionnaire de mots de passe, clé USB,
   espace de stockage privé). Sans elle, impossible d'envoyer une mise à jour sans passer par le support de Google.
2. **Choisir l'adresse e-mail publique** du jeu (obligatoire) — conseillé : une adresse dédiée.
3. **Mettre en ligne la politique de confidentialité** : remplacer `[E-MAIL DE CONTACT]` (4 endroits) dans
   `store/privacy-policy.html`, puis l'héberger (GitHub Pages, Google Sites, site perso) et noter son adresse.
4. **Play Console › Créer une application** : nom « Hoop Bounce », français (France), Jeu, Gratuit.
5. **Contenu de l'application** : remplir les formulaires avec les réponses de `store/CHECKLIST.md` § 4 à 6
   (politique de confidentialité, accès, annonces = Non, public cible 13+, IARC, sécurité des données = aucune).
6. **Fiche du Store** : coller les textes de `store/LISTING.md`, envoyer l'icône (Noël), la bannière (Noël) et les
   captures (8 par type d'appareil : téléphone, tablette 7", tablette 10" — répartition dans `store/SCREENSHOTS.md`) ;
   ajouter les traductions EN et ES ; catégorie **Arcade**, tags, coordonnées.
7. **Test fermé** (compte personnel récent) : créer la piste, importer l'AAB, inviter 12 testeurs, attendre
   14 jours, demander l'accès à la production.
8. **Production** : créer la release avec le même AAB (ou un AAB au versionCode supérieur s'il y a eu des
   corrections), notes de version, pays, envoyer pour examen.
9. **Après Noël** : remplacer l'icône et la bannière de la fiche par les versions intemporelles
   (`icon-512.png`, `feature-graphic-*.png`) — pas besoin de mise à jour de l'application.

## 3. Signature et sauvegardes : ce qu'il faut savoir

- **Identifiant** : `com.echospeed.hoopbounce`, l'identifiant officiel prévu depuis la préparation de la
  publication (la version de test utilise `com.echospeed.hoopbounce.test`, pour que les deux coexistent).
- **Signature** : l'AAB est signé avec la **clé d'import** de `native/release/keys/`. Google Play gère la clé de
  signature finale (« Signature d'application par Google Play », proposée au premier import : accepter).
  Chaque future mise à jour devra être signée avec **la même clé d'import** et avoir un **versionCode plus
  grand** (le script le vérifie : il refuse une autre clé).
- **Sauvegardes des joueurs** : le format de sauvegarde est celui du jeu (avec ses migrations) ; les joueurs de la
  version Play garderont toute leur progression d'une mise à jour à l'autre.
- ⚠️ **La progression de l'APK de test (`.test`) ne passe pas dans la version Play** : Android sépare les
  données de chaque application. C'est normal (et ça ne concerne que les testeurs).
- **Tester avant de publier** : l'APK release (`dist/HoopBounce-1.0.0-16-release.apk`) s'installe à côté de la
  version de test (identifiant différent). Avec la signature par Google Play, la version téléchargée sur le Store
  sera signée par Google : il faudra **désinstaller l'APK release** avant d'installer la version du Store.
  (Option : dans la Console, choisir de faire signer par Google avec **notre propre clé** — importée avec l'outil
  PEPK — pour que l'APK release et la version du Store soient interchangeables ; non nécessaire.)

## 4. Validation du bundle

- Vérifié par le script : identifiant, versionCode 16, versionName 1.0.0, minSdk 24, targetSdk 36, permission
  vibreur seule, signature (jarsigner) avec la clé d'import, présence de `BundleConfig.pb`, du manifeste,
  des ressources et du code du module `base`, et **les mêmes 145 fichiers de jeu que dans l'APK release**.
- Le bundle est assemblé sans Gradle (outils Android d'Ubuntu, format protobuf d'aapt2). L'outil officiel
  **bundletool** n'a pas pu être exécuté dans l'environnement de développement ; pour une vérification de plus,
  sur un ordinateur avec Java :
  `java -jar bundletool-all.jar validate --bundle=HoopBounce-1.0.0-16-release.aab`
  (et `build-apks --bundle=… --output=hb.apks --mode=universal` pour en tirer un APK). La Play Console valide
  aussi le bundle à l'import et indique toute erreur avant l'envoi.

## 5. Mettre à jour plus tard

1. Modifier le jeu, lancer `npm test`.
2. Augmenter `VERSION_CODE` (et `VERSION_NAME` si besoin, ainsi que `src/shared/version.js`) dans
   `tools/build-release.mjs`.
3. `node tools/build-release.mjs` → nouvel AAB signé avec la même clé.
4. Play Console › Production › Créer une release › importer l'AAB.

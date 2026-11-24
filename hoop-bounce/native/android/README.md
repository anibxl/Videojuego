# Hoop Bounce — application Android et publicités AdMob

Le jeu est écrit en HTML/JS. Pour Android, il est emballé avec **Capacitor 8** : le projet natif est dans
`hoop-bounce/android/`. Les publicités passent par le plugin **`@capacitor-community/admob`**, qui utilise le
**SDK officiel Google Mobile Ads**.

Côté jeu, rien n'est à changer : `src/shared/ads.js` détecte l'application native
(`Capacitor.Plugins.AdMob`). Dans le navigateur, il affiche une **annonce de test simulée**.

> ⚠️ Pendant le développement, seuls les **identifiants de test officiels de Google** sont utilisés
> (`src/shared/ads-config.js`, `useTestAds: true`). Ne jamais cliquer sur ses propres vraies annonces :
> le compte AdMob peut être suspendu.

## 1. Ce qui est déjà en place (version 1.0.0)

| Élément | Où |
|---|---|
| Identifiant du paquet `com.echospeed.hoopbounce`, nom « Hoop Bounce » | `capacitor.config.json`, `android/app/build.gradle`, `res/values/strings.xml` |
| Version 1.0.0, numéro de build 1, SDK cible 36, SDK minimum 24 | `android/app/build.gradle`, `android/variables.gradle` |
| Paysage forcé (`sensorLandscape`), plein écran immersif | `AndroidManifest.xml`, `MainActivity.java` |
| Identifiant d'application AdMob (TEST) | `AndroidManifest.xml` (balise `com.google.android.gms.ads.APPLICATION_ID`) → `strings.xml` (`admob_app_id`) |
| Permissions : Internet (publicités), Vibreur (retours tactiles) ; AD_ID ajoutée par le SDK | `AndroidManifest.xml` |
| Icônes : adaptative (motif + fond), ronde, classique, toutes densités | `res/mipmap-*` (générées par `store/tools/render-assets.mjs`) |
| Écran de démarrage : fond `#04070F` + ballon, puis l'écran de chargement du jeu | `res/drawable*/splash.png`, `res/values/styles.xml`, `res/values/colors.xml` |
| Signature de la version publiée, lue dans `android/keystore.properties` (jamais dans Git) | `android/app/build.gradle`, `android/keystore.properties.example` |

## 2. Travailler sur l'application

```bash
cd hoop-bounce
npm install               # Capacitor et le plugin AdMob
npm run android:sync      # copie le jeu dans www/ puis dans le projet Android (à refaire après chaque modification)
npm run android:open      # ouvre le projet dans Android Studio (lancer sur un téléphone branché)
```

`tools/build-web.mjs` ne copie que les fichiers du jeu :
- copiés : pages, `css/`, `src/`, `assets/` ;
- exclus : tests, outils, documentation et visuels de la fiche.

## 3. Construire le fichier AAB

Voir `store/CHECKLIST.md`, § 10 : clé d'importation, `keystore.properties`, puis `./gradlew bundleRelease`.

## 4. Passer aux vrais identifiants (juste avant la publication)

Voir `store/CHECKLIST.md`, § 11. En résumé :
1. Console AdMob : créer l'application et **3 blocs « Avec récompense »** (`doubleCoins`, `checkpoint`,
   `wheelSpin`).
2. `src/shared/ads-config.js` : remplacer les identifiants `prod` (les `XXXX`) et passer `useTestAds` à `false`.
3. `android/app/src/main/res/values/strings.xml` : `admob_app_id` = vrai identifiant d'application.
4. Publier `app-ads.txt` sur le site du développeur, et le message de consentement RGPD dans AdMob.

Garde-fou : tant qu'un identifiant contient encore `XXXX`, le jeu reste en mode test, même si `useTestAds` vaut
`false`.

## 5. Consentement (RGPD / UMP)

Le jeu appelle `requestConsentInfo()`, puis `showConsentForm()` si Google l'exige. Cela n'arrive **qu'au
premier chargement d'une annonce**, jamais au lancement du jeu.

## 6. Rappel des règles du jeu

Les annonces ne sont **jamais** affichées :
- pendant un niveau ;
- pendant une animation importante ;
- au lancement du jeu ;
- automatiquement après une partie.

Le joueur appuie toujours lui-même sur « Regarder une publicité ». La récompense n'est donnée qu'après la
validation de l'annonce par le SDK.

## 7. À vérifier sur un vrai téléphone

- Événements AdMob : récompense, puis fermeture, avec les annonces de test.
- Plein écran et encoche (notch) : les marges `env(safe-area-inset-*)` du jeu.
- Vibrations (`navigator.vibrate`) dans la WebView.
- Son à la reprise après la mise en arrière-plan.

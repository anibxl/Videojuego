# Hoop Bounce — application Android et publicités AdMob

Le jeu est écrit en HTML/JS. Pour Android, il est emballé avec **Capacitor**. Les publicités passent par le
plugin **`@capacitor-community/admob`**, qui utilise le **SDK officiel Google Mobile Ads**.

Côté jeu, rien n'est à changer : `src/shared/ads.js` détecte l'application native
(`Capacitor.Plugins.AdMob`). Dans le navigateur, il affiche une **annonce de test simulée**.

> ⚠️ Pendant le développement, seuls les **identifiants de test officiels de Google** sont utilisés
> (`src/shared/ads-config.js`, `useTestAds: true`). Ne jamais cliquer sur ses propres vraies annonces :
> le compte AdMob peut être suspendu.

## 1. Installer Capacitor et le plugin (préparation Play Store, étape suivante)

```bash
cd hoop-bounce
npm i @capacitor/core @capacitor/android @capacitor-community/admob
npm i -D @capacitor/cli
npx cap init "Hoop Bounce" com.hoopbounce.game --web-dir www
# copier le jeu (index.html, play.html, shop.html, worlds.html, css/, src/, assets/) dans www/
npx cap add android
npx cap sync android
```

## 2. Identifiant d'application AdMob dans `AndroidManifest.xml`

Ajouter dans `android/app/src/main/AndroidManifest.xml`, à l'intérieur de `<application>` :

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="@string/admob_app_id" />
```

Et dans `android/app/src/main/res/values/strings.xml` :

```xml
<!-- TEST (Google) — remplacer par le vrai identifiant avant la publication -->
<string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>
```

Sans cette balise, l'application **plante au démarrage** (exigence du SDK Google Mobile Ads). Le SDK
ajoute lui-même la permission `com.google.android.gms.permission.AD_ID`.

## 3. Passer aux vrais identifiants (juste avant la publication)

1. Dans la console AdMob, créer l'application Android « Hoop Bounce ».
2. Dans cette application, créer **4 blocs d'annonces « Avec récompense »** :
   `doubleCoins`, `checkpoint`, `bonusChest` et `wheelSpin`.
3. Dans `src/shared/ads-config.js` :
   - remplacer les `prod` (les `XXXX`) par les vrais identifiants ;
   - passer `useTestAds` à `false`.
4. Mettre le **même identifiant d'application** dans `strings.xml` (étape 2).
5. Publier un fichier **`app-ads.txt`** à la racine du site du développeur (celui indiqué dans la fiche
   Play Store). Son contenu est donné par la console AdMob.
6. Tester une version de pré-production sur un appareil déclaré comme **appareil de test**
   (`testDeviceIds` dans `ads-config.js`, ou dans la console AdMob).

Garde-fou : tant qu'un identifiant contient encore `XXXX`, le jeu reste en mode test, même si
`useTestAds` vaut `false`.

## 4. Consentement (RGPD / UMP)

- Dans la console AdMob, rubrique **Confidentialité et messages**, créer un message RGPD pour l'Europe
  et le Royaume-Uni.
- Le jeu appelle `requestConsentInfo()` puis, si Google l'exige, `showConsentForm()`. Cela se fait
  **seulement au premier chargement d'une annonce**, jamais au lancement du jeu.

## 5. Déclarations Google Play Console

- **Contient des annonces** : oui. Ce sont uniquement des annonces récompensées, choisies par le joueur.
- **Sécurité des données** :
  - identifiant publicitaire et données d'appareil, collectés par le SDK Google Mobile Ads ;
  - finalités : publicité et analyse ;
  - partage avec Google.
- **Public cible** :
  - si le jeu vise aussi les moins de 13 ans, il faut le programme Familles ;
  - dans ce cas, mettre `childDirected: true`, une classification d'annonces `G`, et utiliser
    uniquement des réseaux certifiés Familles.
- **Politique de confidentialité** : URL publique obligatoire. Elle reprend le texte du menu
  (Paramètres → Politique de confidentialité).

## 6. Rappel des règles du jeu

Les annonces ne sont **jamais** affichées :

- pendant un niveau ;
- pendant une animation importante ;
- au lancement du jeu ;
- automatiquement après une partie.

Le joueur appuie toujours lui-même sur « Regarder une publicité ». La récompense n'est donnée
qu'après la validation de l'annonce par le SDK.

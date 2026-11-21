# Hoop Bounce — version de test Android (APK)

Fichier prêt à installer : **`dist/HoopBounce_Test_v2.apk`** (≈ 0,5 Mo) — version **1.1.0-test2** avec le mode
**TRICKSHOT**. C'est une **mise à jour** de `HoopBounce_Test_v1.apk` : elle s'installe par-dessus, sans
deuxième application, et garde progression, pièces, skins, récompenses et sauvegardes.

| | v1 (étape 20) | **v2 (étape 22)** |
|---|---|---|
| Identifiant | `com.echospeed.hoopbounce.test` | `com.echospeed.hoopbounce.test` (identique) |
| versionCode | 1 | **2** |
| versionName | 1.0.0-test1 | **1.1.0-test2** (« 1.1.0 (test 2) » dans Paramètres et À propos) |
| Clé (SHA-256) | `894f0b7d…35bfd8` | `894f0b7d…35bfd8` (identique) |

## Mettre à jour (la v1 est déjà sur le téléphone)

1. Envoyer `HoopBounce_Test_v2.apk` sur le téléphone et le toucher, comme pour la v1.
2. Android affiche **« Voulez-vous installer une mise à jour de cette application ? »** → **Mettre à jour**
   (ou Installer). **Ne pas désinstaller la v1 avant** : la désinstallation effacerait les sauvegardes.
3. Ouvrir **Hoop Bounce Test** : même icône, même progression ; le mode TRICKSHOT est dans *Modes*.

## Installer sur un téléphone Android (7.0 ou plus récent)

1. Envoyer le fichier `HoopBounce_Test_v2.apk` sur le téléphone (e-mail, WhatsApp, Google Drive, câble USB…).
2. Toucher le fichier dans le téléphone (notification de téléchargement, ou application **Fichiers › Téléchargements**).
3. Android demande d'autoriser cette source (« Installer des applications inconnues ») : **Paramètres › Autoriser
   depuis cette source**, puis revenir en arrière.
4. Toucher **Installer**. Si Play Protect affiche « Application inconnue » ou propose une analyse : **Installer
   quand même** (ou « Plus de détails › Installer quand même ») — c'est normal pour une application qui ne vient
   pas du Play Store.
5. Ouvrir **Hoop Bounce Test** (icône du ballon) et tourner le téléphone à l'horizontale.

Si l'installation échoue :
- « Application non installée » : une ancienne version de test signée avec une autre clé est déjà installée →
  la désinstaller puis réessayer (la progression de test est alors perdue) ;
- le jeu reste noir ou ne démarre pas : mettre à jour **Android System WebView** et **Chrome** dans le Play Store.

## Ce que contient cette version

- Le jeu complet (50 niveaux, boutique, collection, récompenses, missions, succès, bonus) et le mode
  **TRICKSHOT** (50 cartes), **hors ligne**.
- Identifiant **`com.echospeed.hoopbounce.test`**, nom « Hoop Bounce Test » : elle coexiste avec la future version
  du Play Store.
- Version `1.1.0-test2` (affichée « 1.1.0 (test 2) » dans Paramètres et À propos), Android 7.0 minimum, cible
  Android 14, aucune permission Internet (seulement le vibreur).
- **Publicités : annonces de TEST simulées par le jeu** (aucun identifiant AdMob, aucune vraie publicité).
- Débogage possible depuis un ordinateur : téléphone branché en USB (débogage USB activé), puis `chrome://inspect`
  dans Chrome.

## Reconstruire

```bash
sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23   # une seule fois
npm run android:test-apk                       # → dist/HoopBounce_Test_v2.apk (TEST_BUILD = 2)
node tools/build-test-apk.mjs --build 3        # version de test suivante → dist/HoopBounce_Test_v3.apk
```

La clé de signature de test est dans `native/test-apk/keys/` (non versionnée). Pour que les testeurs puissent
**mettre à jour** sans désinstaller (et sans perdre leur progression), toutes les versions de test doivent être
signées avec **la même clé** : la conserver. Le script le garantit : il **refuse** de construire si la clé manque
(au lieu d'en créer une nouvelle), si l'empreinte de la clé n'est pas celle de la v1, si l'identifiant change ou
si le versionCode n'est pas plus grand que celui des APK déjà présents dans `dist/`.

Les sauvegardes du jeu (localStorage) sont attachées à l'application et à l'adresse locale fixe
`https://appassets.androidplatform.net/` : une mise à jour (même identifiant, même clé) les conserve ; la v2
n'ajoute qu'une clé (`hoopbounce.trickshot`) et ne touche à aucune des autres.

## Pourquoi une enveloppe différente du projet `android/` ?

Le projet `android/` (Capacitor, avec le vrai SDK AdMob) se construit avec Gradle, qui doit télécharger le SDK
Android et les bibliothèques Google : ce n'était pas possible dans l'environnement de développement. Cette
enveloppe minimale (une activité, une WebView plein écran, les fichiers du jeu servis depuis l'APK) se construit
avec les seuls outils Android d'Ubuntu. La version Play Store reste à construire depuis `android/` dans Android
Studio (voir `native/android/README.md`).

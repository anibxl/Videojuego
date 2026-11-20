# Hoop Bounce — version de test Android (APK)

Fichier prêt à installer : **`dist/HoopBounce_Test_v1.apk`** (≈ 0,5 Mo).

## Installer sur un téléphone Android (7.0 ou plus récent)

1. Envoyer le fichier `HoopBounce_Test_v1.apk` sur le téléphone (e-mail, WhatsApp, Google Drive, câble USB…).
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

- Le jeu complet (50 niveaux, boutique, collection, récompenses, missions, succès, bonus), **hors ligne**.
- Identifiant **`com.echospeed.hoopbounce.test`**, nom « Hoop Bounce Test » : elle coexiste avec la future version
  du Play Store.
- Version `1.0.0-test1` (affichée « 1.0.0 (test 1) » dans Paramètres et À propos), Android 7.0 minimum, cible
  Android 14, aucune permission Internet (seulement le vibreur).
- **Publicités : annonces de TEST simulées par le jeu** (aucun identifiant AdMob, aucune vraie publicité).
- Débogage possible depuis un ordinateur : téléphone branché en USB (débogage USB activé), puis `chrome://inspect`
  dans Chrome.

## Reconstruire

```bash
sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23   # une seule fois
npm run android:test-apk                       # → dist/HoopBounce_Test_v1.apk
node tools/build-test-apk.mjs --build 2        # version de test suivante → dist/HoopBounce_Test_v2.apk
```

La clé de signature de test est créée au premier lancement dans `native/test-apk/keys/` (non versionnée). Pour
que les testeurs puissent **mettre à jour** sans désinstaller (et sans perdre leur progression), toutes les
versions de test doivent être signées avec **la même clé** : la conserver.

## Pourquoi une enveloppe différente du projet `android/` ?

Le projet `android/` (Capacitor, avec le vrai SDK AdMob) se construit avec Gradle, qui doit télécharger le SDK
Android et les bibliothèques Google : ce n'était pas possible dans l'environnement de développement. Cette
enveloppe minimale (une activité, une WebView plein écran, les fichiers du jeu servis depuis l'APK) se construit
avec les seuls outils Android d'Ubuntu. La version Play Store reste à construire depuis `android/` dans Android
Studio (voir `native/android/README.md`).

# Hoop Bounce sur iPhone (iOS) — construire et faire tester

Le projet Xcode est prêt dans **`ios/`** (Capacitor 8, Swift Package Manager). Le jeu est exactement le même
que sur Android : mêmes fichiers, mêmes niveaux, même sauvegarde, mêmes publicités (identifiants de **test**).

## Ce qu'il faut (dépendances)

| Besoin | Pourquoi | Gratuit ? |
|---|---|---|
| **Un Mac** (macOS 14.5 ou plus récent) | Xcode n'existe que sur Mac | — |
| **Xcode 16 ou plus récent** (App Store du Mac) | compiler l'application iPhone | oui |
| **Node.js 22+** et npm (nodejs.org) | préparer les fichiers du jeu et synchroniser le projet | oui |
| **Un identifiant Apple** | signer l'application pour ton propre iPhone | oui |
| **Apple Developer Program** | envoyer l'application à des amis par **TestFlight** (et plus tard l'App Store) | 99 $/an |
| Internet | Xcode télécharge Capacitor, Google Mobile Ads et UMP (Swift Package Manager) | — |

**Pas besoin de CocoaPods** : le projet utilise Swift Package Manager.

## 1. Préparer le projet (sur le Mac)

```bash
git clone <adresse du dépôt> && cd Videojuego/hoop-bounce
npm install            # dépendances (Capacitor, AdMob, retour haptique)
npm run ios:sync       # copie le jeu dans ios/App/App/public et met à jour les plugins
npm run ios:open       # ouvre ios/App/App.xcodeproj dans Xcode
```

Au premier lancement, Xcode télécharge les paquets (barre de progression en haut) : attendre la fin.

## 2. Essayer sur ton iPhone (gratuit)

1. Dans Xcode, cliquer sur **App** (en haut de la colonne de gauche) › cible **App** › onglet
   **Signing & Capabilities**.
2. **Team** : choisir ton identifiant Apple (« Add an Account… » la première fois).
3. Si Xcode signale que l'identifiant `com.echospeed.hoopbounce` est déjà pris (compte gratuit), le remplacer
   dans **Bundle Identifier** par un identifiant à toi, par exemple `com.tonprenom.hoopbounce`.
4. Brancher l'iPhone en USB, le déverrouiller, accepter « Faire confiance à cet ordinateur ».
5. Sur l'iPhone : **Réglages › Confidentialité et sécurité › Mode développeur** → activer (redémarrage).
6. Dans Xcode, choisir ton iPhone en haut de la fenêtre, puis **▶ (Run)**.
7. Première fois : sur l'iPhone, **Réglages › Général › VPN et gestion de l'appareil** › ton identifiant ›
   **Faire confiance**. Relancer depuis Xcode.

Avec un compte gratuit, l'application fonctionne 7 jours sur l'iPhone branché (il suffit de relancer depuis
Xcode ensuite). Elle ne peut pas être envoyée à des amis.

## 3. La faire tester par des amis : TestFlight (compte Apple Developer)

1. S'inscrire à l'**Apple Developer Program** (developer.apple.com, 99 $/an ; validation en 1-2 jours).
2. Sur **App Store Connect** (appstoreconnect.apple.com) › **Apps** › **+** › Nouvelle app : plateforme iOS,
   nom « Hoop Bounce », langue Français, identifiant de paquet `com.echospeed.hoopbounce`, SKU `hoopbounce`.
3. Dans Xcode : **Team** = l'équipe du compte développeur ; en haut, choisir **Any iOS Device (arm64)** ;
   menu **Product › Archive**.
4. Fenêtre **Organizer** › **Distribute App** › **App Store Connect** › **Upload** (laisser les options par
   défaut). Le numéro de build (**Build**, onglet General) doit augmenter à chaque envoi (1, 2, 3…).
5. App Store Connect › l'app › **TestFlight** : la build apparaît après quelques minutes de traitement.
   - **Testeurs internes** (jusqu'à 100, membres de ton équipe App Store Connect) : disponible tout de suite ;
   - **Testeurs externes** (amis, jusqu'à 10 000) : créer un groupe, ajouter leurs e-mails ou activer un
     **lien public** ; la première build passe une courte vérification d'Apple (souvent < 24 h).
6. Les amis installent l'application **TestFlight** (App Store), ouvrent l'invitation, et installent Hoop
   Bounce. Les mises à jour arrivent automatiquement à chaque nouvelle build.

## Ce qui est configuré

- **Identifiant** `com.echospeed.hoopbounce`, nom affiché **Hoop Bounce**, version **1.0.0** (build 1),
  **iOS 16** minimum (iPhone 8 et plus récents), iPhone et iPad.
- **Paysage uniquement** (encoche à gauche ou à droite), **plein écran** : barre d'état masquée, barre d'accueil
  estompée, gestes du système sur les bords à confirmer d'un second glissement (`App/MainViewController.swift`) ;
  iPad en plein écran.
- WebView sans défilement ni rebond ; marges de l'encoche et de la barre d'accueil gérées par le jeu
  (`viewport-fit=cover`, `env(safe-area-inset-*)`).
- **Publicités** : `GADApplicationIdentifier` = application de **test** iOS de Google
  (`ca-app-pub-3940256099942544~1458002511`), bloc récompensé de test iOS dans `src/shared/ads-config.js`
  (choisi automatiquement sur iPhone) ; SKAdNetwork de Google ; texte de suivi (ATT) présent par précaution — le
  jeu ne demande jamais l'autorisation de suivi.
- **Vibrations** : retour haptique natif (`@capacitor/haptics`) — l'iPhone n'a pas `navigator.vibrate`.
- **Icône** 1024 × 1024 (sans transparence), **écran de démarrage** sombre avec le ballon (comme Android).
- **Sauvegarde** : la même qu'ailleurs (stockage local de la WebView, propre à l'application et conservé entre
  les lancements et les mises à jour).
- Pas de chiffrement propriétaire (`ITSAppUsesNonExemptEncryption` = NO) : pas de question d'export à chaque
  envoi TestFlight.

## Avant l'App Store (plus tard, pas pour TestFlight)

- Créer l'application iOS dans **AdMob**, mettre les vrais identifiants iOS dans `src/shared/ads-config.js`
  (`appId.ios.prod`, `rewarded.ios.prod`) et dans `ios/App/App/Info.plist` (`GADApplicationIdentifier`),
  compléter `SKAdNetworkItems` avec la liste fournie par Google, puis `useTestAds: false`.
- Questionnaire de confidentialité d'App Store Connect (données collectées par AdMob), politique de
  confidentialité en ligne, captures iPhone 6,9" et 6,5".

## Après chaque modification du jeu

```bash
npm run ios:sync    # puis ▶ dans Xcode
```

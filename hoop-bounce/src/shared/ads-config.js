// ════════════════════════════════════════════════════════════════════════════
//  CONFIGURATION DES PUBLICITÉS (Google AdMob) — le SEUL fichier à modifier avant la publication.
// ════════════════════════════════════════════════════════════════════════════
//
// Toutes les publicités du jeu sont des publicités RÉCOMPENSÉES, toujours lancées par le joueur
// (bouton « Regarder une publicité »). Aucune publicité forcée, jamais pendant un niveau.
//
// Pendant le développement : `useTestAds: true` → seuls les identifiants de TEST officiels de Google
// sont utilisés (aucune vraie publicité, aucun risque pour le compte AdMob).
//
// AVANT LA PUBLICATION (voir PROJECT.md, « Publicités → configuration avant publication ») :
//   1. créer l'application et les blocs d'annonces « Avec récompense » dans la console AdMob ;
//   2. remplacer chaque valeur `prod` ci-dessous (les XXXX) par les vrais identifiants ;
//   3. mettre le même identifiant d'application dans AndroidManifest.xml (native/android/README.md)
//      et, pour l'iPhone, l'identifiant iOS dans ios/App/App/Info.plist (GADApplicationIdentifier,
//      voir native/ios/README.md) ;
//   4. passer `useTestAds` à false.
// Android et iOS ont chacun leur application et leurs blocs dans AdMob : Google refuse un bloc Android
// dans une application iOS (et inversement). La plateforme est détectée automatiquement.
// Tant qu'un identifiant `prod` contient encore « XXXX », le jeu reste en mode test (sécurité).

export const ADS_CONFIG = {
  /** true pendant le développement. Ne passer à false que pour la version publiée. */
  useTestAds: true,

  /** Identifiant de l'application AdMob (format ca-app-pub-…~…). */
  appId: {
    android: {
      test: 'ca-app-pub-3940256099942544~3347511713', // application de test officielle de Google
      prod: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',
    },
    ios: {
      test: 'ca-app-pub-3940256099942544~1458002511', // application de test officielle de Google (iOS)
      prod: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',
    },
  },

  /**
   * Blocs d'annonces « Avec récompense » (format ca-app-pub-…/…), un par emplacement pour suivre
   * chacun dans la console AdMob. En test, tous utilisent le bloc récompensé de test de Google.
   */
  rewarded: {
    android: {
      test: 'ca-app-pub-3940256099942544/5224354917', // bloc « récompensé » de test officiel
      prod: {
        doubleCoins: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        checkpoint: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        bonusChest: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        wheelSpin: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      },
    },
    ios: {
      test: 'ca-app-pub-3940256099942544/1712485313', // bloc « récompensé » de test officiel (iOS)
      prod: {
        doubleCoins: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        checkpoint: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        bonusChest: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        wheelSpin: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      },
    },
  },

  /**
   * Emplacements : limite par jour (le joueur choisit toujours ; ces plafonds évitent l'abus et
   * gardent les récompenses précieuses).
   */
  placements: {
    doubleCoins: { dailyCap: 15 },  // doubler les pièces d'une victoire
    checkpoint: { dailyCap: 15 },   // reprendre au dernier drapeau après un échec
    bonusChest: { dailyCap: 1 },    // améliorer le coffre bonus du jour
    wheelSpin: { dailyCap: 3 },     // lancers supplémentaires de la roue de la chance
  },

  /** Appareils de test (identifiants donnés par le journal Android d'AdMob), facultatif. */
  testDeviceIds: [],

  /**
   * Contenu des annonces et public : à régler selon le public déclaré dans la Play Console.
   * Si le public visé inclut des enfants de moins de 13 ans, mettre `childDirected: true` et
   * respecter le programme Familles de Google Play.
   */
  maxAdContentRating: 'PG', // G · PG · T · MA
  childDirected: false,
  underAgeOfConsent: false,

  /** Délai avant de réessayer de charger une annonce après une erreur (s), puis ×2 à chaque échec. */
  retryDelay: 8,
  retryMax: 120,
};

const PLACEHOLDER = /X{4}/;

/** « ios » dans l'application iPhone (Capacitor), sinon « android » (Android et navigateur). */
export function currentPlatform() {
  return globalThis.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
}

/** Identifiants réellement utilisés (test tant que la configuration de production n'est pas complète). */
export function resolveAdIds(config = ADS_CONFIG, platform = currentPlatform()) {
  const key = config.appId[platform] && config.rewarded[platform] ? platform : 'android';
  const app = config.appId[key];
  const rw = config.rewarded[key];
  const prodReady = !config.useTestAds && !PLACEHOLDER.test(app.prod) && Object.values(rw.prod).every((id) => !PLACEHOLDER.test(id));
  if (prodReady) return { testing: false, appId: app.prod, unit: (placement) => rw.prod[placement] ?? Object.values(rw.prod)[0] };
  return { testing: true, appId: app.test, unit: () => rw.test, incomplete: !config.useTestAds };
}

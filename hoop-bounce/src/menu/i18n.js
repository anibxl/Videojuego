// Textes du menu en trois langues. Toute clé doit exister dans chaque langue (vérifié par les tests).

export const STRINGS = {
  fr: {
    'logo.tagline': 'Dribble. Rebondis. Marque.',
    'play': 'Jouer',
    'play.sub': 'Niveau 1 · Premier dribble',
    'nav.worlds': 'Mondes',
    'nav.modes': 'Modes',
    'nav.shop': 'Magasin',
    'nav.collection': 'Collection',
    'nav.settings': 'Paramètres',
    'back': 'Retour',
    'soon': 'À venir',
    'soon.long': 'Arrive dans une prochaine mise à jour',
    'coins': 'Pièces',

    'worlds.title': 'Mondes',
    'worlds.empty.title': 'De nouveaux terrains arrivent',
    'worlds.empty.body': 'Chaque monde aura ses propres terrains, ses pièges et ses paniers. Ils arrivent très bientôt.',

    'modes.title': 'Modes de jeu',
    'modes.subtitle': 'De nouvelles façons de jouer arrivent avec les prochaines mises à jour.',
    'mode.trickshot': 'Trickshot',
    'mode.endless': 'Endless',
    'mode.daily': 'Défis quotidiens',
    'mode.multi': 'Multijoueur',

    'shop.title': 'Magasin',
    'shop.tab.featured': 'À la une',
    'shop.tab.balls': 'Ballons',
    'shop.tab.trails': 'Traînées',
    'shop.tab.coins': 'Pièces',
    'shop.featured.label': 'Offre spéciale',
    'shop.featured.title': 'La boutique ouvre bientôt',
    'shop.featured.body': 'Ballons, traînées lumineuses et packs de pièces arrivent avec la prochaine mise à jour.',
    'shop.item.soon': 'Bientôt',
    'shop.empty': 'Aucun article pour le moment',

    'collection.title': 'Collection',
    'collection.count': '{n} ballon débloqué|{n} ballons débloqués',
    'collection.filter.all': 'Tous',
    'collection.filter.classic': 'Classiques',
    'collection.filter.rare': 'Rares',
    'collection.filter.legendary': 'Légendaires',
    'collection.empty.title': 'Ta collection est vide',
    'collection.empty.body': 'Les ballons que tu débloqueras apparaîtront ici.',

    'settings.title': 'Paramètres',
    'settings.audio': 'Son',
    'settings.music': 'Musique',
    'settings.sfx': 'Effets sonores',
    'settings.game': 'Jeu',
    'settings.vibration': 'Vibrations',
    'settings.vibration.hint': 'Retour tactile lors des rebonds et des boutons',
    'settings.quality': 'Qualité graphique',
    'settings.quality.low': 'Basse',
    'settings.quality.medium': 'Moyenne',
    'settings.quality.high': 'Haute',
    'settings.quality.hint': 'Baisse la qualité si le jeu n’est pas fluide',
    'settings.language': 'Langue',
    'settings.about': 'À propos',
    'settings.privacy': 'Politique de confidentialité',
    'settings.credits': 'Crédits',
    'settings.version': 'Version {v}',

    'privacy.title': 'Politique de confidentialité',
    'privacy.body':
      '<p>Hoop Bounce ne collecte aucune donnée personnelle.</p>' +
      '<p>Tes réglages, ta progression et tes records sont enregistrés uniquement sur ton appareil. Ils ne sont envoyés à aucun serveur et ne sont partagés avec personne.</p>' +
      '<p>Le jeu ne contient ni publicité ni outil de suivi. Si cela change dans une future version, cette page sera mise à jour avant et tu en seras informé dans le jeu.</p>' +
      '<p>Pour effacer tes données, désinstalle le jeu ou vide les données de l’application dans les réglages de ton téléphone.</p>',
    'credits.title': 'Crédits',
    'credits.body':
      '<p><strong>Conception et développement</strong><br>L’équipe Hoop Bounce</p>' +
      '<p><strong>Sons et musique</strong><br>Synthétisés en temps réel dans le jeu</p>' +
      '<p><strong>Polices</strong><br>Unbounded — The Unbounded Project Authors<br>Outfit — The Outfit Project Authors<br>Sous licence SIL Open Font License 1.1</p>' +
      '<p>Merci de jouer !</p>',
    'close': 'Fermer',
    'locked.toast': 'Ce mode arrive dans une prochaine mise à jour',
    'rotate': 'Tourne ton téléphone<br>à l’horizontale',
  },

  en: {
    'logo.tagline': 'Dribble. Bounce. Score.',
    'play': 'Play',
    'play.sub': 'Level 1 · First Dribble',
    'nav.worlds': 'Worlds',
    'nav.modes': 'Modes',
    'nav.shop': 'Shop',
    'nav.collection': 'Collection',
    'nav.settings': 'Settings',
    'back': 'Back',
    'soon': 'Coming soon',
    'soon.long': 'Arriving in a future update',
    'coins': 'Coins',

    'worlds.title': 'Worlds',
    'worlds.empty.title': 'New courts are on their way',
    'worlds.empty.body': 'Each world will have its own courts, traps and hoops. They are coming very soon.',

    'modes.title': 'Game modes',
    'modes.subtitle': 'New ways to play are coming with the next updates.',
    'mode.trickshot': 'Trickshot',
    'mode.endless': 'Endless',
    'mode.daily': 'Daily challenges',
    'mode.multi': 'Multiplayer',

    'shop.title': 'Shop',
    'shop.tab.featured': 'Featured',
    'shop.tab.balls': 'Balls',
    'shop.tab.trails': 'Trails',
    'shop.tab.coins': 'Coins',
    'shop.featured.label': 'Special offer',
    'shop.featured.title': 'The shop opens soon',
    'shop.featured.body': 'Balls, glowing trails and coin packs arrive with the next update.',
    'shop.item.soon': 'Soon',
    'shop.empty': 'Nothing here yet',

    'collection.title': 'Collection',
    'collection.count': '{n} ball unlocked|{n} balls unlocked',
    'collection.filter.all': 'All',
    'collection.filter.classic': 'Classic',
    'collection.filter.rare': 'Rare',
    'collection.filter.legendary': 'Legendary',
    'collection.empty.title': 'Your collection is empty',
    'collection.empty.body': 'The balls you unlock will appear here.',

    'settings.title': 'Settings',
    'settings.audio': 'Sound',
    'settings.music': 'Music',
    'settings.sfx': 'Sound effects',
    'settings.game': 'Game',
    'settings.vibration': 'Vibration',
    'settings.vibration.hint': 'Haptic feedback on bounces and buttons',
    'settings.quality': 'Graphics quality',
    'settings.quality.low': 'Low',
    'settings.quality.medium': 'Medium',
    'settings.quality.high': 'High',
    'settings.quality.hint': 'Lower the quality if the game is not smooth',
    'settings.language': 'Language',
    'settings.about': 'About',
    'settings.privacy': 'Privacy policy',
    'settings.credits': 'Credits',
    'settings.version': 'Version {v}',

    'privacy.title': 'Privacy policy',
    'privacy.body':
      '<p>Hoop Bounce does not collect any personal data.</p>' +
      '<p>Your settings, progress and records are stored only on your device. They are not sent to any server and are not shared with anyone.</p>' +
      '<p>The game contains no ads and no tracking tools. If this changes in a future version, this page will be updated first and you will be told in the game.</p>' +
      '<p>To delete your data, uninstall the game or clear the app data in your phone settings.</p>',
    'credits.title': 'Credits',
    'credits.body':
      '<p><strong>Design and development</strong><br>The Hoop Bounce team</p>' +
      '<p><strong>Sound and music</strong><br>Synthesized in real time by the game</p>' +
      '<p><strong>Fonts</strong><br>Unbounded — The Unbounded Project Authors<br>Outfit — The Outfit Project Authors<br>Licensed under the SIL Open Font License 1.1</p>' +
      '<p>Thanks for playing!</p>',
    'close': 'Close',
    'locked.toast': 'This mode arrives in a future update',
    'rotate': 'Turn your phone<br>sideways',
  },

  es: {
    'logo.tagline': 'Dribla. Rebota. Encesta.',
    'play': 'Jugar',
    'play.sub': 'Nivel 1 · Primer dribling',
    'nav.worlds': 'Mundos',
    'nav.modes': 'Modos',
    'nav.shop': 'Tienda',
    'nav.collection': 'Colección',
    'nav.settings': 'Ajustes',
    'back': 'Volver',
    'soon': 'Próximamente',
    'soon.long': 'Llegará en una próxima actualización',
    'coins': 'Monedas',

    'worlds.title': 'Mundos',
    'worlds.empty.title': 'Llegan nuevas canchas',
    'worlds.empty.body': 'Cada mundo tendrá sus propias canchas, trampas y canastas. Llegan muy pronto.',

    'modes.title': 'Modos de juego',
    'modes.subtitle': 'Nuevas formas de jugar llegarán con las próximas actualizaciones.',
    'mode.trickshot': 'Trickshot',
    'mode.endless': 'Endless',
    'mode.daily': 'Retos diarios',
    'mode.multi': 'Multijugador',

    'shop.title': 'Tienda',
    'shop.tab.featured': 'Destacado',
    'shop.tab.balls': 'Balones',
    'shop.tab.trails': 'Estelas',
    'shop.tab.coins': 'Monedas',
    'shop.featured.label': 'Oferta especial',
    'shop.featured.title': 'La tienda abre pronto',
    'shop.featured.body': 'Balones, estelas luminosas y packs de monedas llegan con la próxima actualización.',
    'shop.item.soon': 'Pronto',
    'shop.empty': 'Todavía no hay artículos',

    'collection.title': 'Colección',
    'collection.count': '{n} balón desbloqueado|{n} balones desbloqueados',
    'collection.filter.all': 'Todos',
    'collection.filter.classic': 'Clásicos',
    'collection.filter.rare': 'Raros',
    'collection.filter.legendary': 'Legendarios',
    'collection.empty.title': 'Tu colección está vacía',
    'collection.empty.body': 'Los balones que desbloquees aparecerán aquí.',

    'settings.title': 'Ajustes',
    'settings.audio': 'Sonido',
    'settings.music': 'Música',
    'settings.sfx': 'Efectos de sonido',
    'settings.game': 'Juego',
    'settings.vibration': 'Vibración',
    'settings.vibration.hint': 'Respuesta háptica en rebotes y botones',
    'settings.quality': 'Calidad gráfica',
    'settings.quality.low': 'Baja',
    'settings.quality.medium': 'Media',
    'settings.quality.high': 'Alta',
    'settings.quality.hint': 'Baja la calidad si el juego no va fluido',
    'settings.language': 'Idioma',
    'settings.about': 'Acerca de',
    'settings.privacy': 'Política de privacidad',
    'settings.credits': 'Créditos',
    'settings.version': 'Versión {v}',

    'privacy.title': 'Política de privacidad',
    'privacy.body':
      '<p>Hoop Bounce no recopila ningún dato personal.</p>' +
      '<p>Tus ajustes, tu progreso y tus récords se guardan solo en tu dispositivo. No se envían a ningún servidor ni se comparten con nadie.</p>' +
      '<p>El juego no contiene publicidad ni herramientas de seguimiento. Si esto cambia en una versión futura, esta página se actualizará antes y te avisaremos en el juego.</p>' +
      '<p>Para borrar tus datos, desinstala el juego o borra los datos de la aplicación en los ajustes de tu teléfono.</p>',
    'credits.title': 'Créditos',
    'credits.body':
      '<p><strong>Diseño y desarrollo</strong><br>El equipo de Hoop Bounce</p>' +
      '<p><strong>Sonido y música</strong><br>Sintetizados en tiempo real por el juego</p>' +
      '<p><strong>Tipografías</strong><br>Unbounded — The Unbounded Project Authors<br>Outfit — The Outfit Project Authors<br>Con licencia SIL Open Font License 1.1</p>' +
      '<p>¡Gracias por jugar!</p>',
    'close': 'Cerrar',
    'locked.toast': 'Este modo llegará en una próxima actualización',
    'rotate': 'Gira tu teléfono<br>en horizontal',
  },
};

export const LANGUAGE_NAMES = { fr: 'Français', en: 'English', es: 'Español' };

/** Traduit une clé. `{n}` et `{v}` sont remplacés ; « singulier|pluriel » selon n. */
export function t(lang, key, vars = {}) {
  let s = STRINGS[lang]?.[key] ?? STRINGS.fr[key] ?? key;
  if (s.includes('|') && typeof vars.n === 'number') {
    const [one, many] = s.split('|');
    s = vars.n === 1 || (lang === 'fr' && vars.n === 0) ? one : many;
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

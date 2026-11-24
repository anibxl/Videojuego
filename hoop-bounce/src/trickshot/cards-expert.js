// Les 30 nouvelles cartes du mode TRICKSHOT (campagne : le Trickshot devient un mode expert, 50 cartes).
// Chacune est construite autour d'UNE idée reconnaissable ; leur difficulté est MESURÉE par le solveur
// (tools/trickshot-check.mjs) et c'est cette mesure qui les range dans les 5 paliers (voir levels.js).
// Toutes ont une solution en un seul tir, enregistrée dans tests/fixtures/trickshot.json.
// Champs : comme dans levels.js (sans `n` ni `diff`, attribués à l'assemblage).

import { tee, frame, floor, plat, wall, block, glass, slope, bumper, bramp, ice, hoopPole, hoopWall, hoopHang, T } from './kit.js';

export const EXPERT_CARDS = [
  // ─── La fenêtre : un mur du sol au plafond, percé d'une seule fenêtre ───
  {
    id: 'la-fenetre',
    name: T('La fenêtre', 'The Window', 'La ventana'),
    hint: T('Un mur entier, une seule fenêtre : vise-la, le panier est juste derrière.', 'A full wall, a single window: aim for it, the hoop is right behind.', 'Un muro entero, una sola ventana: apúntale, el aro está justo detrás.'),
    start: tee(2.5, 1), hoop: hoopPole(18.5, 3.6, 1),
    solids: [...frame(), floor(-1, 25), wall(11, 1, 0.8, 5.6), wall(11, 8.8, 0.8, 4.7)],
  },
  // ─── Le plafond : une dalle basse au-dessus du panier, un muret devant ───
  {
    id: 'le-plafond',
    name: T('Le plafond', 'The Ceiling', 'El techo'),
    hint: T('Le muret bloque les tirs tendus : fais rebondir le ballon sous la dalle.', 'The low wall blocks flat shots: bounce the ball off the slab above.', 'El murete bloquea los tiros rasos: rebota el balón bajo la losa.'),
    start: tee(2.5, 1), hoop: hoopPole(19, 3.4, 1),
    solids: [...frame(), floor(-1, 25), block(8, 8.6, 16, 0.6), wall(13, 1, 0.6, 3.6)],
  },
  // ─── Les marches : le ballon dévale un escalier suspendu jusqu'au panier ───
  {
    id: 'les-marches',
    name: T('Les marches', 'The Steps', 'Los escalones'),
    hint: T('De marche en marche : le panier attend tout en bas, à gauche.', 'Step by step: the hoop waits at the bottom left.', 'De escalón en escalón: el aro espera abajo a la izquierda.'),
    start: tee(21.5, 11), hoop: hoopPole(2.6, 3.4, 1, 1),
    solids: [...frame(), plat(19, 11, 6, { h: 0.6 }), plat(14, 8, 3.2, { hang: true }), plat(8.6, 5.4, 3.2, { hang: true }), floor(-1, 6.5)],
  },
  // ─── Double trampoline : deux toiles au-dessus du vide ───
  {
    id: 'double-trampoline',
    name: T('Double trampoline', 'Double Trampoline', 'Doble trampolín'),
    hint: T('Deux trampolines au-dessus du vide : le premier lance vers le second.', 'Two trampolines over the void: the first one throws you to the second.', 'Dos trampolines sobre el vacío: el primero te lanza al segundo.'),
    start: tee(2.5, 4), hoop: hoopHang(21, 6.4, -1),
    solids: [...frame(), plat(-1, 4, 5, { h: 0.6 }), block(-1, 7.4, 8, 0.5), wall(11.4, -2, 1, 8), block(18.6, 8.4, 6, 0.6)],
    trampolines: [{ x: 7.4, y: 1, w: 2.4 }, { x: 14.4, y: 1, w: 2.4 }],
  },
  // ─── Le mur de caisses : seul un tir puissant passe ───
  {
    id: 'le-mur-de-caisses',
    name: T('Le mur de caisses', 'The Crate Wall', 'El muro de cajas'),
    hint: T('Une pile de caisses barre le chemin : frappe-la assez fort pour passer au travers.', 'A stack of crates blocks the way: hit it hard enough to burst through.', 'Una pila de cajas cierra el paso: golpéala con fuerza para atravesarla.'),
    start: tee(2.5, 1), hoop: hoopPole(19.5, 3.2, 1),
    solids: [...frame(), floor(-1, 25), block(12, 6.6, 12, 0.6)],
    breakables: [{ x: 12, y: 1, w: 0.7, h: 5.6, strength: 9 }],
  },
  // ─── Le portail du ciel : tirer en l'air, ressortir au-dessus du panier ───
  {
    id: 'portail-du-ciel',
    name: T('Le portail du ciel', 'Sky Portal', 'El portal del cielo'),
    hint: T('Le panier est enfermé : le portail du plafond est la seule entrée.', 'The hoop is locked away: the ceiling portal is the only way in.', 'El aro está encerrado: el portal del techo es la única entrada.'),
    start: tee(9, 1), hoop: hoopPole(19.4, 3.2, 1),
    solids: [...frame(), floor(-1, 25), wall(15, 1, 0.6, 9.4), block(15, 10.4, 9, 0.6)],
    teleporters: [{ a: { x: 3.4, y: 11.4 }, b: { x: 19.6, y: 9.2 }, r: 0.85 }],
  },
  // ─── Le trou de serrure : une dalle percée d'une seule fente ───
  {
    id: 'trou-de-serrure',
    name: T('Le trou de serrure', 'The Keyhole', 'La cerradura'),
    hint: T('Une seule fente dans la dalle : passe par-dessus, puis tombe dedans.', 'A single slit in the slab: go over it, then drop through.', 'Una sola rendija en la losa: pasa por encima y cae dentro.'),
    start: tee(2.5, 1), hoop: hoopPole(17.6, 3.2, 1),
    solids: [...frame(), floor(-1, 25), block(6, 7, 8.6, 0.6), block(16.2, 7, 7.8, 0.6), wall(6, 1, 0.6, 6)],
  },
  // ─── La cheminée : un ventilateur dans un conduit, le panier au-dessus de la sortie ───
  {
    id: 'la-cheminee',
    name: T('La cheminée', 'The Chimney', 'La chimenea'),
    hint: T('Fais rouler le ballon dans la bouche du conduit : le souffle le monte et le dépose dans le panier.', 'Roll the ball into the duct’s mouth: the draft lifts it and drops it in the hoop.', 'Haz rodar el balón por la boca del conducto: el soplo lo sube y lo deja en el aro.'),
    start: tee(21.5, 1), hoop: hoopPole(9, 6.6, 1, 1),
    solids: [...frame(), floor(-1, 25), wall(10, 1, 0.5, 6.6), wall(13.5, 2.4, 0.5, 7.6), block(14, 4.4, 10, 0.5), block(-1, 10, 11, 0.5)],
    fans: [{ x: 10.5, y: 1, w: 3, h: 9.6, strength: 110 }],
  },
  // ─── La navette : rebondir sur une plateforme qui va et vient ───
  {
    id: 'la-navette',
    name: T('La navette', 'The Shuttle', 'La lanzadera'),
    hint: T('La navette passe et repasse au-dessus du vide : rebondis dessus au bon moment.', 'The shuttle goes back and forth over the void: bounce on it at the right time.', 'La lanzadera va y viene sobre el vacío: rebota en ella en el momento justo.'),
    start: tee(2.5, 6), hoop: hoopPole(21, 3.6, 1),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), floor(18.5, 25), block(13, 9.4, 11, 0.6)],
    movers: [{ x: 7, y: 3.2, w: 2.6, h: 0.5, path: { dx: 6, dy: 0, period: 3, phase: 0 } }],
  },
  // ─── Le tremplin : rouler, monter la rampe, s'envoler ───
  {
    id: 'le-tremplin',
    name: T('Le tremplin', 'The Ramp', 'La rampa'),
    hint: T('Un tir tendu, au ras du sol : la rampe envoie le ballon sur la corniche du panier.', 'A low, flat shot: the ramp sends the ball onto the hoop’s ledge.', 'Un tiro raso: la rampa manda el balón a la cornisa del aro.'),
    start: tee(2.5, 1), hoop: hoopPole(20.4, 4.4, 2.4),
    solids: [...frame(), floor(-1, 15), slope([[9.6, 1], [14.6, 1], [14.6, 3.6]]), plat(18, 2.4, 7, { h: 0.6 }), block(-1, 5.4, 15, 0.6)],
  },
  // ─── Le labyrinthe : un chemin en S entre des murs ───
  {
    id: 'le-labyrinthe',
    name: T('Le labyrinthe', 'The Maze', 'El laberinto'),
    hint: T('Par-dessus le premier mur, puis sous le second : le panier est au fond du labyrinthe.', 'Over the first wall, then under the second: the hoop is at the end of the maze.', 'Por encima del primer muro y luego por debajo del segundo: el aro está al fondo del laberinto.'),
    start: tee(2.5, 1), hoop: hoopPole(16.2, 2.8, 1),
    solids: [...frame(), floor(-1, 25), wall(7, 1, 0.6, 8.2), wall(12.6, 5.2, 0.6, 8.3)],
  },
  // ─── La triple bande : le panier dans une niche, au fond d'un couloir ───
  {
    id: 'la-niche',
    name: T('La niche', 'The Alcove', 'El nicho'),
    hint: T('Le panier tourne le dos, au fond d’une niche : fais rebondir le ballon contre le mur du fond.', 'The hoop faces away, deep in an alcove: bounce the ball off the back wall.', 'El aro está de espaldas, al fondo de un nicho: rebota el balón en la pared del fondo.'),
    start: tee(12, 1), hoop: hoopWall(1.2, 8.4, -1),
    solids: [...frame(), floor(-1, 25), block(-1, 6.6, 9, 0.6), wall(8, 6.6, 0.6, 2.4)],
  },
  // ─── Laser et portail : le laser garde le portail, un second laser garde la sortie ───
  {
    id: 'laser-et-portail',
    name: T('Laser et portail', 'Laser & Portal', 'Láser y portal'),
    hint: T('Deux lasers à contretemps : un instant seulement, les deux sont éteints.', 'Two lasers out of step: for one moment only, both are off.', 'Dos láseres a contratiempo: solo un instante, los dos están apagados.'),
    start: tee(2.5, 4), hoop: hoopHang(20.4, 5.6, -1),
    solids: [...frame(), plat(-1, 4, 5.5, { h: 0.6 }), block(-1, 8.2, 14.5, 0.6), wall(13.5, -2, 0.6, 10.2)],
    teleporters: [{ a: { x: 9.8, y: 4.6 }, b: { x: 14.6, y: 10.4 }, r: 0.85 }],
    lasers: [{ x1: 7.9, y1: -1, x2: 7.9, y2: 8.2, period: 2.4, on: 1.2, phase: 0 }, { x1: 17.2, y1: 6.8, x2: 17.2, y2: 13.5, period: 2.4, on: 1.2, phase: 0.35 }],
  },
  // ─── La guillotine : une lame qui monte et descend devant le panier ───
  {
    id: 'la-guillotine',
    name: T('La guillotine', 'The Guillotine', 'La guillotina'),
    hint: T('La lame monte et descend devant le panier : passe juste quand elle est en haut.', 'The blade goes up and down in front of the hoop: get through just as it rises.', 'La cuchilla sube y baja delante del aro: pasa justo cuando está arriba.'),
    start: tee(2.5, 1), hoop: hoopPole(20, 3.2, 1),
    solids: [...frame(), floor(-1, 25), block(14, 7.4, 10, 0.6)],
    saws: [{ x: 15, y: 1.9, r: 0.9, path: { dx: 0, dy: 4.6, period: 2.6, phase: 0 } }, { x: 15, y: 4.2, r: 0.9, path: { dx: 0, dy: 2.3, period: 1.3, phase: 0.5 } }],
  },
  // ─── Le flipper géant : des bumpers partout ───
  {
    id: 'flipper-geant',
    name: T('Le flipper géant', 'Giant Pinball', 'El pinball gigante'),
    hint: T('Bumpers en haut, bumpers en bas : trouve la trajectoire qui finit dans le panier.', 'Bumpers above, bumpers below: find the path that ends in the hoop.', 'Bumpers arriba, bumpers abajo: encuentra la trayectoria que acaba en el aro.'),
    start: tee(2.5, 1), hoop: hoopHang(12, 6.2, 1),
    solids: [...frame(), floor(-1, 25), bumper(7, 9, 2, 0.6), bumper(15, 11, 2, 0.6), bumper(20, 6, 0.6, 3), block(10, 4.4, 4, 0.5), bramp([[24, 1], [24, 4], [21, 1]])],
  },
  // ─── Les clignotants : le pont apparaît et disparaît ───
  {
    id: 'les-clignotants',
    name: T('Les clignotants', 'The Blinkers', 'Los intermitentes'),
    hint: T('Les dalles lumineuses apparaissent et disparaissent : la bonne doit être là au rebond.', 'The light slabs come and go: the right one must be there when you bounce.', 'Las losas luminosas aparecen y desaparecen: la buena debe estar ahí al rebotar.'),
    start: tee(2.5, 4), hoop: hoopPole(21.6, 3.6, 1),
    solids: [...frame(), plat(-1, 4, 5, { h: 0.6 }), floor(19.5, 25), block(9, 9.6, 15, 0.6)],
    blinkers: [{ x: 8, y: 1.6, w: 2.6, h: 0.45, period: 2.4, on: 1.2, phase: 0 }, { x: 13.4, y: 2.6, w: 2.6, h: 0.45, period: 2.4, on: 1.2, phase: 0.5 }],
  },
  // ─── Le puits : le panier au fond, sous une ouverture étroite ───
  {
    id: 'le-puits',
    name: T('Le puits', 'The Well', 'El pozo'),
    hint: T('Le panier est au fond du puits : il faut retomber pile dans l’ouverture.', 'The hoop is at the bottom of the well: drop right into the opening.', 'El aro está al fondo del pozo: cae justo en la abertura.'),
    start: tee(2.5, 6), hoop: hoopPole(15.6, 2.4, 0.6),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), floor(13, 18.6, 0.6), wall(12.4, -2, 0.6, 9.4), wall(18.6, -2, 0.6, 9.4), block(12.4, 7.4, 2.6, 0.5), block(17.4, 7.4, 1.8, 0.5)],
  },
  // ─── Le rebond du fond : la toile, au-dessus du vide, lance contre le mur du fond ───
  {
    id: 'rebond-du-fond',
    name: T('Le rebond du fond', 'Back-Wall Bounce', 'El rebote del fondo'),
    hint: T('La toile, au-dessus du vide, envoie le ballon contre le mur du fond : il revient vers le panier.', 'The trampoline, over the void, throws the ball at the back wall: it comes back to the hoop.', 'La lona, sobre el vacío, lanza el balón contra la pared del fondo: vuelve hacia el aro.'),
    start: tee(2.5, 6), hoop: hoopHang(12.6, 8.2, 1),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), glass(-1, 8, 6.4, 0.3), block(5, 6.8, 8.4, 0.5)],
    trampolines: [{ x: 16.4, y: 1, w: 2.6 }],
  },
  // ─── Le chas de l'aiguille : une fenêtre minuscule, tout au fond ───
  {
    id: 'chas-de-l-aiguille',
    name: T('Le chas de l’aiguille', 'Eye of the Needle', 'El ojo de la aguja'),
    hint: T('Une fenêtre à peine plus large que le ballon, tout au fond : un seul tir passe.', 'A window barely wider than the ball, far away: only one shot gets through.', 'Una ventana apenas más ancha que el balón, al fondo: solo un tiro pasa.'),
    start: tee(2.5, 1), hoop: hoopPole(21.4, 3.2, 1),
    solids: [...frame(), floor(-1, 25), wall(18.4, 1, 0.6, 6.4), wall(18.4, 8.4, 0.6, 5.1), block(19, 9.6, 5, 0.5)],
  },
  // ─── Le double verrou : un bouton ouvre la porte, un second ouvre la trappe au-dessus du panier ───
  {
    id: 'double-verrou',
    name: T('Le double verrou', 'Double Lock', 'Doble cerrojo'),
    hint: T('Premier bouton : la porte. Second bouton : la trappe au-dessus du panier. Le ballon doit garder assez d’élan pour les deux.', 'First button: the door. Second button: the trapdoor over the hoop. The ball must keep enough speed for both.', 'Primer botón: la puerta. Segundo botón: la trampilla sobre el aro. El balón debe conservar impulso para los dos.'),
    start: tee(2.5, 6), hoop: hoopPole(12.3, -0.3, -1.6),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), floor(5, 12), floor(12, 14.6, -1.6), floor(14.6, 25), wall(9, 4.2, 0.5, 9.3), wall(17.6, 1, 0.6, 12.5)],
    switches: [{ x: 6.2, y: 1, w: 1.4, target: 'porte' }, { x: 10, y: 1, w: 1.2, target: 'trappe' }],
    doors: [{ id: 'porte', x: 9, y: 1, w: 0.5, h: 3.2, open: { dx: 0, dy: -3.3 }, duration: 0.3 }, { id: 'trappe', x: 12, y: 0.6, w: 2.6, h: 0.4, open: { dx: -2.7, dy: 0 }, duration: 0.3 }],
  },
  // ─── Les portails en chaîne : trois portails, trois entrées étroites ───
  {
    id: 'portails-en-chaine',
    name: T('Portails en chaîne', 'Portal Chain', 'Portales en cadena'),
    hint: T('Trois salles fermées, deux portails : le même tir doit traverser les deux.', 'Three closed rooms, two portals: the same shot must go through both.', 'Tres salas cerradas, dos portales: el mismo tiro debe atravesar los dos.'),
    start: tee(2, 1.5), hoop: hoopPole(20.2, 9.6, 8.2),
    solids: [...frame(), plat(-1, 1.5, 8, { h: 0.6 }), wall(7, -2, 0.5, 15.5), plat(7.5, 1.5, 8, { h: 0.6 }), wall(15.5, -2, 0.5, 15.5), floor(16, 25, 8.2)],
    teleporters: [{ a: { x: 5.2, y: 5.5 }, b: { x: 9, y: 3 }, r: 0.75 }, { a: { x: 13.6, y: 5 }, b: { x: 16.8, y: 11 }, r: 0.75 }],
  },
  // ─── Les lasers croisés : deux lasers, une navette ───
  {
    id: 'lasers-croises',
    name: T('Lasers croisés', 'Crossed Lasers', 'Láseres cruzados'),
    hint: T('Une navette, deux lasers : le tir doit passer entre les éclairs et rebondir sur la navette.', 'A shuttle, two lasers: the shot must slip between the flashes and bounce off the shuttle.', 'Una lanzadera, dos láseres: el tiro debe pasar entre los destellos y rebotar en la lanzadera.'),
    start: tee(2.5, 6), hoop: hoopPole(21.4, 3.6, 1),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), floor(19, 25), block(12, 9.6, 12, 0.6)],
    movers: [{ x: 8, y: 3, w: 2.4, h: 0.5, path: { dx: 6, dy: 0, period: 3.2, phase: 0 } }],
    lasers: [{ x1: 7, y1: -1, x2: 7, y2: 9.6, period: 2.4, on: 1, phase: 0 }, { x1: 17.4, y1: -1, x2: 17.4, y2: 9.6, period: 2.4, on: 1, phase: 0.5 }],
  },
  // ─── Le coffre-fort : caisse, bouton, porte, ventilateur ───
  {
    id: 'le-coffre-fort',
    name: T('Le coffre-fort', 'The Safe', 'La caja fuerte'),
    hint: T('Brise la caisse du couloir, roule sur le bouton : la porte s’ouvre et le ventilateur s’allume.', 'Smash the crate in the corridor, roll over the button: the door opens and the fan starts.', 'Rompe la caja del pasillo, rueda sobre el botón: la puerta se abre y el ventilador arranca.'),
    start: tee(2.5, 4.4), hoop: hoopHang(20.2, 7.8, -1),
    solids: [...frame(), plat(-1, 4.4, 4.4, { h: 0.6 }), floor(5.4, 25), block(5.4, 5, 11.5, 0.5), wall(16.4, 5, 0.5, 8.5)],
    breakables: [{ x: 7.6, y: 1, w: 0.6, h: 4, strength: 6 }],
    switches: [{ x: 11, y: 1, w: 1.4, target: 'safe' }],
    doors: [{ id: 'safe', x: 16.4, y: 1, w: 0.5, h: 4, open: { dx: 0, dy: -4.1 }, duration: 0.3 }],
    fans: [{ x: 17.4, y: 1, w: 2.6, h: 6.6, strength: 120, target: 'safe' }],
  },
  // ─── L'horloge : deux plateformes qui montent et descendent à contretemps ───
  {
    id: 'l-horloge',
    name: T('L’horloge', 'The Clock', 'El reloj'),
    hint: T('Deux ascenseurs à contretemps : rebondis sur le premier quand le second est en haut.', 'Two lifts out of step: bounce on the first while the second is up.', 'Dos ascensores a contratiempo: rebota en el primero cuando el segundo está arriba.'),
    start: tee(2.5, 6), hoop: hoopPole(21.8, 9.6, 8),
    solids: [...frame(), plat(-1, 6, 5, { h: 0.6 }), plat(19.6, 8, 5.4, { h: 0.6 }), block(5, 11.4, 14, 0.5)],
    movers: [{ x: 7.4, y: 1.6, w: 2.4, h: 0.5, path: { dx: 0, dy: 3.6, period: 2.8, phase: 0 } }, { x: 13.4, y: 2.6, w: 2.4, h: 0.5, path: { dx: 0, dy: 3.6, period: 2.8, phase: 0.5 } }],
  },
  // ─── Le grand huit : rampes-bumpers, le ballon fait le tour de la salle ───
  {
    id: 'le-grand-huit',
    name: T('Le grand huit', 'The Loop', 'La montaña rusa'),
    hint: T('Les rampes font faire au ballon une boucle complète avant de le déposer au panier.', 'The ramps send the ball round a full loop before dropping it in the hoop.', 'Las rampas hacen dar al balón una vuelta completa antes de dejarlo en el aro.'),
    start: tee(12, 1), hoop: hoopHang(12, 7, -1),
    solids: [...frame(), floor(8, 16), bramp([[0, 1], [5, 1], [0, 6]]), bramp([[0, 8.6], [0, 13.5], [4.6, 13.5]]), bramp([[24, 8.6], [19.4, 13.5], [24, 13.5]]), bramp([[19, 1], [24, 1], [24, 6]]), block(9, 4.4, 6, 0.5)],
  },
  // ─── L'abîme : le panier au fond d'un puits fermé par une dalle clignotante ───
  {
    id: 'l-abime',
    name: T('L’abîme', 'The Abyss', 'El abismo'),
    hint: T('La dalle au-dessus du puits clignote : elle doit être là pour le rebond, puis partie pour la chute.', 'The slab over the shaft blinks: it must be there for the bounce, then gone for the drop.', 'La losa sobre el pozo parpadea: debe estar para el rebote y luego desaparecer para la caída.'),
    start: tee(2.5, 9), hoop: hoopPole(17.4, 2.4, 0.6),
    solids: [...frame(), plat(-1, 9, 5, { h: 0.6 }), floor(14, 21, 0.6), wall(13.4, -2, 0.6, 8.8), wall(21, -2, 0.6, 8.8), block(6, 4, 4, 0.5)],
    blinkers: [{ x: 14, y: 6.4, w: 7, h: 0.4, period: 2.6, on: 1.3, phase: 0 }],
  },
  // ─── La tour : monter en zigzag jusqu'au panier suspendu tout en haut ───
  {
    id: 'la-tour',
    name: T('La tour', 'The Tower', 'La torre'),
    hint: T('De paroi en paroi, toujours plus haut : le panier est au sommet de la tour.', 'Wall to wall, ever higher: the hoop is at the top of the tower.', 'De pared en pared, cada vez más alto: el aro está en lo alto de la torre.'),
    start: tee(10.4, 1), hoop: hoopHang(12, 9.4, 1),
    solids: [...frame(), floor(-1, 25), wall(8, 1, 0.6, 9.4), wall(15.4, 1, 0.6, 12.5), block(8.6, 4.6, 2.4, 0.5), block(14.2, 7.6, 1.2, 0.5)],
  },
  // ─── La mécanique : portail, trampoline, bouton, porte, fosse ───
  {
    id: 'la-mecanique',
    name: T('La mécanique', 'The Contraption', 'El artilugio'),
    hint: T('Portail, trampoline, bouton, porte, fosse : chaque pièce de la mécanique doit s’enchaîner, du premier rebond à la fosse.', 'Portal, trampoline, button, door, pit: every part of the contraption must chain, from the first bounce to the pit.', 'Portal, trampolín, botón, puerta, foso: cada pieza del artilugio debe encadenarse, del primer rebote al foso.'),
    start: tee(2.5, 1.5), hoop: hoopPole(20.4, -0.2, -1.4),
    solids: [...frame(), plat(-1, 1.5, 7, { h: 0.6 }), glass(-1, 6, 7.3, 0.3), wall(6, 1.5, 0.3, 4.5), floor(10.4, 18.6), floor(18.6, 25, -1.4), wall(17, 4.6, 0.5, 8.9)],
    teleporters: [{ a: { x: 3.6, y: 4 }, b: { x: 9.2, y: 4.4 }, r: 0.8 }],
    switches: [{ x: 13.8, y: 1, w: 1.2, target: 'last' }],
    doors: [{ id: 'last', x: 17, y: 1, w: 0.5, h: 3.6, open: { dx: 0, dy: -3.7 }, duration: 0.3 }],
    trampolines: [{ x: 8, y: 1, w: 2.4 }],
  },
  // ─── Les scies : deux lames montent et descendent sur la trajectoire ───
  {
    id: 'les-scies',
    name: T('Les scies', 'The Saws', 'Las sierras'),
    hint: T('Deux scies balaient le passage à contretemps : lance au moment où le chemin s’ouvre.', 'Two saws sweep the passage out of step: shoot when the path opens.', 'Dos sierras barren el paso a contratiempo: tira cuando el camino se abra.'),
    start: tee(2.5, 4), hoop: hoopPole(21, 3.4, 1),
    solids: [...frame(), plat(-1, 4, 5, { h: 0.6 }), floor(18.5, 25), block(6, 10.4, 18, 0.6)],
    saws: [{ x: 9.5, y: 3, r: 0.7, path: { dx: 0, dy: 6, period: 2.6, phase: 0 } }, { x: 14.5, y: 3, r: 0.7, path: { dx: 0, dy: 6, period: 2.6, phase: 0.5 } }],
  },
  // ─── La glissade : la glace emporte le ballon, il faut qu'il s'envole pile au bord ───
  {
    id: 'la-glissade',
    name: T('La glissade', 'The Slide', 'El deslizamiento'),
    hint: T('La glace ne freine pas : le ballon doit quitter la piste juste au bord pour retomber dans le panier.', 'Ice doesn’t brake: the ball must leave the track right at the edge to drop into the hoop.', 'El hielo no frena: el balón debe salir de la pista justo en el borde para caer en el aro.'),
    start: tee(2.5, 9), hoop: hoopPole(20.6, 3, 1),
    solids: [...frame(), plat(-1, 9, 5, { h: 0.6 }), ice(5, 5.4, 9, 0.5), floor(17.8, 25), block(14, 8.6, 10, 0.5)],
  },
];

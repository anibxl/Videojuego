# 🎟️ RascaManía

Juego de boletos de rasca virtuales hecho con HTML, CSS y JavaScript puro, sin dependencias ni paso de compilación.
**Se juega solo con monedas ficticias: no hay apuestas ni dinero real.**

## Cómo jugar

Abre `index.html` en el navegador (doble clic o cualquier servidor estático, por ejemplo GitHub Pages).

1. Empiezas con **500 monedas** (más si has renacido).
2. Compra boletos en la **Tienda** (de uno en uno, ×5 o ×10).
3. **Rasca** arrastrando el ratón o el dedo sobre la capa metálica; el contenido se descubre poco a poco. El botón «⚡ Rascar todo» se desbloquea con la habilidad «Rascado automático».
4. Si salen **3 símbolos iguales**, ganas su premio. En Oro, Diamante y Legendario, la casilla **MULTIPLICADOR** lo multiplica.
5. Gana experiencia, sube de nivel y desbloquea boletos mejores.

## 📅 Partida por días

La partida avanza **por días**. Cada día tienes un número de **jugadas** (cada boleto o partida gasta una) y un **objetivo de monedas** que tienes que tener cuando se acaben.

- **Objetivo:** 500 el día 1 y un 25 % más cada día (650, 800, 1.000… unos 4.650 el día 11 y unos 14.000 el día 16).
- **Jugadas:** 12 el día 1, y 1 o 2 más cada día, hasta un máximo de 40.
- **Al empezar cada día** recibes un bonus del 12 % del objetivo de ese día, proporcional a las jugadas que usaste el día anterior (si cierras el día antes, recibes menos), la producción de tu ⛏️ mina y, con la habilidad 🏦 Banco, intereses sobre lo que superaste el objetivo (como mucho, el 50 % del nuevo objetivo).
- **Terminar antes:** si ya tienes el objetivo, puedes cerrar el día sin gastar el resto de jugadas, para no arriesgar.
- **Si no llegas**, la partida termina y empiezas de cero, salvo que tengas una **❤️ Segunda vida**: te salva, conservas tu progreso y pasas al día siguiente.
- `node tools/simulate-days.js` simula miles de partidas para ajustar la dificultad. Sin habilidades, mina ni objetos y usando todas las jugadas, la mitad de las partidas llega al día 6 y un 23 % pasa del día 7; las mejoras son las que permiten llegar más lejos.

## Boletos

| Boleto | Precio | Nivel | Prob. de premio | Premio máximo | Retorno teórico |
|---|---:|---:|---:|---:|---:|
| Básico | 10 | 1 | 1 de 1,98 | 1.000 | 91,5 % |
| Plata | 50 | 3 | 1 de 2,20 | 5.000 | 93,5 % |
| Oro | 200 | 6 | 1 de 2,60 | 50.000 | 94,8 % |
| Diamante | 1.000 | 10 | 1 de 2,83 | 500.000 | 96,3 % |
| Legendario | 5.000 | 15 | 1 de 4,21 | 1.000.000 | 97,0 % |

Las tablas completas están en `js/data.js` y se pueden ver dentro del juego, en *Estadísticas → Probabilidades programadas*.

### Cómo se decide el premio

- El resultado se sortea **al comprar** el boleto según su tabla de probabilidades, y se guarda con él. Recargar la página no cambia el resultado.
- Después se genera una cuadrícula **coherente** con ese resultado. En un boleto premiado hay exactamente 3 símbolos ganadores y ningún otro símbolo aparece 3 veces. En uno sin premio, ningún símbolo aparece 3 veces.
- `node tools/simulate.js [n]` simula `n` boletos de cada tipo. Compara la teoría con lo observado y comprueba que todas las cuadrículas sean coherentes.

## ✨ Premios extremadamente raros

Además del premio normal, cada boleto o partida tiene un sorteo aparte de acontecimientos muy raros. El premio es un múltiplo del precio de lo que juegas, así que cada nivel solo suma un 1 % al retorno medio. Cada uno tiene su propia animación y su propio sonido:

| Acontecimiento | Probabilidad | Premio | Animación |
|---|---|---|---|
| 🌠 Estrella fugaz | 1 de 10.000 | ×100 el precio | cielo nocturno cruzado por estrellas fugaces |
| 💰 Lluvia de oro | 1 de 100.000 | ×1.000 | la pantalla se oscurece y llueven monedas durante segundos |
| 💥 Supernova | 1 de 1.000.000 | ×10.000 | apagón; un punto de luz crece y estalla con ondas expansivas |
| 🌌 Big Bang | 1 de 10.000.000 | ×100.000 | salto a velocidad luz, cuenta atrás 3-2-1 y explosión de todos los colores |

## 📒 Álbum de premios

Colección de los 132 premios del juego: cada símbolo ganador de cada boleto (normales, secretos y de edición limitada) y de cada juego, más los 4 acontecimientos raros. Muestra los que has conseguido (con cuántas veces) y los que faltan como «?». **Se conserva siempre**, aunque pierdas o renazcas. Completar el 25 % y el 50 % da logros.

## 🌟 Renacer

Al llegar al nivel 10 puedes renacer: empiezas una partida nueva desde el día 1, pero con mejoras permanentes que se acumulan con cada renacimiento. Cada renacimiento posterior pide 3 niveles más (13, 16, 19…).

| Por cada renacimiento | |
|---|---|
| 🍀 Premios | +4 % |
| 📚 Experiencia | +10 % |
| 💰 Monedas iniciales | +150 |
| 🎟️ Jugadas al día | +1 |

Al renacer se conservan el álbum, los récords y los renacimientos, y también se mantienen si pierdes una partida.

## Juegos sin rascar

Siguen la misma mecánica (3 símbolos iguales = premio, resultado sorteado con una tabla de probabilidades), pero se juegan sin rascar:

| Juego | Tipo | Precio | Nivel | Prob. de premio | Premio máximo | Retorno teórico |
|---|---|---:|---:|---:|---:|---:|
| Tragaperras clásica | 3 rodillos | 25 | 2 | 1 de 2,16 | 5.000 | 95,0 % |
| Cajas sorpresa | 3 cajas | 100 | 4 | 1 de 2,28 | 25.000 | 93,0 % |
| Máquina mega | 3 rodillos | 500 | 8 | 1 de 2,59 | 100.000 | 95,5 % |
| Cofres reales | 3 cajas | 2.500 | 12 | 1 de 2,83 | 750.000 | 95,3 % |

Si cierras la página mientras giran los rodillos, la partida se cobra al volver.

## Mecánicas especiales

### 🕵️ Boletos secretos
Aparecen al azar en la tienda cada pocos minutos y solo durante **45 segundos**. Puedes comprar un máximo de 3 por aparición. Tienen símbolos y premios que no existen en ningún otro boleto, y como recompensa por estar atento devuelven algo más de lo que cuestan.

| Boleto | Precio | Nivel | Prob. de premio | Premio máximo | Retorno |
|---|---:|---:|---:|---:|---:|
| Sombra | 100 | 1 | 1 de 1,97 | 30.000 | 107 % |
| Fantasma | 800 | 6 | 1 de 2,19 | 300.000 (×5) | 108 % |
| Mítico | 4.000 | 12 | 1 de 2,49 | 1.500.000 | 108 % |

### 🎉 Eventos y boletos de edición limitada
El calendario de eventos es el mismo para todos los jugadores (se calcula con la fecha UTC). Cada 3 días empieza un evento que dura 2 días; después hay un día de descanso y la tienda muestra la cuenta atrás del siguiente. Hay 6 eventos que se van turnando: Halloween, Navidad, Primavera, Verano, Festival lunar y Expedición espacial. Cada uno trae su boleto de **edición limitada** (300 monedas, nivel 3, retorno del 97 %) con símbolos y premios exclusivos de hasta 150.000. Cuando el evento termina, el boleto desaparece de la tienda; los que ya hayas comprado se conservan.

### 🌍 Jackpot mundial
Es un bote que se acumula: empieza en 100.000, crece 50 monedas por minuto y suma el 1 % de lo que juega **cada jugador**. Cada boleto o partida tiene una probabilidad de llevarse el bote entero proporcional a su precio (Legendario: 1 de 2.000; Básico: 1 de 1.000.000). Al ganarlo, el bote vuelve a empezar para todos.

- En la versión publicada en **claude.ai**, el bote es compartido entre todos los que abren el juego. Usa la base de datos de la página: cada jugador guarda solo su aportación (el bote es la suma de todas) y, para cobrarlo, se toma un bloqueo corto que impide que dos personas se lleven el mismo bote.
- Al abrir `index.html` o GitHub Pages no hay servidor, así que el bote funciona en **modo local** (solo en ese navegador) y el juego lo indica.

## Objetos

- ❤️ **Segunda vida:** te salva cuando no llegas al objetivo del día (máximo 3).
- 🧪 **Poción de sabiduría:** doble de experiencia durante 20 partidas.
- 🔮 **Bola de cristal:** 2 casillas extra descubiertas en los próximos 8 boletos.
- 🧿 **Amuleto de la fortuna:** premios +10 % durante 10 partidas.
- 🛡️ **Escudo de consuelo:** recuperas el 10 % de cada partida sin premio durante 10 partidas.
- ⛏️ **Mina de monedas:** ingresos pasivos: al empezar cada día te da el 20 % de todo lo que has invertido en ella (cada mejora se amortiza en unos 5 días). Tiene 10 niveles.

El precio de los objetos sube con el nivel del jugador.

## Progresión

- **Niveles y XP:** cada boleto rascado da XP, con un extra si tiene premio. Cada nivel da una recompensa en monedas y puede desbloquear un boleto nuevo.
- **Inventario:** boletos comprados pendientes de rascar.
- **Historial:** los últimos 300 boletos, con filtros.
- **Estadísticas:** gastado, ganado, balance, porcentaje de premiados, retorno real por tipo, mayor premio y rachas.
- **Logros:** 40 retos con recompensa.
- **Fin de la partida:** si al acabar el día no llegas al objetivo, empiezas de cero (salvo con una ❤️ Segunda vida). Antes de una compra que te dejaría sin dinero para jugar, el juego pide confirmación.
- **Récords** de todas las partidas (día alcanzado, nivel, saldo, mayor premio y número de partida): se conservan al empezar de cero.
- La partida se guarda automáticamente en `localStorage`.

## Árbol de habilidades

Las habilidades son mejoras permanentes que se compran con monedas. Hay cinco ramas, cada habilidad tiene varios niveles y se desbloquea comprando la anterior y alcanzando cierto nivel de jugador. Completar todo el árbol cuesta unas 1.330.000 monedas.

| Rama | Habilidad | Efecto por nivel | Niveles |
|---|---|---|---:|
| ⚡ Maestría | 📚 Aprendiz veloz | +10 % de experiencia | 5 |
| | 💅 Uña de acero | Rascas un 25 % más ancho | 3 |
| | 🤖 Rascado automático | Botón «⚡ Rascar todo» en cada boleto | 1 |
| | 👁️ Ojo de lince | 1 casilla ya descubierta en cada boleto | 2 |
| | 🚀 Rascado en lote | Botón «Rascar todos» en el inventario | 1 |
| 🍀 Suerte | 🍀 Trébol de la suerte | Premios +2 % | 5 |
| | 🔄 Segunda oportunidad | 3 % de que un boleto sin premio se vuelva a sortear al comprarlo | 4 |
| | ✨ Toque dorado | 5 % de que un premio se duplique | 3 |
| 💰 Economía | 🏷️ Cliente VIP | Boletos un 2 % más baratos | 5 |
| | 🎁 Bonus generoso | Bonus de inicio de día +30 % | 3 |
| | 🛟 Seguro de consuelo | Recuperas el 4 % de cada boleto sin premio | 5 |
| | 📈 Inversor | Recompensas de nivel +25 % | 4 |
| 🎰 Arcade | 🎰 Palanca engrasada | Premios de los juegos +4 % | 5 |
| | 🥈 Premio de consolación | Con 2 iguales en un juego recuperas el 10 % | 3 |
| | 🔁 Tirada múltiple | Jugar ×5 y ×10 de golpe | 1 |
| | 🃏 Comodín | 6 % de que una pareja perdedora de símbolos comunes se complete | 3 |
| ⛏️ Negocios | 👷 Capataz | La mina produce +25 % | 4 |
| | 🏦 Banco | Al empezar el día, 5 % de interés sobre lo que superaste el objetivo | 3 |
| | ⚗️ Alquimista | Los objetos duran +25 % | 4 |
| | 🤝 Comerciante | Objetos y mina −8 % | 3 |

Las tablas de probabilidad base no cambian. Las habilidades actúan al comprar el boleto (nuevo sorteo, premio doble) o al cobrarlo (bonificaciones y reembolsos), y el resultado del boleto indica qué habilidad se ha aplicado.

## Efectos

- Rascado realista sobre `<canvas>`: bordes irregulares, polvo de rascado y sonido de fricción que depende de la velocidad.
- Cada casilla destaca al descubrirse, y las parejas iguales se iluminan para crear tensión.
- Lluvia de monedas, confeti, fuegos artificiales, destello y temblor de pantalla para los premios grandes y legendarios.
- Todos los sonidos se sintetizan con Web Audio. Se pueden silenciar con 🔊.
- Diseño adaptable a ordenador y móvil, con navegación inferior y controles táctiles.

## Estructura

```
index.html        estructura de pantallas
css/styles.css    estilos y diseños de cada rareza
js/data.js        boletos, juegos, objetos, mina, habilidades, probabilidades, niveles y logros
js/scratch.js     motor de rascado (canvas + detección de casillas)
js/effects.js     partículas a pantalla completa
js/audio.js       sonidos sintetizados
js/game.js        estado, tienda, inventario, progresión e interfaz
tools/simulate.js verificación de probabilidades
```

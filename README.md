# 🎟️ RascaManía

Juego de boletos de rasca virtuales hecho con HTML, CSS y JavaScript puro, sin dependencias ni paso de compilación.
**Se juega solo con monedas ficticias: no hay apuestas ni dinero real.**

## Cómo jugar

Abre `index.html` en el navegador (doble clic o cualquier servidor estático, por ejemplo GitHub Pages).

1. Empiezas con **1.000 monedas**.
2. Compra boletos en la **Tienda** (de uno en uno, ×5 o ×10).
3. **Rasca** arrastrando el ratón o el dedo sobre la capa metálica; el contenido se descubre poco a poco. También puedes pulsar «⚡ Rascar todo».
4. Si salen **3 símbolos iguales**, ganas su premio. En Oro, Diamante y Legendario, la casilla **MULTIPLICADOR** lo multiplica.
5. Gana experiencia, sube de nivel y desbloquea boletos mejores.

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

## Juegos sin rascar

Siguen la misma mecánica (3 símbolos iguales = premio, resultado sorteado con una tabla de probabilidades), pero se juegan sin rascar:

| Juego | Tipo | Precio | Nivel | Prob. de premio | Premio máximo | Retorno teórico |
|---|---|---:|---:|---:|---:|---:|
| Tragaperras clásica | 3 rodillos | 25 | 2 | 1 de 2,16 | 5.000 | 95,0 % |
| Cajas sorpresa | 3 cajas | 100 | 4 | 1 de 2,28 | 25.000 | 93,0 % |
| Máquina mega | 3 rodillos | 500 | 8 | 1 de 2,59 | 100.000 | 95,5 % |
| Cofres reales | 3 cajas | 2.500 | 12 | 1 de 2,83 | 750.000 | 95,3 % |

Si cierras la página mientras giran los rodillos, la partida se cobra al volver.

## Objetos

- ❤️ **Segunda vida:** te salva de la bancarrota (máximo 3).
- 🧪 **Poción de sabiduría:** doble de experiencia durante 20 partidas.
- 🔮 **Bola de cristal:** 2 casillas extra descubiertas en los próximos 8 boletos.
- 🧿 **Amuleto de la fortuna:** premios +10 % durante 10 partidas.
- 🛡️ **Escudo de consuelo:** recuperas el 10 % de cada partida sin premio durante 10 partidas.
- ⛏️ **Mina de monedas:** ingresos pasivos que se acumulan aunque el juego esté cerrado (hasta 6 h). Tiene 10 niveles y se recoge desde el inicio o la tienda.

El precio de los objetos sube con el nivel del jugador.

## Progresión

- **Niveles y XP:** cada boleto rascado da XP, con un extra si tiene premio. Cada nivel da una recompensa en monedas y puede desbloquear un boleto nuevo.
- **Inventario:** boletos comprados pendientes de rascar.
- **Historial:** los últimos 300 boletos, con filtros.
- **Estadísticas:** gastado, ganado, balance, porcentaje de premiados, retorno real por tipo, mayor premio y rachas.
- **Logros:** 26 retos con recompensa.
- **Bonus diario** cada 20 h.
- **Bancarrota:** si no te llega para lo más barato, no tienes boletos sin rascar, no puedes recoger nada de la mina y no hay bonus diario disponible, pierdes la partida y **empiezas de cero**. Si tienes una **❤️ Segunda vida**, se gasta sola, conservas tu progreso y recibes monedas (300 + 100 × nivel). Antes de una compra que te dejaría sin nada, el juego pide confirmación.
- **Récords** de todas las partidas (nivel, saldo, mayor premio y número de partida): se conservan al empezar de cero.
- La partida se guarda automáticamente en `localStorage`.

## Árbol de habilidades

Las habilidades son mejoras permanentes que se compran con monedas. Hay cinco ramas, cada habilidad tiene varios niveles y se desbloquea comprando la anterior y alcanzando cierto nivel de jugador. Completar todo el árbol cuesta unas 1.330.000 monedas.

| Rama | Habilidad | Efecto por nivel | Niveles |
|---|---|---|---:|
| ⚡ Maestría | 📚 Aprendiz veloz | +10 % de experiencia | 5 |
| | 💅 Uña de acero | Rascas un 25 % más ancho | 3 |
| | 👁️ Ojo de lince | 1 casilla ya descubierta en cada boleto | 2 |
| | 🚀 Rascado en lote | Botón «Rascar todos» en el inventario | 1 |
| 🍀 Suerte | 🍀 Trébol de la suerte | Premios +2 % | 5 |
| | 🔄 Segunda oportunidad | 3 % de que un boleto sin premio se vuelva a sortear al comprarlo | 4 |
| | ✨ Toque dorado | 5 % de que un premio se duplique | 3 |
| 💰 Economía | 🏷️ Cliente VIP | Boletos un 2 % más baratos | 5 |
| | 🎁 Bonus generoso | Bonus diario +30 % | 3 |
| | 🛟 Seguro de consuelo | Recuperas el 4 % de cada boleto sin premio | 5 |
| | 📈 Inversor | Recompensas de nivel +25 % | 4 |
| 🎰 Arcade | 🎰 Palanca engrasada | Premios de los juegos +4 % | 5 |
| | 🥈 Premio de consolación | Con 2 iguales en un juego recuperas el 10 % | 3 |
| | 🔁 Tirada múltiple | Jugar ×5 y ×10 de golpe | 1 |
| | 🃏 Comodín | 6 % de que una pareja perdedora de símbolos comunes se complete | 3 |
| ⛏️ Negocios | 👷 Capataz | La mina produce +25 % | 4 |
| | 📦 Almacén | Capacidad de la mina +50 % | 3 |
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

---

## 🧽 CLEAN RUSH (juego 3D para Android, Godot 4.3)

La carpeta [`clean_rush/`](clean_rush/) contiene un proyecto independiente: **CLEAN RUSH**, un simulador de limpieza 3D para móviles con 6 mapas, 13 herramientas, contratos, mejoras, colección, logros y guardado local.
Instrucciones de apertura, exportación a APK e instalación: [`clean_rush/README.md`](clean_rush/README.md). Estado verificado y hoja de ruta: [`clean_rush/docs/DELIVERY.md`](clean_rush/docs/DELIVERY.md).

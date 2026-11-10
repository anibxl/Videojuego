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

## Progresión

- **Niveles y XP:** cada boleto rascado da XP, con un extra si tiene premio. Cada nivel da una recompensa en monedas y puede desbloquear un boleto nuevo.
- **Inventario:** boletos comprados pendientes de rascar.
- **Historial:** los últimos 300 boletos, con filtros.
- **Estadísticas:** gastado, ganado, balance, porcentaje de premiados, retorno real por tipo, mayor premio y rachas.
- **Logros:** 16 retos con recompensa.
- **Bonus diario** cada 20 h, y **ayuda de emergencia** si te quedas sin monedas ni boletos.
- La partida se guarda automáticamente en `localStorage`.

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
js/data.js        boletos, probabilidades, generación, niveles y logros
js/scratch.js     motor de rascado (canvas + detección de casillas)
js/effects.js     partículas a pantalla completa
js/audio.js       sonidos sintetizados
js/game.js        estado, tienda, inventario, progresión e interfaz
tools/simulate.js verificación de probabilidades
```

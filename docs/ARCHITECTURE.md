# Arquitectura — para quien continúe este código

Todo vive en un único IIFE en `src/game.js` (sin módulos, sin build step, a
propósito: es un prototipo que se abre con doble clic en `index.html`). Si el
proyecto crece más allá de esto, la primera decisión técnica real que hay que
tomar es si vale la pena introducir un bundler — ver `ROADMAP.md`.

## Loop principal

```
loadAll(() => loop())          // carga todas las imágenes, después arranca
function loop(){ update(); if(playing) draw(); requestAnimationFrame(loop); }
```

`update()` avanza física/IA/timers. `draw()` es puramente de dibujo, no debería
mutar estado de juego (hoy lo respeta).

## Estado global (todo son variables de módulo, no hay clases)

- `game` — HP, ítem equipado, sala actual, y **`game.flags`**: el único lugar
  donde vive el progreso de historia/inventario. Si agregás una feature nueva
  que necesita persistir algo, va acá.
- `player`, `enemies`, `shots`, `drops` — estado de la escena activa.
- `dialog` / `cutscene` — cuando cualquiera de los dos no es `null`, el juego
  pausa (`update()` corta temprano) y el input se redirige a cerrarlos. Son
  el mismo patrón, duplicado a propósito para no acoplar diálogo de texto
  con cutscene de imagen completa; si en algún momento hay más de 2 tipos de
  overlay modal, vale la pena unificarlos en una sola pila de "modales".

## Salas (`rooms`)

Cada sala es un objeto plano: fondo, rectángulos caminables (`walk`),
rectángulos bloqueados (`block`), salidas (`exits`, con `need` opcional para
gatear con un flag/ítem), puntos de interés (`spots`, resueltos en
`interact()`) y enemigos iniciales (`foes`, clonados en `spawnRoom()`).

Agregar una sala nueva = agregar una entrada acá + los assets correspondientes
en `files`. No hace falta tocar el loop ni el render.

## Historia: `game.flags` + `storyAct()`

**Regla de diseño:** no hay un contador de "capítulo" separado. `storyAct()`
lo deriva de los flags existentes (`lantern`, `witchDead`, `foundRecord`, ...).
Esto es intencional: evita que capítulo y flags queden desincronizados si el
jugador hace las cosas en un orden no previsto. Si agregás un flag nuevo que
debería mover de capítulo, sumalo ahí, no crees un flag de capítulo aparte.

`questText()` (usado por el HUD) también lee `storyAct()` — es el único lugar
donde el jugador ve explícitamente "quién te está mandando". Si agregás un
acto nuevo, actualizá ese switch.

Los diálogos condicionados por historia (ver `interact()`, casos `"elder"` y
`"record"`) siguen el mismo patrón: revisan `storyAct()` y/o flags puntuales,
y actualizan un flag la primera vez que se ven para no repetir el mismo texto.

Ver `docs/STORY.md` para el guion completo con la intención narrativa de cada
línea — este archivo es solo la mecánica.

## Animación del golpe (sin sprite dedicado)

No hay un frame de arte para "atacando" — el golpe se simula 100% con canvas
en el bloque de dibujo del jugador (dentro de `draw()`, buscar `player.atk`):
un lunge (el cuerpo se adelanta unos px hacia la dirección del golpe y
vuelve, con un seno sobre `player.atk` que cuenta 14→0) más un arco relleno
que barre rápido y se desvanece, con un punto sólido en la punta simulando
la cabeza del martillo. Mismo criterio que el resto del proyecto: sin arte
nuevo, se compensa con algo procedural en vez de dejarlo estático.

## Animación del jugador (`Animator`)

Objeto `Animator` en `src/game.js`: estados `"idle"`/`"walk"` por dirección
(`front`/`back`/`side`), pensado como equivalente casero a un Animator de
Unity o un AnimatedSprite2D de Godot, pero sobre Canvas puro.

**Deuda técnica conocida:** hoy `back` y `side` tienen `real:false` porque
`hero_b0.png`≡`hero_b1.png` y `hero_s0.png`≡`hero_s1.png` (mismo archivo,
mismo hash — nunca se dibujó el segundo frame). Mientras eso no se resuelva,
`Animator` compensa con una animación procedural (bamboleo + inclinación
leve vía `ctx.transform`) para que caminar de espaldas/costado no se vea
rígido, pero no reemplaza tener arte real. Para cerrar esto: dibujar
`hero_b1.png`/`hero_s1.png` con la pose de paso distinta a `_0` y cambiar su
`real` a `true` en `Animator.directions` — no hace falta tocar nada más.

## Cutscenes de imagen completa

`showCutscene(key, text)` / `closeCutscene()`. `key` referencia
`cutsceneImg`, cargado por separado de los sprites normales (`cutsceneFiles`)
porque son ilustraciones de una sola vez, no assets dibujados cada frame.
Están pensadas para momentos de "giro" — usarlas con moderación, 1-2 por acto
como mucho, o pierden impacto.

## Detección celular/desktop y controles táctiles

`IS_TOUCH` en `src/game.js` (arriba del todo) decide una sola vez, al
cargar, si el dispositivo es touch-primero
(`matchMedia("(hover: none) and (pointer: coarse)")`, con
`navigator.maxTouchPoints` como respaldo). Si es `true`, se agrega la
clase `is-touch` a `<body>` — todo el resto (mostrar joystick/botones,
ocultar el texto de ayuda de teclado) es CSS puro en `index.html`
condicionado a esa clase, no hay ramas de layout en JS.

`initTouchControls()` conecta el joystick con las mismas flags `keys.w/a/s/d`
que ya lee el movimiento — el código de movimiento no sabe ni le importa
si esas flags las puso el teclado o un dedo. Los tres botones táctiles
(`btnAttack`/`btnUse`/`btnTalk`) llaman directo a `onKey("z"/"x"/"c")`, así
heredan gratis toda la lógica de diálogo/cutscene/elección final que
`onKey` ya maneja — no hay lógica duplicada entre input de teclado y táctil.

Si se agrega un control nuevo más adelante (por ejemplo un botón para
cambiar de objeto sin tocar el HUD), seguir el mismo patrón: la UI nueva
llama a la función que ya usa el teclado, nunca duplica su lógica.

## Guardado (`localStorage`)

Un solo slot (`SAVE_KEY="malleus_save_v1"` en `src/game.js`) — alcanza para
un prototipo de un pueblo. `saveGame()` guarda sala, ítem equipado, todos
los flags, HP y posición; se llama después de cada cambio de sala
(`applyWarp`), cada flag que cambia `interact()`, y cada vez que muere la
bruja o se sella el pozo. Si agregás un flag nuevo en otro lugar del código
que no pase por esos puntos, acordate de sumar un `saveGame()` ahí también
— no hay un mecanismo automático que lo detecte.

`defaultFlags()` es la única fuente de verdad del estado inicial — la usan
tanto partida nueva como `loadSaveData()` (mergeada con lo que haya en el
save, para que un flag agregado después de que alguien guardó no rompa la
carga vieja). Si agregás un flag nuevo, solo hace falta sumarlo ahí.

`resolveChoice()` (el final del juego) llama `clearSave()` — un final ya
jugado no debería poder "continuarse". No hay más lógica de borrado de save
más allá de eso y de arrancar una partida nueva desde el título.

## Cómo agregar contenido narrativo sin romper nada

1. Nuevo flag → agregarlo al objeto inicial en `game.flags` con su default.
2. Si mueve de capítulo → sumarlo a `storyAct()`.
3. Si es un NPC nuevo → sprite en `files`, entrada en `spots` de la sala
   correspondiente, dibujo condicional en el bloque `if(game.room===...)`
   dentro de `draw()`, y su caso en `interact()`.
4. Si es una revelación grande → considerar un cutscene en vez de solo texto.
5. Actualizar `docs/STORY.md` con la intención narrativa (qué sabe el jugador
   antes/después, qué NO debería poder saber todavía).

## Cosas que un dev/IA nuevo debería saber antes de tocar el código

- Hay guardado (`localStorage`, ver sección de arriba), pero un solo slot —
  no hay "guardar como" ni múltiples partidas.
- No hay tests. Cambios en `blocked()`/`tryMove()` (colisión) conviene
  probarlos a mano en las 4 salas, cada una tiene geometría distinta.
- Los assets `assets/party.jpg` (arte conceptual con 4 personajes: el
  Martillo, un caballero, la herbolaria y un ballestero) y
  `assets/bowman.png` están en el repo pero **no usados todavía** — son
  semilla para un futuro sistema de compañeros (ver `ROADMAP.md`).

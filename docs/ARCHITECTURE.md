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

## Iluminación en salas oscuras (`drawRimLitSprite`)

Bug real encontrado probando el juego con Playwright (Chromium headless,
capturas reales — no alcanzaba con leer el código): en capilla/cripta con
la linterna encendida, el personaje se veía como una mancha casi invisible
aunque el círculo de luz ambiental fuera grande. Tres intentos, en orden,
hasta encontrar el que realmente funciona (los primeros dos quedan como
comentario en el código para que nadie los reintente):

1. **Recentrar el círculo de luz** (`ly = player.y-cam.y+HUD-62` en vez de
   `-30`) — necesario pero no alcanza solo.
2. **Halo ambiente alrededor del jugador** — medido con muestreo de píxeles:
   sí ilumina el piso (9,8,7 → 138,111,74), pero la túnica del sprite
   (~47/255 de brillo promedio) no "refleja" esa luz — comparación lado a
   lado mostró cero cambio en el personaje mismo.
3. **Redibujar el sprite en modo `screen` sobre sí mismo** — matemáticamente
   no sirve para píxeles muy oscuros: `screen(x,x) ≈ 2x` para x chico, así
   que 0.03 de brillo apenas sube a 0.06. Imperceptible.
4. **`drawPlayerRimLight()` (la que quedó):** dibuja el sprite en
   `pbuf`/`pctx`, un `<canvas>` offscreen aparte, y ahí sí usa
   `globalCompositeOperation="source-atop"` para aclarar SOLO los píxeles
   con alpha>0 del sprite. No funciona directo en el canvas principal
   porque a esa altura del dibujo ya está opaco en todos lados (source-atop
   pintaría la pantalla entera, no la silueta) — por eso hace falta el
   buffer aparte, transparente de verdad.

Se dibuja DESPUÉS del vignette de oscuridad (`R.dark`), no antes — ese fue
el otro medio-bug: si se dibuja antes, el vignette lo vuelve a tapar. Solo
aplica al jugador (los enemigos se quedan sin iluminar a propósito, para
que sigan dando miedo en la oscuridad).

**Generalizada a `drawRimLitSprite(image,h,flip)` (18/9):** al integrar el
sprite real del Padre, probando en capilla se confirmó que desaparecía
igual que el jugador antes del fix — mismo motivo, ningún sprite se salva
del vignette sin esto. `drawPlayerRimLight()` ahora es un wrapper de una
sola línea sobre la función general. `DARK_NPCS` (junto a `GLOWS`) lista
qué NPCs se iluminan solos en qué sala — a diferencia del jugador, esto NO
depende de tener la linterna equipada: son ellos los que tienen su propia
luz. Agregar un NPC nuevo a una sala oscura = sumarlo a `DARK_NPCS`, nada más.

## Menú de pausa

`paused` (bool) — mismo patrón que `dialog`/`cutscene`: `update()` corta
temprano si está en `true` (ver el guard con `||paused`). A propósito NO
cierra diálogos/cutscenes activos al pausar — quedan congelados debajo del
menú, que tiene z-index más alto, y siguen donde estaban al reanudar.

Se activa con `P`/`Escape` (`onKey()`, chequeo al principio de la función,
antes que cualquier otra tecla) o el botón `#btnPause` (siempre visible,
pensado para touch que no tiene teclado). El volumen usa un `GainNode`
maestro (`masterGain` en `ensureAudio()`) — antes cada `beep()` se conectaba
directo a `AC.destination`, así que no había forma de bajar el volumen
global sin esto. Persiste en `localStorage` (`malleus_volume`).

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

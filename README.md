# MALLEUS — Oficio

Prototipo de RPG de acción 2D (canvas, vanilla JS, sin frameworks ni build step)
ambientado en una cacería de brujas de inspiración inquisitorial. Referencias de
diseño: **Zelda** (mundo con ítems-llave que abren zonas, combate simple con
melee + ranged + luz), **Golden Sun** (progresión narrativa por capas, overworld
legible, tono serio sin dejar de ser jugable).

Jugalo abriendo `index.html` en un navegador (no necesita servidor ni build).

## Controles

| Acción | Desktop | Táctil (celular/tablet) |
|---|---|---|
| Moverse | WASD / flechas | Joystick (abajo a la izquierda) |
| Atacar / interactuar | clic izquierdo / Z / J | botón ⚒ |
| Usar objeto equipado | clic derecho / X / K | botón 🕯 |
| Hablar / abrir | clic cerca / C | botón HABLAR |
| Cambiar objeto | rueda del mouse / teclas 1-2-3 | tocar el ícono en el HUD arriba |
| Cerrar diálogo o cutscene | clic / Z / Enter | botón ⚒ |

El juego detecta solo si es celular o desktop (`IS_TOUCH` en `src/game.js`,
basado en `matchMedia("(hover: none) and (pointer: coarse)")`) y muestra
joystick + botones únicamente en dispositivos táctiles — en desktop ese
bloque de UI no se renderiza ni intercepta clics.

## Guardado

El progreso se guarda solo (`localStorage`, un slot) después de cada
cambio de sala o hito importante — no hay botón de guardar manual. Al
volver a abrir el juego aparece un botón "Continuar" en la pantalla de
título si hay una partida guardada.

## Concepto narrativo: "El Silencio"

La premisa **no** es "la Iglesia tapa algo por conveniencia". La doctrina de
fondo es correcta y defendible — el espíritu general de la institución es
bueno (pensalo en clave *Warhammer 40k*: el sistema tiene razón, la gente que
lo ejecuta a veces no). El daño real en la historia sale de fallas humanas
puntuales dentro de una cadena de mando que, en sí misma, cumple un propósito
legítimo.

**La doctrina:** existen aguas (pozos, criptas húmedas) donde quien bebe deja
de poder sentir culpa — no cura nada, no da poder: borra la capacidad de
arrepentirse, y por lo tanto de elegir el bien. Es la muerte del alma
disfrazada de paz total. La Iglesia lo sabe desde hace generaciones y por eso
existe el protocolo. En esto, Roma tiene razón.

**La cadena de mando (por diseño, cada eslabón sabe menos que el anterior o
tiene una falla más íntima):**

- **El Papa** — conoce la doctrina en abstracto, nunca vio un pozo, jamás
  midió el costo humano real de aplicarla. Su fe y su mandato son genuinos.
- **El Obispo** — no conoce la teología, ejecuta el procedimiento del
  *Malleus* (el manual que le da nombre a tu personaje) sin cuestionarlo.
  Puede tener corrupción propia (usar el protocolo para fines políticos).
- **El Padre del pueblo** — es quien te dirige día a día, y tiene una culpa
  íntima propia: llevó a alguien que amaba al pozo, sabiendo lo que hacía. No
  por maldad — por amor desesperado y débil.
- **Vos, el Martillo** — no sos un elegido al azar: fuiste expuesto de chico a
  algo similar y sobreviviste. Sos el argumento *a favor* del sistema, no en
  contra: la prueba de que resistir es posible.

**El arco de revelación** (ver `docs/STORY.md` para el detalle completo y los
flags de historia que lo controlan):

1. **Acto 1** — funciona como cacería de brujas normal, sin fisuras.
2. **Acto 2** — aparece un NPC nuevo (el Encapuchado, otro Martillo, mucho más
   viejo) que empieza a sembrar dudas sobre el manual.
3. **Acto 3** — la bruja, al morir, dice algo que no encaja con "malvada".
4. **Acto 4** — un registro oculto en la cripta confirma la doctrina de "El
   Silencio" en los términos del propio Obispado.
5. **Final** — decisión entre revelar lo que encontraste o guardar silencio
   y sostener el ciclo. Implementado: hablale al Padre después de que
   confiese (Acto 4→5) y elegí `Z` (revelar) o `X` (silencio).

## Estado actual del prototipo

Implementado:
- Movimiento, combate melee (martillo), ranged (ballesta), linterna en zonas
  oscuras, sistema de salas con warps y requisitos de ítem para avanzar.
- 4 salas: plaza, bosque, capilla, cripta. Boss final: la bruja.
- Sistema de flags de historia (`game.flags`) y capítulo derivado
  (`storyAct()`), dos NPCs narrativos (el Encapuchado y el Padre del
  pueblo), un cutscene de imagen completa (la aparición de la bruja), un
  registro coleccionable en la cripta, y **el arco completo hasta el final**
  con elección real (`reveal`/`silence`).
- HUD con indicador de "encargo actual" (quién te está dirigiendo en esa
  parte de la historia).

Pendiente (ver `ROADMAP.md`): pantallas de final más distinguibles
visualmente, expansión a más pueblos, sistema de guardado.

## Estructura del repo

```
index.html         shell HTML + CSS (carga src/game.js)
src/game.js         todo el motor y la lógica del juego
assets/             sprites, fondos, overlays, arte de cutscene
docs/STORY.md        guion completo, flags de historia y diálogos por acto
docs/ARCHITECTURE.md   cómo está armado el código, para devs/IA que continúen
ROADMAP.md           fases de desarrollo priorizadas
```

Si sos otro desarrollador (humano o IA) retomando esto: empezá por
`docs/ARCHITECTURE.md`, después `docs/STORY.md`, y recién ahí tocá
`src/game.js`.

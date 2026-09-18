# Roadmap

Orden sugerido. Cada fase asume que la anterior está jugable de punta a
punta antes de arrancar la siguiente — evitar expandir contenido (Fase 2)
antes de cerrar el loop narrativo actual (Fase 1).

## Fase 1 — Cerrar el loop narrativo del pueblo actual (COMPLETA)

Lo que ya está: Actos 1-5 completos (`docs/STORY.md`) — Encapuchado, cutscene
de la bruja, registro en la cripta, NPC físico del Padre con confesión,
final con elección real (`reveal`/`silence`), quest tracker en el HUD.

Quedó afuera de esta fase, para más adelante:
- [ ] Dos pantallas de final más distinguibles visualmente (hoy ambas ramas
  reusan el mismo `showOverlay("win",...)` genérico, solo cambia el texto —
  andaría bien una ilustración o color distinto por rama).
- [ ] El sistema de diálogo con elección (`pendingChoice` en `game.js`) es
  ad-hoc — funciona para este único caso pero no generaliza. Si aparece un
  segundo punto de elección en la historia, vale la pena generalizarlo (ver
  Fase 2).

## Fase 2 — Sistemas base que van a hacer falta para todo lo demás

- [x] **Guardado** — `localStorage`, un slot, ver `docs/ARCHITECTURE.md`.
- [x] **Menú de pausa** — `P`/`Escape` o botón en pantalla, con reanudar,
  reiniciar (con confirmación) y volumen persistente. Ver `docs/ARCHITECTURE.md`.
- [ ] Sistema de diálogo con **opciones** (no solo texto lineal) — hoy existe
  una versión ad-hoc (`pendingChoice`) solo para el final del juego; si
  aparece un segundo punto de elección en la historia, generalizarlo.
## Fase 3 — Expansión de mundo (2-3 pueblos)

- [ ] Mapa de overworld conectando pueblos (cada uno con su propio Padre y
  problema local, todos reportando a la misma cadena Obispo→Papa).
- [ ] Reutilizar el patrón de `rooms` actual — no debería requerir cambios
  de arquitectura, solo más contenido.
- [ ] Decidir si cada pueblo tiene su propia "verdad local" que conecta con
  la doctrina general, o si el segundo/tercer pueblo son variaciones del
  mismo patrón (recomendado para no diluir el foco narrativo).

## Fase 4 — Sistema de compañeros (semilla ya en los assets)

`assets/party.jpg` es arte conceptual de 4 personajes: el Martillo, un
caballero, la herbolaria (ya NPC) y un ballestero (`assets/bowman.png`,
no usado todavía). Esto sugiere que el diseño original contemplaba un
sistema de party al estilo Golden Sun.
- [ ] Definir mecánica de compañeros (¿acompañan en combate? ¿dan
  habilidades pasivas? ¿son solo narrativos?)
- [ ] Si se implementa combate en party, revisar si el motor actual
  (pensado para un solo actor controlable) aguanta o si conviene
  refactorizar antes.

## Fase 5 — Pulido

- [x] ~~Arte faltante: segundo frame de caminata~~ — resuelto 18/9, ver
  `docs/ART_TODO.md` y la sección de Animator en `docs/ARCHITECTURE.md`.
- [ ] Balance de combate (HP/daño/velocidad de enemigos — todo hardcodeado
  hoy en `spawnRoom()`, fácil de tunear pero nunca testeado a fondo).
- [ ] Feel: cámara, screen shake en golpes, mejor feedback de daño.
- [ ] Sonido — hoy todo son beeps generados por Web Audio (`sfx` en
  `game.js`); considerar música ambiente y sfx reales si el proyecto sigue.
- [ ] Accesibilidad básica (remapeo de teclas, tamaño de texto).

## Decisiones técnicas pendientes (para cuando el proyecto crezca)

- **Bundler / módulos**: hoy todo es un único `<script>` sin build step, a
  propósito, para que sea fácil de abrir y editar. Si el archivo
  (`src/game.js`) pasa de ~800-1000 líneas, vale la pena partirlo en
  módulos ES (`rooms.js`, `story.js`, `render.js`, etc.) aunque implique
  sumar un paso de build.
- **Deploy**: el repo está pensado para servirse como sitio estático
  (GitHub Pages, Vercel, Netlify — cualquiera sirve tal cual está, sin
  configuración especial, porque es HTML/JS/assets puro).

# Guion — "El Silencio"

Este documento es la fuente de verdad narrativa. `src/game.js` implementa una
fracción de esto (Actos 1-4, sin el final). Si escribís diálogo nuevo,
volvé a leer la sección del acto correspondiente antes de escribirlo — el
punto central del guion es que **nadie miente activamente**, cada personaje
dice la verdad tal como la conoce, y esas verdades parciales no coinciden
entre sí. Evitar que cualquier NPC "sepa demasiado" antes de tiempo.

## La doctrina real (el jugador no debería leer esto tal cual hasta el Acto 4)

Ciertas aguas (pozos, criptas húmedas, manantiales) hacen que quien bebe deje
de poder sentir culpa. No es una cura ni un poder: es la desaparición de la
capacidad de arrepentirse, y por lo tanto de elegir el bien sobre el mal. La
persona queda en paz total — y deja de ser, en cualquier sentido reconocible,
la misma persona. La Iglesia lo llama internamente "El Silencio" y lo trata
como una amenaza teológica de primer orden: si el libre albedrío para pecar
desaparece, desaparece la necesidad de fe. El protocolo nunca fue "curar" el
pozo — es sellarlo, generación tras generación, disfrazado de cacería de
brujas para que ni dentro de la propia Iglesia se entienda del todo qué se
protege.

**Importante:** la doctrina es correcta. Sellar el pozo es, objetivamente, lo
que corresponde. El conflicto dramático no está en "¿la Iglesia tiene razón?"
— la tiene. Está en el costo humano de sostenerla y en las fallas puntuales
de la gente que la ejecuta.

## La cadena de mando

| Nivel | Qué sabe | Su falla |
|---|---|---|
| **Papa** | La doctrina en abstracto, sin ubicaciones ni nombres. Nunca vio un pozo. | Ceguera de gestión: no mide el costo humano real de sus mandatos. |
| **Obispo** | El procedimiento (el *Malleus*), sin la teología detrás. | Puede usar el protocolo para fines propios (política local, tierras). |
| **Padre del pueblo** | Vio el pozo de cerca. Sabe más de lo que dice. | Culpa íntima: llevó a alguien que amaba al agua, hace tiempo. |
| **El Martillo (jugador)** | Nada, al principio. | Ninguna — es el argumento a favor del sistema: sobrevivió una exposición similar de chico. |

El Encapuchado (NPC nuevo, Acto 2+) es **otro Martillo**, mucho más viejo,
que hizo este mismo trabajo hace treinta años y nunca resolvió si hizo bien.
No es un sabio ni un traidor: es alguien que ya pasó por esto y no tiene
respuestas limpias para dar, solo preguntas incómodas.

## Estructura por actos (mapeado a `storyAct()` en el código)

### Acto 1 — `storyAct() === 1` (default, sin flags activos)
Cacería de brujas normal, sin fisuras. El jugador no tiene motivos para
dudar de nada. Diálogos existentes de herbolaria/mercenario/pozo se leen en
este registro sin necesitar cambios.

### Acto 2 — `storyAct() === 2` (flag `lantern` true)
Aparece el Encapuchado en la plaza. Primera pista de que esto no es la
primera vez que pasa ("yo también vine por un pozo, hace treinta años").
El jugador todavía no tiene motivo para sospechar de la Iglesia — solo de
que el trabajo es más viejo y más raro de lo que pensaba.

### Acto 3 — `storyAct() === 3` (flag `witchDead` true)
La bruja, al morir, no maldice — dice algo que no encaja con "villana"
(línea ya existente: *"el agua suelta el nombre y se calla"*). El
Encapuchado, si se le habla de nuevo, pregunta explícitamente qué dijo ella
antes de morir, insinuando que **siempre** dicen lo mismo y que nunca es lo
que el manual promete.

### Acto 4 — `storyAct() === 4` (flag `foundRecord` true)
El jugador encuentra el registro del Obispado en la cripta (spot `"record"`,
solo interactuable después de `witchDead`). Ahí se confirma la doctrina en
los términos institucionales, con una firma tachada a propósito — quién la
tachó y por qué queda abierto para el Acto 5.

### Acto 5 — el Padre y la confesión (implementado)
- El Padre es un NPC físico en la capilla (spot `"padre"`, silueta clara
  distinta del Encapuchado — sotana gris con estola, sin capucha).
- Confiesa su culpa íntima automáticamente la primera vez que se le habla
  en Acto 4 (`storyAct()===4`, después de leer el registro).
- **Final con elección real** (`game.flags.confessed`): la siguiente vez
  que se le habla, pregunta qué le vas a decir al Obispo. `Z`/clic
  izquierdo → `"reveal"` (romper la cadena). `X`/clic derecho → `"silence"`
  (sostener el ciclo). Cada rama termina en su propia pantalla de victoria
  vía `showOverlay()`, con texto distinto — no hay tercer final "limpio" a
  propósito.

## Guía de tono para escribir diálogo nuevo

- Nadie es cínico ni villano de manual. El Obispo corrupto, si aparece, cree
  genuinamente que sus atajos sirven al bien mayor.
- Frases cortas, directas, sin explicar de más — el jugador arma el
  rompecabezas explorando, no escuchando monólogos.
- Ningún personaje dice la palabra "El Silencio" antes del Acto 4. Antes de
  eso, se habla en rodeos: "el pacto", "lo que el manual no explica", "el
  agua", etc.
- El Papa y el Obispo (como personas físicas) todavía no aparecen en el
  código — solo se los menciona. Si se implementan como cutscenes o cartas,
  mantener la misma regla: hablan con convicción genuina, no con dobles
  intenciones.

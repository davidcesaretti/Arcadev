# Snake — Documentación técnica

Juego clásico de Snake implementado en React + TypeScript con Canvas 2D y audio sintetizado vía Web Audio API.

---

## Estructura de archivos

```
snake/
├── constants.ts   — valores fijos: grid, celdas, velocidades, puntuación
├── game.ts        — lógica pura del juego (estado + funciones de transición)
├── audio.ts       — motor de audio (música + SFX sin archivos externos)
├── index.tsx      — componente React: game loop, input, dibujo, UI
└── README.md      — este archivo
```

La separación es deliberada: `game.ts` no sabe nada de React ni del canvas.
`index.tsx` no contiene lógica de reglas. Esto hace que cada parte sea testeable
y reemplazable de forma independiente.

---

## constants.ts — Los números del juego

```
GRID = 24       → el tablero es de 24×24 celdas
CELL = 22       → cada celda ocupa 22px
CANVAS_SIZE = 528px  → (24 × 22)
```

### Velocidades

Hay 4 tiers. Cada uno define tres cosas:

| Tier   | ms entre pasos | Multiplicador de pts | Color UI     |
|--------|---------------|----------------------|--------------|
| SLOW   | 200ms         | ×1                   | verde        |
| NORMAL | 130ms         | ×1.5                 | cian         |
| FAST   | 75ms          | ×2.5                 | amarillo     |
| INSANE | 40ms          | ×4                   | magenta      |

`ms` es el intervalo que tiene que acumularse antes de que la serpiente
dé un paso. A menos ms, más frecuentes son los pasos → más rápido.
`multiplier` escala los puntos base (100) por cada item comido.

---

## game.ts — Lógica pura

### El estado

```ts
interface State {
  snake: Vec2[]     // array de segmentos; [0] es la cabeza, [último] es la cola
  dir: Dir          // dirección actual del movimiento
  nextDir: Dir      // dirección encolada por input (ver sección de input)
  food: Vec2        // posición del item de comida
  score: number
  phase: 'waiting' | 'playing' | 'gameover' | 'win'
  speed: SpeedTier
  speedCfg: SpeedConfig
  stepAccMs: number  // acumulador del timer de paso
  elapsedMs: number  // tiempo total de la partida
  eatId: number      // contador de eventos "comió" (dispara SFX/animación)
  flashMs: number    // ms restantes de la animación de flash al crecer
  winId: number      // contador de eventos "ganó" (dispara SFX)
  deathId: number    // contador de eventos "murió" (dispara SFX)
}
```

Todo el estado es **inmutable**: cada función devuelve un nuevo objeto
en lugar de mutar el existente. Esto evita bugs difíciles de rastrear.

Los campos `eatId`, `winId` y `deathId` son contadores enteros que se
incrementan cuando ocurre el evento. El game loop los compara con los
valores del frame anterior para saber si disparar un sonido o animación
sin necesidad de callbacks ni efectos secundarios dentro de la lógica pura.

### `tick(state, deltaMs)` — el corazón del juego

Se llama cada frame con el tiempo transcurrido desde el frame anterior.
Internamente acumula ese tiempo en `stepAccMs`. Cuando el acumulador supera
`speedCfg.ms`, la serpiente da un paso:

```
acumulador += deltaMs
si acumulador < speedCfg.ms → solo actualizar timers, no mover nada
si acumulador >= speedCfg.ms → dar un paso
  acumulador = acumulador - speedCfg.ms   (conservar el excedente)
```

Restar en vez de resetear a 0 es importante: evita que pasos a alta
velocidad se "traquen" o acumulen desfases.

**Pasos del movimiento:**

1. Aplicar `nextDir` como dirección real (el jugador puede haber girado
   entre un paso y el siguiente).
2. Calcular la nueva posición de la cabeza sumando el vector de la dirección.
3. Verificar colisión con paredes (x o y fuera de [0, GRID)).
4. Verificar colisión con el cuerpo propio — pero excluyendo la cola,
   porque la cola se va a mover y libera esa celda en este mismo paso.
5. Comprobar si la nueva cabeza coincide con la comida.
   - **No comió**: mover = `[nuevaCabeza, ...cuerpoSinÚltimo]`
   - **Comió**: crecer = `[nuevaCabeza, ...cuerpoCompleto]` (sin quitar cola)
6. Si comió y la longitud == GRID×GRID → victoria.

### `queueDir(state, dir)` — dirección encolada

No se puede girar 180°: si la serpiente va a la derecha y el jugador
presiona izquierda, el input se ignora. La función `isOpposite` lo detecta.

La razón de tener `nextDir` separado de `dir` es que el input puede llegar
en cualquier momento del frame, pero la dirección solo se aplica cuando la
serpiente da un paso. Si `dir` se actualizara inmediatamente, podrías
pulsar derecha y luego arriba en el mismo frame, y la serpiente haría un
giro de 270° en lugar de los dos giros consecutivos esperados.

### `randomFood(snake)` — colocar la comida

Construye un `Set` con todas las celdas ocupadas por la serpiente
(formato `"x,y"`), genera todos los puntos libres y elige uno al azar.
Si `free.length === 0` devuelve `{x: -1, y: -1}`: el tablero está lleno,
señal de que el jugador ganó.

---

## index.tsx — Componente React

### Game loop con `requestAnimationFrame`

```ts
useEffect(() => {
  let lastTime = performance.now()

  function loop() {
    const now = performance.now()
    const delta = Math.min(now - lastTime, 100)  // clamp anti-lag
    lastTime = now

    stateRef.current = tick(stateRef.current, delta)
    drawScene(ctx, stateRef.current)
    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)
  return () => { /* cleanup */ }
}, [])
```

El estado del juego vive en `stateRef` (un `useRef`), no en `useState`.
Esto es clave: si viviera en `useState`, cada cambio de estado dispararía
un re-render de React, que es costoso y no hace falta porque el canvas
se dibuja directamente cada frame. React solo se re-renderiza cuando
cambia el score, la fase o el tiempo (cada ~1 segundo visual).

El `delta` se limita a 100ms para que si el navegador estaba en background
y la pestaña vuelve al foco, no haya un salto enorme en la lógica.

### Input y el doble buffer de dirección

El handler de teclado llama a `queueDir` que solo actualiza `nextDir`.
La dirección real solo se aplica cuando `tick` da un paso. Esto permite
que el jugador encole un giro que se ejecutará en el siguiente paso,
aunque el input llegue en medio del intervalo actual.

### Cómo se sincronizan el canvas y React

```
60fps: game loop → tick() → drawScene() → no re-render de React
                                        → si score/phase/time cambió → setUi()
```

`setUi` actualiza la sidebar (tiempo, longitud, etc.) pero es poco
frecuente comparado con los frames de dibujo.

### Flash de crecimiento

Cuando la serpiente come, `flashMs` se setea a `FLASH_MS` (320ms).
En `drawScene`, para los primeros 4 segmentos del cuerpo, el color se
interpola hacia blanco usando `lerpHex` de acuerdo a cuánto tiempo queda
del flash. La intensidad del flash cae por segmento (segmento 0 brilla más,
segmento 3 casi nada), creando un efecto de onda que recorre la cabeza.

```
flashT = flashMs / FLASH_MS   // 1 = recién comió, 0 = flash terminado
amount = flashT × (1 - idx/4)  // idx=0 → máximo, idx=3 → mínimo
color = lerpHex(baseColor, blanco, amount × 0.8)
```

---

## audio.ts — Motor de audio

Todo el audio se sintetiza en tiempo real con la Web Audio API.
No hay archivos `.mp3` ni `.ogg`.

### Cadena de audio

```
Oscilador → GainNode (ADSR) → musicGain ─┐
                                          ├→ masterGain → destination
Oscilador → GainNode (ADSR) → sfxGain ───┘
```

- `masterGain`: volumen global (0.55)
- `musicGain`: volumen de la música de fondo (0.32)
- `sfxGain`: volumen de los efectos de sonido (0.70)

Separar música y SFX en ramas distintas permite ajustar sus volúmenes
sin afectarse mutuamente.

### Cómo funciona `tone()`

```ts
tone(destino, frecuencia, tiempo, duración, forma, volumen)
```

Crea un `OscillatorNode` (genera la onda) y un `GainNode` (controla el
volumen). El gain empieza en `vol` y hace un rampa exponencial hasta
casi 0 en el 85% de la duración. Esto simula el ataque/decaimiento de
un instrumento real (sin el ramp el sonido se cortaría de forma brusca).

```
volumen
  │▓
  │▓▓
  │  ▓▓▓▒▒▒▒░░░░────
  └───────────────→ tiempo
    start     stop
```

### Scheduling de la música

La música no se reproduce nota a nota en tiempo real. En cambio, un
`setInterval` se ejecuta cada 20ms y mira hacia adelante 120ms
(`lookahead = 0.12`). Si hay notas pendientes dentro de esa ventana,
las programa con `osc.start(tiempo)` usando el reloj exacto del
`AudioContext` (`ctx.currentTime`).

Esto es el patrón estándar de scheduling de Web Audio porque:
- `setInterval` no es preciso (puede retrasarse varios ms)
- El reloj del AudioContext sí es de alta precisión
- Al mirar 120ms hacia adelante se "adelanta" a cualquier retraso del
  interval, garantizando que las notas suenen sin saltos ni silencios

```
tiempo real:  ──────────────────────────────→
ctx.currentTime:        │
lookahead window:       │←──120ms──→│
notas ya programadas:       ●   ●   ●
próxima ejecución del timer:  ↑ (dentro de 20ms)
```

### La melodía

```ts
const THEME: [frecuencia, beats][] = [ ... ]
```

Cada entrada es una nota definida por:
- **frecuencia** en Hz (o 0 para silencio). Las constantes `N.A4 = 440`,
  `N.C5 = 523.25`, etc. corresponden a notas musicales reales.
- **beats**: duración en tiempos musicales. La duración real en segundos
  depende del BPM: `dur = (60 / bpm) × beats`.

La progresión armónica es Am → F → C → G, un loop de 8 compases
estilo chiptune. Al cambiar la velocidad del juego, el BPM de la música
también sube:

| Velocidad | BPM |
|-----------|-----|
| SLOW      | 100 |
| NORMAL    | 128 |
| FAST      | 155 |
| INSANE    | 185 |

### Los SFX

| Evento  | Descripción técnica                                              |
|---------|------------------------------------------------------------------|
| `playEat`   | Dos notas ascendentes (C5 → E5) con onda cuadrada, rápidas   |
| `playDeath` | Descenso cromático A4→C4 con onda sierra (suena más áspero)  |
| `playWin`   | Fanfarria C5→E5→G5→C6 + sweep de frecuencia final           |

La onda **cuadrada** suena más brillante y "chiptune". La onda **sierra**
es más agresiva/áspera, ideal para el efecto de muerte.

---

## Flujo completo de una partida

```
1. Montar componente
   → createState('normal')     estado inicial, phase='waiting'
   → Game loop arranca (rAF)
   → Input listener registrado

2. Jugador presiona Enter
   → audioStarted = true
   → startGame()               phase='playing'
   → snakeAudio.startMusic()

3. Cada frame (~16ms a 60fps)
   → tick(state, delta)
      ├─ stepAcc += delta
      ├─ si stepAcc < speedCfg.ms → solo actualizar timers
      └─ si stepAcc >= speedCfg.ms → dar paso
           ├─ colisión pared/cuerpo → phase='gameover', deathId++
           ├─ comió comida → snake crece, score++, eatId++, flashMs=320
           │    └─ todo el tablero lleno → phase='win', winId++
           └─ movimiento normal
   → drawScene(ctx, state)    dibujar canvas
   → si eatId cambió → snakeAudio.playEat()
   → si deathId cambió → snakeAudio.playDeath(), stopMusic()
   → si winId cambió → snakeAudio.playWin(), stopMusic()

4. Game over o Victoria
   → Overlay encima del canvas con estadísticas
   → Enter → doRestart() → vuelta a paso 1
```

---

## Decisiones de diseño

**¿Por qué `stateRef` en vez de `useState` para el estado del juego?**
El estado cambia 60 veces por segundo. `useState` causaría 60 re-renders
por segundo de React, lo que es innecesario porque el canvas se redibuja
directamente. Solo se llama a `setUi` cuando cambia algo que tiene que
verse en la sidebar HTML.

**¿Por qué funciones puras en `game.ts`?**
Facilita testear la lógica sin montar componentes. También hace que el
game loop sea predecible: `siguienteEstado = tick(estadoActual, delta)`.
No hay efectos secundarios ocultos.

**¿Por qué no usar `useReducer`?**
Podría funcionar, pero obligaría a que cada `dispatch` pase por el
ciclo de render de React. Como el tick ocurre 60 veces por segundo,
la solución con `useRef` + mutación manual del ref es más eficiente.

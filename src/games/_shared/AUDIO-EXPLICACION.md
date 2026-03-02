# Cómo funcionan la música y los sonidos (Tetris y Snake)

En ambos juegos **no se usan archivos de audio** (mp3, wav, etc.). Todo se genera en tiempo real con la **Web Audio API** del navegador: osciladores que vibran a cierta frecuencia = sonido. Esta guía explica la lógica detrás.

---

## 1. La idea central: frecuencia = nota

Un **sonido** es una vibración en el aire. La **frecuencia** (cuántas veces vibra por segundo, en Hz) determina la **altura** del sonido:

- **Frecuencia baja** (ej. 100 Hz) → sonido grave (como un bajo).
- **Frecuencia alta** (ej. 1000 Hz) → sonido agudo (como un pitido).

En música, las **notas** tienen frecuencias estándar. Por ejemplo, el **La central (A4)** suena a **440 Hz**. A partir de ahí se calculan el resto de las notas con una fórmula matemática (escala temperada).

En el código tenemos un objeto con las frecuencias de las notas que usamos:

```ts
const N = {
  C4: 261.63,   // Do central
  D4: 293.66,   // Re
  E4: 329.63,   // Mi
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,   // La (referencia estándar)
  B4: 493.88,
  C5: 523.25,   // Do una octava arriba
  // ... más notas
}
```

**Conclusión:** para tocar “un Do”, creamos un oscilador que vibre a 261.63 Hz. Para un Mi, a 329.63 Hz. La melodía no es más que **una lista de (frecuencia, duración)** que vamos reproduciendo en orden.

---

## 2. Cómo se genera un tono: oscilador + ganancia

La Web Audio API trabaja con **nodos** conectados en cadena. Para un tono simple:

1. **Oscilador** (`OscillatorNode`): genera una onda que sube y baja. Esa onda es el sonido “puro” a una frecuencia.
   - `oscillator.frequency.value = 440` → suena un La.
   - El **tipo de onda** cambia el “timbre”:
     - `sine` → suave, flauta.
     - `square` → más duro, “chiptune” / 8 bits.
     - `sawtooth` → más áspero, tipo sintetizador.
     - `triangle` → intermedio.

2. **Ganancia** (`GainNode`): controla el **volumen**. Si dejamos el volumen fijo, el sonido se corta de golpe al parar el oscilador y suena mal. Por eso hacemos un **decay**: el volumen empieza en un valor y baja suavemente hasta casi 0 antes de cortar el oscilador. Eso es un “envelope” muy simple (ataque-decay).

En Tetris/Snake tenemos una función auxiliar que hace exactamente eso:

```ts
private tone(dest, freq, time, dur, type = 'square', vol = 0.27) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, time)                    // volumen inicial
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.88)  // baja hasta casi 0
  osc.start(time)
  osc.stop(time + dur * 0.9)
  // ... conectar osc → gain → dest
}
```

- **freq**: la nota (Hz).
- **time**: en qué segundo del “tiempo de audio” debe empezar.
- **dur**: cuánto dura la nota (en segundos).
- **type**: tipo de onda (`square` para melodía chiptune, `sine` para algo más suave).

Así, **cada nota de la melodía** es una llamada a `tone()` con la frecuencia y la duración correctas.

---

## 3. Cómo se arma una melodía (ej. Korobeiniki en Tetris)

Una canción es una **secuencia de notas**, cada una con:

- **Frecuencia** (qué nota).
- **Duración** (cuánto tiempo suena, muchas veces en “negras” o fracciones: 1 = negra, 0.5 = corchea, 2 = blanca).

En el código la melodía se guarda como un array de `[frecuencia, duración_en_negras]`:

```ts
const THEME: [number, number][] = [
  [N.E5, 1], [N.B4, .5], [N.C5, .5], [N.D5, 1], [N.C5, .5], [N.B4, .5],  // compás 1
  [N.A4, 1], [N.A4, .5], [N.C5, .5], [N.E5, 1], [N.D5, .5], [N.C5, .5],  // compás 2
  // ...
]
```

Para saber **cuántos segundos dura cada nota** necesitamos el **tempo** (BPM = beats per minute):

- 1 negra = 60/BPM segundos.  
  Ejemplo: 150 BPM → 1 negra = 0,4 s.
- Duración real = (60 / BPM) × duración_en_negras.

Entonces, para cada elemento del THEME:

1. Tomamos frecuencia y duración en negras.
2. Convertimos a segundos: `dur = (60 / bpm) * beats`.
3. Llamamos a `tone(..., freq, nextTime, dur, ...)`.
4. Avanzamos el “cursor” del tiempo: `nextTime += dur`.
5. Pasamos a la siguiente nota; cuando se acaba el array, volvemos al inicio (loop).

Eso es exactamente lo que hace el **scheduler** en un `setInterval` (cada ~20 ms): mira “qué tiempo de audio estamos” y programa todas las notas que caen en una ventana de ~0,12 s hacia el futuro. Así la melodía suena continua y a tiempo.

**Resumen:**  
Melodía = lista de (frecuencia, duración). BPM convierte duración a segundos. Un loop va llamando a `tone()` una nota tras otra y reinicia el array para que suene en loop.

---

## 4. Cómo se hacen los efectos de sonido (SFX)

Los SFX son **sonidos cortos** con formas concretas. No son una lista de notas fijas, sino **un oscilador (o varios) con cambios en el tiempo**:

### Pieza que se fija (Tetris) — “thunk”

- Un oscilador **sine**.
- Frecuencia: empieza en 180 Hz y **baja** hasta 55 Hz en 70 ms (`exponentialRampToValueAtTime`).
- Volumen: empieza alto y baja a casi 0 en 90 ms.

Resultado: un “golpe” que baja de tono, como algo que se asienta.

### Comer (Snake) — “pip pip”

- Dos tonos cortos seguidos: primero C5, luego E5, cada uno con duración fija (0.07 s y 0.1 s).
- Es como tocar dos notas muy cortas con `tone()`.

### Muerte (Snake / Tetris) — “error” o “apagado”

- Varias notas **en secuencia**, cada una un poco más grave: por ejemplo G4 → E4 → C4 → A3 → …
- Se usa onda **sawtooth** y decay en el volumen.
- Da la sensación de “power down” o “algo salió mal”.

### Tetris (4 líneas) — “fanfarria”

- Un **barrido** de frecuencia (sawtooth de C5 a C6).
- Luego 4 notas fijas (C5, E5, G5, C6) con `tone()`.
- Combinación de “sweep” + acorde para que suene a logro.

La lógica siempre es la misma:  
**crear oscilador(es), darles frecuencia y ganancia, y opcionalmente animar frecuencia y/o ganancia con `setValueAtTime` y `exponentialRampToValueAtTime`** en momentos concretos (`ctx.currentTime + ...`).

---

## 5. Por qué usamos “tiempo de audio” y no “ya”

Si llamas a `osc.start(0)` pensando “ahora”, un retraso de JavaScript puede hacer que el sonido se retrase. La Web Audio API usa un **reloj interno** (`ctx.currentTime`). Lo que hacemos es:

- Decidir **en qué segundo** debe sonar cada nota: `time = musicNextTime` (o `ctx.currentTime + 0.05` para un pequeño offset).
- Programar: `osc.start(time)` y `osc.stop(time + dur)`.

Así el navegador reproduce en el momento exacto aunque nuestro `setInterval` tenga pequeños retrasos. Por eso el scheduler trabaja siempre con variables tipo `musicNextTime` y no con “ahora”.

---

## 6. Resumen en una tabla

| Qué | Cómo |
|-----|------|
| **Una nota** | Oscilador a una frecuencia + Gain con decay. |
| **Melodía** | Array de [frecuencia, duración]; BPM → segundos; loop que llama a `tone()` y avanza el tiempo. |
| **Tempo** | BPM; 1 negra = 60/BPM segundos. |
| **SFX “thunk”** | Oscilador con frecuencia que baja en el tiempo (ramp). |
| **SFX “pip”** | Dos tonos cortos a frecuencias fijas. |
| **SFX “error”** | Secuencia de notas descendentes con sawtooth. |
| **Sincronía** | Programar con `start(time)` / `stop(time)` usando el reloj del AudioContext. |

Con esto tenés la lógica detrás de las “canciones” y sonidos del Snake y el Tetris: **frecuencia = nota, duración = ritmo, osciladores + ganancia = timbre y volumen**, y todo orquestado con el tiempo del `AudioContext`.

// Motor de audio para Snake — Web Audio API (sin archivos)

const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50,
  G3: 196.00, A3: 220.00, B3: 246.94,
  R: 0,
}

// Melodía de fondo — estilo chiptune loop de 16 pasos
// Basada en una progresión Am - F - C - G (4/4, 8ths)
const THEME: [number, number][] = [
  [N.A4, .5], [N.C5, .5], [N.E5, 1],   [N.A4, .5], [N.G4, .5],
  [N.F4, .5], [N.A4, .5], [N.C5, 1],   [N.F4, .5], [N.E4, .5],
  [N.C4, .5], [N.E4, .5], [N.G4, 1],   [N.C4, .5], [N.B3, .5],
  [N.G3, .5], [N.B3, .5], [N.D4, 1],   [N.G3, .5], [N.A3, .5],
  [N.A3, .5], [N.C4, .5], [N.E4, 1],   [N.A3, .5], [N.G3, .5],
  [N.F4, 2],  [N.R, .5],  [N.E4, .5],
  [N.A4, .5], [N.B4, .5], [N.C5, .5],  [N.B4, .5],
  [N.A4, 2],  [N.R, 2],
]

export class SnakeAudio {
  private ctx: AudioContext | null = null
  private masterGain!: GainNode
  private musicGain!: GainNode
  private sfxGain!: GainNode

  private musicPlaying = false
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private musicNextTime = 0
  private musicIdx = 0
  private bpm = 128

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.55
      this.masterGain.connect(this.ctx.destination)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.32
      this.musicGain.connect(this.masterGain)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.7
      this.sfxGain.connect(this.masterGain)
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  resume() { this.ctx?.resume() }

  private tone(
    dest: AudioNode, freq: number, time: number, dur: number,
    type: OscillatorType = 'square', vol = 0.25,
  ) {
    const ctx = this.ctx
    if (!ctx || freq === 0) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.85)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(time)
    osc.stop(time + dur * 0.9)
  }

  // ── Música ──────────────────────────────────────────────────────────────────

  private scheduleMusicNotes() {
    const ctx = this.ctx
    if (!ctx || !this.musicPlaying) return
    const lookahead = 0.12
    while (this.musicNextTime < ctx.currentTime + lookahead) {
      const [freq, beats] = THEME[this.musicIdx % THEME.length]!
      const dur = (60 / this.bpm) * beats
      this.tone(this.musicGain, freq, this.musicNextTime, dur, 'square', 0.22)
      this.musicNextTime += dur
      this.musicIdx = (this.musicIdx + 1) % THEME.length
    }
  }

  startMusic() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    if (this.musicPlaying) return
    this.musicPlaying = true
    this.musicNextTime = ctx.currentTime + 0.05
    this.musicIdx = 0
    this.musicTimer = setInterval(() => this.scheduleMusicNotes(), 20)
  }

  stopMusic() {
    this.musicPlaying = false
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null }
  }

  // Acelerar la música con la velocidad del juego
  setTempo(bpm: number) {
    this.bpm = Math.max(80, Math.min(220, bpm))
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  // Comer item: pip ascendente doble
  playEat() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime
    this.tone(this.sfxGain, N.C5, t, 0.07, 'square', 0.3)
    this.tone(this.sfxGain, N.E5, t + 0.07, 0.1, 'square', 0.28)
  }

  // Muerte: descenso cromático tipo "blip de error"
  playDeath() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime
    ;[N.A4, N.G4, N.F4, N.E4, N.D4, N.C4].forEach((freq, i) =>
      this.tone(this.sfxGain, freq, t + i * 0.065, 0.1, 'sawtooth', 0.28)
    )
  }

  // Victoria: fanfarria ascendente
  playWin() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime
    ;[N.C5, N.E5, N.G5, N.C6].forEach((freq, i) =>
      this.tone(this.sfxGain, freq, t + i * 0.1, 0.22, 'square', 0.3)
    )
    // Sweep final
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(N.C5, t + 0.4)
    osc.frequency.exponentialRampToValueAtTime(N.C6, t + 0.7)
    g.gain.setValueAtTime(0.3, t + 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85)
    osc.connect(g); g.connect(this.sfxGain)
    osc.start(t + 0.4); osc.stop(t + 0.9)
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  restart() {
    this.stopMusic()
    this.musicIdx = 0
  }

  destroy() {
    this.stopMusic()
    this.ctx?.close()
    this.ctx = null
  }
}

export const snakeAudio = new SnakeAudio()

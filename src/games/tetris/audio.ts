// Motor de audio para Tetris usando Web Audio API

// ── Frecuencias de notas ──────────────────────────────────────────────────────
const N = {
  E3: 164.81, G3: 196.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.00, B5: 987.77, C6: 1046.50,
  R: 0,
}

// Korobeiniki (Type A) — [frecuencia, tiempos en negras]
// Frase 1 (c1-c4 = 16 tiempos) + Frase 2 (c5-c8 = 16 tiempos) → loop
const THEME: [number, number][] = [
  [N.E5, 1], [N.B4, .5], [N.C5, .5], [N.D5, 1], [N.C5, .5], [N.B4, .5],  // c1: 4
  [N.A4, 1], [N.A4, .5], [N.C5, .5], [N.E5, 1], [N.D5, .5], [N.C5, .5],  // c2: 4
  [N.B4, 1.5], [N.C5, .5], [N.D5, 1], [N.E5, 1],                          // c3: 4
  [N.C5, 1], [N.A4, 1], [N.A4, 2],                                         // c4: 4
  [N.D5, 2], [N.F5, 1], [N.A5, 1],                                         // c5: 4
  [N.G5, 1.5], [N.F5, .5], [N.E5, 1.5], [N.C5, .5],                       // c6: 4
  [N.B4, 1.5], [N.C5, .5], [N.D5, 1], [N.E5, 1],                          // c7: 4
  [N.C5, 1], [N.A4, 1], [N.A4, 2],                                         // c8: 4
]

// Música de game over — descenso en La menor, 70 BPM, atmosférica
const GO_THEME: [number, number][] = [
  [N.A4, 3], [N.G4, 1], [N.F4, 2], [N.E4, 2],
  [N.D4, 4], [N.C4, 2], [N.B3, 2],
  [N.A3, 6], [N.R, 2],
]

// ── Motor ─────────────────────────────────────────────────────────────────────

export class TetrisAudio {
  private ctx: AudioContext | null = null
  private masterGain!: GainNode
  private musicGain!: GainNode
  private sfxGain!: GainNode

  private musicPlaying = false
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private musicNextTime = 0
  private musicIdx = 0
  private bpm = 150

  private goPlaying = false
  private goTimer: ReturnType<typeof setInterval> | null = null
  private goNextTime = 0
  private goIdx = 0

  // ── Inicialización ──────────────────────────────────────────────────────────

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.6
      this.masterGain.connect(this.ctx.destination)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.38
      this.musicGain.connect(this.masterGain)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.65
      this.sfxGain.connect(this.masterGain)
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  resume() { this.ctx?.resume() }

  // ── Generación de tonos ─────────────────────────────────────────────────────

  private tone(
    dest: AudioNode, freq: number, time: number, dur: number,
    type: OscillatorType = 'square', vol = 0.27,
  ) {
    const ctx = this.ctx
    if (!ctx || freq === 0) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.88)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(time)
    osc.stop(time + dur * 0.9)
  }

  // ── Música principal ────────────────────────────────────────────────────────

  private scheduleMusicNotes() {
    const ctx = this.ctx
    if (!ctx || !this.musicPlaying) return
    const lookahead = 0.12
    while (this.musicNextTime < ctx.currentTime + lookahead) {
      const [freq, beats] = THEME[this.musicIdx % THEME.length]!
      const dur = (60 / this.bpm) * beats
      this.tone(this.musicGain, freq, this.musicNextTime, dur, 'square', 0.26)
      this.musicNextTime += dur
      this.musicIdx = (this.musicIdx + 1) % THEME.length
    }
  }

  startMusic() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    this.stopGameOverMusic()
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

  setTempo(bpm: number) {
    this.bpm = Math.max(80, Math.min(240, bpm))
  }

  // ── Música de game over ─────────────────────────────────────────────────────

  private scheduleGoNotes() {
    const ctx = this.ctx
    if (!ctx || !this.goPlaying) return
    const lookahead = 0.15
    const beatSec = 60 / 70
    while (this.goNextTime < ctx.currentTime + lookahead) {
      const [freq, beats] = GO_THEME[this.goIdx % GO_THEME.length]!
      const dur = beatSec * beats
      this.tone(this.musicGain, freq, this.goNextTime, dur, 'sine', 0.17)
      this.goNextTime += dur
      this.goIdx = (this.goIdx + 1) % GO_THEME.length
    }
  }

  startGameOverMusic() {
    const ctx = this.ensureCtx()
    if (!ctx || this.goPlaying) return
    ctx.resume()
    this.goPlaying = true
    this.goNextTime = ctx.currentTime + 0.05
    this.goIdx = 0
    this.goTimer = setInterval(() => this.scheduleGoNotes(), 20)
  }

  stopGameOverMusic() {
    this.goPlaying = false
    if (this.goTimer) { clearInterval(this.goTimer); this.goTimer = null }
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  playLock() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.07)
    gain.gain.setValueAtTime(0.55, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  playClear(lines: number) {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime

    if (lines >= 4) {
      const sweep = ctx.createOscillator()
      const sg = ctx.createGain()
      sweep.type = 'sawtooth'
      sweep.frequency.setValueAtTime(N.C5, t)
      sweep.frequency.exponentialRampToValueAtTime(N.C6, t + 0.2)
      sg.gain.setValueAtTime(0.38, t)
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      sweep.connect(sg); sg.connect(this.sfxGain)
      sweep.start(t); sweep.stop(t + 0.55)
      ;[N.C5, N.E5, N.G5, N.C6].forEach((freq, i) =>
        this.tone(this.sfxGain, freq, t + 0.2 + i * 0.045, 0.38, 'square', 0.22)
      )
      return
    }

    const chords: number[][] = [
      [N.C5, N.E5],
      [N.C5, N.E5, N.G5],
      [N.C5, N.E5, N.G5, N.B5],
    ]
    const chord = chords[lines - 1] ?? chords[0]!
    chord.forEach((freq, i) =>
      this.tone(this.sfxGain, freq, t + i * 0.045, 0.18 + lines * 0.06, 'square', 0.24)
    )
  }

  playGameOver() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    ctx.resume()
    const t = ctx.currentTime
    ;[N.G4, N.E4, N.C4, N.A3, N.G3, N.E3].forEach((freq, i) =>
      this.tone(this.sfxGain, freq, t + i * 0.17, 0.24, 'sawtooth', 0.3)
    )
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  restart() {
    this.stopMusic()
    this.stopGameOverMusic()
    this.musicIdx = 0
  }

  destroy() {
    this.stopMusic()
    this.stopGameOverMusic()
    this.ctx?.close()
    this.ctx = null
  }
}

export const audio = new TetrisAudio()

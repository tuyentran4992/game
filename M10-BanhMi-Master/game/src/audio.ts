// src/audio.ts — WebAudio synth SFX, 0 file am thanh (SPEC §9).
// 5 mau + heartbeat: pop / chime / coin / angry-buzz / fanfare / heartbeat.
let ctx: AudioContext | null = null
let muted = false

function ac(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext }
    const AC = window.AudioContext ?? w.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(freq: number, dur: number, type: OscillatorType, gain = 0.16, delay = 0, slideTo?: number): void {
  const a = ac()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  setMuted(m: boolean): void {
    muted = m
  },
  /** unlock sau first user gesture (autoplay policy mobile) */
  unlock(): void {
    void ac()
  },
  pop(): void {
    blip(440, 0.07, 'square', 0.12, 0, 240)
  },
  chime(): void {
    blip(880, 0.25, 'sine', 0.14)
    blip(1320, 0.25, 'sine', 0.08, 0.05)
  },
  coin(): void {
    blip(1046, 0.06, 'square', 0.1)
    blip(1568, 0.18, 'square', 0.1, 0.06)
  },
  angry(): void {
    blip(160, 0.28, 'sawtooth', 0.16, 0, 90)
  },
  fanfare(): void {
    ;[523, 659, 784].forEach((f, i) => blip(f, 0.22, 'triangle', 0.16, i * 0.11))
  },
  heartbeat(): void {
    blip(55, 0.14, 'sine', 0.22)
  },
  bad(): void {
    blip(220, 0.18, 'square', 0.14, 0, 110)
  }
}

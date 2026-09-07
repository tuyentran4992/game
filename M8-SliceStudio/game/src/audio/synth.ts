// Slice Studio — audio/synth.ts (Tier B, WebAudio only — no audio files)
// 2 synth voices required by the fun gate: slice whoosh + reveal chime.

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Must be called from a user gesture (pointerdown) to unlock audio. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  private noiseBurst(dur: number, f0: number, f1: number, vol: number, when = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, slideTo?: number): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** The cut: whoosh + snap. Higher accuracy = brighter snap. */
  slice(pct: number): void {
    this.noiseBurst(0.16, 4200, 700, 0.5);
    this.tone(300 + pct * 2, 0.14, 0.35, 'triangle', 0.02, 90);
  }

  /** Reveal chime when a core is unveiled. */
  reveal(): void {
    this.tone(660, 0.22, 0.22, 'sine', 0.05);
    this.tone(880, 0.24, 0.18, 'sine', 0.16);
    this.tone(1320, 0.3, 0.14, 'sine', 0.27);
  }

  /** GHOST CUT signature (streak >=95%). */
  ghost(): void {
    this.tone(1760, 0.34, 0.16, 'sine', 0.1);
    this.tone(2340, 0.4, 0.1, 'sine', 0.22);
    this.noiseBurst(0.3, 6000, 9000, 0.12, 0.05);
  }

  /** Chunk lost buzz (no-go touch). */
  chunkLost(): void {
    this.tone(140, 0.22, 0.3, 'sawtooth', 0, 70);
    this.noiseBurst(0.12, 300, 120, 0.3);
  }

  /** UI blip. */
  blip(): void {
    this.tone(520, 0.06, 0.15, 'square');
  }
}

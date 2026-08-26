/**
 * Neon Grid — Web Audio Procedural Sound Synthesizer
 *
 * Studio-quality retro-cyberpunk audio effects synthesized in real-time
 * without any external audio asset files or network latency.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private _muted: boolean = false;

  constructor() {
    // Check saved mute preference
    try {
      const saved = localStorage.getItem('neon_grid_muted');
      if (saved !== null) {
        this._muted = saved === 'true';
      }
    } catch {
      this._muted = false;
    }
  }

  public get isMuted(): boolean {
    return this._muted;
  }

  public setMuted(muted: boolean): void {
    this._muted = muted;
    try {
      localStorage.setItem('neon_grid_muted', String(muted));
    } catch {
      // ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  private initContext(): AudioContext | null {
    if (this._muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Sound when picking up / selecting a piece */
  public playPickup(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Sound when placing a piece on the board */
  public playDrop(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Punch bass
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    // High snap click
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(1200, now);
    snapOsc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    snapGain.gain.setValueAtTime(0.1, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
    snapOsc.start(now);
    snapOsc.stop(now + 0.04);
  }

  /** Sound when piece snaps back due to invalid placement */
  public playSnapback(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Sound when lines are cleared. Scales pitch with combo streak */
  public playClear(lines: number = 1, combo: number = 0): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreqs = [
      [523.25, 659.25, 783.99],          // C5, E5, G5 (Single)
      [659.25, 783.99, 1046.50, 1318.5], // E5, G5, C6, E6 (Double)
      [783.99, 1046.50, 1318.5, 1567.98, 2093.0], // Triple+
    ];

    const chordIndex = Math.min(baseFreqs.length - 1, Math.max(0, lines - 1));
    const chord = baseFreqs[chordIndex];
    const pitchMultiplier = Math.pow(1.08, Math.min(combo, 8));

    chord.forEach((freq, i) => {
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      noteOsc.type = i === 0 ? 'sine' : 'triangle';
      const f = freq * pitchMultiplier;
      noteOsc.frequency.setValueAtTime(f, now + i * 0.04);
      noteOsc.frequency.exponentialRampToValueAtTime(f * 1.02, now + i * 0.04 + 0.25);

      noteGain.gain.setValueAtTime(0, now + i * 0.04);
      noteGain.gain.linearRampToValueAtTime(0.18 / (i + 1), now + i * 0.04 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.35);

      noteOsc.connect(noteGain);
      noteGain.connect(ctx.destination);

      noteOsc.start(now + i * 0.04);
      noteOsc.stop(now + i * 0.04 + 0.35);
    });
  }

  /** Huge combo fanfare */
  public playComboFanfare(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 to G6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  /** Game over sad tone */
  public playGameOver(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 415.3, 392, 349.23]; // A4, Ab4, G4, F4

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.12, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.3);
    });
  }

  /** UI button click */
  public playButtonClick(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Chime / whoosh sound when new pieces spawn in tray */
  public playSpawn(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [587.33, 880, 1174.66]; // D5, A5, D6 arpeggio

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);

      gain.gain.setValueAtTime(0, now + idx * 0.035);
      gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.035 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.18);
    });
  }
}

export const soundFx = new SoundSynthesizer();


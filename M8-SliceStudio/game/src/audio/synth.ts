// Slice Studio - audio/synth.ts (Tier B, WebAudio only - no audio files)
// 2 synth voices required by the fun gate: slice whoosh + reveal chime.
//
// S3 polish (card t_e5b58098): ADDED voices strum / resumeCue / ambience and
// enriched chunkLost content. Existing signatures slice/reveal/ghost/chunkLost/
// blip are UNCHANGED (S3-T2 anchors byte-identical regions); frozen numbers
// stay literal so the anchors hold - see src/config/audio-config.ts for the
// tunable mirror + the "used" groups that ARE read from config.
//
// F1 fix (card t_3011ee93, Playgama C-24 "mute + stop audio when minimized"):
// the ambience pad now follows tab visibility - hidden stops it, visible
// resumes the current chapter mood. `muted` became an accessor (same property
// syntax for hud/TraceScene): muting kills a running pad immediately, unmuting
// restores it when it should be audible. The guard listens AT the document
// (visibilitychange fires there, bubbles=false - same lesson as save.ts S4F).

import { AUDIO } from '../config/audio-config';

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private mutedState = false;
  /** Chapter of the most recent ambience() request - resume keeps this mood. */
  private lastChapter = 1;
  /** Removal fn for the visibility guard; non-null = installed exactly once. */
  private visGuard: (() => void) | null = null;

  /**
   * Mute accessor (was a plain flag): muting must be audible at once - a
   * running pad dies immediately (F1 sibling defect: the flag never reached
   * the already-started pad). Unmuting restores the pad when it should play.
   */
  get muted(): boolean {
    return this.mutedState;
  }

  set muted(v: boolean) {
    const was = this.mutedState;
    this.mutedState = v;
    if (v && !was) {
      this.stopAmbience();
    } else if (!v && was) {
      this.restoreAmbience();
    }
  }

  /** Must be called from a user gesture (pointerdown) to unlock audio. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.installVisGuard();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = AUDIO.master.gain;
    this.master.connect(this.ctx.destination);
    this.installVisGuard();
  }

  /**
   * F1 (C-24): hide the tab → stop the pad; come back → resume the current
   * chapter mood. visibilitychange fires AT the document (bubbles=false), so
   * the listener goes on document - a window listener would never hear it
   * (same wiring lesson as installLifecycleSavers S4F). Installs exactly once.
   */
  private installVisGuard(): void {
    if (this.visGuard) return;
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    const onVis = () => {
      if (this.isHidden()) {
        this.stopAmbience();
      } else {
        this.restoreAmbience();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    this.visGuard = () => document.removeEventListener('visibilitychange', onVis);
  }

  /** Tab hidden? Node/no-document environments read as visible (never blocks). */
  private isHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden === true;
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
    // Enriched content (S3): proto buzz kept as layer 1 + 2nd buzz layer +
    // low thud - "loss with weight" (DESIGN-SPEC S4, pillar 3).
    this.tone(AUDIO.chunkLost.buzzF, AUDIO.chunkLost.buzzDur, AUDIO.chunkLost.buzzVol, 'sawtooth', 0, AUDIO.chunkLost.buzzSlideTo);
    this.noiseBurst(AUDIO.chunkLost.noiseDur, AUDIO.chunkLost.noiseF0, AUDIO.chunkLost.noiseF1, AUDIO.chunkLost.noiseVol);
    this.tone(AUDIO.chunkLost.buzz2F, AUDIO.chunkLost.buzz2Dur, AUDIO.chunkLost.buzz2Vol, 'square', 0);
    this.tone(AUDIO.chunkLost.thudF, AUDIO.chunkLost.thudDur, AUDIO.chunkLost.thudVol, 'sine', AUDIO.chunkLost.thudAt, AUDIO.chunkLost.thudSlideTo);
  }

  /** UI blip. */
  blip(): void {
    this.tone(520, 0.06, 0.15, 'square');
  }

  /** Split strum (S3): 4 rising notes, higher pct = higher pitch (pillar 1). */
  strum(pct: number): void {
    if (!this.ctx || !this.master || this.muted) return;
    const c = AUDIO.strum;
    const p = Math.min(100, Math.max(0, pct));
    const root = c.base * Math.pow(2, (p / 100) * c.octave);
    const ratios = [c.r1, c.r2, c.r3, c.r4];
    for (let i = 0; i < c.notes; i++) {
      this.tone(root * ratios[i], c.noteDur, c.vol, 'triangle', i * c.step);
    }
  }

  /** Resume cue (S3): two soft 880 Hz pings - "release the edge, keep going". */
  resumeCue(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const c = AUDIO.resumeCue;
    this.tone(c.f, c.d, c.v1, 'sine', 0);
    this.tone(c.f, c.d, c.v2, 'sine', c.gap);
  }

  /** Chapter ambience (S3): 2-osc sine pad, very quiet, mood per chapter. */
  ambience(chapter: number): void {
    if (!this.ctx || !this.master || this.isHidden()) return;
    const c = AUDIO.ambience;
    const pads = [c.pad1, c.pad2, c.pad3, c.pad4];
    const ch = Math.min(4, Math.max(1, Math.floor(chapter)));
    // Remember the request even when muted (F1-T7): a muted boot must resume
    // the CURRENT chapter mood on the first unmute, not chapter 1.
    this.lastChapter = ch;
    if (this.muted) return;
    const root = pads[ch - 1];
    this.stopAmbience();
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(c.gain, t + c.attack);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(root, t);
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(root * c.f2Mul * c.detune, t);
    o1.connect(g);
    o2.connect(g);
    g.connect(this.master);
    o1.start(t);
    o2.start(t);
    this.pad = { o1, o2, gain: g };
  }

  private pad: { o1: OscillatorNode; o2: OscillatorNode; gain: GainNode } | null = null;

  /** Fade the current ambience pad out and stop it (safe if none). */
  private stopAmbience(): void {
    if (!this.ctx || !this.pad) return;
    const c = AUDIO.ambience;
    const t = this.ctx.currentTime;
    const { o1, o2, gain } = this.pad;
    this.pad = null;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + c.release);
    o1.stop(t + c.release + 0.05);
    o2.stop(t + c.release + 0.05);
  }

  /**
   * F1: bring the pad back for the current chapter mood (visibility restored
   * or unmuted). No-op when muted, hidden, already playing, or voiceless.
   */
  private restoreAmbience(): void {
    if (this.mutedState || this.isHidden()) return;
    if (this.pad || !this.ctx || !this.master) return;
    this.ambience(this.lastChapter);
  }
}

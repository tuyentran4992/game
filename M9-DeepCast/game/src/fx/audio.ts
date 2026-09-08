// WebAudio synth SFX (DESIGN-SPEC §5: reel-click, splash, pop, creak, alarm; no music asset).
type SynthKind = 'reel' | 'splash' | 'pop' | 'creak' | 'alarm';

class Sfx {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private ensureCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      } catch {
        this.enabled = false;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(kind: SynthKind): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    switch (kind) {
      case 'reel':
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      case 'splash':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'pop':
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'creak':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.linearRampToValueAtTime(90, t + 0.3);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
        break;
      case 'alarm':
        osc.type = 'square';
        osc.frequency.setValueAtTime(990, t);
        osc.frequency.setValueAtTime(740, t + 0.08);
        osc.frequency.setValueAtTime(990, t + 0.16);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.start(t);
        osc.stop(t + 0.24);
        break;
    }
  }

  // quick tension beep track (>95: fast beeps, DESIGN-SPEC §5)
  playAlarmBeep(): void {
    this.play('alarm');
  }
}

export const sfx = new Sfx();

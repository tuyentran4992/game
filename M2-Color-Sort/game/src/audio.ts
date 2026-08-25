// ============================================================================
// GALAXY AUDIO BUS — WebAudio synth, KHÔNG file ngoài, KHÔNG gọi mạng (M2-09).
// MỌI âm thanh (synth + sfx file của Phaser) đi qua MỘT bus duy nhất:
//   → SDK pause/mute callback chỉ cần 1 dòng: `synthAudio.setMuted(true)`.
// Bundle: 0 KB asset (tất cả sinh bằng oscillator).
// ============================================================================
import { pentatonicFreq, risingMelody } from './logic/pentatonic';

/** Bất kỳ sound-manager nào có cờ mute (Phaser.Sound.BaseSoundManager) — tránh import Phaser. */
export interface MutableSoundManager {
  mute: boolean;
}

const MASTER_GAIN = 0.9;

type ToneOpts = {
  freq: number;
  type?: OscillatorType;
  at?: number;       // delay (giây) so với "bây giờ"
  dur?: number;      // độ dài note
  gain?: number;     // biên độ đỉnh
  attack?: number;
  glideTo?: number;  // ramp tần số tới
  filter?: number;   // lowpass cutoff
};

class GalaxyAudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private sealStep = 0;
  private sounds: MutableSoundManager | null = null;

  // ---------------------------------------------------------------- core bus
  private getCtx(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    try {
      const AudioCtx = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Gắn Phaser sound manager vào bus → mute 1 lần là im toàn bộ. */
  public attachSoundManager(sounds: MutableSoundManager): void {
    this.sounds = sounds;
    this.sounds.mute = this.muted;
  }

  /** MUTE/UNMUTE toàn bộ game bằng MỘT dòng (SDK onPause / onAudioEnabledChange). */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.sounds) this.sounds.mute = muted;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, now, 0.015);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /** Alias giữ tương thích với code cũ (`synthAudio.setMute`). */
  public setMute(muted: boolean): void {
    this.setMuted(muted);
  }

  public getMute(): boolean {
    return this.muted;
  }

  /** SDK onPause: treo hẳn audio context (tiết kiệm CPU + im tuyệt đối). */
  public suspend(): void {
    this.setMuted(true);
    try { void this.ctx?.suspend(); } catch { /* ignore */ }
  }

  /** SDK onResume. */
  public resume(enabled = true): void {
    try { void this.ctx?.resume(); } catch { /* ignore */ }
    this.setMuted(!enabled);
  }

  // -------------------------------------------------------------- primitives
  private tone(o: ToneOpts): void {
    if (this.muted) return;
    const ctx = this.getCtx();
    if (!ctx || !this.master) return;
    try {
      const t0 = ctx.currentTime + (o.at ?? 0);
      const len = o.dur ?? 0.2;
      const peak = o.gain ?? 0.16;
      const attack = o.attack ?? 0.012;

      const osc = ctx.createOscillator();
      osc.type = o.type ?? 'sine';
      osc.frequency.setValueAtTime(o.freq, t0);
      if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t0 + len * 0.9);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);

      if (o.filter) {
        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(o.filter, t0);
        osc.connect(flt);
        flt.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + len + 0.02);
    } catch {
      // audio không khả dụng → im lặng, không crash (M2-08 style fallback)
    }
  }

  // ------------------------------------------------------------------- SFX
  /** Đổ chất lỏng — "glug" trầm ấm, cao dần theo lớp. */
  public playGlug(step = 0): void {
    const base = 320 + step * 42;
    this.tone({ freq: base, glideTo: base * 1.45, type: 'sine', dur: 0.11, gain: 0.18, filter: 820 + step * 120 });
  }

  /** Giọt nước chạm mặt chất lỏng — "drop" mềm (pour juice). */
  public playDrop(fillRatio = 0.5): void {
    const f = 540 + fillRatio * 420;
    this.tone({ freq: f, glideTo: f * 0.55, type: 'sine', dur: 0.16, gain: 0.13, attack: 0.006, filter: 1800 });
    this.tone({ freq: f * 2, type: 'triangle', dur: 0.07, gain: 0.05, at: 0.005 });
  }

  /** Chọn/nhả ống, bấm nút. */
  public playClick(): void {
    this.tone({ freq: 880, glideTo: 460, type: 'sine', dur: 0.05, gain: 0.12, attack: 0.004 });
  }

  /** Đổ không hợp lệ — buzz trầm. */
  public playBuzz(): void {
    this.tone({ freq: 132, glideTo: 96, type: 'sawtooth', dur: 0.13, gain: 0.14, filter: 700 });
  }

  /** Gợi ý (rewarded hint) — ding 3 nốt. */
  public playHint(): void {
    [0, 1, 2].forEach((i) => {
      this.tone({ freq: pentatonicFreq(7 + i * 2), type: 'sine', dur: 0.34, gain: 0.13, at: i * 0.06 });
    });
  }

  // ------------------------------------------------------- SEAL (melody hook)
  /** Reset thang âm mỗi khi vào level / restart → melody luôn bắt đầu từ nốt gốc. */
  public resetSealScale(step = 0): void {
    this.sealStep = Math.max(0, Math.floor(step));
  }

  public getSealStep(): number {
    return this.sealStep;
  }

  /**
   * SEAL: ống vừa thành 1 màu duy nhất → nốt kế tiếp ĐI LÊN thang ngũ cung
   * (mỗi seal 1 nốt cao hơn → clear level nghe như 1 câu nhạc hoàn chỉnh).
   */
  public playSealNote(step?: number): void {
    const s = step ?? this.sealStep;
    this.sealStep = s + 1;
    const f = pentatonicFreq(s + 5); // bắt đầu từ octave giữa cho sáng
    this.tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.17, attack: 0.014 });
    this.tone({ freq: f * 2, type: 'sine', dur: 0.34, gain: 0.07, at: 0.02 });      // harmonic lung linh
    this.tone({ freq: f * 1.5, type: 'sine', dur: 0.26, gain: 0.05, at: 0.05 });    // quãng 5 (kính "đóng")
  }

  /** Giữ tên cũ: hoàn thành 1 ống = seal. */
  public playTubeComplete(): void {
    this.playSealNote();
  }

  /** Level clear — melody đi lên rồi resolve (khớp thang seal). */
  public playLevelClear(sealCount?: number): void {
    const notes = risingMelody(Math.max(3, sealCount ?? Math.max(3, this.sealStep)), 5);
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      this.tone({ freq: f, type: last ? 'sine' : 'triangle', dur: last ? 0.9 : 0.3, gain: last ? 0.2 : 0.15, at: i * 0.085 });
      if (last) {
        this.tone({ freq: f * 1.5, type: 'sine', dur: 0.85, gain: 0.09, at: i * 0.085 + 0.02 });
        this.tone({ freq: f * 0.5, type: 'sine', dur: 0.95, gain: 0.11, at: i * 0.085 });
      }
    });
  }

  /** Hạt confetti lấp lánh (level clear) — nốt ngắn ngẫu nhiên trong thang. */
  public playSparkle(index = 0): void {
    this.tone({ freq: pentatonicFreq(10 + (index % 5)), type: 'sine', dur: 0.18, gain: 0.07, at: index * 0.03 });
  }

  /** Ống trống thưởng (rewarded extra tube) — nốt ấm đi lên. */
  public playRewardTube(): void {
    [0, 2, 4].forEach((s, i) => {
      this.tone({ freq: pentatonicFreq(4 + s), type: 'triangle', dur: 0.4, gain: 0.14, at: i * 0.07 });
    });
  }
}

export const synthAudio = new GalaxyAudioBus();
export type { GalaxyAudioBus };

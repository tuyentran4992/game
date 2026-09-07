/**
 * M7 Skip King — plopSynth (TẦNG B audio — FUN2-C1 theo bản tổng hợp quyết định
 * comment 267 card t_af145f89): oscillator 3 lớp TONAL + 1 lớp SLAP CHỦ ĐẠO theo audioMapper
 * (tầng A map params — tầng B chỉ phát):
 * - Slap (1.5–4kHz, transient ≤80ms) đi đường BANDPASS RIÊNG nối thẳng compressor — KHÔNG qua
 *   lowpass tonal (lowpass cũ 2200Hz giết slap; nới lowpass tonal ~3.2kHz giữ đuôi sáng).
 * - playWhoosh(power): noise-burst bandpass sweep lúc ném — dùng oscillator có sẵn trong
 *   IAudioContextLike (0 surface stub mới).
 * - setMuted(): mute button state — play/playWhoosh no-op 0 node; persist do scene giữ
 *   (localStorage qua KV storage inject — tầng B không đụng DOM storage).
 * AudioContext.resume() chạy ngay pointerdown ĐẦU — once-per-page (installResumeHook).
 * Câm (resume fail / state ≠ running / muted) → play() im lặng 0 node.
 * Node chơi xong ngắt kết nối qua onended — không rò node.
 */
import {
  plopParams,
  whooshParams,
  type PlopParams,
  type PlopLayer,
  type WhooshParams,
} from '../logic/audioMapper';

export type { PlopParams, PlopLayer, WhooshParams } from '../logic/audioMapper';

/** Ctor AudioContext inject — unit test fake được (jsdom không có WebAudio). */
export type AudioContextCtor = new () => IAudioContextLike;

/** Surface tối thiểu plopSynth đụng tới (tiêu chuẩn hoá cho inject + stub). */
export interface IAudioContextLike {
  state: string;
  currentTime: number;
  destination: IAudioNodeLike;
  createOscillator(): IOscillatorLike;
  createGain(): IGainLike;
  createDelay(): IDelayLike;
  createBiquadFilter(): IBiquadLike;
  createDynamicsCompressor(): ICompressorLike;
  resume(): Promise<void>;
}

export interface IAudioNodeLike {
  connect(dest: IAudioNodeLike): IAudioNodeLike;
  disconnect(): void;
}

export interface IOscillatorLike extends IAudioNodeLike {
  type: string;
  frequency: IAudioParamLike;
  detune: IAudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
  onended: (() => void) | null;
}

export interface IGainLike extends IAudioNodeLike {
  gain: IAudioParamLike;
}

export interface IDelayLike extends IAudioNodeLike {
  delayTime: IAudioParamLike;
}

export interface IBiquadLike extends IAudioNodeLike {
  type: string;
  frequency: IAudioParamLike;
  Q: IAudioParamLike;
}

export interface ICompressorLike extends IAudioNodeLike {
  threshold: IAudioParamLike;
}

export interface IAudioParamLike {
  value: number;
  setValueAtTime(v: number, t?: number): IAudioParamLike;
  linearRampToValueAtTime(v: number, t?: number): IAudioParamLike;
  exponentialRampToValueAtTime(v: number, t?: number): IAudioParamLike;
  cancelScheduledValues(t?: number): IAudioParamLike;
}

/** Hằng tổng đồ nghe (đơn vị + rationale — không phải luật chơi, juice audio). [PLACEHOLDER] tới boss playtest. */
const SYNTH = {
  reverbDelayS: 0.14, // s — feedback delay ngắn (~plop) cho vang nhẹ mặt nước
  reverbFeedback: 0.35, // 0..1 — 1-2 lần dội rồi tắt, "reverb nhẹ"
  reverbWet: 0.22, // 0..1 — trộn vang mỏng, tiếng gốc vẫn nổi
  lowpassHz: 3200, // Hz — NỚI từ 2200: giữ đuôi tonal sáng (slap chính đi đường bandpass riêng)
  compThresholdDb: -18, // dB — ngưỡng nén; chặn clip khi 4 lớp chồng đỉnh
  attackS: 0.006, // s — đầu tiếng gần tức thì (âm phải không trễ)
  releaseS: 0.06, // s — đuôi envelope master; tổng khớp envelope mapper 150–250ms
  slapQ: 1.2, // — Q bandpass slap: gọn, "thíp" chứ không huýt [PLACEHOLDER]
  whooshQ: 2.5, // — Q bandpass whoosh: hơi hẹp, nghe "gió vút" [PLACEHOLDER]
} as const;

/** Lớp tonal pitch là nguồn; lớp 1/2 đã map sẵn tần số trong audioMapper — cắm thẳng. */
function playLayer(ctx: IAudioContextLike, layer: PlopLayer, t0: number, out: IGainLike): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = layer.type;
  osc.frequency.setValueAtTime(layer.freqHz, t0);
  // Pitch tụt nhẹ trong thân tiếng — chất "thả đá xuống nước".
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, layer.freqHz * 0.72), t0 + layer.durationS);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(layer.level, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + layer.durationS);
  osc.connect(env);
  env.connect(out);
  osc.start(t0);
  osc.stop(t0 + layer.durationS);
  osc.onended = () => {
    env.disconnect();
    osc.disconnect();
  };
}

/**
 * Lớp slap CHỦ ĐẠO — đường RIÊNG: osc → env → bandpass(freq slap) → compressor.
 * Tách khỏi lowpass/reverb wet (loop cộng dồn lệch — rủi ro card): slap phải ra NGAY,
 * không bị lowpass giữ lại.
 */
function playSlap(
  ctx: IAudioContextLike,
  freqHz: number,
  durationS: number,
  level: number,
  t0: number,
  out: ICompressorLike,
): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(freqHz, t0);
  bandpass.Q.setValueAtTime(SYNTH.slapQ, t0);
  osc.type = 'square'; // sóng vuông qua bandpass hẹp = transient sắc như "thíp" nước
  osc.frequency.setValueAtTime(freqHz, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(level, t0 + 0.004); // attack cực ngắn — transient
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durationS);
  osc.connect(env);
  env.connect(bandpass);
  bandpass.connect(out);
  osc.start(t0);
  osc.stop(t0 + durationS);
  osc.onended = () => {
    env.disconnect();
    bandpass.disconnect();
    osc.disconnect();
  };
}

/**
 * Whoosh lúc ném — noise-burst ước lượng bằng oscillator có sẵn: sawtooth pitch sweep nhanh
 * qua bandpass sweep đi lên (start→end theo whooshParams tầng A). [PLACEHOLDER] feel-tune.
 */
function playWhooshLayer(ctx: IAudioContextLike, w: WhooshParams, t0: number, out: ICompressorLike): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.Q.setValueAtTime(SYNTH.whooshQ, t0);
  bandpass.frequency.setValueAtTime(w.bandStartHz, t0);
  bandpass.frequency.exponentialRampToValueAtTime(w.bandEndHz, t0 + w.durationS);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(w.bandStartHz, t0);
  osc.frequency.exponentialRampToValueAtTime(w.bandEndHz * 0.85, t0 + w.durationS);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(w.level, t0 + w.durationS * 0.3); // swell — hơi thở tay ném
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + w.durationS);
  osc.connect(env);
  env.connect(bandpass);
  bandpass.connect(out);
  osc.start(t0);
  osc.stop(t0 + w.durationS);
  osc.onended = () => {
    env.disconnect();
    bandpass.disconnect();
    osc.disconnect();
  };
}

/** Dựng graph 1 lần/ctx → { master, comp }: [tonal→dry+reverb] → master → lowpass → comp → destination. */
function buildGraph(ctx: IAudioContextLike): { master: IGainLike; comp: ICompressorLike } {
  const master = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(SYNTH.lowpassHz, ctx.currentTime);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(SYNTH.compThresholdDb, ctx.currentTime);

  const delay = ctx.createDelay();
  delay.delayTime.setValueAtTime(SYNTH.reverbDelayS, ctx.currentTime);
  const feedback = ctx.createGain();
  feedback.gain.setValueAtTime(SYNTH.reverbFeedback, ctx.currentTime);
  const wet = ctx.createGain();
  wet.gain.setValueAtTime(SYNTH.reverbWet, ctx.currentTime);

  // Feedback loop reverb nhẹ: delay → feedback → delay.
  delay.connect(feedback);
  feedback.connect(delay);
  master.connect(delay); // gửi tín hiệu vào vang
  delay.connect(wet); // vang lọc lowpass (cắt đục) rồi trộn về master
  wet.connect(lowpass);
  lowpass.connect(master);

  master.connect(comp); // compressor trên đường ra — chặn clip trước destination
  comp.connect(ctx.destination);
  return { master, comp };
}

/** PlopSynth 1 instance — inject ctx (unit test) hoặc tự tạo qua ctor cho sẵn. */
export class PlopSynth {
  private ctx: IAudioContextLike | null = null;
  private master: IGainLike | null = null;
  private comp: ICompressorLike | null = null;
  private soundOff = false;
  private muted = false;
  private resumeInFlight: Promise<void> | null = null;
  private resumeCalled = false;

  constructor(private ctor?: AudioContextCtor) {}

  /** resume() — gọi tại pointerdown ĐẦU (once). Fail → latch soundOff (không thử lại vô hạn). */
  resume(): Promise<void> {
    if (this.resumeCalled) {
      return this.resumeInFlight ?? Promise.resolve();
    }
    this.resumeCalled = true;
    if (!this.ctx) {
      // Chưa có ctx (inject test thì GIỮ NGUYÊN ctx đã inject) — tự tạo qua ctor.
      try {
        const Ctor = this.ctor ?? getGlobalAudioContextCtor();
        this.ctx = new Ctor();
      } catch {
        this.soundOff = true;
        this.ctx = null; // không có AudioContext — play() im lặng
        this.resumeInFlight = Promise.resolve();
        return this.resumeInFlight;
      }
    }
    this.resumeInFlight = this.ctx.resume().then(
      () => {
        if (!this.ctx || this.ctx.state !== 'running') {
          this.soundOff = true;
          this.ctx = null; // ctx câm vĩnh viễn — drop để play() im lặng (không dựng graph rác)
        }
      },
      () => {
        this.soundOff = true;
      },
    );
    return this.resumeInFlight;
  }

  /** Câm thật sự — scene đọc để boost ripple + banner "SOUND OFF" (EN). */
  isSoundOff(): boolean {
    return this.soundOff;
  }

  /** Mute button state (FUN2-C1) — true → play/playWhoosh no-op 0 node. Persist do scene giữ. */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Đảm bảo graph đã dựng (ctx running) — trả comp đích cho đường slap/whoosh. */
  private ensureGraph(): ICompressorLike | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (!this.master || !this.comp) {
      const g = buildGraph(ctx);
      this.master = g.master;
      this.comp = g.comp;
    }
    return this.comp;
  }

  /** Phát plop (3 lớp tonal + slap chủ đạo) theo params audioMapper — câm/muted thì im lặng (0 node). */
  play(params: PlopParams): void {
    const ctx = this.ctx;
    if (!ctx || this.soundOff || this.muted || ctx.state !== 'running') return;
    const comp = this.ensureGraph();
    if (!comp) return;
    const t0 = ctx.currentTime;
    const master = this.master!;
    // Envelope master theo lực — anchor attack + anchor release (2 setValue) rồi ramp.
    master.gain.cancelScheduledValues(t0);
    master.gain.setValueAtTime(0.0001, t0); // anchor attack
    master.gain.linearRampToValueAtTime(params.masterGain, t0 + SYNTH.attackS);
    master.gain.setValueAtTime(params.masterGain, t0 + params.totalDurationS); // anchor release
    master.gain.linearRampToValueAtTime(0.0001, t0 + params.totalDurationS + SYNTH.releaseS);
    for (const layer of params.layers) playLayer(ctx, layer, t0, master);
    // Slap CHỦ ĐẠO — đường bandpass riêng nối thẳng compressor (tách khỏi lowpass/reverb wet).
    playSlap(ctx, params.slap.freqHz, params.slap.durationS, params.slap.level, t0, comp);
  }

  /** Whoosh lúc ném — bandpass sweep ∝ power; câm/muted → 0 node. */
  playWhoosh(power: number): void {
    const ctx = this.ctx;
    if (!ctx || this.soundOff || this.muted || ctx.state !== 'running') return;
    const comp = this.ensureGraph();
    if (!comp) return;
    playWhooshLayer(ctx, whooshParams(power), ctx.currentTime, comp);
  }

  // ---- mirror test (TDD-B wiring — không lộ logic mới) ----
  static resetForTest(): void {
    sharedInstance = null;
  }
  useContextForTest(ctx: IAudioContextLike): void {
    this.ctx = ctx;
  }
  ctxForTest(): IAudioContextLike | null {
    return this.ctx;
  }
}

function getGlobalAudioContextCtor(): AudioContextCtor {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) throw new Error('plopSynth: không có AudioContext (trình duyệt không hỗ trợ WebAudio)');
  return Ctor;
}

let sharedInstance: PlopSynth | null = null;

/** Instance dùng chung toàn game — resume once-per-page, mọi scene phát qua đây. */
export function sharedPlopSynth(): PlopSynth {
  if (!sharedInstance) sharedInstance = new PlopSynth();
  return sharedInstance;
}

/**
 * Hook pointerdown ĐẦU trên document — resume AudioContext NGAY (bắt buộc CONTRACT mục 5:
 * boss lần đầu phải nghe plop). Idempotent: listener once, resume tự chống lặp.
 */
export function installResumeHook(synth: PlopSynth = sharedPlopSynth()): void {
  document.addEventListener(
    'pointerdown',
    () => {
      void synth.resume();
    },
    { once: true },
  );
}

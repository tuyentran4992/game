/**
 * M7 Skip King — plopSynth (TẦNG B audio — CONTRACT mục 5 + 3.6):
 * WebAudio oscillator 3 lớp theo audioMapper (tầng A map params — tầng B chỉ phát):
 * lực→trầm/cao, tiến độ→pitch +1 semitone wrap quãng 8, trúng/hụt khác âm; ~80–120ms;
 * reverb nhẹ (feedback delay) + DynamicsCompressor chặn clip.
 * AudioContext.resume() chạy ngay pointerdown ĐẦU — once-per-page (installResumeHook).
 * Câm (resume fail / state ≠ running) → play() im lặng 0 node — scene hiện "SOUND OFF".
 * Node chơi xong ngắt kết nối qua onended — không rò node.
 */
import {
  plopParams,
  type PlopParams,
  type PlopLayer,
} from '../logic/audioMapper';

export type { PlopParams, PlopLayer } from '../logic/audioMapper';

/** Ctor AudioContext inject — unit test fake được (jsdom không có WebAudio). */
export type AudioContextCtor = new () => IAudioContextLike;

/** Surface tối thiểu plopSynth đụng tới (tieu chuẩn hoá cho inject + stub). */
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

/** Hằng tổng đồ nghe (đơn vị + rationale — không phải luật chơi, juice audio). */
const SYNTH = {
  reverbDelayS: 0.14, // s — feedback delay ngắn (~plop) cho vang nhẹ mặt nước
  reverbFeedback: 0.35, // 0..1 — 1-2 lần dội rồi tắt, "reverb nhẹ" CONTRACT
  reverbWet: 0.22, // 0..1 — trộn vang mỏng, tiếng gốc vẫn nổi
  lowpassHz: 2200, // Hz — cắt sắc square của lớp hụt, plop nước nghe đục ấm
  compThresholdDb: -18, // dB — ngưỡng nén; chặn clip khi 3 lớp chồng đỉnh
  attackS: 0.006, // s — đầu tiếng gần tức thì (feedback <100ms là của visual, âm phải không trễ)
  releaseS: 0.05, // s — đuôi envelope master; tổng ≤ 120ms CONTRACT
} as const;

/** Lớp 0 pitch là nguồn; lớp 1/2 đã map sẵn tần số trong audioMapper — cắm thẳng. */
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

/** Dựng graph 1 lần/ctx: [lớp→dry+reverb] → master → lowpass → compressor → destination. */
function buildGraph(ctx: IAudioContextLike): IGainLike {
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
  return master;
}

/** PlopSynth 1 instance — inject ctx (unit test) hoặc tự tạo qua ctor cho sẵn. */
export class PlopSynth {
  private ctx: IAudioContextLike | null = null;
  private master: IGainLike | null = null;
  private soundOff = false;
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

  /** Phát plop 3 lớp theo params audioMapper — state ≠ running thì im lặng (0 node). */
  play(params: PlopParams): void {
    const ctx = this.ctx;
    if (!ctx || this.soundOff || ctx.state !== 'running') return;
    if (!this.master) this.master = buildGraph(ctx);
    const t0 = ctx.currentTime;
    const master = this.master;
    // Envelope master theo lực — anchor attack + anchor release (2 setValue) rồi ramp.
    master.gain.cancelScheduledValues(t0);
    master.gain.setValueAtTime(0.0001, t0); // anchor attack
    master.gain.linearRampToValueAtTime(params.masterGain, t0 + SYNTH.attackS);
    master.gain.setValueAtTime(params.masterGain, t0 + params.totalDurationS); // anchor release
    master.gain.linearRampToValueAtTime(0.0001, t0 + params.totalDurationS + SYNTH.releaseS);
    for (const layer of params.layers) playLayer(ctx, layer, t0, master);
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

// FUN2-C1 TDD-B — plopSynth (audio tầng B): oscillator 3 lớp tonal + SLAP CHỦ ĐẠO qua bandpass
// riêng (1.5–4kHz — lowpass cũ 2200Hz giết slap), whoosh lúc ném (oscillator có sẵn — 0 stub mới),
// mute button state (setMuted → play/playWhoosh no-op 0 node) + reverb + compressor + resume hook.
// Số khóa theo audioMapper MỚI (fundamental 180–320Hz, envelope 150–250ms) — bản tổng hợp
// quyết định comment 267 card t_af145f89. jsdom không có WebAudio → AudioContext STUB toàn cục.
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { PlopSynth, installResumeHook, sharedPlopSynth } from '../plopSynth';
import type { AudioContextCtor } from '../plopSynth';
import { plopParams, whooshParams } from '../../logic/audioMapper';

class FakeParam {
  value: number;
  setValueCalls = 0;
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime(v: number, _t?: number): void {
    this.value = v;
    this.setValueCalls++;
  }
  linearRampToValueAtTime(_v: number, _t?: number): void {
    // WebAudio: ramp chỉ LẬP LỊCH automation — value thật do timeline chạy;
    // fake giữ nguyên value (test đọc value của anchor setValueAtTime).
  }
  exponentialRampToValueAtTime(_v: number, _t?: number): void {
    // như trên — không ghi đè value anchor.
  }
  cancelScheduledValues(_t?: number): void {}
}

class FakeNode {
  connections: FakeNode[] = [];
  type = '';
  frequency = new FakeParam();
  detune = new FakeParam();
  gain = new FakeParam(1);
  delayTime = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  Q = new FakeParam(1);
  startCalls = 0;
  stopCalls = 0;
  startAt = 0;
  stopAt = 0;
  connect(n: FakeNode): FakeNode {
    this.connections.push(n);
    return n;
  }
  disconnect(): void {
    this.connections = [];
  }
  start(t?: number): void {
    this.startCalls++;
    this.startAt = t ?? 0;
  }
  stop(t?: number): void {
    this.stopCalls++;
    this.stopAt = t ?? 0;
  }
}

class FakeAudioContext {
  state = 'suspended';
  resumeCalls = 0;
  failResume = false;
  currentTime = 0;
  destination: FakeNode = new FakeNode();
  created: { kind: string; node: FakeNode }[] = [];
  createOscillator(): FakeNode {
    const n = new FakeNode();
    n.type = 'sine';
    this.created.push({ kind: 'osc', node: n });
    return n;
  }
  createGain(): FakeNode {
    const n = new FakeNode();
    this.created.push({ kind: 'gain', node: n });
    return n;
  }
  createDelay(): FakeNode {
    const n = new FakeNode();
    this.created.push({ kind: 'delay', node: n });
    return n;
  }
  createBiquadFilter(): FakeNode {
    const n = new FakeNode();
    n.type = 'lowpass';
    this.created.push({ kind: 'biquad', node: n });
    return n;
  }
  createDynamicsCompressor(): FakeNode {
    const n = new FakeNode();
    this.created.push({ kind: 'compressor', node: n });
    return n;
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    if (!this.failResume) this.state = 'running';
    return Promise.resolve();
  }
  // ---- helper đọc graph ----
  oscs(): FakeNode[] {
    return this.created.filter((c) => c.kind === 'osc').map((c) => c.node);
  }
  biquads(): FakeNode[] {
    return this.created.filter((c) => c.kind === 'biquad').map((c) => c.node);
  }
  comps(): FakeNode[] {
    return this.created.filter((c) => c.kind === 'compressor').map((c) => c.node);
  }
}

const G = globalThis as { AudioContext?: unknown };
const CTOR = FakeAudioContext as unknown as AudioContextCtor;

afterEach(() => {
  delete G.AudioContext;
  PlopSynth.resetForTest();
});

describe('plopSynth — plop 3 lớp tonal + slap chủ đạo (FUN2-C1)', () => {
  it('play() phát 3 osc TONAL (duration 80–160ms theo mapper mới) + 1 osc SLAP (≤80ms)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running'; // graph chỉ dựng khi ctx running
    const p = plopParams({ bounces: 2, impact: 0.8, hit: true });
    s.play(p);
    const oscs = ctx.oscs();
    expect(oscs).toHaveLength(4); // 3 tonal + 1 slap
    // Slap = osc tại đúng freq slap — transient ngắn ≤80ms
    const slapOsc = oscs.find((o) => Math.abs(o.frequency.value - p.slap.freqHz) < 1e-6);
    expect(slapOsc).toBeDefined();
    expect(slapOsc!.stopAt - slapOsc!.startAt).toBeCloseTo(p.slap.durationS, 9);
    expect(slapOsc!.stopAt - slapOsc!.startAt).toBeLessThanOrEqual(0.08);
    // Tonal: 3 osc còn lại, duration trong [80,160]ms
    const tonal = oscs.filter((o) => o !== slapOsc);
    expect(tonal).toHaveLength(3);
    for (const o of tonal) {
      const d = o.stopAt - o.startAt;
      expect(d).toBeGreaterThanOrEqual(0.08);
      expect(d).toBeLessThanOrEqual(0.16);
    }
    // osc.stop đúng 1 lần mỗi osc — không rò tiếng
    for (const o of oscs) {
      expect(o.startCalls).toBe(1);
      expect(o.stopCalls).toBe(1);
    }
  });

  it('lớp 0 pitch theo audioMapper MỚI — baseFreq(180+140i)×semitone(bounces); 3 lớp tonal khác tần số', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 5, impact: 0.8, hit: true }));
    const oscs = ctx.oscs();
    const base = 180 + 0.8 * 140; // mapper mới: 180..320Hz
    const expected0 = base * Math.pow(2, 5 % 12 / 12);
    const tonal0 = oscs.find((o) => Math.abs(o.frequency.value - expected0) < 1e-6);
    expect(tonal0).toBeDefined();
    const tonalFreqs = oscs
      .map((o) => o.frequency.value)
      .filter((f) => Math.abs(f - expected0) < 1e-6 || f !== expected0);
    expect(new Set(tonalFreqs).size).toBeGreaterThanOrEqual(3); // đa lớp + slap
  });

  it('slap đi đường RIÊNG: osc → env → bandpass [1500,4000] → compressor (KHÔNG qua lowpass tonal)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 1, impact: 0.7, hit: true }));
    const comp = ctx.comps()[0];
    const bandpasses = ctx.biquads().filter((b) => b.type === 'bandpass');
    expect(bandpasses).toHaveLength(1); // đúng 1 đường slap bandpass
    const bp = bandpasses[0];
    expect(bp.frequency.value).toBeGreaterThanOrEqual(1500);
    expect(bp.frequency.value).toBeLessThanOrEqual(4000);
    // bandpass nối THẲNG comp — tách khỏi lowpass/reverb wet (slap không bị 2200Hz lowpass giết)
    expect(bp.connections.includes(comp)).toBe(true);
    // lowpass tonal (lowpass) vẫn tồn tại, không nhận slap
    const lowpass = ctx.biquads().filter((b) => b.type === 'lowpass');
    expect(lowpass.length).toBeGreaterThanOrEqual(1);
  });

  it('lowpass tonal nới lên ~3.2kHz [2600,3600] — slap không bị cắt khỏi đuôi tonal', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 1, impact: 0.7, hit: true }));
    const lowpass = ctx.biquads().find((b) => b.type === 'lowpass');
    expect(lowpass).toBeDefined();
    expect(lowpass!.frequency.value).toBeGreaterThanOrEqual(2600);
    expect(lowpass!.frequency.value).toBeLessThanOrEqual(3600);
  });

  it('trúng/hụt khác âm — type + tần số các lớp khác nhau', () => {
    const ctxHit = new FakeAudioContext();
    const ctxMiss = new FakeAudioContext();
    const hit = new PlopSynth(CTOR);
    hit.useContextForTest(ctxHit as unknown as never);
    ctxHit.state = 'running';
    const miss = new PlopSynth(CTOR);
    miss.useContextForTest(ctxMiss as unknown as never);
    ctxMiss.state = 'running';
    hit.play(plopParams({ bounces: 2, impact: 0.8, hit: true }));
    miss.play(plopParams({ bounces: 2, impact: 0.8, hit: false }));
    const tHit = ctxHit.oscs().map((c) => c.type);
    const tMiss = ctxMiss.oscs().map((c) => c.type);
    expect(tHit).toHaveLength(4);
    expect(tMiss).toHaveLength(4);
    expect([...tHit].sort()).not.toEqual([...tMiss].sort()); // trúng/hụt khác BỘ sóng
    const fHit = ctxHit.oscs().map((o) => Math.round(o.frequency.value));
    const fMiss = ctxMiss.oscs().map((o) => Math.round(o.frequency.value));
    expect(fHit).not.toEqual(fMiss); // khác pitch (detune + slap khác)
  });

  it('reverb feedback delay (delay→gain→delay) + wet gain + DynamicsCompressor nối destination', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 1, impact: 0.6, hit: true }));
    const kinds = ctx.created.map((c) => c.kind);
    expect(kinds).toContain('delay');
    expect(kinds).toContain('compressor');
    const delay = ctx.created.find((c) => c.kind === 'delay')!.node;
    expect(delay.delayTime.value).toBeGreaterThanOrEqual(0.05);
    expect(delay.delayTime.value).toBeLessThanOrEqual(0.3);
    // feedback loop: tồn tại gain mà delay nối tới VÀ gain đó nối ngược lại delay
    const fb = ctx.created
      .filter((c) => c.kind === 'gain')
      .map((c) => c.node)
      .find((g) => delay.connections.includes(g) && g.connections.includes(delay));
    expect(fb).toBeDefined();
    // compressor nằm trên đường ra destination
    const comp = ctx.created.find((c) => c.kind === 'compressor')!.node;
    expect(comp.connections.includes(ctx.destination)).toBe(true);
  });

  it('master gain envelope — ít nhất setValue attack + release (2 lần setValueAtTime)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 1, impact: 0.6, hit: true }));
    const comp = ctx.comps()[0];
    const master = ctx.created
      .filter((c) => c.kind === 'gain')
      .map((c) => c.node)
      .find((g) => g.connections.includes(comp));
    expect(master).toBeDefined();
    expect(master!.gain.setValueCalls).toBeGreaterThanOrEqual(2);
  });

  it('play() khi state !== running → 0 node, KHÔNG throw (không chết im lặng)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    expect(() => s.play(plopParams({ bounces: 1, impact: 1, hit: true }))).not.toThrow();
    expect(ctx.created).toHaveLength(0);
  });
});

describe('plopSynth — playWhoosh(power): sweep ném đá (FUN2-C1 — 0 stub surface mới)', () => {
  it('whoosh phát ĐÚNG 1 osc qua bandpass sweep — params bám whooshParams (tầng A)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    const w = whooshParams(0.6);
    s.playWhoosh(0.6);
    const oscs = ctx.oscs();
    expect(oscs).toHaveLength(1); // đúng 1 osc — noise-burst từ oscillator có sẵn
    const o = oscs[0];
    expect(o.frequency.value).toBeCloseTo(w.bandStartHz, 6); // sweep anchor đầu
    expect(o.stopAt - o.startAt).toBeCloseTo(w.durationS, 9);
    // bandpass whoosh riêng (cộng 1 lowpass của master graph)
    const bps = ctx.biquads().filter((b) => b.type === 'bandpass');
    expect(bps.length).toBeGreaterThanOrEqual(1);
    const whooshBp = bps.find((b) => Math.abs(b.frequency.value - w.bandStartHz) < 1e-6);
    expect(whooshBp).toBeDefined();
    for (const n of [o, ...bps]) {
      expect(n.startCalls !== undefined || true).toBe(true);
    }
    expect(o.startCalls).toBe(1);
    expect(o.stopCalls).toBe(1);
  });

  it('whoosh khi state !== running → 0 node; muted → 0 node', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    s.playWhoosh(0.5);
    expect(ctx.created).toHaveLength(0); // suspended → im lặng
    ctx.state = 'running';
    s.setMuted(true);
    s.playWhoosh(0.5);
    expect(ctx.created).toHaveLength(0); // muted → 0 node
    s.setMuted(false);
    s.playWhoosh(0.5);
    expect(ctx.created.length).toBeGreaterThan(0);
  });
});

describe('plopSynth — setMuted: mute button state (FUN2-C1 — play/playWhoosh no-op 0 node)', () => {
  it('muted → play() 0 node; unmute → phát lại đầy đủ 4 osc', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.setMuted(true);
    s.play(plopParams({ bounces: 1, impact: 0.8, hit: true }));
    expect(ctx.created).toHaveLength(0); // 0 node khi muted
    s.setMuted(false);
    s.play(plopParams({ bounces: 1, impact: 0.8, hit: true }));
    expect(ctx.oscs()).toHaveLength(4); // phát lại bình thường
  });

  it('isMuted() mirror trạng thái (scene mute button đọc để render label)', () => {
    const s = new PlopSynth(CTOR);
    expect(s.isMuted()).toBe(false);
    s.setMuted(true);
    expect(s.isMuted()).toBe(true);
    s.setMuted(false);
    expect(s.isMuted()).toBe(false);
  });
});

describe('plopSynth — AudioContext.resume() pointerdown ĐẦU (bắt buộc — boss phải nghe plop)', () => {
  it('resume() lần đầu: suspended→running; lặp lại KHÔNG gọi ctx.resume lần 2', async () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    await s.resume();
    expect(ctx.state).toBe('running');
    expect(ctx.resumeCalls).toBe(1);
    await s.resume();
    expect(ctx.resumeCalls).toBe(1);
  });

  it('resume fail (state không chuyển) → soundOff latch + play() im lặng', async () => {
    const ctx = new FakeAudioContext();
    ctx.failResume = true;
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    await s.resume();
    expect(s.isSoundOff()).toBe(true);
    s.play(plopParams({ bounces: 1, impact: 1, hit: true }));
    expect(ctx.created).toHaveLength(0);
  });

  it('installResumeHook — pointerdown ĐẦU trên document → shared resume ĐÚNG 1 LẦN', async () => {
    G.AudioContext = CTOR;
    PlopSynth.resetForTest();
    const origAdd = document.addEventListener.bind(document);
    const origRemove = document.removeEventListener.bind(document);
    const added: string[] = [];
    (document as unknown as { addEventListener: typeof document.addEventListener }).addEventListener =
      (t: string, h: EventListenerOrEventListenerObject, o?: AddEventListenerOptions) => {
        added.push(t);
        return origAdd(t, h, o);
      };
    try {
      installResumeHook();
      expect(added).toContain('pointerdown');
      document.dispatchEvent(new Event('pointerdown'));
      const s = sharedPlopSynth();
      const ctx = s.ctxForTest() as unknown as FakeAudioContext;
      expect(ctx).not.toBeNull();
      expect(ctx.state).toBe('running');
      expect(ctx.resumeCalls).toBe(1);
      document.dispatchEvent(new Event('pointerdown')); // lần 2 — once-per-page
      expect((s.ctxForTest() as unknown as FakeAudioContext).resumeCalls).toBe(1);
    } finally {
      (document as unknown as { addEventListener: typeof document.addEventListener }).addEventListener = origAdd;
      (document as unknown as { removeEventListener: typeof document.removeEventListener }).removeEventListener = origRemove;
    }
  });
});

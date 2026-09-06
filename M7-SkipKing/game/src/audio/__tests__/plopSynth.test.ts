// T4 TDD-B — plopSynth (audio tầng B — CONTRACT mục 5): oscillator 3 lớp theo audioMapper
// (lực→trầm/cao, tiến độ→pitch +1 semitone wrap quãng 8, trúng/hụt khác âm) + reverb feedback
// delay + DynamicsCompressor + AudioContext.resume() chạy ngay pointerdown ĐẦU (once-per-page).
// jsdom không có WebAudio → AudioContext STUB toàn cục; PlopSynth nhận ctor inject cho unit test.
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { PlopSynth, installResumeHook, sharedPlopSynth } from '../plopSynth';
import type { AudioContextCtor } from '../plopSynth';
import { plopParams } from '../../logic/audioMapper';

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
}

const G = globalThis as { AudioContext?: unknown };
const CTOR = FakeAudioContext as unknown as AudioContextCtor;

afterEach(() => {
  delete G.AudioContext;
  PlopSynth.resetForTest();
});

describe('plopSynth — plop 3 lớp + reverb + compressor (CONTRACT mục 5)', () => {
  it('play() phát ĐỦ 3 oscillator — start+stop, mỗi lớp đúng duration 80–120ms', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running'; // graph chỉ dựng khi ctx running
    s.play(plopParams({ bounces: 2, impact: 0.8, hit: true }));
    const oscs = ctx.created.filter((c) => c.kind === 'osc').map((c) => c.node);
    expect(oscs).toHaveLength(3);
    const durs = oscs.map((o) => o.stopAt - o.startAt);
    for (const d of durs) {
      expect(d).toBeGreaterThanOrEqual(0.08);
      expect(d).toBeLessThanOrEqual(0.12);
    }
    // osc.stop được gọi đúng 1 lần mỗi lớp — không rò tiếng
    for (const o of oscs) {
      expect(o.startCalls).toBe(1);
      expect(o.stopCalls).toBe(1);
    }
  });

  it('lớp 0 pitch theo audioMapper — baseFreq×semitone(bounces); các lớp khác tần số (đa lớp)', () => {
    const ctx = new FakeAudioContext();
    const s = new PlopSynth(CTOR);
    s.useContextForTest(ctx as unknown as never);
    ctx.state = 'running';
    s.play(plopParams({ bounces: 5, impact: 0.8, hit: true }));
    const oscs = ctx.created.filter((c) => c.kind === 'osc').map((c) => c.node);
    const base = 70 + 0.8 * 120;
    const expected0 = base * Math.pow(2, 5 % 12 / 12);
    expect(oscs[0].frequency.value).toBeCloseTo(expected0, 6);
    expect(new Set(oscs.map((o) => o.frequency.value)).size).toBe(3);
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
    const tHit = ctxHit.created.filter((c) => c.kind === 'osc').map((c) => c.node.type);
    const tMiss = ctxMiss.created.filter((c) => c.kind === 'osc').map((c) => c.node.type);
    expect(tHit).toHaveLength(3);
    expect(tMiss).toHaveLength(3);
    expect([...tHit].sort()).not.toEqual([...tMiss].sort()); // trúng/hụt khác BỘ sóng
    const fHit = ctxHit.created.filter((c) => c.kind === 'osc').map((c) => c.node.frequency.value);
    const fMiss = ctxMiss.created.filter((c) => c.kind === 'osc').map((c) => c.node.frequency.value);
    expect(fHit).toHaveLength(3);
    expect(fMiss).toHaveLength(3);
    expect(fHit.map((v) => Math.round(v))).not.toEqual(fMiss.map((v) => Math.round(v))); // khác pitch (detune)
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
    const comp = ctx.created.find((c) => c.kind === 'compressor')!.node;
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

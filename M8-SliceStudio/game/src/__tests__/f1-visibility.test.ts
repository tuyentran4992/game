// Slice Studio — F1 visibility guard tests (TDD-A red-first, card t_3011ee93).
// Playgama C-24 PRE-SUBMIT: "mute + stop audio when minimized" — the ambience
// pad must follow tab visibility. Cells per the card body:
//   F1-T1 hidden  → pad fades out (gain ramp→0.0001) + both osc stop
//   F1-T2 visible → pad resumes with the CURRENT chapter mood (no new gesture)
//   F1-T3 resume honors `muted` (muted → no pad; unmute hidden → no pad; visible → pad back)
//   F1-T4 mute button kills a running pad immediately (setter path)
//   F1-T5 idempotent: repeated visible/hidden dispatches never double the pad
// Node env (vitest.config) — document/window stubbed, fake WebAudio like S3 tests.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Synth } from '../audio/synth';
import { AUDIO } from '../config/audio-config';

// --- fake document: mutable `hidden` + real EventTarget-style dispatch ---
class FakeDocument {
  hidden = false;
  private ls = new Map<string, Array<(ev: Event) => void>>();
  addEventListener(t: string, cb: (ev: Event) => void): void {
    const arr = this.ls.get(t) ?? [];
    arr.push(cb);
    this.ls.set(t, arr);
  }
  removeEventListener(t: string, cb: (ev: Event) => void): void {
    this.ls.set(t, (this.ls.get(t) ?? []).filter((f) => f !== cb));
  }
  listenerCount(t: string): number {
    return (this.ls.get(t) ?? []).length;
  }
  dispatch(t: string): void {
    for (const cb of this.ls.get(t) ?? []) cb({ type: t } as Event);
  }
}

// --- stub AudioContext recording created nodes + start/stop calls ---
function installCtx() {
  const nodes: StubNode[] = [];
  class StubParam {
    value = 0;
    calls: Array<[string, number, number]> = [];
    setValueAtTime(v: number, t: number) { this.calls.push(['setValueAtTime', v, t]); this.value = v; }
    exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exponentialRampToValueAtTime', v, t]); }
    linearRampToValueAtTime(v: number, t: number) { this.calls.push(['linearRampToValueAtTime', v, t]); }
    cancelScheduledValues(t: number) { this.calls.push(['cancelScheduledValues', NaN, t]); }
  }
  class StubNode {
    kind: string;
    params: Record<string, StubParam> = {};
    calls: string[] = [];
    constructor(kind: string, ...paramNames: string[]) {
      this.kind = kind;
      for (const p of paramNames) {
        this.params[p] = new StubParam();
        (this as unknown as Record<string, StubParam>)[p] = this.params[p];
      }
    }
    connect(dest: unknown) { return dest; }
    start() { this.calls.push('start'); }
    stop() { this.calls.push('stop'); }
  }
  class StubCtx {
    currentTime = 0;
    sampleRate = 48000;
    state = 'running';
    destination = new StubNode('dest');
    createGain() { const n = new StubNode('gain', 'gain'); nodes.push(n); return n; }
    createOscillator() {
      const n = new StubNode('osc', 'frequency');
      (n as unknown as { type: string }).type = 'sine';
      nodes.push(n);
      return n;
    }
    createBufferSource() { return new StubNode('bufsrc'); }
    createBiquadFilter() { return new StubNode('filter', 'frequency', 'Q'); }
    createBuffer(_ch: number, len: number, _sr: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    resume() { return Promise.resolve(); }
  }
  vi.stubGlobal('window', { AudioContext: StubCtx as unknown as typeof AudioContext });
  return {
    nodes,
    count: (kind: string) => nodes.filter((n) => n.kind === kind).length,
    of: (kind: string) => nodes.filter((n) => n.kind === kind),
  };
}

/** Boot a Synth with fake ctx + fake document, play the pad for `chapter`. */
function bootPad(chapter: number) {
  const t = installCtx();
  const doc = new FakeDocument();
  vi.stubGlobal('document', doc as unknown as Document);
  const s = new Synth();
  s.ensure(); // installs the visibility guard (user-gesture stand-in)
  s.ambience(chapter); // master gain + pad gain + 2 osc
  return { t, doc, s };
}

/** The pad gain is the 2nd gain node (1st = master). */
const padGain = (t: ReturnType<typeof installCtx>) => t.of('gain')[1];

afterEach(() => { vi.unstubAllGlobals(); });

describe('F1 ambience pad follows tab visibility (C-24)', () => {
  it('F1-T1: document hidden → pad fades out (gain→0.0001) and both osc stop', () => {
    const { t, doc } = bootPad(2);
    expect(t.count('osc')).toBe(2);
    expect(t.count('gain')).toBe(2);
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    const g = padGain(t);
    const ramps = g.params.gain.calls.filter((c) => c[0] === 'exponentialRampToValueAtTime');
    expect(ramps.some((c) => c[1] === 0.0001)).toBe(true);
    const stopped = t.of('osc').filter((o) => o.calls.includes('stop'));
    expect(stopped.length).toBe(2);
  });

  it('F1-T2: visible again → pad resumes with the CURRENT chapter mood, no new gesture', () => {
    const { t, doc } = bootPad(2);
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    const before = t.count('osc');
    doc.hidden = false;
    doc.dispatch('visibilitychange');
    expect(t.count('osc') - before).toBe(2);
    expect(t.count('gain')).toBe(3); // master + old pad + resumed pad
    const resumedGain = t.of('gain')[2];
    expect(resumedGain.params.gain.calls.some((c) => c[0] === 'exponentialRampToValueAtTime' && c[1] === AUDIO.ambience.gain)).toBe(true);
    // mood: chapter 2 roots (pad2, pad2 * f2Mul * detune)
    const freqs = t.of('osc').slice(2).map((o) => o.params.frequency.value);
    expect(freqs).toEqual([AUDIO.ambience.pad2, AUDIO.ambience.pad2 * AUDIO.ambience.f2Mul * AUDIO.ambience.detune]);
  });

  it('F1-T3: resume honors muted — muted hides nothing new, unmute while hidden stays quiet, visible brings the pad back', () => {
    const { t, doc, s } = bootPad(3);
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    s.muted = true;
    doc.hidden = false;
    doc.dispatch('visibilitychange');
    expect(t.count('osc')).toBe(2); // muted → resume must not start a pad
    s.muted = false; // unmute while visible → pad returns
    expect(t.count('osc')).toBe(4);
    const freqs = t.of('osc').slice(2).map((o) => o.params.frequency.value);
    expect(freqs[0]).toBe(AUDIO.ambience.pad3);
  });

  it('F1-T4: muting while the pad is playing kills it immediately (mute button path)', () => {
    const { t, s } = bootPad(1);
    expect(t.count('osc')).toBe(2);
    s.muted = true;
    const g = padGain(t);
    expect(g.params.gain.calls.some((c) => c[0] === 'exponentialRampToValueAtTime' && c[1] === 0.0001)).toBe(true);
    expect(t.of('osc').filter((o) => o.calls.includes('stop')).length).toBe(2);
  });

  it('F1-T5: repeated visible dispatches never double the pad; repeated hidden are safe', () => {
    const { t, doc } = bootPad(4);
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    doc.dispatch('visibilitychange'); // second hidden: no pad left, no throw
    doc.hidden = false;
    doc.dispatch('visibilitychange');
    const afterFirstResume = t.count('osc');
    doc.dispatch('visibilitychange'); // pad already playing → no second pad
    expect(t.count('osc')).toBe(afterFirstResume);
    expect(t.count('gain')).toBe(3); // master + stopped pad + one resumed pad
  });

  it('F1-T6: guard installs exactly once — repeated ensure() keeps a single listener', () => {
    const t = installCtx();
    const doc = new FakeDocument();
    vi.stubGlobal('document', doc as unknown as Document);
    const s = new Synth();
    s.ensure();
    s.ensure();
    s.ensure();
    expect(doc.listenerCount('visibilitychange')).toBe(1);
    expect(t.count('gain')).toBe(1); // master only
  });

  it('F1-T7: muted-at-boot records the requested chapter — first unmute resumes the RIGHT mood', () => {
    // TraceScene boots muted from the save, then loadLevel calls ambience(ch):
    // the request is blocked but the chapter must still be remembered.
    const t = installCtx();
    const doc = new FakeDocument();
    vi.stubGlobal('document', doc as unknown as Document);
    const s = new Synth();
    s.ensure();
    s.muted = true;
    s.ambience(3); // blocked by mute — but chapter 3 must be remembered
    expect(t.count('osc')).toBe(0);
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    doc.hidden = false;
    doc.dispatch('visibilitychange'); // still muted → quiet
    expect(t.count('osc')).toBe(0);
    s.muted = false; // first unmute → pad with the REQUESTED chapter mood
    const freqs = t.of('osc').map((o) => o.params.frequency.value);
    expect(freqs[0]).toBe(AUDIO.ambience.pad3);
  });
});

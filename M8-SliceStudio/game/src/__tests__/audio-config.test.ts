// Slice Studio - S3 audio tests (TDD-B, card t_e5b58098).
// WebAudio cannot be asserted by ear - assert STRUCTURE (TEST-CASES.md S3):
//   S3-T1 config purity: audio-config.ts imports nothing (0 Phaser / 0 DOM) and
//        every number lives within its declared [min,max] mirror (AUDIO_LIMITS)
//   S3-T2 voices only ADDED: slice/reveal/ghost byte-identical to the pre-polish
//        source (incl. params); chunkLost keeps its signature (content enriched);
//        strum/resumeCue/ambience exist
//   S3-T3 muted no-op: muted=true -> all 8 voices no throw, 0 nodes created;
//        missing AudioContext -> voices are no-ops (game still runs);
//        happy-path structural counts (strum 4 notes, resumeCue 2, pad 2 osc @0.04)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { Synth } from '../audio/synth';
import { AUDIO, AUDIO_LIMITS } from '../config/audio-config';

function readSrc(relFromSrc: string): string {
  const candidates = [
    `src/${relFromSrc}`, // vitest runs with cwd = game dir
    new URL(`../${relFromSrc}`, import.meta.url).pathname,
  ];
  for (const p of candidates) if (existsSync(p)) return readFileSync(p, 'utf8');
  throw new Error(`source not found: ${relFromSrc}`);
}

// Byte-exact regions of audio/synth.ts @main 693ce73 (pre-polish) - S3-T2 anchor.
// chunkLost content is ALLOWED to change (CONTRACT comment 332) -> only its
// comment + signature line are anchored; slice/reveal/ghost are anchor-in-full.
const SIG = {
  slice: [
    '  /** The cut: whoosh + snap. Higher accuracy = brighter snap. */',
    '  slice(pct: number): void {',
    '    this.noiseBurst(0.16, 4200, 700, 0.5);',
    "    this.tone(300 + pct * 2, 0.14, 0.35, 'triangle', 0.02, 90);",
    '  }',
  ].join('\n'),
  reveal: [
    '  /** Reveal chime when a core is unveiled. */',
    '  reveal(): void {',
    "    this.tone(660, 0.22, 0.22, 'sine', 0.05);",
    "    this.tone(880, 0.24, 0.18, 'sine', 0.16);",
    "    this.tone(1320, 0.3, 0.14, 'sine', 0.27);",
    '  }',
  ].join('\n'),
  ghost: [
    '  /** GHOST CUT signature (streak >=95%). */',
    '  ghost(): void {',
    "    this.tone(1760, 0.34, 0.16, 'sine', 0.1);",
    "    this.tone(2340, 0.4, 0.1, 'sine', 0.22);",
    '    this.noiseBurst(0.3, 6000, 9000, 0.12, 0.05);',
    '  }',
  ].join('\n'),
  chunkLost: [
    '  /** Chunk lost buzz (no-go touch). */',
    '  chunkLost(): void {',
  ].join('\n'),
};

// --- stub AudioContext that counts created nodes + records param automation ---
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
    constructor(kind: string, ...paramNames: string[]) {
      this.kind = kind;
      for (const p of paramNames) {
        this.params[p] = new StubParam();
        // WebAudio nodes expose params directly (gain.gain, osc.frequency...)
        (this as unknown as Record<string, StubParam>)[p] = this.params[p];
      }
    }
    connect(dest: unknown) { return dest; }
    start() { /* scheduled - no-op */ }
    stop() { /* scheduled - no-op */ }
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
    createBufferSource() { const n = new StubNode('bufsrc'); nodes.push(n); return n; }
    createBiquadFilter() { const n = new StubNode('filter', 'frequency', 'Q'); nodes.push(n); return n; }
    createBuffer(_ch: number, len: number, _sr: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    resume() { return Promise.resolve(); }
  }
  vi.stubGlobal('window', { AudioContext: StubCtx as unknown as typeof AudioContext });
  return {
    nodes,
    created: () => nodes.length,
    count: (kind: string) => nodes.filter((n) => n.kind === kind).length,
    of: (kind: string) => nodes.filter((n) => n.kind === kind),
  };
}

describe('S3-T1 audio-config is pure data, every number within declared limits', () => {
  const src = readSrc('config/audio-config.ts');
  it('imports nothing - no Phaser, no DOM, no side effects', () => {
    // strip comments first: a mention in prose is not a dependency
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/^\s*import\b/m);
    expect(code).not.toMatch(/require\s*\(/);
    expect(code.toLowerCase()).not.toContain('phaser');
    expect(code).not.toMatch(/\b(window|document|navigator)\b/);
  });
  it('AUDIO_LIMITS mirrors every voice+key; every value is a finite number in [min,max]', () => {
    const audio = AUDIO as unknown as Record<string, Record<string, number>>;
    const limits = AUDIO_LIMITS as unknown as Record<string, Record<string, [number, number]>>;
    expect(Object.keys(limits).sort()).toEqual(Object.keys(audio).sort());
    for (const voice of Object.keys(audio)) {
      expect(Object.keys(limits[voice]).sort()).toEqual(Object.keys(audio[voice]).sort());
      for (const k of Object.keys(audio[voice])) {
        const v = audio[voice][k];
        expect(typeof v, `${voice}.${k}`).toBe('number');
        expect(Number.isFinite(v), `${voice}.${k}`).toBe(true);
        expect(v, `${voice}.${k}`).toBeGreaterThanOrEqual(limits[voice][k][0]);
        expect(v, `${voice}.${k}`).toBeLessThanOrEqual(limits[voice][k][1]);
      }
    }
  });
  it('strum: 4-note rising arpeggio (higher pct = higher pitch, per DESIGN-SPEC S4)', () => {
    const s = AUDIO.strum;
    const ratioKeys = Object.keys(s).filter((k) => /^r\d$/.test(k));
    expect(ratioKeys.length).toBe(s.notes);
    for (let i = 2; i <= s.notes; i++) {
      expect((s as unknown as Record<string, number>)[`r${i}`])
        .toBeGreaterThan((s as unknown as Record<string, number>)[`r${i - 1}`]);
    }
  });
  it('ambience pad gain is very low (0.04) per DESIGN-SPEC S4', () => {
    expect(AUDIO.ambience.gain).toBe(0.04);
  });
});

describe('S3-T2 voices are only ADDED (existing signatures unchanged)', () => {
  const src = readSrc('audio/synth.ts');
  it('slice / reveal / ghost byte-identical to pre-polish source (incl. params)', () => {
    expect(src).toContain(SIG.slice);
    expect(src).toContain(SIG.reveal);
    expect(src).toContain(SIG.ghost);
  });
  it('chunkLost keeps its signature (content may be enriched)', () => {
    expect(src).toContain(SIG.chunkLost);
  });
  it('new voices exist: strum(pct) / resumeCue() / ambience(chapter)', () => {
    expect(src).toContain('  strum(pct: number): void {');
    expect(src).toContain('  resumeCue(): void {');
    expect(src).toContain('  ambience(chapter: number): void {');
  });
});

describe('S3-T3 muted no-op + structural counts (stub AudioContext)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('muted=true -> all 8 voices (old + new) no throw, 0 nodes created', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure(); // master gain node only
    s.muted = true;
    const before = t.created();
    expect(() => {
      s.slice(80); s.reveal(); s.ghost(); s.chunkLost();
      s.blip(); s.strum(80); s.resumeCue(); s.ambience(2);
    }).not.toThrow();
    expect(t.created() - before).toBe(0);
  });

  it('no AudioContext -> every voice is a no-op, no throw (game still runs)', () => {
    vi.stubGlobal('window', {}); // no AudioContext, no webkitAudioContext
    const s = new Synth();
    expect(() => s.ensure()).not.toThrow();
    expect(() => {
      s.slice(50); s.reveal(); s.ghost(); s.chunkLost();
      s.blip(); s.strum(50); s.resumeCue(); s.ambience(1);
    }).not.toThrow();
  });

  it('happy path: strum(80) = 4 rising notes pitched by pct', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure();
    expect(t.count('gain')).toBe(1); // master only
    s.strum(80);
    const oscs = t.of('osc');
    expect(oscs.length).toBe(AUDIO.strum.notes);
    const root = AUDIO.strum.base * Math.pow(2, (80 / 100) * AUDIO.strum.octave);
    const rels = [AUDIO.strum.r1, AUDIO.strum.r2, AUDIO.strum.r3, AUDIO.strum.r4];
    oscs.forEach((o, i) => {
      const first = o.params.frequency.calls.find((c) => c[0] === 'setValueAtTime');
      expect(first, `strum note ${i}`).toBeDefined();
      expect(first![1]).toBeCloseTo(root * rels[i], 5);
    });
  });

  it('happy path: resumeCue() = two 880Hz pings, second softer', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure();
    s.strum(80); // 4 oscs
    s.resumeCue();
    const all = t.of('osc');
    expect(all.length).toBe(6);
    const pings = all.slice(4);
    const c = AUDIO.resumeCue;
    pings.forEach((o) => {
      const first = o.params.frequency.calls.find((call) => call[0] === 'setValueAtTime');
      expect(first![1]).toBe(c.f);
    });
    // second ping softer + later (gains of the 6th/7th... gain nodes: master + 4 strum + 2 cue)
    const gains = t.of('gain');
    const cueGains = gains.slice(5);
    const v1 = cueGains[0].params.gain.calls.find((call) => call[0] === 'setValueAtTime');
    const v2 = cueGains[1].params.gain.calls.find((call) => call[0] === 'setValueAtTime');
    expect(v1![1]).toBe(c.v1);
    expect(v2![1]).toBe(c.v2);
    expect(c.v2).toBeLessThan(c.v1);
  });

  it('happy path: ambience(2) = 2-osc sine pad, holds at 0.04; chapter switch replaces pad', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure();
    s.ambience(2);
    expect(t.count('osc')).toBe(2);
    const pad = t.of('osc');
    const root = AUDIO.ambience.pad2;
    const f1 = pad[0].params.frequency.calls.find((call) => call[0] === 'setValueAtTime');
    const f2 = pad[1].params.frequency.calls.find((call) => call[0] === 'setValueAtTime');
    expect(f1![1]).toBeCloseTo(root, 5);
    expect(f2![1]).toBeCloseTo(root * AUDIO.ambience.f2Mul * AUDIO.ambience.detune, 5);
    const padGain = t.of('gain')[1];
    const ramps = padGain.params.gain.calls.filter((c) => c[0] === 'exponentialRampToValueAtTime');
    expect(ramps.length).toBeGreaterThanOrEqual(1);
    expect(ramps[0][1]).toBe(AUDIO.ambience.gain); // holds at 0.04
    s.ambience(3); // switch chapter - no throw, pad replaced
    expect(t.count('osc')).toBe(4);
    expect(() => s.ambience(99)).not.toThrow(); // out-of-range chapter clamps
  });

  it('slice keeps its proto structure: whoosh (buffer+filter+gain) + tone', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure();
    s.slice(80);
    expect(t.count('bufsrc')).toBe(1);
    expect(t.count('filter')).toBe(1);
    expect(t.count('osc')).toBe(1);
  });

  it('master gain is 0.5 and matches config', () => {
    const t = installCtx();
    const s = new Synth();
    s.ensure();
    const master = t.of('gain')[0];
    expect(master.params.gain.value).toBe(AUDIO.master.gain);
  });
});

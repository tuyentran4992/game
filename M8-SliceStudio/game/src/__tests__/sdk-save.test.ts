// Slice Studio — S4 SDK save tests (TDD-A red-first, card t_4650bb65).
// 8 cells per specs/2-slice-studio/TEST-CASES.md:
//   S4-T1 reducer stars max-only          S4-T2 unlockedLevel only increases
//   S4-T3 fullRunGhost flag               S4-T4 missing-v schema migrates to v1
//   S4-T5 atomic serialize (1 call/event) S4-T6 save→load round-trip (MockBackend+localStorage mock)
//   S4-T7 Mock boot empty no-throw        S4-T8 visibilitychange → saveData exactly once
// Schema: DATA-MODEL.md §2 — key 'slice-studio-save-v1'. Tier A: no Phaser imports.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockBackend } from '@game/sdk/instance';
import { applyCut, defaultSave, migrateSave, SaveStore, SAVE_KEY, type CutInput, type SliceStudioSave } from '../sdk/save';
import { LEVELS } from '../level/levels';

const L5 = LEVELS[4];
const L8 = LEVELS[7];
const L9 = LEVELS[8];
const L12 = LEVELS[LEVELS.length - 1];

function baseSave(overrides: Partial<SliceStudioSave> = {}): SliceStudioSave {
  return { ...defaultSave(), ...overrides };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('S4 save reducer (pure TS)', () => {
  it('S4-T1: stars keep max-only, unlockedLevel unchanged on a worse replay', () => {
    const save = baseSave({ stars: { 5: 3 }, bestPct: { 5: 95 }, unlockedLevel: 7 });
    const next = applyCut(save, { level: L5, stars: 2, pct: 81, ghostStreak: 0 });
    expect(next.stars[5]).toBe(3);
    expect(next.bestPct[5]).toBe(95);
    expect(next.unlockedLevel).toBe(7);
  });

  it('S4-T2: unlockedLevel only increases (7 stays on L5 replay; L8 3★ bumps to 8)', () => {
    const save = baseSave({ unlockedLevel: 7 });
    const worse = applyCut(save, { level: L5, stars: 1, pct: 60, ghostStreak: 0 });
    expect(worse.unlockedLevel).toBe(7);
    const better = applyCut(worse, { level: L8, stars: 3, pct: 96, ghostStreak: 1 });
    expect(better.unlockedLevel).toBe(8);
  });

  it('S4-T3: fullRunGhost true only for full run (streak 12 + L12 ghost), stays true once earned', () => {
    const won = applyCut(baseSave(), { level: L12, stars: 3, pct: 97, ghostStreak: 12 });
    expect(won.fullRunGhost).toBe(true);
    const won2 = applyCut(won, { level: L5, stars: 2, pct: 80, ghostStreak: 0 });
    expect(won2.fullRunGhost).toBe(true); // title is permanent
    const broke = applyCut(baseSave(), { level: L9, stars: 3, pct: 96, ghostStreak: 8 });
    expect(broke.fullRunGhost).toBe(false);
  });

  it('S4-T3b: bestStreak keeps the max seen', () => {
    const s1 = applyCut(baseSave({ bestStreak: 3 }), { level: L9, stars: 3, pct: 96, ghostStreak: 9 });
    expect(s1.bestStreak).toBe(9);
    const s2 = applyCut(s1, { level: L5, stars: 1, pct: 60, ghostStreak: 0 });
    expect(s2.bestStreak).toBe(9); // never decreases
  });
});

describe('S4 save schema', () => {
  it('S4-T4: missing-v / null schema migrates to v1 defaults without crash', () => {
    expect(() => migrateSave(null)).not.toThrow();
    expect(() => migrateSave(undefined)).not.toThrow();
    expect(() => migrateSave({})).not.toThrow();
    const m = migrateSave({});
    expect(m.v).toBe(1);
    expect(m.unlockedLevel).toBe(1);
    expect(m.stars).toEqual({});
    expect(m.bestPct).toEqual({});
    expect(m.bestStreak).toBe(0);
    expect(m.fullRunGhost).toBe(false);
    expect(m.muted).toBe(false);
    const partial = migrateSave({ unlockedLevel: 4, stars: { 1: 2 } });
    expect(partial.v).toBe(1);
    expect(partial.unlockedLevel).toBe(4);
    expect(partial.stars[1]).toBe(2);
  });
});

describe('S4 save store (atomic write via SDK)', () => {
  it('S4-T5: exactly one saveData call per flush — the whole object in a single write', async () => {
    const backend = new MockBackend();
    const spy = vi.spyOn(backend, 'saveData');
    const store = new SaveStore(backend);
    store.setLoaded(baseSave());
    await store.flush();
    await store.flush();
    expect(spy).toHaveBeenCalledTimes(2); // 1 write per save event — no field-by-field
    const first = spy.mock.calls[0][0] as SliceStudioSave;
    const round = JSON.parse(JSON.stringify(first)) as SliceStudioSave;
    expect(round.v).toBe(1);
    expect(round.unlockedLevel).toBe(1);
    expect(Object.keys(round).sort()).toEqual(Object.keys(defaultSave()).sort());
  });

  it('S4-T6: save→load round-trip deep-equal through MockBackend + localStorage mock', async () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage); // node env: MockBackend reads the bare global too
    const writer = new MockBackend();
    const store = new SaveStore(writer);
    store.setLoaded(baseSave({ unlockedLevel: 3, stars: { 1: 2, 2: 3 }, bestPct: { 1: 78.4, 2: 95 }, bestStreak: 4 }));
    await store.flush();
    expect(mem.get('game_save')).toBeTruthy(); // MockBackend's own storage key (interface-fixed)
    const reader = new MockBackend(); // fresh instance → reads the storage, not memory
    const loaded = migrateSave(await reader.loadData());
    expect(loaded).toEqual(store.current);
  });

  it('S4-T7: standalone boot — Mock initialize + empty loadData never throws', async () => {
    const backend = new MockBackend();
    const store = new SaveStore(backend);
    await expect(backend.initialize()).resolves.toBeUndefined();
    await expect(store.restore()).resolves.toBeUndefined(); // storage empty → defaults
    expect(store.current.unlockedLevel).toBe(1);
    await expect(store.restore()).resolves.toBeUndefined(); // idempotent
  });

  it('S4-T8: visibilitychange dispatch → saveData called exactly once per event (spy)', async () => {
    let fireVisibility: () => void = () => {};
    vi.stubGlobal('window', {
      addEventListener: (_t: string, cb: (ev?: unknown) => void) => {
        fireVisibility = cb;
      },
      removeEventListener: () => {},
    });
    const backend = new MockBackend();
    const spy = vi.spyOn(backend, 'saveData');
    const store = new SaveStore(backend);
    store.setLoaded(baseSave());
    store.installLifecycleSavers();
    fireVisibility();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    fireVisibility();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('S4-T8b: recordCut merges a result then persists — max-only end to end', async () => {
    const backend = new MockBackend();
    const spy = vi.spyOn(backend, 'saveData');
    const store = new SaveStore(backend);
    store.setLoaded(baseSave({ unlockedLevel: 7, stars: { 5: 3 } }));
    const cut: CutInput = { level: L5, stars: 2, pct: 81, ghostStreak: 0 };
    store.recordCut(cut);
    await store.flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.current.unlockedLevel).toBe(7);
    expect(store.current.stars[5]).toBe(3);
  });
});

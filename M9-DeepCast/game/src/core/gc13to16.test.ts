// GC-13..16 — sim-backed tests (TEST-CASES §A rows 13-16 + §C thresholds).
import { describe, it, expect } from 'vitest';
import { runAllSeeds } from '../../scripts/sim.ts';
import { createGame, startDive, applyContinue, resolveSurface } from './rules.ts';
import { applyDiveTick as tick } from './tick.ts';
import { SEA_TOP, SURFACE_Y, SEA_BOTTOM, depthMToPx } from '../data/world.ts';

const DT = 1 / 60;

describe('GC-13 fairness + §C medians (40 seeds)', () => {
  it('every seed can hook a fish within air=45s (first-catch policy at <=250m)', () => {
    let allOk = true;
    const failures: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const state = createGame(seed);
      startDive(state);
      let hookedOnce = false;
      // descend to 250m, park (release windows like the real loop), wait within air budget
      for (let i = 0; i < 45 / DT && !hookedOnce; i++) {
        const depthM = state.hookY - SEA_TOP;
        const holding = depthM < 250 ? true : (i % 360) >= 30;
        tick(state, DT, { holding });
        if (state.hooked.length > 0) hookedOnce = true;
      }
      if (!hookedOnce) {
        allOk = false;
        failures.push(seed);
      }
    }
    expect(failures).toEqual([]);
    expect(allOk).toBe(true);
  });

  it('policy §C: median dive in [25,70]s, survival window and whale money gates hold', () => {
    const runs = runAllSeeds(40);
    const allDives = runs.flatMap((r) => r.dives.map((d) => d.durationS)).sort((a, b) => a - b);
    const medianDive = allDives[Math.floor(allDives.length / 2)]!;
    expect(medianDive).toBeGreaterThanOrEqual(25);
    expect(medianDive).toBeLessThanOrEqual(70);

    const wins = runs.filter((r) => r.outcome === 'win').length;
    const winRate = wins / runs.length;
    expect(winRate).toBeGreaterThanOrEqual(0.2);
    expect(winRate).toBeLessThanOrEqual(0.6);

    const inWindow = allDives.filter((d) => d >= 30 && d <= 60).length;
    expect(inWindow / allDives.length).toBeGreaterThanOrEqual(0.5);

    const medianBreaks = runs.map((r) => r.breaks).sort((a, b) => a - b)[20]!;
    expect(medianBreaks).toBeLessThanOrEqual(2);

    const whaleMoney = runs.filter((r) => r.moneyAtWhaleTouch !== null).map((r) => r.moneyAtWhaleTouch!);
    expect(whaleMoney.length).toBeGreaterThan(0);
    whaleMoney.sort((a, b) => a - b);
    const medianWhaleMoney = whaleMoney[Math.floor(whaleMoney.length / 2)]!;
    expect(medianWhaleMoney).toBeGreaterThanOrEqual(450);
  });
});

describe('GC-14 whale cannot idle-break', () => {
  it('whale hooked with tension >=100 for 5s: no break event, whale stays hooked', () => {
    const state = createGame(1);
    startDive(state);
    // place a live whale on the hook (as if just attached)
    state.whaleUid = 999;
    state.fish.push({ uid: 999, defId: 'whale', x: 240, y: depthMToPx(1150), vx: 0, phase: 0, alive: true });
    state.hooked = [999];
    state.whaleHooked = true;
    state.whaleTossTimer = 0;
    state.whaleStruggles = 0;
    state.hookX = 240;
    state.hookY = depthMToPx(1150);
    let breakEvents = 0;
    let escapes = 0;
    for (let i = 0; i < 5 / DT; i++) {
      state.tension = 110; // force the over-limit reading every tick
      const before = state.events.length;
      tick(state, DT, { holding: true });
      breakEvents += state.events.slice(before).filter((e) => e.type === 'break').length;
      escapes += state.events.slice(before).filter((e) => e.type === 'whale-escape').length;
    }
    expect(breakEvents).toBe(0); // hook is locked: no tension break
    expect(escapes).toBe(0); // and well inside the 20s toss limit
    expect(state.whaleHooked).toBe(true);
  });
});

describe('GC-15 win path', () => {
  it('hook f9+f10, sell, whale dive, reel home -> WIN with rank S', () => {
    const state = createGame(3);
    startDive(state);
    // script: f9 + f10 on a double hook at depth, then surface
    state.fish.push({ uid: 901, defId: 'f9', x: 240, y: depthMToPx(900), vx: 0, phase: 0, alive: true });
    state.fish.push({ uid: 902, defId: 'f10', x: 240, y: depthMToPx(920), vx: 0, phase: 0, alive: true });
    state.hooked = [901, 902];
    state.doubleHook = true;
    state.hookX = 240;
    state.hookY = depthMToPx(900);
    state.hookMode = 'reel';
    state.hookY = SURFACE_Y + 2; // arrive at the surface with both fish (selling tested by GC-10)
    tick(state, DT, { holding: false });
    expect(state.phase).toBe('dive'); // back home, money grown
    const moneyAfterSale = state.money;
    expect(moneyAfterSale).toBeGreaterThanOrEqual(600 - 150 + 170 + 210); // f9 170 + f10 210 at combo 1,1.15

    // whale dive: whale patrols the bottom like a real spawn (vx 40, homing), then ride the toss
    startDive(state);
    state.fish = [{ uid: 999, defId: 'whale', x: 240, y: SEA_BOTTOM - 4, vx: 40, phase: 0, alive: true }];
    state.whaleUid = 999;
    state.hookX = 240;
    state.hookY = SURFACE_Y + 2;

    // mini bot: descend to the whale band, park rhythm until it bites, then
    // hold while thrashing (tension >= 40), reel when tired -> surface -> WIN
    let winSeen = false;
    let plan: 'down' | 'park' | 'up' = 'down';
    let wait = 0;
    let park = 0;
    for (let i = 0; i < 90 / DT && !winSeen; i++) {
      const depthM = state.hookY - SEA_TOP;
      let holding: boolean;
      if (state.whaleHooked) {
        holding = state.tension >= 40;
      } else if (plan === 'down') {
        if (depthM >= 1195) plan = 'park';
        holding = true;
      } else if (plan === 'park') {
        park += DT;
        if (park >= 12) plan = 'up';
        wait += DT;
        holding = wait % 6 >= 0.5;
      } else {
        holding = false;
      }
      tick(state, DT, { holding });
      if (state.phase === 'win') winSeen = true;
    }
    expect(winSeen).toBe(true);
    expect(state.rank).toBe('S'); // hearts 3, breaks 0
    expect(state.breaks).toBe(0);
  });
});

describe('GC-16 rewarded continue exactly once', () => {
  it('first lose: continue restores (hearts>=1, money>=150); second lose: continue is refused', () => {
    const state = createGame(7);
    startDive(state);
    // force an immediate fuel loss at the surface
    state.money = 100;
    resolveSurface(state);
    expect(state.phase).toBe('lose');
    expect(state.loseReason).toBe('OUT OF FUEL');

    const heartsBefore = state.hearts;
    applyContinue(state); // rewarded-continue #1: granted
    expect(state.usedContinue).toBe(true);
    expect(state.phase).toBe('dive');
    expect(state.hearts).toBe(Math.max(1, heartsBefore));
    expect(state.money).toBe(Math.max(100, 150));

    // lose again (drain the wallet below fuel first)
    state.money = 100;
    resolveSurface(state);
    expect(state.phase).toBe('lose');
    const attempted = applyContinue(state); // #2: refused
    expect(attempted).toBe(state);
    expect(state.phase).toBe('lose');
    expect(state.usedContinue).toBe(true); // still exactly one continue ever
  });
});

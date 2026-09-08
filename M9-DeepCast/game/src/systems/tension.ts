// Tension & struggle — pure functions (DATA-MODEL §3).
// tension target = clamp(sum(hooked fightPk * pulses) + dragTerm, 0, 120); break at >= 100.
import type { FishDef } from '../data/fishData.ts';
import { LINE_LIMIT, TENSION_COOL } from '../data/world.ts';
import { CURRENT_DEPTH_M, CURRENT_DRAG, DOUBLE_HOOK_DRAG } from '../data/upgrades.ts';
import { depthPxToM } from '../data/world.ts';

export interface PulseDef {
  period: number;
  peak: number; // first peak time offset (s), plus k*period
}

// 0.35 + 0.65 * max(0, sin)^3, peak at t = peak + k*period (GC-04/05 shapes)
export const pulseAt = (t: number, period: number, peak: number): number => {
  const phase = (2 * Math.PI * (t - peak)) / period + Math.PI / 2;
  const s = Math.sin(phase);
  return 0.35 + 0.65 * Math.pow(Math.max(0, s), 3);
};

// Pulse train of one fish: 1 xung, 2 xung (period*0.53), whale 3 xung (adds period*0.29)
export const pulsesFor = (def: FishDef, phase: number): PulseDef[] => {
  const list: PulseDef[] = [{ period: def.pulsePeriod, peak: def.pulsePeriod / 4 + phase }];
  if (def.pulseCount >= 2) {
    const p2 = def.pulsePeriod * 0.53;
    list.push({ period: p2, peak: p2 + phase }); // 2nd peak lands at 0.53*period (GC-05)
  }
  if (def.pulseCount >= 3) {
    const p3 = def.pulsePeriod * 0.29;
    list.push({ period: p3, peak: p3 + phase });
  }
  return list;
};

// Pulse train of one fish: 1 xung, 2 xung (period*0.53), whale 3 xung (adds period*0.29).
// Tension reads the ENVELOPE = max of the pulses (the strongest thrash right now).
// The whale's tension uses only its main pulse so a tired window exists to reel in.
export const pulseEnvelope = (def: FishDef, phase: number, t: number): number => {
  if (def.id === 'whale') return pulseAt(t, def.pulsePeriod, def.pulsePeriod / 4 + phase);
  let m = 0;
  for (const p of pulsesFor(def, phase)) m = Math.max(m, pulseAt(t, p.period, p.peak));
  return m;
};

// dragTerm: double hook +6 per extra fish; 850m+ current +14 while descending (DATA-MODEL §3)
export const dragTerm = (
  hookedCount: number,
  doubleHook: boolean,
  hookY: number,
  descending: boolean,
): number => {
  let d = 0;
  if (doubleHook && hookedCount >= 2) d += DOUBLE_HOOK_DRAG * (hookedCount - 1);
  if (descending && depthPxToM(hookY) >= CURRENT_DEPTH_M) d += CURRENT_DRAG;
  return d;
};

// Tension target. GC-04: max ~= fightPk for single fish (envelope peaks at 1.0).
export const tensionTarget = (defs: FishDef[], phases: number[], t: number, drag: number): number => {
  let sum = drag;
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    sum += def.fightPk * pulseEnvelope(def, phases[i]!, t);
  }
  return sum;
};

// REEL STRAIN accumulates while reeling a line under load (base > 60): fight-80 fish break
// after a few seconds of non-stop reeling (GC-06) while lighter fish stay safe (GC-04).
// NIN bleeds strain off fast (30/s) — the skill loop. Whale skips strain (hook locked, GC-14).
export const STRAIN_FLOOR = 60;
export const STRAIN_GAIN = 2.0;
export const STRAIN_HOLD_RELIEF = 30; // /s while HOLD
export const STRAIN_SETTLE = 8; // /s natural bleed
export const stepStrain = (
  strain: number,
  base: number,
  reeling: boolean,
  holding: boolean,
  dt: number,
): number => {
  let s = strain;
  if (reeling) s += Math.max(0, base - STRAIN_FLOOR) * STRAIN_GAIN * dt; // keep strain while reeling
  else if (holding) s = Math.max(0, s - STRAIN_HOLD_RELIEF * dt);
  else s = Math.max(0, s - STRAIN_SETTLE * dt);
  return Math.min(60, s);
};

// HOLD decay: "tension ha nhanh x(1+TENSION_COOL*2)" -> exponential decay, k = 0.35*1.7 = 0.595/s
export const HOLD_DECAY = TENSION_COOL * (1 + TENSION_COOL * 2);
// Rise/fall inertia: tension chases the target fast (RISE) but does not teleport, giving
// the player a reaction window to NIN before a double-thrash spike reaches 100.
export const RISE_RATE = 120; // /s
export const FALL_RATE = 60; // /s natural settle (no HOLD)

export const stepTension = (
  tension: number,
  target: number,
  holding: boolean,
  dt: number,
): number => {
  if (holding) return tension * Math.exp(-HOLD_DECAY * dt);
  if (target > tension) return tension + Math.min(target - tension, RISE_RATE * dt);
  return Math.max(target, tension - FALL_RATE * dt);
};

export const isBreak = (tension: number): boolean => tension >= LINE_LIMIT;

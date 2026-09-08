// Oxygen system — pure (DATA-MODEL §1 AIR_RATE).
import { AIR_MAX, AIR_RATE } from '../data/world.ts';

// mode dive/reel: 1.0 * (1 + 0.05*w/10) when carrying fish; HOLD: flat 0.5 (SPEC §3 "oxy x0.5").
// Whale toss uses the plain mode rate (weight factor skipped — whale pulls the boat, not your lungs).
export const airRateFor = (mode: string, hookedWeight: number, whaleHooked: boolean): number => {
  if (mode === 'hold') return AIR_RATE.hold;
  const base = mode === 'dive' ? AIR_RATE.dive : AIR_RATE.reel;
  if (whaleHooked || hookedWeight <= 0) return base;
  return base * AIR_RATE.hooked(hookedWeight);
};

export const drainAir = (air: number, rate: number, dt: number): number =>
  Math.max(0, air - rate * dt);

export const isAirOut = (air: number): boolean => air <= 0;

export const resetAir = (): number => AIR_MAX;

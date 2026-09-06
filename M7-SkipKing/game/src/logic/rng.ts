/**
 * M7 Skip King — PRNG mulberry32 (Tommy Ettinger) injectable.
 * - Deterministic theo seed → nền sim seeded của T2 (sweep 1800 cú, 100 seed assist).
 * - Importable không DOM, không dependency (Tầng A — CONTRACT mục 1).
 * - Test deterministic phải inject qua opts.rng, CẤM Math.random thô (ROLE-RULES fe-dev).
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

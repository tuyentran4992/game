// mulberry32 — RNG deterministic (DATA-MODEL §4; TB-04: core/data cam RNG he thong).

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function (): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** pick 1 phần tử deterministic */
export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Fisher–Yates shuffle (tạo mảng mới, không mutate) */
export function shuffled<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// Mulberry32 PRNG — deterministic, state lives in GameState (DATA-MODEL §6).
// Pure TS, no Phaser, seeded RNG only (TB-04).

export interface RngResult {
  state: number;
  value: number;
}

export const mulberryNext = (state: number): RngResult => {
  let s = state | 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: s, value };
};

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  intRange(min: number, max: number): number; // inclusive
  shuffle<T>(arr: T[]): T[];
}

// Wrap a mutable cell holding the mulberry32 state.
export const makeRng = (cell: { state: number }): Rng => ({
  next: () => {
    const r = mulberryNext(cell.state);
    cell.state = r.state;
    return r.value;
  },
  range: (min, max) => {
    const r = mulberryNext(cell.state);
    cell.state = r.state;
    return min + r.value * (max - min);
  },
  intRange: (min, max) => {
    const r = mulberryNext(cell.state);
    cell.state = r.state;
    return min + Math.floor(r.value * (max - min + 1));
  },
  shuffle: (arr) => {
    // Fisher-Yates, deterministic from the cell state
    for (let i = arr.length - 1; i > 0; i--) {
      const r = mulberryNext(cell.state);
      cell.state = r.state;
      const j = Math.floor(r.value * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  },
});

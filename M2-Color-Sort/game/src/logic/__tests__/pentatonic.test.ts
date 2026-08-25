import { describe, it, expect } from 'vitest';
import { pentatonicFreq, risingMelody, PENTATONIC_SEMITONES, BASE_HZ } from '../pentatonic';

describe('pentatonic — thang âm SEAL (mỗi ống seal 1 nốt đi lên)', () => {
  it('bậc 0 = nốt gốc', () => {
    expect(pentatonicFreq(0)).toBeCloseTo(BASE_HZ, 5);
  });

  it('luôn TĂNG dần theo step (cảm giác đi lên)', () => {
    let prev = 0;
    for (let s = 0; s < 24; s++) {
      const f = pentatonicFreq(s);
      expect(f).toBeGreaterThan(prev);
      prev = f;
    }
  });

  it('sau 5 bậc là đúng 1 octave (×2)', () => {
    for (let s = 0; s < 8; s++) {
      expect(pentatonicFreq(s + PENTATONIC_SEMITONES.length)).toBeCloseTo(pentatonicFreq(s) * 2, 4);
    }
  });

  it('map đúng bậc bán cung C D E G A', () => {
    PENTATONIC_SEMITONES.forEach((semi, i) => {
      expect(pentatonicFreq(i)).toBeCloseTo(BASE_HZ * Math.pow(2, semi / 12), 4);
    });
  });

  it('step âm/thập phân được kẹp an toàn về bậc 0', () => {
    expect(pentatonicFreq(-3)).toBeCloseTo(BASE_HZ, 5);
    expect(pentatonicFreq(0.7)).toBeCloseTo(BASE_HZ, 5);
  });

  it('risingMelody: n nốt đi lên + 1 nốt resolve cao nhất', () => {
    const m = risingMelody(4, 0);
    expect(m.length).toBe(5);
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
    expect(Math.max(...m)).toBe(m[m.length - 1]);
  });

  it('risingMelody luôn có ít nhất 2 nốt', () => {
    expect(risingMelody(0).length).toBeGreaterThanOrEqual(2);
    expect(risingMelody(-5).length).toBeGreaterThanOrEqual(2);
  });
});

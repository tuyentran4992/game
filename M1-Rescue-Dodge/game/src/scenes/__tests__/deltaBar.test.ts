// UT delta-bar Start (UPG2-V-H1) — thuần logic tầng B qua public interface engine (CONTRACT K0 §2).
// Engine stub: chỉ cần public state `bestScore` + `score` (lastScore sống sót qua scene.start('StartScene')
// vì endGame() KHÔNG reset score — chỉ startNewGame() reset khi chơi lại).
import { describe, it, expect } from 'vitest';
import { deltaToBest, deltaBarText } from '../deltaBar';

function stubEngine(best: number, last: number) {
  return { bestScore: best, score: last };
}

describe('deltaToBest — N = best − lastScore', () => {
  it('delta duong: best 120, vua choi 83 -> 37', () => {
    expect(deltaToBest(stubEngine(120, 83))).toBe(37);
  });

  it('lastScore bang best -> delta 0 (khong phai -0)', () => {
    const d = deltaToBest(stubEngine(83, 83));
    expect(d).toBe(0);
    expect(Object.is(d, 0)).toBe(true);
  });

  it('best 0, chua tung choi (score 0) -> delta 0 (dòng ân)', () => {
    expect(deltaToBest(stubEngine(0, 0))).toBe(0);
  });

  it('lastScore > best (chua qua saveBest, ván “thua 0 điểm”): delta ep ve 0, khong am', () => {
    expect(deltaToBest(stubEngine(50, 83))).toBe(0);
  });
});

describe('deltaBarText — format “<N> POINTS TO BEAT YOUR BEST” (PB-5: 100% tiếng Anh)', () => {
  it('delta 37 -> "37 POINTS TO BEAT YOUR BEST"', () => {
    expect(deltaBarText(stubEngine(120, 83))).toBe('37 POINTS TO BEAT YOUR BEST');
  });

  it('delta 1 -> "1 POINT TO BEAT YOUR BEST" (số ít)', () => {
    expect(deltaBarText(stubEngine(10, 9))).toBe('1 POINT TO BEAT YOUR BEST');
  });

  it('delta 0 (vua lap ky luc / chua choi) -> rong (an dòng)', () => {
    expect(deltaBarText(stubEngine(83, 83))).toBe('');
    expect(deltaBarText(stubEngine(0, 0))).toBe('');
  });
});

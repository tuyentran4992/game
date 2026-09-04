// Delta-bar "suýt phá record" màn Start (UPG2-V-H1, #78-Y1).
// Logic thuần tách khỏi scene — scene chỉ gọi render với public interface engine
// (ctx.engine.bestScore + ctx.engine.score: lastScore sống sót qua scene.start('StartScene')
// vì endGame() không reset score, chỉ startNewGame() reset). Contract K0 §2 — không đụng types.ts.
import type { GameEngine } from '../logic/GameEngine';

/** N = bestScore − lastScore; ép về 0 nếu âm (lastScore chưa kịp saveBest). */
export function deltaToBest(engine: Pick<GameEngine, 'bestScore' | 'score'>): number {
  return Math.max(0, engine.bestScore - engine.score);
}

/**
 * Dòng delta-bar: "<N> POINTS TO BEAT YOUR BEST" (PB-5: 100% tiếng Anh).
 * N ≤ 0 (vừa lập kỷ lục / chưa từng chơi) → chuỗi rỗng, scene ẩn dòng.
 */
export function deltaBarText(engine: Pick<GameEngine, 'bestScore' | 'score'>): string {
  const n = deltaToBest(engine);
  if (n <= 0) return '';
  return `${n} ${n === 1 ? 'POINT' : 'POINTS'} TO BEAT YOUR BEST`;
}

// GC-12/13 — Rewarded continue ≤1/lượt + interstitial lần 2+ + continue-earned
// fruit removal (M3-05/07).
//
// Semantics (theo lượt — anh Tuyền chốt 2026-08-23, CLAUDE.md):
//   • Mỗi "Retry" = lượt mới → Rewarded "Continue" được lại 1 lần/lượt (M3-05).
//   • playCount đếm số game-over trong lượt hiện tại, reset mỗi lượt mới
//     (startNewGame).
//   • Interstitial chỉ từ game-over lần 2+ trong lượt = playCount >= 2 (M3-07).
//
// Tier convention is 0-based: 0 = cherry ... 11 = watermelon (max).
import { describe, it, expect } from 'vitest';
import { MergeEngine } from '../merge-engine';
import { fruitsAboveLine } from '../continue';
import type { FruitPos } from '../game-over';

const fruit = (y: number, tier = 0): FruitPos => ({ y, tier });

describe('GC-12: rewarded continue ≤1 per turn, interstitial on 2nd game-over (M3-05/07)', () => {
  it('fresh turn: no rewarded continue and no interstitial before any game over', () => {
    const e = new MergeEngine();
    expect(e.state.gameOver).toBe(false);
    expect(e.state.playCount).toBe(0);
    expect(e.state.continueUsed).toBe(false);
    // canContinue requires an active game over (M3-05: continue is offered AFTER
    // game over) — not available while still playing.
    expect(e.canContinue()).toBe(false);
    expect(e.shouldShowInterstitial()).toBe(false);
  });

  it('1st game over → rewarded available, NO interstitial (M3-05)', () => {
    const e = new MergeEngine();
    e.setGameOver(true, true);
    expect(e.state.gameOver).toBe(true);
    expect(e.state.playCount).toBe(1);
    expect(e.canContinue()).toBe(true);           // rewarded path
    expect(e.shouldShowInterstitial()).toBe(false); // not interstitial
  });

  it('useContinue consumes the single rewarded continue (≤1/lượt) and resumes', () => {
    const e = new MergeEngine();
    e.setGameOver(true, true);
    e.useContinue();
    expect(e.state.continueUsed).toBe(true);
    expect(e.state.gameOver).toBe(false);        // resumed play
    expect(e.canContinue()).toBe(false);         // already used this turn
    expect(e.shouldShowInterstitial()).toBe(false); // playCount still 1
  });

  it('2nd game over (after continue) → NO rewarded, show interstitial (M3-07)', () => {
    const e = new MergeEngine();
    e.setGameOver(true, true);   // 1st game over → rewarded
    e.useContinue();             // earned, resume
    e.setGameOver(true, true);   // 2nd game over
    expect(e.state.playCount).toBe(2);
    expect(e.canContinue()).toBe(false);          // no more rewarded this turn
    expect(e.shouldShowInterstitial()).toBe(true); // interstitial path
  });

  it('retry (startNewGame) resets the turn: rewarded available again, interstitial off', () => {
    const e = new MergeEngine();
    e.setGameOver(true, true);
    e.useContinue();
    e.setGameOver(true, true);   // 2nd game over → interstitial
    expect(e.shouldShowInterstitial()).toBe(true);
    e.startNewGame();            // new turn (Retry)
    expect(e.state.playCount).toBe(0);
    expect(e.state.continueUsed).toBe(false);
    expect(e.state.gameOver).toBe(false);
    expect(e.shouldShowInterstitial()).toBe(false);
    // 1st game over of the new turn → rewarded available again (≤1/lượt)
    e.setGameOver(true, true);
    expect(e.canContinue()).toBe(true);
    expect(e.shouldShowInterstitial()).toBe(false);
  });

  it('a moving fruit above the line is not a game over (settled flag honoured)', () => {
    // setGameOver defers to the scene's settle check (M3-03); a moving fruit
    // crossing the line must never be reported as game over.
    const e = new MergeEngine();
    e.setGameOver(true, false); // not settled
    expect(e.state.gameOver).toBe(false);
    expect(e.state.playCount).toBe(0);
    expect(e.canContinue()).toBe(false);
    expect(e.shouldShowInterstitial()).toBe(false);
  });

  it('declining the rewarded continue does not consume it (M3-06: not-earned stays)', () => {
    // If the rewarded ad is not earned/cancelled, useContinue is NOT called, so
    // the continue stays available and no interstitial is forced.
    const e = new MergeEngine();
    e.setGameOver(true, true);
    expect(e.canContinue()).toBe(true); // still available, not consumed
    expect(e.state.continueUsed).toBe(false);
    expect(e.shouldShowInterstitial()).toBe(false);
  });
});

describe('GC-13: fruitsAboveLine filters fruits above the danger line (M3-05)', () => {
  it('returns only fruits with center y < dangerY (above the line)', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(150), fruit(199), fruit(200), fruit(250)];
    expect(fruitsAboveLine(fruits, dangerY)).toEqual([fruit(150), fruit(199)]);
  });

  it('a fruit exactly on the line (y === dangerY) is NOT removed', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(200), fruit(201)];
    expect(fruitsAboveLine(fruits, dangerY)).toEqual([]);
  });

  it('removing above-line fruits leaves the below-line ones to be pushed down', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(120), fruit(180), fruit(210), fruit(300)];
    const removed = fruitsAboveLine(fruits, dangerY);
    const kept = fruits.filter((f) => f.y >= dangerY);
    expect(removed).toEqual([fruit(120), fruit(180)]);
    expect(kept).toEqual([fruit(210), fruit(300)]);
    // nothing lost or duplicated
    expect([...removed, ...kept].length).toBe(fruits.length);
  });

  it('empty fruit list → empty result (no crash on continue with no fruits)', () => {
    expect(fruitsAboveLine([], 200)).toEqual([]);
  });

  it('preserves fruit identity (tier) for the scene to despawn the right bodies', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(100, 3), fruit(220, 7)];
    const above = fruitsAboveLine(fruits, dangerY);
    expect(above).toEqual([fruit(100, 3)]);
    expect(above[0].tier).toBe(3);
  });

  it('does not mutate the input array (pure)', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(150), fruit(250)];
    const snapshot = fruits.map((f) => ({ ...f }));
    fruitsAboveLine(fruits, dangerY);
    expect(fruits).toEqual(snapshot);
  });
});

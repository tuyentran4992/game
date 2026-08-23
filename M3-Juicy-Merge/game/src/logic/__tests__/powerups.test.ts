import { describe, it, expect } from 'vitest';
import {
  createInitialPowerupState,
  canSwapFruit,
  consumeSwap,
  canShakeBucket,
  consumeShake,
  grantSwap,
  grantShake,
  evaluateComboReward,
  evaluateScoreMilestoneReward,
  evaluateRecordBroken,
  computeShakeImpulse,
  MAX_SWAPS,
  MAX_SHAKES,
} from '../powerups';

describe('Powerups Logic: Swap & Shake state management', () => {
  it('initializes with default counts (2 swaps, 1 shake)', () => {
    const state = createInitialPowerupState();
    expect(state.swapCount).toBe(2);
    expect(state.shakeCount).toBe(1);
    expect(canSwapFruit(state)).toBe(true);
    expect(canShakeBucket(state)).toBe(true);
  });

  it('consumeSwap decrements count until zero and rejects further swaps', () => {
    const state = createInitialPowerupState();
    expect(consumeSwap(state)).toBe(true);
    expect(state.swapCount).toBe(1);
    expect(consumeSwap(state)).toBe(true);
    expect(state.swapCount).toBe(0);
    expect(canSwapFruit(state)).toBe(false);
    expect(consumeSwap(state)).toBe(false);
  });

  it('consumeShake decrements count until zero and rejects further shakes', () => {
    const state = createInitialPowerupState();
    expect(consumeShake(state)).toBe(true);
    expect(state.shakeCount).toBe(0);
    expect(canShakeBucket(state)).toBe(false);
    expect(consumeShake(state)).toBe(false);
  });

  it('grantSwap and grantShake add counts clamped to maximum caps', () => {
    const state = createInitialPowerupState();
    grantSwap(state, 10);
    expect(state.swapCount).toBe(MAX_SWAPS);

    grantShake(state, 10);
    expect(state.shakeCount).toBe(MAX_SHAKES);
  });
});

describe('Powerups Logic: Reward evaluation', () => {
  it('combo x3 rewards swap, combo x5 rewards shake, others reward null', () => {
    expect(evaluateComboReward(1)).toBe(null);
    expect(evaluateComboReward(2)).toBe(null);
    expect(evaluateComboReward(3)).toBe('swap');
    expect(evaluateComboReward(4)).toBe(null);
    expect(evaluateComboReward(5)).toBe('shake');
    expect(evaluateComboReward(6)).toBe(null);
  });

  it('score milestone rewards shake every 1000 points', () => {
    let milestone = 0;
    const res1 = evaluateScoreMilestoneReward(850, milestone);
    expect(res1.reward).toBe(null);
    expect(res1.newMilestone).toBe(0);

    const res2 = evaluateScoreMilestoneReward(1050, milestone);
    expect(res2.reward).toBe('shake');
    expect(res2.newMilestone).toBe(1000);
    milestone = res2.newMilestone;

    const res3 = evaluateScoreMilestoneReward(1400, milestone);
    expect(res3.reward).toBe(null);

    const res4 = evaluateScoreMilestoneReward(2100, milestone);
    expect(res4.reward).toBe('shake');
    expect(res4.newMilestone).toBe(2000);
  });

  it('evaluateRecordBroken triggers only once when bestScore > 0 and score > bestScore', () => {
    expect(evaluateRecordBroken(500, 1000, false)).toBe(false);
    expect(evaluateRecordBroken(1200, 0, false)).toBe(false); // No prior record set
    expect(evaluateRecordBroken(1200, 1000, false)).toBe(true); // Newly broken
    expect(evaluateRecordBroken(1500, 1000, true)).toBe(false); // Already triggered
  });

  it('computeShakeImpulse returns balanced forces proportional to mass', () => {
    const impulse1 = computeShakeImpulse(2, 0.1, 0);
    const impulse2 = computeShakeImpulse(10, 0.1, 0);
    expect(Math.abs(impulse2.fx)).toBeGreaterThan(Math.abs(impulse1.fx));
    expect(Number.isFinite(impulse1.fx)).toBe(true);
    expect(Number.isFinite(impulse1.fy)).toBe(true);
  });
});

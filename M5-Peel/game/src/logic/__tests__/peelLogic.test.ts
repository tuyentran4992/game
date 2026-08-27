import { describe, it, expect, beforeEach } from 'vitest';
import { PeelStateMachine } from '../PeelStateMachine';
import { GAME_CONFIG } from '../../config/peelConfig';

describe('PeelStateMachine — Stage 1 Pure Logic Tests', () => {
  let sm: PeelStateMachine;
  const cx = GAME_CONFIG.CENTER_X;
  const cy = GAME_CONFIG.CENTER_Y;

  beforeEach(() => {
    sm = new PeelStateMachine(0); // Start with Orange
  });

  it('should initialize with 3 unpeeled grooves and streak 0', () => {
    expect(sm.getGrooves().length).toBe(3);
    expect(sm.getStreak()).toBe(0);
    expect(sm.getCurrentFruit().id).toBe('orange');
    expect(sm.getFruitIndex()).toBe(1);
    expect(sm.getStatus()).toBe('IDLE');
  });

  it('should start peeling when touch is on fruit surface', () => {
    const started = sm.startPeel(cx + 120, cy, 1000);
    expect(started).toBe(true);
    expect(sm.getStatus()).toBe('PEELING');
    expect(sm.getActiveStroke()).not.toBeNull();
  });

  it('should reject startPeel when touch is too far from fruit', () => {
    const started = sm.startPeel(cx + 500, cy, 1000);
    expect(started).toBe(false);
    expect(sm.getStatus()).toBe('IDLE');
  });

  it('should achieve PERFECT PEEL when swiping >=80% across the fruit and increase streak', () => {
    const startX = cx + 130;
    sm.startPeel(startX, cy, 1000);

    const steps = 20;
    const swipeDistance = PeelStateMachine.TARGET_SWIPE_PX * 0.9;
    let currentTime = 1000;

    for (let i = 1; i <= steps; i++) {
      currentTime += 16;
      const currentX = startX - (swipeDistance * i) / steps;

      const update = sm.updatePeel(currentX, cy, currentTime);
      expect(update.isDisconnected).toBe(false);
    }

    const end = sm.endPeel(currentTime + 16);
    expect(end.quality).toBe('PERFECT');
    expect(end.ratio).toBeGreaterThanOrEqual(0.75);
    expect(sm.getStreak()).toBe(1);
  });

  it('should achieve GOOD when swiping between 50% and 74%', () => {
    const startX = cx + 130;
    sm.startPeel(startX, cy, 1000);

    const steps = 15;
    const swipeDistance = PeelStateMachine.TARGET_SWIPE_PX * 0.6;
    let currentTime = 1000;

    for (let i = 1; i <= steps; i++) {
      currentTime += 16;
      const currentX = startX - (swipeDistance * i) / steps;

      sm.updatePeel(currentX, cy, currentTime);
    }

    const end = sm.endPeel(currentTime + 16);
    expect(end.quality).toBe('GOOD');
    expect(end.ratio).toBeGreaterThanOrEqual(0.50);
  });

  it('should trigger DISCONNECT when stopping/stalling >220ms and reset streak', () => {
    const startX = cx + 130;
    sm.startPeel(startX, cy, 1000);
    sm.updatePeel(startX - 230, cy, 1050);
    sm.endPeel(1060);
    expect(sm.getStreak()).toBe(1);

    sm.startPeel(startX, cy - 40, 2000);

    const update = sm.updatePeel(startX, cy - 40, 2250);

    expect(update.isDisconnected).toBe(true);
    expect(update.disconnectReason).toBe('TIMEOUT_STALLED');
    expect(sm.getStatus()).toBe('DISCONNECTED');
    expect(sm.getStreak()).toBe(0);
  });

  it('should trigger DISCONNECT when reversing direction by > 22px', () => {
    const startX = cx + 130;
    sm.startPeel(startX, cy, 1000);

    sm.updatePeel(startX - 80, cy, 1020);

    const update = sm.updatePeel(startX - 80 + 35, cy, 1040);

    expect(update.isDisconnected).toBe(true);
    expect(update.disconnectReason).toBe('REVERSED_DIRECTION');
    expect(sm.getStatus()).toBe('DISCONNECTED');
    expect(sm.getStreak()).toBe(0);
  });

  it('should advance to next fruit in rotation when all 3 grooves are completed', () => {
    expect(sm.getCurrentFruit().id).toBe('orange');

    // Strip 0 (Top)
    sm.startPeel(cx + 130, cy - 45, 1000);
    sm.updatePeel(cx + 130 - 230, cy - 45, 1050);
    sm.endPeel(1060);

    // Strip 1 (Middle)
    sm.startPeel(cx + 130, cy, 2000);
    sm.updatePeel(cx + 130 - 230, cy, 2050);
    sm.endPeel(2060);

    // Strip 2 (Bottom)
    sm.startPeel(cx + 130, cy + 45, 3000);
    sm.updatePeel(cx + 130 - 230, cy + 45, 3050);
    const lastEnd = sm.endPeel(3060);

    expect(lastEnd.allGroovesCompleted).toBe(true);
    expect(sm.getCurrentFruit().id).toBe('watermelon');
    expect(sm.getFruitIndex()).toBe(2);
    expect(sm.getGrooves().every((g) => !g.isCompleted)).toBe(true);
  });

  // --- Test Case: Head ribbon == pointer mỗi frame khi cắt (0 delay) ---
  it('should guarantee head position equals current touch point every frame with zero delay', () => {
    const startX = cx + 130;
    const startY = cy;
    sm.startPeel(startX, startY, 1000);

    const testPoints = [
      { x: startX - 20, y: startY + 2, t: 1016 },
      { x: startX - 45, y: startY + 5, t: 1032 },
      { x: startX - 90, y: startY + 8, t: 1048 },
    ];

    for (const pt of testPoints) {
      sm.updatePeel(pt.x, pt.y, pt.t);
      const stroke = sm.getActiveStroke();
      expect(stroke).not.toBeNull();
      const lastPoint = stroke!.points[stroke!.points.length - 1];
      expect(lastPoint.x).toBe(pt.x);
      expect(lastPoint.y).toBe(pt.y);
    }
  });

  // --- Test Case: Chain không tự giao trên path tròn (Bend angle <= 25 deg limit) ---
  it('should guarantee angle difference between consecutive segments is clamped <= 25 deg', () => {
    const maxBendRad = 25 * (Math.PI / 180);

    // Giả lập chuỗi node trên đường cong xoay gắt
    let currentAngle = 0;
    const targetTurn = Math.PI * 0.8; // Cố gắng bẻ góc 144 độ cực gắt

    const angleDiff = Math.atan2(
      Math.sin(targetTurn - currentAngle),
      Math.cos(targetTurn - currentAngle)
    );
    const clampedDiff = Math.max(-maxBendRad, Math.min(maxBendRad, angleDiff));

    expect(Math.abs(clampedDiff)).toBeLessThanOrEqual(maxBendRad);
    expect(clampedDiff).toBeCloseTo(maxBendRad, 4);
  });

  // --- Test Case: 2 sample xa nhau vẫn ra vệt liền ---
  it('should maintain unbroken continuous accumulated arc even with large jump between 2 samples', () => {
    const startX = cx + 130;
    sm.startPeel(startX, cy, 1000);

    const farX = startX - 180;
    const update = sm.updatePeel(farX, cy, 1016);

    expect(update.isDisconnected).toBe(false);
    expect(update.peeledDeltaArcRad).toBe(180);
    expect(update.currentRatio).toBeCloseTo(180 / PeelStateMachine.TARGET_SWIPE_PX, 2);
  });
});

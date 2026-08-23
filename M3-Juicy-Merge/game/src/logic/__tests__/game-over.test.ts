// GC-05/06/07 — game-over check thuần (M3-03, §4.2)
// Pure: không dùng Matter, không dùng sdk. Scene (Bước 11) tính `settled` từ
// body sleeping / speed < threshold + grace period, rồi gọi hàm này.
// Tier convention 0-based (0 = cherry ... 11 = watermelon).
import { describe, it, expect } from 'vitest';
import { checkGameOver, type FruitPos } from '../game-over';

// Helper: build a fruit at a given center y. tier is irrelevant to the check
// but included to mirror the real fruit shape the scene will pass.
const fruit = (y: number, tier = 0): FruitPos => ({ y, tier });

describe('GC-05: settled + fruit above danger line → game over', () => {
  it('settled=true and one fruit with center y < dangerY → true', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(150), fruit(300)]; // 150 < 200 → above
    expect(checkGameOver(fruits, dangerY, true)).toBe(true);
  });

  it('settled=true but all fruits below the line → false', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(250), fruit(300)]; // both >= 200
    expect(checkGameOver(fruits, dangerY, true)).toBe(false);
  });

  it('a fruit exactly on the line (y === dangerY) is NOT above → false', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(200)];
    expect(checkGameOver(fruits, dangerY, true)).toBe(false);
  });

  it('empty fruit list → false even when settled', () => {
    expect(checkGameOver([], 200, true)).toBe(false);
  });
});

describe('GC-06: NOT settled (moving) + fruit crossing the line → false', () => {
  it('fruit above the line but settled=false → false', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(100)]; // well above the line
    expect(checkGameOver(fruits, dangerY, false)).toBe(false);
  });

  it('fruit above the line but settled=false (many fruits) → false', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(50), fruit(120), fruit(180)];
    expect(checkGameOver(fruits, dangerY, false)).toBe(false);
  });
});

describe('GC-07: not yet settled + fruit above the line → false', () => {
  it('fruit resting above the line but bodies still moving → false', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(150)]; // above line
    // settled=false: scene has not confirmed all bodies sleeping + grace
    expect(checkGameOver(fruits, dangerY, false)).toBe(false);
  });

  it('only settles once — settled flips false→true with the same fruits', () => {
    const dangerY = 200;
    const fruits: FruitPos[] = [fruit(150)];
    expect(checkGameOver(fruits, dangerY, false)).toBe(false);
    expect(checkGameOver(fruits, dangerY, true)).toBe(true);
  });
});

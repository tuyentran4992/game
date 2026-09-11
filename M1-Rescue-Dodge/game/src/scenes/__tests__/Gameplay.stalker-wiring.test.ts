// UT Stalker Bee Wiring — xác minh wiring Stalker Bee, telegraph laser, an toàn và phân tầng Stage (TDD-B).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { MECHANICS } from '../../config/mechanics';
import { GameEngine } from '../../logic/GameEngine';

describe('Stalker Bee Wiring — Stage 3 Enemy Integration', () => {
  it('types.ts chứa stalker trong BeeType', () => {
    const src = readFileSync('src/logic/types.ts', 'utf8');
    expect(src).toContain("'stalker'");
    expect(src).toContain('stalkerTelegraphSec');
    expect(src).toContain('stalkerSpeedMult');
  });

  it('mechanics.ts có cấu hình chuẩn cho Stalker Bee và khoảng cách làn kề', () => {
    expect(MECHANICS.stalkerTelegraphSec).toBe(0.8);
    expect(MECHANICS.stalkerSpeedMult).toBe(1.80);
    expect(typeof MECHANICS.stalkerRatioStage3).toBe('number');
    expect(MECHANICS.stalkerRatioStage3!).toBeGreaterThan(0);
    expect(MECHANICS.minAdjacentBeeDistY).toBe(180);
  });

  it('Gameplay.ts có wiring createStalkerBeeEntity, telegraph laser và willBlockAllLanes với delaySec', () => {
    const src = readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(src).toContain('createStalkerBeeEntity');
    expect(src).toContain('stalkerLaser');
    expect(src).toContain('stalkerDelayLeft');
    expect(src).toContain('delaySec');
    expect(src).toContain('Digit3');
    expect(src).toContain('minAdjacentBeeDistY');
  });

  it('SpawnDirector.ts có tích hợp safeLanesStalker và ưu tiên catLane', () => {
    const src = readFileSync('src/logic/SpawnDirector.ts', 'utf8');
    expect(src).toContain('safeLanesStalker');
    expect(src).toContain("type === 'stalker'");
    expect(src).toContain('stalkerSpeedMult');
  });

  it('GameEngine phân tầng kẻ thù theo Stage: Stage 1 (chỉ normal/speedy), Stage 2 (+zigzag), Stage 3 (+stalker)', () => {
    const engine1 = new GameEngine(MECHANICS, { rng: () => 0.5 });
    engine1.stage = 1;
    for (let i = 0; i < 50; i++) {
      const type = engine1.rollBeeType(35, 1);
      expect(type === 'normal' || type === 'speedy').toBe(true);
      expect(type).not.toBe('zigzag');
      expect(type).not.toBe('stalker');
    }

    const engine2 = new GameEngine(MECHANICS, { rng: () => 0.40 });
    engine2.stage = 2;
    expect(engine2.rollBeeType(35, 1)).toBe('zigzag');

    const engine3 = new GameEngine(MECHANICS, { rng: () => 0.48 });
    engine3.stage = 3;
    expect(engine3.rollBeeType(35, 1)).toBe('stalker');
  });
});

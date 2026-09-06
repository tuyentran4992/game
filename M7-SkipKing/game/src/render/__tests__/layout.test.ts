/**
 * T3 TDD-B — projection layout (pure, không Phaser): z (m, 0=waterline đáy → fieldZMax=horizon)
 * → toạ độ màn 720×1280. Số render đọc qua LAYOUT — test khoá hành vi projection.
 */
import { describe, it, expect } from 'vitest';
import { makeProjection, LAYOUT, AIM, FX } from '../layout';
import { MECHANICS } from '../../config/mechanics';

describe('makeProjection — z → màn hình (waterline z=0 đáy màn, CONTRACT §2)', () => {
  const p = makeProjection(MECHANICS.canvas.width, MECHANICS.canvas.height);

  it('z=0 → y = waterlineY (dòng nước gần, sát đáy màn)', () => {
    expect(p.zToY(0)).toBe(p.waterlineY);
    expect(p.waterlineY).toBeGreaterThan(p.horizonY);
    expect(p.waterlineY).toBeLessThanOrEqual(MECHANICS.canvas.height);
  });

  it('z=fieldZMax → y = horizonY (chân trời)', () => {
    expect(p.zToY(MECHANICS.fieldZMax)).toBe(p.horizonY);
    expect(p.horizonY).toBeGreaterThan(0);
    expect(p.horizonY).toBeLessThan(MECHANICS.canvas.height / 2);
  });

  it('giảm đơn điệu theo z (z xa hơn → y nhỏ hơn, lên phía chân trời)', () => {
    let prev = Infinity;
    for (let z = 0; z <= MECHANICS.fieldZMax; z += 4) {
      const y = p.zToY(z);
      expect(y).toBeLessThan(prev);
      prev = y;
    }
  });

  it('scale co theo sâu: z=0 → 1, horizon → LAYOUT.horizonScale, không âm', () => {
    expect(p.zScale(0)).toBe(1);
    expect(p.zScale(MECHANICS.fieldZMax)).toBeCloseTo(LAYOUT.horizonScale, 10);
    expect(p.zScale(MECHANICS.fieldZMax / 2)).toBeGreaterThan(LAYOUT.horizonScale);
    expect(p.zScale(MECHANICS.fieldZMax / 2)).toBeLessThan(1);
  });

  it('pxPerM(z) dương — đá/ripple đo được bằng px', () => {
    expect(p.pxPerM(0)).toBeGreaterThan(0);
    expect(p.pxPerM(MECHANICS.fieldZMax)).toBeGreaterThan(0);
  });
});

describe('LAYOUT — hằng render có đơn vị + rationale (không số rải rác)', () => {
  it('aim guide: dài tỉ lệ lực trong [aimMinPx, aimMaxPx]', () => {
    expect(AIM.aimMinPx).toBeGreaterThan(0);
    expect(AIM.aimMaxPx).toBeGreaterThan(AIM.aimMinPx);
  });

  it('ripple pool có trần (object pool — ROLE-RULES perf)', () => {
    expect(FX.ripplePool).toBeGreaterThan(0);
    expect(FX.ripplePool).toBeLessThanOrEqual(20);
  });

  it('squash đúng 80ms — CONTRACT §6 juice giữ', () => {
    expect(FX.squashMs).toBe(80);
  });

  it('kéo tối đa ≥ 44px target chạm của config (vùng kéo thoải mái hơn target)', () => {
    expect(AIM.maxDragPx).toBeGreaterThanOrEqual(MECHANICS.touchTargetPx);
  });
});

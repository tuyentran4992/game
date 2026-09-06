/**
 * T3 TDD-B — PullBackInput: kéo ngược kiểu dây cung (CONTRACT 3.2).
 * Kéo ngược = tích lực + hướng; thả = FlickInput qua schema chung tầng A (K4×V1).
 * Pure — không Phaser: scene chỉ wire pointer events vào onDown/onMove/onUp.
 */
import { describe, it, expect } from 'vitest';
import { PullBackInput } from '../PullBackInput';
import { AIM } from '../../render/layout';
import { throwAngleDeg } from '../../logic/mechanics';

function harness() {
  const aims: (ReturnType<PullBackInput['currentInput']>)[] = [];
  const released: { dirX: number; dirZ: number; power: number }[] = [];
  const pull = new PullBackInput({
    onAim: (f) => aims.push(f),
    onRelease: (f) => released.push(f),
  });
  return { pull, aims, released };
}

describe('PullBackInput — kéo ngược = tích lực (power ∝ độ dài kéo)', () => {
  it('kéo ngang 1/2 maxDrag → power 0.5, hướng NGƯỢC chiều kéo (dây cung)', () => {
    const { pull, released } = harness();
    pull.onDown(360, 900);
    pull.onMove(360 - AIM.maxDragPx / 2, 900); // kéo trái ngang
    pull.onUp(360 - AIM.maxDragPx / 2, 900);
    expect(released).toHaveLength(1);
    expect(released[0].power).toBeCloseTo(0.5, 6);
    // kéo trái → đá bay phải (ngược): dirX > 0; kéo ngang → bay ra xa (dirZ < 0)
    expect(released[0].dirX).toBeGreaterThan(0);
    expect(released[0].dirZ).toBeLessThan(0);
  });

  it('kéo thẳng xuống → góc ném 0° (đúng trục ra horizon — mechanics.throwAngleDeg)', () => {
    const { pull, released } = harness();
    pull.onDown(360, 900);
    pull.onMove(360, 900 + AIM.maxDragPx);
    pull.onUp(360, 900 + AIM.maxDragPx);
    expect(released[0].dirX).toBeCloseTo(0, 9);
    expect(throwAngleDeg(released[0])).toBeCloseTo(0, 6);
  });

  it('power kẹp biên 0..1 — kéo quá maxDrag không vượt 1', () => {
    const { pull, released } = harness();
    pull.onDown(360, 900);
    pull.onMove(360, 900 + AIM.maxDragPx * 3);
    pull.onUp(360, 900 + AIM.maxDragPx * 3);
    expect(released[0].power).toBe(1);
  });

  it('kéo quá ngắn → huỷ (không bắn nhầm khi chạm lửng)', () => {
    const { pull, released, aims } = harness();
    pull.onDown(360, 900);
    pull.onMove(362, 903); // ~3.6px < minDrag
    pull.onUp(362, 903);
    expect(released).toHaveLength(0);
    expect(aims[aims.length - 1]).toBeNull(); // aim guide tắt
  });

  it('onAim stream null khi chưa kéo / null sau khi thả — aim guide đúng trạng thái', () => {
    const { pull, aims } = harness();
    expect(pull.currentInput()).toBeNull();
    pull.onDown(360, 900);
    pull.onMove(360, 900 + 100);
    expect(pull.currentInput()).not.toBeNull();
    expect(aims[aims.length - 1]).not.toBeNull();
    pull.onUp(360, 900 + 100);
    expect(pull.currentInput()).toBeNull();
    expect(aims[aims.length - 1]).toBeNull();
  });

  it('cancel() huỷ cú kéo đang giữa chừng', () => {
    const { pull, released } = harness();
    pull.onDown(360, 900);
    pull.onMove(360, 900 + 120);
    pull.cancel();
    expect(pull.currentInput()).toBeNull();
    pull.onUp(360, 900 + 120);
    expect(released).toHaveLength(0);
  });
});

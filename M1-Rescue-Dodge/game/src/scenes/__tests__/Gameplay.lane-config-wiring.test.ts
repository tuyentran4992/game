// [UPG2-N1] t_79d2b77d — tầng B: khoá wiring lane-switch của scene theo config (TDD-B).
// Scene KHÔNG được chứa lại literal tween/buffer — phải đọc MechanicsConfig:
//   laneMoveMs / laneMoveDelayMs / laneMoveEase / laneMoveSettleMs / inputBufferMs.
// Mô hình grep-cấp nguồn như Gameplay.spawn-wiring.test.ts (T1a) + fx-wiring (T1f).
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { MECHANICS } from '../../logic/mechanics';

const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');

describe('UPG2-N1 — scene đọc lane-tween từ MechanicsConfig (không literal)', () => {
  it('moveLane KHÔNG chứa literal duration/ease/delay — mọi số đi qua config', () => {
    const body = methodBody(SRC, 'private moveLane');
    expect(body).not.toMatch(/duration:\s*\d{2,}/);
    expect(body).not.toMatch(/delay:\s*\d{2,}/);
    expect(body).toContain('MECHANICS.laneMoveMs');
    expect(body).toContain('MECHANICS.laneMoveEase');
    expect(body).toContain('MECHANICS.laneMoveDelayMs');
  });

  it('settle tween sau cubic.out cũng đọc config (laneMoveSettleMs)', () => {
    const body = methodBody(SRC, 'private moveLane');
    expect(body).toContain('MECHANICS.laneMoveSettleMs');
  });

  it('dur.tn không còn là nguồn của tween đổi làn (key token cũ bị thay trong moveLane)', () => {
    const body = methodBody(SRC, 'private moveLane');
    expect(body).not.toContain('dur.tn');
  });

  it('config default khớp cảm giác đang chạy: 120/35/cubic.out/80/buffer 0', () => {
    expect(MECHANICS.laneMoveMs).toBe(120);
    expect(MECHANICS.laneMoveDelayMs).toBe(35);
    expect(MECHANICS.laneMoveEase).toBe('cubic.out');
    expect(MECHANICS.laneMoveSettleMs).toBe(80);
    expect(MECHANICS.inputBufferMs).toBe(0);
  });
});

/** Cắt body 1 method (từ dấu tên tới `  }` đóng ở indent method). */
function methodBody(src: string, name: string): string {
  const start = src.indexOf(name + '(');
  if (start < 0) return '';
  const end = src.indexOf('\n  }', start);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

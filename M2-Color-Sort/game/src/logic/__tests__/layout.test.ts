import { describe, it, expect } from 'vitest';
import { computeBoardLayout, tubePosition } from '../layout';

const VIEWPORTS: [number, number, string][] = [
  [390, 844, '9:16 phone'],
  [360, 780, 'small phone'],
  [414, 896, 'large phone'],
  [768, 1024, '3:4 tablet'],
  [1280, 720, '16:9 landscape'],
  [1080, 1080, '1:1'],
  [412, 1464, '9:32 rất cao'],
];

const HUD = 104;
const TOOLBAR = 126;
const MARGIN = 16;

describe('layout — board responsive (DESIGN-SPEC §2)', () => {
  it('mọi ống nằm TRONG khung (không tràn ngang/dọc) mọi viewport × 3..12 ống', () => {
    for (const [w, h, name] of VIEWPORTS) {
      for (let n = 3; n <= 12; n++) {
        const L = computeBoardLayout(w, h, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
        expect(L.cols * L.rows, `${name} n=${n}`).toBeGreaterThanOrEqual(n);
        for (let i = 0; i < n; i++) {
          const p = tubePosition(L, i);
          expect(p.x - L.tubeW / 2, `${name} n=${n} i=${i} left`).toBeGreaterThanOrEqual(0);
          expect(p.x + L.tubeW / 2, `${name} n=${n} i=${i} right`).toBeLessThanOrEqual(w + 0.01);
          expect(p.y - L.tubeH / 2, `${name} n=${n} i=${i} top`).toBeGreaterThanOrEqual(HUD - 0.01);
          expect(p.y + L.tubeH / 2, `${name} n=${n} i=${i} bottom`).toBeLessThanOrEqual(h - TOOLBAR + 0.01);
        }
      }
    }
  });

  it('giữ vùng chạm ≥ 44px trên 9:16 kể cả level 12 ống', () => {
    for (let n = 3; n <= 12; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
      expect(L.hitW, `n=${n}`).toBeGreaterThanOrEqual(44);
      expect(L.hitH, `n=${n}`).toBeGreaterThanOrEqual(44);
      expect(L.tubeW, `n=${n} tubeW`).toBeGreaterThanOrEqual(44);
    }
  });

  it('các ống KHÔNG chồng lên nhau (khoảng cách ≥ gap)', () => {
    const L = computeBoardLayout(390, 844, 12, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const a = tubePosition(L, i);
        const b = tubePosition(L, j);
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        const overlap = dx < L.tubeW - 0.01 && dy < L.tubeH - 0.01;
        expect(overlap, `tube ${i} vs ${j} overlap`).toBe(false);
      }
    }
  });

  it('ống cao hơn rộng (đúng hình ống nghiệm) và không vượt max', () => {
    for (const [w, h] of VIEWPORTS) {
      const L = computeBoardLayout(w, h, 7, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
      expect(L.tubeH).toBeGreaterThan(L.tubeW);
      expect(L.tubeH).toBeLessThanOrEqual(236);
      expect(L.tubeW).toBeLessThanOrEqual(92);
    }
  });

  it('hàng cuối thiếu ống vẫn được căn giữa', () => {
    const L = computeBoardLayout(390, 844, 7, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
    const lastRowStart = L.cols * (L.rows - 1);
    const inLastRow = L.count - lastRowStart;
    if (inLastRow > 0 && inLastRow < L.cols) {
      const first = tubePosition(L, lastRowStart);
      const last = tubePosition(L, L.count - 1);
      expect((first.x + last.x) / 2).toBeCloseTo(390 / 2, 3);
    }
  });

  it('ít ống → dùng 1 hàng (không chia hàng vô ích)', () => {
    const L = computeBoardLayout(390, 844, 3, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
    expect(L.rows).toBe(1);
    expect(L.cols).toBe(3);
  });

  it('viewport siêu nhỏ vẫn trả layout hợp lệ (không NaN, không âm)', () => {
    const L = computeBoardLayout(200, 320, 12, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN });
    expect(Number.isFinite(L.tubeW)).toBe(true);
    expect(L.tubeW).toBeGreaterThan(0);
    expect(L.tubeH).toBeGreaterThan(0);
    expect(L.rows * L.cols).toBeGreaterThanOrEqual(12);
  });
});

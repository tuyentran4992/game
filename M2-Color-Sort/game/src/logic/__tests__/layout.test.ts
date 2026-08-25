import { describe, it, expect } from 'vitest';
import { computeBoardLayout, tubePosition } from '../layout';

const VIEWPORTS: [number, number, string][] = [
  [390, 844, '9:16 phone'],
  [360, 780, 'small phone'],
  [414, 896, 'large phone'],
  [320, 568, 'iPhone SE nhỏ'],
  [768, 1024, '3:4 tablet'],
  [1280, 720, '16:9 landscape'],
  [1080, 1080, '1:1'],
  [412, 1464, '9:32 rất cao'],
];

const HUD = 104;
const TOOLBAR = 126;
const MARGIN = 16;

/** capacity theo số ống (mirror mechanics ramp: 9 ống trở xuống cap 4, từ 10 cap 5). */
function capFor(n: number): number {
  return n >= 10 ? 5 : 4;
}

/** cap cột theo bề rộng (DESIGN-SPEC §2.3) — dùng cho assertion. */
function colCapFor(width: number): number {
  return width < 380 ? 4 : width < 480 ? 5 : width < 900 ? 6 : width < 1500 ? 7 : 8;
}

describe('layout — board responsive (DESIGN-SPEC §2)', () => {
  it('mọi ống nằm TRONG khung (không tràn ngang/dọc) mọi viewport × 3..12 ống', () => {
    for (const [w, h, name] of VIEWPORTS) {
      for (let n = 3; n <= 12; n++) {
        const L = computeBoardLayout(w, h, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
        expect(L.cols * L.rows, `${name} n=${n}`).toBeGreaterThanOrEqual(n);
        // ghi nhớ "breathing room": board không sát mép HUD/toolbar (padY ≥ 16)
        expect(L.cols, `${name} n=${n} col cap`).toBeLessThanOrEqual(colCapFor(w));
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
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
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

  // ======================= AUDIT §B3 / PHASE3 =======================

  it('column cap theo bề rộng (DESIGN-SPEC §2.3) — 320px ≤ 4 cột, 390px ≤ 5, 768px ≤ 6', () => {
    // 320px phone
    for (let n = 6; n <= 12; n++) {
      const L = computeBoardLayout(320, 568, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.cols, `320px n=${n}`).toBeLessThanOrEqual(colCapFor(320));
    }
    // 390px phone
    for (let n = 6; n <= 12; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.cols, `390px n=${n}`).toBeLessThanOrEqual(colCapFor(390));
    }
    // 1280px desktop
    for (let n = 6; n <= 12; n++) {
      const L = computeBoardLayout(1280, 720, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.cols, `1280px n=${n}`).toBeLessThanOrEqual(colCapFor(1280));
    }
  });

  it('portrait ≤ 3 hàng, landscape ≤ 2 hàng', () => {
    // portrait 390×844
    for (let n = 6; n <= 12; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.rows, `portrait n=${n}`).toBeLessThanOrEqual(3);
    }
    // landscape 1280×720
    for (let n = 6; n <= 12; n++) {
      const L = computeBoardLayout(1280, 720, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.rows, `landscape n=${n}`).toBeLessThanOrEqual(2);
    }
  });

  it('390×844 (verify): n≤5 → 1 hàng; n=6-10 → 2 hàng, layer ≥ 26, gap ≥ 8; n=11-12 → 2×6 hoặc 3', () => {
    for (let n = 3; n <= 5; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.rows, `n=${n} phải 1 hàng`).toBe(1);
    }
    for (let n = 6; n <= 10; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.rows, `n=${n} phải 2 hàng`).toBe(2);
      expect(L.layerH, `n=${n} layer`).toBeGreaterThanOrEqual(26);
      expect(L.gapX, `n=${n} gap`).toBeGreaterThanOrEqual(8);
      expect(L.gapY, `n=${n} gapY`).toBeGreaterThanOrEqual(8);
    }
    for (const n of [11, 12]) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect([2, 3]).toContain(L.rows);
    }
  });

  it('min tube 44×120 khi viewport đủ chỗ (390×844)', () => {
    for (let n = 4; n <= 12; n++) {
      const L = computeBoardLayout(390, 844, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(L.tubeW, `n=${n} tubeW≥44`).toBeGreaterThanOrEqual(44);
      expect(L.tubeH, `n=${n} tubeH≥120`).toBeGreaterThanOrEqual(120);
    }
  });

  it('320px network: không tràn + layer hợp lệ (không âm, không NaN)', () => {
    for (let n = 3; n <= 12; n++) {
      const L = computeBoardLayout(320, 568, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
      expect(Number.isFinite(L.layerH)).toBe(true);
      expect(L.layerH).toBeGreaterThan(0);
      expect(L.tubeW).toBeGreaterThan(16);
      expect(L.tubeH).toBeGreaterThan(16);
      // tất cả ống nằm trong (không tràn ra ngoài mép)
      for (let i = 0; i < n; i++) {
        const p = tubePosition(L, i);
        expect(p.x + L.tubeW / 2).toBeLessThanOrEqual(320.01);
        expect(p.x - L.tubeW / 2).toBeGreaterThanOrEqual(-0.01);
      }
    }
  });

  it('gap đàn hồi ≥ 8px mọi viewport khi có chỗ (không bao giờ mù 5px)', () => {
    for (const [w, h] of [[390, 844], [412, 915], [320, 568], [768, 1024], [1280, 720]]) {
      for (let n = 6; n <= 12; n++) {
        const L = computeBoardLayout(w, h, n, { hudH: HUD, toolbarH: TOOLBAR, marginX: MARGIN, capacity: capFor(n) });
        expect(L.gapX, `${w}x${h} n=${n}`).toBeGreaterThanOrEqual(8);
        expect(L.gapY, `${w}x${h} n=${n}`).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

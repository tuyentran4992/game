// Responsive board layout (PURE — no Phaser). DESIGN-SPEC §2.1/§2.3:
// board tự co theo viewport, ống KHÔNG nhỏ hơn vùng chạm 44px khi còn chỗ,
// level khó (nhiều ống) vẫn chơi được ở 9:16.
// Test: __tests__/layout.test.ts

export interface BoardLayout {
  cols: number;
  rows: number;
  /** tổng số ống được xếp (dùng để căn giữa hàng cuối) */
  count: number;
  /** chiều rộng viewport dùng để căn giữa */
  viewWidth: number;
  tubeW: number;
  tubeH: number;
  gapX: number;
  gapY: number;
  boardW: number;
  boardH: number;
  /** tâm ống đầu tiên (hàng 0, cột 0) */
  startX: number;
  startY: number;
  /** vùng chạm tối thiểu (>= 44px theo design-system §2) */
  hitW: number;
  hitH: number;
}

export interface LayoutOptions {
  /** chiều cao HUD trên (safe area) */
  hudH?: number;
  /** chiều cao toolbar dưới */
  toolbarH?: number;
  /** lề ngang */
  marginX?: number;
  minTubeW?: number;
  maxTubeW?: number;
  minTubeH?: number;
  maxTubeH?: number;
  minGapX?: number;
  minGapY?: number;
  /** tỉ lệ rộng/cao của ống (DESIGN-SPEC §3.1: 84×200 ≈ 0.42) */
  aspect?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  hudH: 96,
  toolbarH: 128,
  marginX: 16,
  minTubeW: 44,
  maxTubeW: 92,
  minTubeH: 104,
  maxTubeH: 236,
  minGapX: 10,
  minGapY: 14,
  aspect: 0.42,
};

/** ưu tiên ít hàng: 1 hàng dễ đọc hơn nhiều hàng khi diện tích tương đương */
const ROW_PENALTY = 1200;
/** thưởng lớn cho cấu hình còn giữ vùng chạm ≥ 44px (design-system §2) */
const TOUCH_BONUS = 4000;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Chọn số cột/hàng + kích thước ống tối ưu (tối đa diện tích ống) sao cho toàn bộ
 * board vừa trong vùng giữa HUD và toolbar. Ống co xuống dưới 44px CHỈ khi
 * viewport quá nhỏ để tránh tràn (fallback an toàn, không bao giờ vẽ ra ngoài).
 */
export function computeBoardLayout(
  width: number,
  height: number,
  tubeCount: number,
  opts: LayoutOptions = {},
): BoardLayout {
  const o = { ...DEFAULTS, ...opts };
  const n = Math.max(1, Math.floor(tubeCount));
  const availW = Math.max(80, width - o.marginX * 2);
  const areaTop = o.hudH;
  const areaH = Math.max(140, height - o.hudH - o.toolbarH);

  let best: BoardLayout | null = null;
  let bestScore = -Infinity;

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const gapY = o.minGapY;

    // chiều cao ống theo số hàng
    let tubeH = (areaH - gapY * (rows + 1)) / rows;
    tubeH = Math.min(o.maxTubeH, tubeH);
    if (tubeH <= 24) continue;

    // chiều rộng theo tỉ lệ ống, rồi co lại nếu không đủ ngang
    let gapX = o.minGapX;
    let tubeW = clamp(tubeH * o.aspect, o.minTubeW, o.maxTubeW);
    let needed = cols * tubeW + gapX * (cols + 1);
    if (needed > availW) {
      tubeW = (availW - gapX * (cols + 1)) / cols;
      if (tubeW < o.minTubeW) {
        // hạ gap trước khi hạ vùng chạm
        gapX = Math.max(4, o.minGapX * 0.5);
        tubeW = (availW - gapX * (cols + 1)) / cols;
      }
      if (tubeW <= 16) continue;
      // giữ ống không "béo": cao ít nhất ~2× rộng
      tubeH = Math.min(tubeH, Math.max(o.minTubeH * 0.6, tubeW / o.aspect));
    }

    // ưu tiên: (1) giữ vùng chạm ≥ 44px, (2) ít hàng (board gọn, dễ nhìn), (3) ống to
    const score = tubeW * tubeH - rows * ROW_PENALTY + (tubeW >= o.minTubeW ? TOUCH_BONUS : 0);
    if (score <= bestScore) continue;

    const boardW = cols * tubeW + gapX * (cols - 1);
    const boardH = rows * tubeH + gapY * (rows - 1);
    bestScore = score;
    best = {
      cols,
      rows,
      count: n,
      viewWidth: width,
      tubeW,
      tubeH,
      gapX,
      gapY,
      boardW,
      boardH,
      startX: (width - boardW) / 2 + tubeW / 2,
      startY: areaTop + (areaH - boardH) / 2 + tubeH / 2,
      hitW: Math.max(44, tubeW),
      hitH: Math.max(44, tubeH),
    };
  }

  if (best) return best;

  // Fallback cực nhỏ: 1 hàng, chia đều
  const cols = n;
  const tubeW = Math.max(12, (availW - o.minGapX * (cols + 1)) / cols);
  const tubeH = Math.max(40, areaH - o.minGapY * 2);
  const boardW = cols * tubeW + o.minGapX * (cols - 1);
  return {
    cols,
    rows: 1,
    count: n,
    viewWidth: width,
    tubeW,
    tubeH,
    gapX: o.minGapX,
    gapY: o.minGapY,
    boardW,
    boardH: tubeH,
    startX: (width - boardW) / 2 + tubeW / 2,
    startY: areaTop + areaH / 2,
    hitW: Math.max(44, tubeW),
    hitH: Math.max(44, tubeH),
  };
}

/** Tâm ống thứ i theo layout (row-major, hàng cuối tự căn giữa). */
export function tubePosition(layout: BoardLayout, index: number): { x: number; y: number } {
  const r = Math.floor(index / layout.cols);
  const c = index % layout.cols;
  const inRow = Math.min(layout.cols, Math.max(1, layout.count - r * layout.cols));
  const rowW = inRow * layout.tubeW + layout.gapX * (inRow - 1);
  const rowStartX = (layout.viewWidth - rowW) / 2 + layout.tubeW / 2;
  return {
    x: rowStartX + c * (layout.tubeW + layout.gapX),
    y: layout.startY + r * (layout.tubeH + layout.gapY),
  };
}

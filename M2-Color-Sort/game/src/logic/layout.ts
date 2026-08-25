// Responsive board layout (PURE — no Phaser). DESIGN-SPEC §2.1/§2.3 + AUDIT §B3:
// board tự co theo viewport, ống KHÔNG nhỏ hơn vùng chạm 44px khi còn chỗ, level
// khó (nhiều ống) vẫn chơi được ở 9:16, column cap theo bề rộng, gap đàn hồi,
// và chiều cao ống TÔN TRỌNG capacity để mỗi lát chất lỏng đọc được (layer ≥ 26px).
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
  /** chiều cao mỗi lát chất lỏng ((tubeH − nội thất)/capacity) — đọc được ≥ 26px */
  layerH: number;
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
  /** tỉ lệ rộng/cao của ống (DESIGN-SPEC §3.1: 84×200 ≈ 0.42) */
  aspect?: number;
  /** số lát tối đa mỗi ống (AUDIT §B3 — capacity là input của layout) */
  capacity?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  hudH: 96,
  toolbarH: 128,
  marginX: 16,
  minTubeW: 44,
  maxTubeW: 92,
  minTubeH: 120,
  maxTubeH: 236,
  aspect: 0.42,
  capacity: 4,
};

/** Chiều cao tối thiểu của MỘT lát chất lỏng để đọc được / nhắm được (AUDIT §B3). */
export const MIN_LAYER_PX = 26;
/** chiều cao nội thất ống (innerPad*2 + 4) — từ ui.ts renderLiquid */
const TUBE_INNER = 11;
/** vùng chạm tối thiểu theo design-system §2 */
export const MIN_TOUCH = 44;

/** Elastic gap: lớn dần theo ống (AUDIT §B3 — không bao giờ co về 5px mù). */
function elasticGap(tubeW: number): number {
  return Math.max(8, Math.min(22, tubeW * 0.18));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Chọn số cột/hàng + kích thước ống tối ưu (tối đa ĐỘ ĐỌC ĐƯỢC) sao cho toàn bộ
 * board vừa trong vùng giữa HUD và toolbar, với:
 *   - column cap theo bề rộng (DESIGN-SPEC §2.3)  w<380→4, <480→5, <900→6, <1500→7, else 8
 *   - portrait ≤ 3 hàng, landscape ≤ 2 hàng
 *   - breathing room padY/padX được TRỪ TRƯỚC khi fit (ống không chạm HUD/toolbar)
 *   - gap đàn hồi clamp(tubeW*0.18, 8, 22)
 *   - capacity-aware: tubeH ≥ capacity*MIN_LAYER_PX + nội thất (khi viewport cho phép)
 *   - min tube 44×120; score ĐỘ ĐỌC, không phải diện tích.
 */
export function computeBoardLayout(
  width: number,
  height: number,
  tubeCount: number,
  opts: LayoutOptions = {},
): BoardLayout {
  const o = { ...DEFAULTS, ...opts };
  const n = Math.max(1, Math.floor(tubeCount));
  const capacity = Math.max(1, Math.floor(o.capacity ?? DEFAULTS.capacity));

  // 1) column cap theo bề rộng (DESIGN-SPEC §2.3)
  const maxColsByWidth = width < 380 ? 4 : width < 480 ? 5 : width < 900 ? 6 : width < 1500 ? 7 : 8;
  const maxCols = Math.min(n, maxColsByWidth);
  // 2) portrait ≤ 3 hàng, landscape ≤ 2
  const maxRows = height / width > 1.5 ? 3 : 2;

  // 3) breathing room TRƯỚC khi fit
  const availRawW = Math.max(0, width - o.marginX * 2);
  const areaRawH = Math.max(0, height - o.hudH - o.toolbarH);
  const padX = Math.max(12, availRawW * 0.04);
  const padY = Math.max(16, areaRawH * 0.06);
  const areaTop = o.hudH + padY;
  const availW = Math.max(24, availRawW - padX * 2);
  const areaH = Math.max(24, areaRawH - padY * 2);

  // 4) capacity-aware min chiều cao ống
  const capMinTubeH = capacity * MIN_LAYER_PX + TUBE_INNER;

  const tryLayout = (cols: number): { layout: BoardLayout; score: number } | null => {
    const rows = Math.ceil(n / cols);
    if (rows > maxRows) return null;

    // elastic gap phụ thuộc tubeW → lặp vài vòng để hội tụ
    let gap = 12;
    let tubeW = (availW - gap * (cols + 1)) / cols;
    for (let k = 0; k < 3; k++) {
      tubeW = (availW - gap * (cols + 1)) / cols;
      gap = elasticGap(tubeW);
    }
    if (tubeW <= 16) return null;
    // ống KHÔNG to hơn maxTubeW (92px — design); phần dư là lề 2 bên cho thoáng
    tubeW = Math.min(tubeW, o.maxTubeW);
    gap = elasticGap(tubeW);

    let tubeH = Math.min(o.maxTubeH, (areaH - gap * (rows + 1)) / rows);
    if (tubeH <= 24) return null;

    // aspect shaping NHƯNG không hạ xuống dưới capMin (capacity-aware)
    const shapedByW = tubeW / o.aspect;
    tubeH = Math.min(tubeH, Math.max(capMinTubeH, shapedByW));

    const layerH = (tubeH - TUBE_INNER) / capacity;
    // AUDIT §B3 / verify: n=6..10 nên 2 HÀNG (đọc thông, không phải "tường đông"),
    // NHƯNG vẫn cho phép 3 khi viewport quá hẹp (cols cap chặn 2 hàng) → bonus, không cứng.
    const twoRowBonus = n >= 6 && n <= 10 && rows === 2 ? 12000 : 0;
    const score =
      twoRowBonus
      + layerH * 60                                    // đọc được từng lát
      + Math.min(tubeW, o.maxTubeW) * 8              // ống to thì tốt
      - rows * 240                                   // hàng nhiều → nhẹ nhàng hơn Penalty 1200 cũ
      - (gap < 10 ? 5000 : 0)                        // gap mù = không bao giờ xếp
      + (tubeW >= MIN_TOUCH && layerH >= MIN_LAYER_PX ? 6000 : 0); // touch ≥44 + layer ≥26

    const boardW = cols * tubeW + gap * (cols - 1);
    const boardH = rows * tubeH + gap * (rows - 1);
    return {
      score,
      layout: {
        cols,
        rows,
        count: n,
        viewWidth: width,
        tubeW,
        tubeH,
        gapX: gap,
        gapY: gap,
        boardW,
        boardH,
        startX: (width - boardW) / 2 + tubeW / 2,
        startY: areaTop + (areaH - boardH) / 2 + tubeH / 2,
        hitW: Math.max(MIN_TOUCH, tubeW),
        hitH: Math.max(MIN_TOUCH, tubeH),
        layerH,
      },
    };
  };

  let best: BoardLayout | null = null;
  let bestScore = -Infinity;

  // 5) tìm layout: 1 hàng ĐƯỢC ƯU TIÊN trên phone khi vừa (dễ đọc thông)
  const singleFeasible = width < 900 && n <= maxColsByWidth;
  for (let cols = 1; cols <= maxCols; cols++) {
    const picked = tryLayout(cols);
    if (!picked) continue;
    let s = picked.score;
    if (singleFeasible && picked.layout.rows === 1 && picked.layout.tubeW >= MIN_TOUCH) s += 20000; // ép 1 hàng
    if (s <= bestScore) continue;
    bestScore = s;
    best = picked.layout;
  }

  if (best) return best;

  // 6) Fallback cực nhỏ: 1 hàng, chia đều (KHÔNG tràn ra ngoài)
  const cols = Math.min(n, Math.max(1, Math.floor(availW / (MIN_TOUCH + 8))));
  const tubeW = Math.max(12, (availW - elasticGap(24) * (cols + 1)) / cols);
  const tubeH = Math.max(40, areaH - elasticGap(tubeW) * 2);
  const boardW = cols * tubeW + elasticGap(tubeW) * (cols - 1);
  const layerH = Math.max(6, (tubeH - TUBE_INNER) / capacity);
  return {
    cols,
    rows: Math.ceil(n / cols),
    count: n,
    viewWidth: width,
    tubeW,
    tubeH,
    gapX: elasticGap(tubeW),
    gapY: elasticGap(tubeW),
    boardW,
    boardH: (Math.ceil(n / cols)) * tubeH + Math.max(0, Math.ceil(n / cols) - 1) * elasticGap(tubeW),
    startX: (width - boardW) / 2 + tubeW / 2,
    startY: areaTop + (areaH - Math.max(tubeH, areaH - elasticGap(tubeW) * 2)) / 2 + tubeH / 2,
    hitW: Math.max(MIN_TOUCH, tubeW),
    hitH: Math.max(MIN_TOUCH, tubeH),
    layerH,
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

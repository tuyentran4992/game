// Pattern: Data Table (SỐ của bố cục cột dọc 720×1420)
// TRÁCH NHIỆM: chứa TOÀN BỘ số thiết kế của tầng render — ô mockup §4.1/§4.2, tỷ lệ từng
//   component, đệm an toàn, trần chữ. `layout.ts` bên cạnh chỉ còn HÀM DỰNG HÌNH
//   (layoutOf / cardArt / buttonFace / rowBoxes ...): đổi số = sửa bảng này, thêm luật hình học
//   = sửa layout.ts. Một file một trách nhiệm (gate G1: layout.ts 361 dòng > trần 350).
// RÀNG BUỘC: không import phaser (test chạy trong node); MỖI SỐ CHỈ XUẤT HIỆN MỘT LẦN;
//   scene/component cấm cộng trừ padding ở nơi gọi — mọi ô nội dung phải đi qua hàm layout.
// SỐ NEO: DESIGN-SPEC §4.1 (màn chơi) + §4.2 (Title), đơn vị của cột 720×1420 — KHÔNG phải px
//   màn hình. Camera production CỐ ĐỊNH cỡ này (main.ts Scale.FIT) nên layoutOf(720,1420) trả
//   đúng từng px mockup; camera lệch chỉ THU ĐỀU + căn giữa cột.

/** Hình chữ nhật thế giới (đã nhân tỷ lệ fit) — đơn vị trả về của mọi hàm layout. */
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Một ô mockup: [x, y, w, h] tính bằng ĐƠN VỊ CỦA CỘT 720×1420 (không phải px màn hình). */
export type Rect = readonly [number, number, number, number];

/** Trần dưới của một ô chạm, tính bằng px thế giới của cột thiết kế 720×1420. */
export const TAP_MIN = 44;

/** Camera CHỐT của bản dựng (DESIGN-SPEC §4): một cột dọc 720×1420 + Scale.FIT. */
const DESIGN = { w: 720, h: 1420 } as const;

/** Camera CHỐT — main.ts dựng Phaser.Game ĐÚNG cỡ này (một nguồn số, không khai lại ở nơi khác). */
export const CAMERA = { width: DESIGN.w, height: DESIGN.h } as const;

/** Bố cục trả về của MỘT màn: mỗi vùng một Box, scene không tự suy ô nào. */
export type Layout = {
  readonly w: number;
  readonly h: number;
  /** 1 đơn vị thiết kế = chiều cao camera / 1420 — dùng cho nét vẽ mỏng (độ dày nếp gấp). */
  readonly s: number;
  readonly cx: number;
  /** Cột chơi 720×1420 (đầy chiều ngang thiết kế) — `portrait` cùng một ô, giữ tên cho scene cũ. */
  readonly field: Box;
  readonly portrait: Box;
  readonly level: Box;
  readonly stars: Box;
  readonly ink: Box;
  readonly sound: Box;
  readonly menu: Box;
  readonly sheet: Box;
  /** Dải chữ giải thích khi bấm sai (§4.1: 60,690,600,60). */
  readonly banner: Box;
  readonly options: readonly Box[];
  readonly hint: Box;
  readonly undo: Box;
  readonly undoAd: Box;
  readonly retry: Box;
  readonly unfold: Box;
  readonly play: Box;
  readonly shop: Box;
  /** Tờ giấy demo + chữ + thanh tiến trình của hai màn ngoài vòng chơi. */
  readonly titleSheet: Box;
  readonly titleWord: Box;
  readonly progress: Box;
};

/**
 * Tỷ lệ riêng của từng COMPONENT vẽ (DỮ LIỆU — một bảng duy nhất). Bài học gate G3: bốn hằng
 * `FIT/BAND/SWATCH/STAR_RATIO` khai rời ở bốn file là bốn sự thật song song, đổi một chỗ là
 * lệch chỗ khác. Thêm hình mới = thêm một dòng ở đây, component chỉ tra.
 */
export const RATIOS = {
  star: { ratio: 0.32, band: 0.34 },
  badge: { disc: 0.88, ring: 0.82 },
  skinCard: { swatch: 0.56 },
} as const;

/**
 * BẢNG SỐ §4.1/§4.2 — nguồn sự thật duy nhất. Hai nút loại trừ nhau dùng CHUNG một dòng
 * (undoAd ≡ undo) nên rect đăng cho QA luôn là ô của nút ĐANG hiện.
 */
export const M = {
  /** HUD hàng 1 (y 16, cao 64). */
  level: [16, 16, 300, 64],
  sound: [560, 16, 64, 64],
  menu: [640, 16, 64, 64],
  /** HUD hàng 2 (y 88, cao 64): sao bám mép trái, mực bám mép phải — không chung hàng với nhau. */
  stars: [16, 88, 240, 64],
  ink: [560, 88, 144, 64],
  /** Tờ giấy 480×480 + dải chữ báo sai ngay dưới mép giấy. */
  sheet: [120, 170, 480, 480],
  banner: [60, 690, 600, 60],
  /** Hàng nút kết quả (ngay dưới ô đáp án): retry trái, next phải. */
  retry: [108, 1256, 240, 48],
  unfold: [372, 1256, 240, 48],
  /** Hàng nút công cụ (y 1312, cao 72): hint trái, undo phải. */
  hint: [108, 1312, 240, 72],
  undo: [372, 1312, 240, 72],
  /** Title §4.2: giấy demo 560×560, chữ Paper Crease, PLAY, SHOP. */
  titleSheet: [80, 180, 560, 560],
  titleWord: [60, 780, 600, 160],
  play: [240, 980, 240, 88],
  shop: [240, 1096, 240, 72],
  /** Thanh tiến trình Boot (nằm giữa chữ Title và nút PLAY của màn sau). */
  progress: [120, 1000, 480, 24],
} as const satisfies Record<string, Rect>;

/** Lưới 2×2 của bốn ô đáp án §4.1: ô 240×264, gap 24, hàng/cột do số liệu dựng ra. */
export const OPTION_GRID = { x: 108, y: 700, w: 240, h: 264, gap: 24, cols: 2, count: 4 } as const;

/** Bốn ô của lưới (tính từ gốc + bước ô — thêm hàng/cột là sửa OPTION_GRID, không thêm dòng). */
export const OPTION_RECTS: readonly Rect[] = Array.from({ length: OPTION_GRID.count }, (_, i) => {
  const c = i % OPTION_GRID.cols;
  const r = Math.floor(i / OPTION_GRID.cols);
  return [
    OPTION_GRID.x + c * (OPTION_GRID.w + OPTION_GRID.gap),
    OPTION_GRID.y + r * (OPTION_GRID.h + OPTION_GRID.gap),
    OPTION_GRID.w,
    OPTION_GRID.h,
  ] as const;
});

/**
 * HAI KHOẢNG CÁCH của tầng bố cục (đơn vị thiết kế nên tự scale theo camera) — gate G3 bắt
 * đúng chỗ này: `safe` là px HÌNH HỌC trong khi `GATE_STARS = 12` (src/logic/progression.ts) là
 * SAO mở chương, còn `dotEdge = 2` không liên quan `FREE_HINT_GAP = 2` (cooldown hint). Ba luật
 * KHÁC NHAU tình cờ trùng chữ số, nên chúng là DÒNG BẢNG chứ không phải hằng số trần: không ai
 * đọc nhầm là một luật, hai file không còn khai hai `const TÊN = cùng giá trị`, và đổi đệm chỉ
 * việc sửa một ô ở đây.
 */
export const PADS = { safe: 12, dotEdge: 2 } as const;

/** Một cửa đọc đệm an toàn (giữ nguyên tên mà component + test đang import từ layout.ts). */
export const SAFE_PAD: number = PADS.safe;

/** Sàn tuyệt đối của cỡ chữ (px thế giới cột thiết kế) — không bao giờ có chữ vô hình. */
export const MIN_FONT_PX = 14;

/**
 * DỮ LIỆU của một ô đáp án (tỷ lệ trên ô, không phải px): cạnh badge số và khe badge→thumbnail.
 * Đệm cho CHẤM LỖ không nằm ở đây: nó là NGHIỆM CỦA PHƯƠNG TRÌNH `dotFieldSide` (bán kính do
 * holeView quyết — đặt một tỷ lệ ở đây là khai hai sự thật cho một hình).
 */
export const CARD = { badge: 0.18, slot: 0.04 } as const;

/** Nét viền của khung giấy trong ô: `floor` cho ô rất nhỏ, `ratio` cho ô thường (OptionCard tra). */
export const CARD_FRAME = { floor: 2, ratio: 0.02 } as const;

/** DỮ LIỆU của một nút: cạnh hình so với ô trong + tỷ lệ ước lượng bề rộng/cao chữ Fraunces. */
export const BUTTON = { art: 0.8, em: 0.6, line: 1.3 } as const;
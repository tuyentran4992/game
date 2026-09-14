// Pattern: Data Table (bố cục CỘT DỌC 720×1420)
// TRÁCH NHIỆM: phát ra HÌNH CHỮ NHẬT thật của từng vùng vẽ. Mọi số ở đây là SỐ THIẾT KẾ
//   trích nguyên văn mockup cột dọc (DESIGN-SPEC §4.1/§4.2, đơn vị 720×1420) — KHÔNG còn
//   "tỷ lệ theo chiều cao camera": bản cũ nhân 0,31×h trên camera ngang nên ô đáp án ra
//   334×172 (ngang) thay vì 240×264 (dọc) và HUD sao đè lên hũ Mực 126 đơn vị.
// RÀNG BUỘC: không import phaser (test node + dễ thử); một dòng = một vùng, scene không cộng
//   trừ số lẻ ở nơi gọi; camera production CỐ ĐỊNH 720×1420 (main.ts Scale.FIT) nên
//   layoutOf(720,1420) trả đúng từng px mockup, camera lệch chỉ THU ĐỀU + căn giữa cột.
// VÙNG AN TOÀN TRONG Ô (V6): `innerRect` / `cardArt` / `buttonFace` / `inkFace` ở cuối file là
//   chủ duy nhất của khoảng đệm giữa nội dung và viền — nhãn số, chấm lỗ, chữ trên nút đều lấy ô
//   từ đây, component không được tự trừ 12 (cả ba lỗi nhìn thấy trong ảnh chụp thật là do chỗ này).

export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Trần dưới của một ô chạm, tính bằng px thế giới của cột thiết kế 720×1420. */
export const TAP_MIN = 44;

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

/** Camera CHỐT của bản dựng (DESIGN-SPEC §4): một cột dọc 720×1420 + Scale.FIT. */
const DESIGN = { w: 720, h: 1420 } as const;

/** Camera CHỐT — main.ts dựng Phaser.Game ĐÚNG cỡ này (một nguồn số, không khai lại ở nơi khác). */
export const CAMERA = { width: DESIGN.w, height: DESIGN.h } as const;

/** Một ô mockup: [x, y, w, h] tính bằng ĐƠN VỊ CỦA CỘT 720×1420 (không phải px màn hình). */
type Rect = readonly [number, number, number, number];

/**
 * BẢNG SỐ §4.1/§4.2 — nguồn sự thật duy nhất. Hai nút loại trừ nhau dùng CHUNG một dòng
 * (undoAd ≡ undo) nên rect đăng cho QA luôn là ô của nút ĐANG hiện.
 */
const M = {
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
const OPTION_GRID = { x: 108, y: 700, w: 240, h: 264, gap: 24, cols: 2, count: 4 } as const;

/** Bốn ô của lưới (tính từ gốc + bước ô — thêm hàng/cột là sửa OPTION_GRID, không thêm dòng). */
const OPTION_RECTS: readonly Rect[] = Array.from({ length: OPTION_GRID.count }, (_, i) => {
  const c = i % OPTION_GRID.cols;
  const r = Math.floor(i / OPTION_GRID.cols);
  return [
    OPTION_GRID.x + c * (OPTION_GRID.w + OPTION_GRID.gap),
    OPTION_GRID.y + r * (OPTION_GRID.h + OPTION_GRID.gap),
    OPTION_GRID.w,
    OPTION_GRID.h,
  ] as const;
});

/** Đơn vị thiết kế -> thế giới: THU ĐỀU theo `k` rồi dời về gốc cột đã căn giữa camera. */
const place = (r: Rect, k: number, dx: number): Box => ({
  x: dx + r[0] * k, y: r[1] * k, w: r[2] * k, h: r[3] * k,
});

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
 * Bố cục một màn. Cột 720×1420 được THU ĐỀU (k = tỷ lệ fit) và CĂN GIỮA camera: desktop rộng
 * thì hai dải letterbox nằm ngoài cột (nền giấy + vignette đặt ở index.html), camera khớp
 * thiết kế (720×1420 — trường hợp production) thì mọi ô trả ĐÚNG TỪNG PX mockup.
 */
export function layoutOf(w: number, h: number): Layout {
  const s = h / DESIGN.h;
  const k = Math.min(w / DESIGN.w, s);
  const dx = (w - DESIGN.w * k) / 2;
  const at = (r: Rect): Box => place(r, k, dx);
  const column: Box = { x: dx, y: 0, w: DESIGN.w * k, h: DESIGN.h * k };
  return {
    w,
    h,
    s,
    cx: w / 2,
    field: column,
    portrait: column,
    level: at(M.level),
    stars: at(M.stars),
    ink: at(M.ink),
    sound: at(M.sound),
    menu: at(M.menu),
    sheet: at(M.sheet),
    banner: at(M.banner),
    options: OPTION_RECTS.map((r) => at(r)),
    hint: at(M.hint),
    undo: at(M.undo),
    undoAd: at(M.undo),
    retry: at(M.retry),
    unfold: at(M.unfold),
    play: at(M.play),
    shop: at(M.shop),
    titleSheet: at(M.titleSheet),
    titleWord: at(M.titleWord),
    progress: at(M.progress),
  };
}

/**
 * Dải của nếp gấp thứ `fold` trên tờ giấy cạnh `sheet.h` (mỗi nếp gấp đôi => dải dày
 * 1/2^(fold+1)). Scene chỉ gọi một dòng — phép chia lớp ở ĐÂY, không nằm trong PlayScene.
 */
export function creaseBand(sheet: Box, fold: number): Box {
  const band = sheet.h / 2 ** (fold + 1);
  return { x: sheet.x, y: sheet.y + band * (2 * fold + 1) * 0.5, w: sheet.w, h: band };
}

/**
 * Vùng vẽ LỖ bên trong một ô đáp án — xem `cardArt` (ô chứa TÂM các chấm, không phải mép chấm).
 * Giữ tên cho oracle của view-b3a-holes (đo 120 màn trên cạnh ô thật).
 */
export function holeField(box: Box): Box {
  return cardArt(box).holes;
}

// ---------------------------------------------------------------------------
// VÙNG AN TOÀN BÊN TRONG MỘT Ô (V6.1/V6.2/V6.3 — ảnh chụp thật bản cũ: nhãn 1-2-3-4 TRÔI RA
// NGOÀI card vì container đặt tại gốc trái-trên của ô trong khi Rectangle vẽ theo tâm; chấm lỗ
// nằm đúng TRÊN VIỀN; chữ "Hint" nằm DƯỚI hộp nút). Ba ô nội dung do layout PHÁT RA, component
// chỉ vẽ đúng ô — không ai được tự tay trừ 12 ở nơi gọi (một nguồn số duy nhất).
// ---------------------------------------------------------------------------

/** Pad tối thiểu giữa NỘI DUNG và VIỀN của một ô — đơn vị thiết kế nên tự scale theo camera. */
export const SAFE_PAD = 12;

/** Thu ô vào trong `pad` mọi phía. Ô hẹp hơn 2*pad ⇒ cạnh về 0, không bao giờ số âm. */
export function innerRect(box: Box, pad: number): Box {
  return {
    x: box.x + pad,
    y: box.y + pad,
    w: Math.max(0, box.w - pad * 2),
    h: Math.max(0, box.h - pad * 2),
  };
}

/**
 * DỮ LIỆU của một ô đáp án (tỷ lệ trên ô, không phải px): cạnh badge số, khe badge→thumbnail,
 * và margin bán kính lỗ. `hole` PHẢI ≥ bán kính lỗ lớn nhất mà `holeView.RADIUS_RULE.card` cho
 * phép (0,055) — test layout soi đúng bất đẳng thức đó, không phải lời hứa trong comment.
 */
const CARD = { badge: 0.18, slot: 0.04, hole: 0.06 } as const;

/** Ba ô của một card: nhãn số ở GÓC TRONG, thumbnail giấy, và ô chứa TÂM lỗ. */
export type CardArt = { readonly badge: Box; readonly paper: Box; readonly holes: Box };

export function cardArt(box: Box): CardArt {
  const inner = innerRect(box, SAFE_PAD);
  const badgeSide = Math.min(inner.w, inner.h) * CARD.badge;
  const slot = inner.h * CARD.slot;
  const stage: Box = {
    x: inner.x,
    y: inner.y + badgeSide + slot,
    w: inner.w,
    h: Math.max(0, inner.h - badgeSide - slot),
  };
  const square = (shrink: number): Box => {
    const side = Math.min(stage.w, stage.h) * shrink;
    return { x: stage.x + (stage.w - side) / 2, y: stage.y + (stage.h - side) / 2, w: side, h: side };
  };
  return {
    badge: { x: inner.x, y: inner.y, w: badgeSide, h: badgeSide },
    paper: square(1),
    // Ô tâm lỗ hẹp hơn thumbnail đúng `hole` mỗi bên ⇒ chấm sát mép vẫn còn nguyên trong card.
    holes: square(1 / (1 + CARD.hole * 2)),
  };
}

// --- chữ trong ô: một nguồn ước lượng duy nhất --------------------------------

/** DỮ LIỆU của một nút: cạnh hình so với ô trong + tỷ lệ ước lượng bề rộng/cao chữ Fraunces. */
const BUTTON = { art: 0.8, em: 0.6, line: 1.3 } as const;

/**
 * Sàn tuyệt đối của cỡ chữ (px thế giới cột thiết kế): `fitFontSize` không xuống dưới số này
 * để không bao giờ có chữ vô hình. Không phải "cỡ mong muốn" — cỡ mong muốn là `base` của
 * paperTheme.TYPE_SIZES, và chỉ bị thu khi ô thật sự chật.
 */
export const MIN_FONT_PX = 14;

/** Bề rộng / bề cao MỘT DÒNG chữ `chars` ký tự ở cỡ `px` — test đo lại đúng ô chữ sẽ dựng. */
export const textWidthPx = (px: number, chars: number): number => px * BUTTON.em * Math.max(0, chars);
export const textHeightPx = (px: number): number => px * BUTTON.line;

/**
 * Cỡ chữ để `text` nằm gọn trong `box`: không to hơn `base`, không nhỏ hơn sàn đọc được.
 * Ước lượng theo bảng tỷ lệ chứ KHÔNG đo font lúc vẽ ⇒ thuần số, chạy được trong node.
 */
export function fitFontSize(base: number, text: string, box: Box): number {
  const byWidth = textWidthPx(base, text.length) === 0 ? base : (box.w * base) / textWidthPx(base, text.length);
  return Math.max(MIN_FONT_PX, Math.min(base, (box.h * base) / textHeightPx(base), byWidth));
}

/** Hình + nhãn của một nút: `showArt` = false là HY SINH icon để chữ nằm trong nút (V6.3). */
export type ButtonFace = {
  readonly art: Box;
  readonly label: Box;
  readonly showArt: boolean;
};

/**
 * Ô của hình (glyph) và của nhãn bên trong một nút.
 *  · chỉ có hình (icon HUD) hoặc chỉ có chữ  => ô đó lấy nguyên vùng trong;
 *  · có cả hai => chia đôi, nhưng nếu chữ KHÔNG nằm gọn bên hình thì BỎ HÌNH, chữ lấy nguyên ô —
 *    thà mất một icon còn hơn để chữ tràn ra ngoài nút (ca thật: 'Continue — Level 120' trong
 *    nút PLAY 240×88 của §4.2). PC-O-02 chỉ buộc chiều ngược lại (nút CHỈ hình vẫn hiểu được).
 * Mọi ô trả về đều nằm trong `innerRect(box, SAFE_PAD)`.
 */
export function buttonFace(box: Box, px: number, text: string, hasArt: boolean): ButtonFace {
  const inner = innerRect(box, SAFE_PAD);
  if (!hasArt) return { art: inner, label: inner, showArt: false };
  if (text.length === 0) return { art: inner, label: inner, showArt: true };
  const side = Math.min(inner.w, inner.h) * BUTTON.art;
  const art: Box = { x: inner.x, y: inner.y + (inner.h - side) / 2, w: side, h: side };
  const label: Box = { x: art.x + side, y: inner.y, w: Math.max(0, inner.w - side), h: inner.h };
  if (textWidthPx(px, text.length) > label.w) return { art: inner, label: inner, showArt: false };
  return { art, label, showArt: true };
}

/** Ô giọt mực + ô chữ số Mực bên trong hộp `ink` (V6.5: con số phải nằm TRONG hộp). */
export function inkFace(box: Box): { readonly drop: Box; readonly digits: Box } {
  const inner = innerRect(box, SAFE_PAD);
  const dropSide = Math.min(inner.h, inner.w * 0.34);
  const drop: Box = { x: inner.x, y: inner.y + (inner.h - dropSide) / 2, w: dropSide, h: dropSide };
  const x = drop.x + dropSide;
  return { drop, digits: { x, y: inner.y, w: Math.max(0, inner.x + inner.w - x), h: inner.h } };
}

/**
 * Bù lệch cho đòn lún DS:95: container lớn nhất của một ô có GỐC ở góc trái-trên nên thu
 * `scale` là ô chạy về góc đó. Trả về khoảng phải DỜI ô để nó co QUANH TÂM — một hàm duy nhất
 * cho mọi component nhấn-lún (nút và card), không ai tự nhân (1 - 0,96)/2 ở nơi gọi.
 */
export function pressShift(box: Box, scale: number): { readonly x: number; readonly y: number } {
  return { x: (box.w * (1 - scale)) / 2, y: (box.h * (1 - scale)) / 2 };
}

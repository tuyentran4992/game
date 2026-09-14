// Pattern: Data Table (hình học các màn tiến trình)
// TRÁCH NHIỆM: đổi Layout của B3a (camera Fit + cột 720 = `l.field`) thành CÁC Ô HÌNH CHỮ NHẬT
//   thật cho lưới màn, tab chương, card spa, ô album, huy hiệu, bảng điểm.Scene chỉ việc lấy ô
//   rồi vẽ — không cộng trừ kích thước trong vòng lặp (R-04: resize là TÍNH LẠI ô, không sinh
//   lại model).
// RÀNG BUỘC: không import phaser (thử được bằng số học thuần), mọi số đo pack §4 là PX Ở
//   CHIỀU CAO THIẾT KẾ 1080 và được nhân `s = h/1080` đúng một chỗ; cột nội dung bị kẹp bởi
//   bề ngang camera nên 9:16 lẫn 32:9 đều nằm trong màn hình (trừ vệt an toàn 16px).
// THÊM MỘT MÀN = THÊM MỘT DÒNG `D`, không sửa các hàm bên dưới.

import { LEVELS_PER_CHAPTER } from '../../logic/progression';
import type { Box, Layout } from '../layout';
import { TAP_MIN } from '../layout';

/** Một cặp cạnh thiết kế (px ở chiều cao 1080). */
type Size = { readonly w: number; readonly h: number };

/** Bảng số đo pack §4 — mọi ô khác nhau ở đây, không nằm trong scene. */
const D = {
  designH: 1080,
  safe: 16,
  /** Lưới 15 màn của một chương: 3 cột × 5 hàng, ô 168×168. */
  cell: { w: 168, h: 168 },
  cellGap: 12,
  cellCols: 3,
  /** Dải tab chương: pill 200×72, cuộn ngang. */
  tab: { w: 200, h: 72 },
  tabGap: 16,
  /** Spa: 2 cột × 4 hàng, card 260×300. */
  card: { w: 260, h: 300 },
  cardGap: 24,
  /** Album: 4 cột, ô 200×200. */
  tile: { w: 200, h: 200 },
  tileGap: 18,
  /** Hàng huy hiệu tròn ⌀96. */
  badge: 96,
  badgeGap: 24,
  /** Bảng điểm (ScoreScene + EndScene dùng chung một panel). */
  panel: { w: 480, h: 560 },
  /** Header nhãn + hàng nút dưới. */
  head: 120,
  bar: 88,
  barGap: 16,
  bandGap: 20,
} as const;

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

/** Đơn vị scale thiết kế -> thế giới hiện tại (một cửa duy nhất cho mọi phép nhân). */
export const scaleOf = (l: Layout): number => l.h / D.designH;

/** Cột nội dung: đúng cột 720 của B3a, nhưng không bao giờ rộng hơn camera. */
export function columnOf(l: Layout): Box {
  const s = scaleOf(l);
  const w = Math.min(l.field.w, l.w - 2 * D.safe * s);
  return box(l.cx - w / 2, D.safe * s, w, l.h - 2 * D.safe * s);
}

/** Bốn dải dọc của một màn tiến trình: đầu, tab, lưới, hàng nút. */
export type Frame = { readonly head: Box; readonly tabs: Box; readonly grid: Box; readonly bar: Box };

export function frameOf(l: Layout): Frame {
  const s = scaleOf(l);
  const col = columnOf(l);
  const gap = D.bandGap * s;
  const headH = D.head * s;
  const tabH = D.tab.h * s;
  const barH = D.bar * s;
  const top = col.y + headH + gap;
  const gridY = top + tabH + gap;
  const barY = col.y + col.h - barH;
  return {
    head: box(col.x, col.y, col.w, headH),
    tabs: box(col.x, top, col.w, tabH),
    grid: box(col.x, gridY, col.w, barY - gap - gridY),
    bar: box(col.x, barY, col.w, barH),
  };
}

/**
 * Lưới đều `cols × rows` nằm trọn trong `area`: ô lấy tối đa bằng số đo pack, nếu không đủ
 * chỗ thì THU NHỎ ĐỀU (giữ tỷ lệ) chứ không tràn — ô nào cũng còn là vùng bấm hợp lệ
 * (không xuống dưới trần chạm TAP_MIN của layout B3a, một nguồn duy nhất).
 */
export function gridBoxes(area: Box, cols: number, rows: number, max: Size, gap: number): Box[] {
  const fit = Math.min(
    (area.w - gap * (cols - 1)) / cols,
    ((area.h - gap * (rows - 1)) / rows) * (max.w / max.h),
    max.w,
  );
  const cw = Math.max(TAP_MIN, fit);
  const ch = cw * (max.h / max.w);
  const totalW = cw * cols + gap * (cols - 1);
  const totalH = ch * rows + gap * (rows - 1);
  const x0 = area.x + (area.w - totalW) / 2;
  const y0 = area.y + (area.h - totalH) / 2;
  const out: Box[] = [];
  for (let i = 0; i < cols * rows; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push(box(x0 + c * (cw + gap), y0 + r * (ch + gap), cw, ch));
  }
  return out;
}

/** Lưới của từng màn trên MapScene: 3 cột × 5 hàng = đúng 15 ô một chương (logic đếm hàng). */
export const cellGrid = (l: Layout): Box[] => {
  const s = scaleOf(l);
  const rows = Math.ceil(LEVELS_PER_CHAPTER / D.cellCols);
  return gridBoxes(frameOf(l).grid, D.cellCols, rows, D.cell, D.cellGap * s);
};

/** Lưới card spa (2 cột × 4 hàng). */
export const cardGrid = (l: Layout, count: number): Box[] => {
  const s = scaleOf(l);
  const cols = 2;
  return gridBoxes(frameOf(l).grid, cols, Math.ceil(count / cols), D.card, D.cardGap * s);
};

/** Lưới ô album (4 cột). */
export const tileGrid = (l: Layout, count: number): Box[] => {
  const s = scaleOf(l);
  const cols = 4;
  return gridBoxes(frameOf(l).grid, cols, Math.ceil(count / cols), D.tile, D.tileGap * s);
};

/** Chiều rộng một pill tab ở đơn vị thế giới (đã nhân scale). */
export const tabUnit = (l: Layout): Size => {
  const s = scaleOf(l);
  return { w: D.tab.w * s, h: D.tab.h * s };
};

const tabGap = (l: Layout): number => D.tabGap * scaleOf(l);

/** Cả hàng tab dài bao nhiêu (để biết giới hạn cuộn ngang). */
export function stripSpan(l: Layout, count: number): number {
  const gap = tabGap(l);
  return count * tabUnit(l).w + Math.max(0, count - 1) * gap;
}

/** Pill thứ `index` khi hàng tab đang cuộn `scroll` px (cuộn ngang — pack §4). */
export function stripBox(l: Layout, index: number, scroll: number): Box {
  const f = frameOf(l);
  const u = tabUnit(l);
  const gap = tabGap(l);
  return box(f.tabs.x + index * (u.w + gap) - scroll, f.tabs.y, u.w, u.h);
}

/** Trần cuộn: hàng tab dài bao nhiêu thì cuộn được bấy nhiêu (không cuộn âm). */
export const scrollMax = (l: Layout, count: number): number =>
  Math.max(0, stripSpan(l, count) - frameOf(l).tabs.w);

export const clampScroll = (value: number, max: number): number =>
  Math.min(max, Math.max(0, value));

/** Ô một pill có ĐANG nằm trong vùng nhìn thấy của dải tab không — rect QA chỉ đăng khi thật. */
export function inStrip(l: Layout, b: Box): boolean {
  const f = frameOf(l);
  return b.x + b.w > f.tabs.x && b.x < f.tabs.x + f.tabs.w;
}

/** Panel bảng điểm 480×560 căn giữa cột (ScoreScene và EndScene dùng chung). */
export function panelBox(l: Layout): Box {
  const s = scaleOf(l);
  const col = columnOf(l);
  const w = Math.min(D.panel.w * s, col.w);
  const h = Math.min(D.panel.h * s, col.h);
  return box(l.cx - w / 2, col.y + (col.h - h) / 2, w, h);
}

/** Đường kính huy hiệu ⌀96 đã theo scale — BadgeIcon và test cùng đọc một nguồn. */
export const badgeRadius = (l: Layout): number => (D.badge * scaleOf(l)) / 2;

/** Hàng huy hiệu tròn xếp đều trong một dải ngang. */
export function badgeBoxes(area: Box, count: number, l: Layout): Box[] {
  const s = scaleOf(l);
  const d = D.badge * s;
  const gap = D.badgeGap * s;
  const total = count * d + Math.max(0, count - 1) * gap;
  const x0 = area.x + (area.w - total) / 2;
  const y0 = area.y + (area.h - d) / 2;
  return Array.from({ length: count }, (_, i) => box(x0 + i * (d + gap), y0, d, d));
}

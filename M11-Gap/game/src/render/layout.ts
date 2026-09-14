// Pattern: công thức hình học (bố cục CỘT DỌC 720×1420) — SỐ nằm ở layoutTable.ts
// TRÁCH NHIỆM: DỰNG Ô. `layoutOf` biến bảng mockup thành Box thế giới; `innerRect` / `cardArt`
//   / `buttonFace` / `inkFace` / `iconRow` / `rowBoxes` là LUẬT ĐỆM: phát ra CHÍNH Ô VẼ để
//   component dùng, không ai tự trừ padding ở nơi gọi (năm lỗi trong ảnh chụp thật đều do chỗ
//   này). Toàn bộ số thiết kế đã sang `layoutTable.ts` (gate G1: file này 361/350 dòng) —
//   đổi số = sửa bảng, đổi luật hình học = sửa đây.
// RÀNG BUỘC: không import phaser (test node + dễ thử); một dòng = một vùng, scene không cộng
//   trừ số lẻ ở nơi gọi; camera production CỐ ĐỊNH 720×1420 (main.ts Scale.FIT) nên
//   layoutOf(720,1420) trả đúng từng px mockup, camera lệch chỉ THU ĐỀU + căn giữa cột.

import { maxDotRadius } from './holeView';
import {
  BUTTON, CAMERA, CARD, CARD_FRAME, MIN_FONT_PX, M, OPTION_RECTS, PADS, SAFE_PAD,
  type Box, type Layout, type Rect,
} from './layoutTable';

// Bảng số + tỷ lệ component sống ở layoutTable.ts; layout.ts là MẶT TIỀN của tầng bố cục nên
// giữ nguyên bộ tên mà main.ts / ui/* / mọi component đang import (không phá hợp đồng cũ).
export {
  CAMERA, MIN_FONT_PX, RATIOS, SAFE_PAD, TAP_MIN,
  type Box, type Layout, type Rect,
} from './layoutTable';

/** Đơn vị thiết kế -> thế giới: THU ĐỀU theo `k` rồi dời về gốc cột đã căn giữa camera. */
const place = (r: Rect, k: number, dx: number): Box => ({
  x: dx + r[0] * k, y: r[1] * k, w: r[2] * k, h: r[3] * k,
});

/**
 * Bố cục một màn. Cột 720×1420 được THU ĐỀU (k = tỷ lệ fit) và CĂN GIỮA camera: desktop rộng
 * thì hai dải letterbox nằm ngoài cột (nền giấy + vignette đặt ở index.html), camera khớp
 * thiết kế (720×1420 — trường hợp production) thì mọi ô trả ĐÚNG TỪNG PX mockup.
 */
export function layoutOf(w: number, h: number): Layout {
  const s = h / CAMERA.height;
  const k = Math.min(w / CAMERA.width, s);
  const dx = (w - CAMERA.width * k) / 2;
  const at = (r: Rect): Box => place(r, k, dx);
  const column: Box = { x: dx, y: 0, w: CAMERA.width * k, h: CAMERA.height * k };
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
 * Nét viền của KHUNG GIẤY trong ô đáp án (Rectangle vẽ nét theo tâm nét nên nó ăn VÀO TRONG
 * đúng một nửa nét): layout tính đệm và OptionCard vẽ nét cùng đọc hàm này — hai chỗ từng tự
 * viết `max(2, cạnh * 0,02)` là hai sự thật của một nét.
 */
export function frameStroke(side: number): number {
  return Math.max(CARD_FRAME.floor, side * CARD_FRAME.ratio);
}

/**
 * LUẬT ĐỆM CHẤM (V3): cạnh ô tâm lỗ = cạnh khung giấy TRỪ hai lần "bán kính chấm lớn nhất +
 * khe PADS.dotEdge + nửa nét viền khung". Vì sao phải cộng cả ba (đo từ ảnh chụp thật): chấm
 * sát mép dưới của khung nên chừa đúng bán kính thì HÌNH TRÒN VẪN CHẠM viền đã vẽ.
 * Bán kính không nhân bản ở đây: hỏi `holeView.maxDotRadius` bằng cạnh KHUNG — cạnh khung ≥
 * cạnh ô tâm lỗ và bán kính đơn điệu theo cạnh, nên đó là CHẶN TRÊN tuyệt đối: đệm trả về rộng
 * hơn yêu cầu chứ không bao giờ hẹp hơn.
 */
export function dotFieldSide(paperSide: number): number {
  const bite = maxDotRadius('card', paperSide) + PADS.dotEdge + frameStroke(paperSide) / 2;
  return Math.max(0, paperSide - 2 * bite);
}

/** Ô cùng tâm, cạnh `side`, nằm trong `outer` — hình nào cũng vuông nên chỉ cần một cạnh. */
const concentric = (outer: Box, side: number): Box => ({
  x: outer.x + (outer.w - side) / 2, y: outer.y + (outer.h - side) / 2, w: side, h: side,
});

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
  const paper = concentric(stage, Math.min(stage.w, stage.h));
  return {
    badge: { x: inner.x, y: inner.y, w: badgeSide, h: badgeSide },
    paper,
    // Lùi vào trong thumbnail đúng `đệm chấm` mỗi bên ⇒ cả hình tròn còn trong VIỀN ĐÃ VẼ.
    holes: concentric(paper, dotFieldSide(paper.w)),
  };
}

// --- chữ trong ô: một nguồn ước lượng duy nhất --------------------------------

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

/**
 * Dời một ô NGANG về đúng TRỤC CỘT `cx` (Việc 2, vòng layout 2): hàng nút kết quả và hàng nút
 * công cụ có HAI khe mockup (108 + 372) nhưng hai nút loại trừ nhau nên phần lớn pha chỉ còn MỘT
 * nút đứng — để nó bám khe trái là phá trục. Hai khe cùng hiện thì không gọi hàm này (giữ nguyên
 * §4.1). Chỉ đổi `x`; `y/w/h` là của mockup.
 */
export function centerOnAxis(box: Box, cx: number): Box {
  return { x: cx - box.w / 2, y: box.y, w: box.w, h: box.h };
}

/** Một chỗ ngồi trong hàng nút: hàng nào, ô mockup, ĐANG sáng hay không. */
export type RowSlot = { readonly row: string; readonly box: Box; readonly shown: boolean };

/**
 * Luật TRỤC của MỘT hàng nút (Việc 2): đúng MỘT khe sáng ⇒ dời nó về `cx` (nút đơn độc phải
 * đứng giữa cột, không bám khe trái của §4.1); HAI khe sáng (hoặc không khe nào) ⇒ giữ nguyên
 * hai khe mockup. Trả về cùng thứ tự đầu vào để scene `retint` từng cái mà không tra lại index.
 */
export function rowBoxes(slots: readonly RowSlot[], cx: number): Box[] {
  const lit = slots.filter((s) => s.shown);
  if (lit.length !== 1) return slots.map((s) => s.box);
  return slots.map((s) => (s === lit[0] ? centerOnAxis(s.box, cx) : s.box));
}

/** Một khe nút của một hàng: id (tra ô theo ĐÚNG thứ tự bảng) + ba mục của RowSlot. */
export type SlotPlace = { readonly id: string } & RowSlot;

/**
 * Ô THẬT của mọi nút trong MỌI hàng của một màn: gom theo `row`, áp `rowBoxes` từng hàng, trả
 * về theo THỨ TỰ ĐẦU VÀO (nên bảng nút xen kẽ hàng cũng không lệch ô).
 * Vì sao luật nằm ở layout thay vì trong scene: đây là HÌNH HỌC (đâu là trục của một hàng), và
 * hàng nút thứ ba sẽ phải thêm một dòng `row` trong bảng chứ không phải một nhánh if trong scene.
 */
export function slotBoxes(slots: readonly SlotPlace[], cx: number): Box[] {
  const placed: Record<string, Box> = {};
  for (const row of new Set(slots.map((s) => s.row))) {
    const group = slots.filter((s) => s.row === row);
    rowBoxes(group, cx).forEach((b, i) => {
      const at = group[i];
      if (at) placed[at.id] = b;
    });
  }
  return slots.map((s) => placed[s.id] ?? s.box);
}

/**
 * Hàng `count` biểu tượng đều nhau BÊN TRONG vùng an toàn của ô chứa: chiếc đầu nằm áp mép
 * trong trái, chiếc cuối áp mép trong phải, chiếc giữa đúng tâm — hàng sao của HUD vì thế chung
 * một trục dọc với nhãn HUD (Việc 2), thay vì dàn hết chiều ngang ô rồi tràn ra ngoài đệm.
 * Cạnh mỗi ô con không vượt quá `size`, và không vượt quá `1/count` bề rộng an toàn.
 */
export function iconRow(box: Box, count: number, size: number): Box[] {
  const inner = innerRect(box, SAFE_PAD);
  const n = Math.max(1, Math.floor(count));
  const side = Math.max(0, Math.min(size, inner.w / n, inner.h));
  const step = n > 1 ? (inner.w - side) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => ({
    x: n > 1 ? inner.x + step * i : inner.x + (inner.w - side) / 2,
    y: inner.y + (inner.h - side) / 2,
    w: side, h: side,
  }));
}

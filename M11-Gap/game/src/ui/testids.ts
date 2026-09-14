// Pattern: Registry (QA hooks)
// TRÁCH NHIỆM: tầng render không có DOM node cho từng element ⇒ đăng ký {testid: rect thật}
//   lên window để QA (Playwright/vision) bấm đúng chỗ. Tiền lệ M10: cùng model
//   registerTestid(id,x,y,w,h) + markCanvas gắn data-testid cho canvas. Module này còn sở
//   hữu BẢNG hook của màn chơi (tên id -> cách chọn rect) để scene không ôm registry (A2) và
//   để phép đổi Box -> px CHỈ tồn tại ở một chỗ (A9).
// RÀNG BUỘC: rect tính bằng px HIỂN THỊ của canvas (đã nhân scale + offset), không phải số
//   đo tưởng tượng; mỗi lần đổi kích thước thì scene gọi lại ⇒ registry không bao giờ cũ.
// PC-15: file này không mở mạng, không đọc Cookie, chỉ ghi một object lên window.

import type { RenderPhase } from '../render/anim/unfoldPlan';
import type { Box, Layout } from '../render/layout';
import { TAP_MIN } from '../render/layout';

export type TestidRect = { x: number; y: number; w: number; h: number };

/** Bộ biến đổi thế giới -> px hiển thị: scale của canvas và vị trí canvas trong trang. */
export type ViewTransform = {
  readonly sx: number;
  readonly sy: number;
  readonly ox: number;
  readonly oy: number;
};

export const TESTIDS: Record<string, TestidRect> = {};

/** Chiều chạm tối thiểu 44px — nhỏ hơn là nắn lại ở đây để QA không bấm hụt (PC-U-05). */
export function registerTestid(id: string, x: number, y: number, w: number, h: number): void {
  const ww = Math.max(TAP_MIN, Math.round(w));
  const hh = Math.max(TAP_MIN, Math.round(h));
  TESTIDS[id] = { x: Math.round(x), y: Math.round(y), w: ww, h: hh };
}

/** Nút bị ẩn thì xoá rect — để lại vùng vô hình là "ảo giác nút" (PC-U-05). */
export function clearTestid(id: string): void {
  delete TESTIDS[id];
}

/** Bộ đổi toạ độ thế giới -> px trang. `canvas` lấy từ game, `w`/`h` là kích thước camera
 *  (Fit 1920x1080) — scene gọi lại MỖI lần layout đổi để rect QA không bao giờ cũ. */
export function viewTransform(
  canvas: { getBoundingClientRect(): { x: number; y: number; width: number; height: number } },
  w: number,
  h: number,
): ViewTransform {
  const r = canvas.getBoundingClientRect();
  return { sx: r.width / w, sy: r.height / h, ox: r.x, oy: r.y };
}

/** Chữ ký đăng ký rect mà mỗi scene tự cung cấp (một cửa: Box thế giới -> px hiển thị). */
export type Hook = (id: string, b: Box) => void;

/**
 * Dựng CỬA đăng ký rect cho một scene (A9: PlayScene và TitleScene không copy lại phép đổi
 * toạ độ). `size()` là hàm đọc camera hiện hành — resize thì rect tính lại, không bắt
 * scene phải nhân sx/sy ở hai nơi.
 */
export function makeTestidHook(
  canvas: { getBoundingClientRect(): { x: number; y: number; width: number; height: number } },
  size: () => { width: number; height: number },
): Hook {
  return (id, b) => {
    const cam = size();
    const vt = viewTransform(canvas, cam.width, cam.height);
    registerTestid(id, vt.ox + b.x * vt.sx, vt.oy + b.y * vt.sy, b.w * vt.sx, b.h * vt.sy);
  };
}

/**
 * Id QA có số thứ tự: `qaId('map-node', 7)` -> `testid-map-node-7`. Năm màn vòng tiến trình
 * có ô lặp theo dữ liệu (tab chương, ô màn, card spa, ô album, huy hiệu) nên id phải dựng từ
 * index — nhưng KHÔNG viết prefix hở ở nơi gọi: khu vực đặt tên của B3a cấm token kết thúc
 * bằng gạch, vì một prefix không số là id mà QA không bao giờ đọc thấy trong registry.
 */
export function qaId(scope: string, index: number): string {
  return ['testid', scope, index].join('-');
}

/** Gắn data-testid cho canvas và công bố registry cho devtools/QA. */
export function markCanvas(game: { canvas?: { setAttribute(name: string, value: string): void } | null }): void {
  game.canvas?.setAttribute('data-testid', 'game-canvas');
  (window as unknown as Record<string, unknown>).__pcTestids = TESTIDS;
}

/** Bốn ô đáp án của một đề — id TĨNH, đúng PC-03 (không có ô thứ năm). */
export const OPTION_IDS: readonly string[] = [
  'testid-option-0', 'testid-option-1', 'testid-option-2', 'testid-option-3',
];

/**
 * Phần màn chơi phải trả lời để bảng hook chọn được rect (scene giữ state, bảng chỉ CHỌN).
 */
export type PlayRects = {
  opened(): boolean;
  shown(phase: RenderPhase): boolean;
  packetBox(l: Layout): Box;
  holeBox(l: Layout): Box;
  breathBox(l: Layout): Box;
};

/** Một dòng QA: id + hàm trả rect thật, hoặc null khi vùng đó ĐANG không hiện (PC-U-05). */
export type HookRow = {
  readonly id: string;
  readonly rect: (s: PlayRects, l: Layout) => Box | null;
};

/** Bảng hook của PlayScene (pack §6) — thêm vùng chơi = thêm một dòng, không sửa scene. */
export const PLAY_HOOKS: readonly HookRow[] = [
  { id: 'testid-hud-level', rect: (_s, l) => l.level },
  { id: 'testid-hud-stars', rect: (_s, l) => l.stars },
  { id: 'testid-hud-ink', rect: (_s, l) => l.ink },
  { id: 'testid-sheet-folded', rect: (s, l) => (s.opened() ? null : s.packetBox(l)) },
  { id: 'testid-sheet-hole', rect: (s, l) => (s.opened() ? s.holeBox(l) : null) },
  { id: 'testid-unfold-anim', rect: (s, l) => (s.opened() ? l.sheet : null) },
  { id: 'testid-hint-breath', rect: (s, l) => s.breathBox(l) },
  { id: 'testid-feedback-wrong', rect: (s, l) => (s.shown('wrong') ? l.sheet : null) },
  ...OPTION_IDS.map((id, i): HookRow => ({ id, rect: (_s, l) => l.options[i] })),
];

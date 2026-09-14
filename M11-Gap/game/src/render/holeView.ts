// Pattern: Data Table (trần vẽ của tầng render)
// TRÁCH NHIỆM: trả lời hai câu "MỘT ô giấy phải vẽ nổi BAO NHIÊU lớp / BAO NHIÊU lỗ" bằng
//   cách DẪN XUẤT từ src/logic, không khai số học ở tầng vẽ. Review F1 (B3a) bắt đúng chỗ này:
//   MAX_HOLES từng bị hardcode 8 trong khi chương 7-8 của chiến dịch mở bung 16 lỗ ⇒
//   SheetView/OptionCard âm thầm cắt lỗ, và hai ô vốn KHÁC NHAU trong LevelSpec render ra
//   Y HỆT NHAU (đề mất đáp án ngay trên màn hình, dù logic vẫn đúng).
// VÌ SAU MỘT FILE: bậc thang số lớp và trần số lỗ là CÙNG MỘT sự thật hình học
//   ("mỗi nếp gấp đôi tờ giấy") — tách ra là khai hai trần ở hai nơi (E2/A9).
// RÀNG BUỘC: module THUẦN (không import phaser) ⇒ test chạy được trong node, và là nơi duy
//   nhất tầng vẽ được phép đọc trần của chainTable/cutRegion.

import { MAX_CHAIN_LEN, MAX_PUNCH_COUNT } from '../logic/chainTable';
import { CUT_MAX_SNIPS } from '../logic/cutRegion';

/** Số nếp của mọi chuỗi hợp lệ: 1..MAX_CHAIN_LEN (trần do CHAIN_ROWS dẫn xuất). */
const FOLD_COUNTS: readonly number[] = Array.from({ length: MAX_CHAIN_LEN }, (_, i) => i + 1);

/** Bậc thang số lớp = 2^số-nếp ⇒ [2,4,8,16] với bảng chuỗi nếp hiện hành. */
export const LAYER_LADDER: readonly number[] = FOLD_COUNTS.map((folds) => 2 ** folds);

/** Trần dưới và trần trên của số lớp mà một lịch mở bung phải phủ. */
export const MIN_LAYERS: number = LAYER_LADDER[0] ?? 0;
export const MAX_LAYERS: number = LAYER_LADDER[LAYER_LADDER.length - 1] ?? 0;

/**
 * Trần số LỖ của một ô (tờ giấy lẫn ô đáp án dùng chung): mỗi NGUỒN lỗ — một ĐIỂM ĐỤC hay
 * một NHÁT CẮT — mở ra tối đa MAX_LAYERS vị trí. Nguồn lỗ tối đa của một đề là
 * MAX_PUNCH_COUNT điểm đục cộng CUT_MAX_SNIPS nhát cắt (cả hai trần đều của logic).
 */
export const MAX_HOLES: number = (MAX_PUNCH_COUNT + CUT_MAX_SNIPS) * MAX_LAYERS;

/** Phần lỗ vượt trần: `hidden` > 0 là CÓ MẤT DỮ LIỆU VẼ — scene phải báo, không im lặng. */
export type HoleBudget = { readonly shown: number; readonly hidden: number };

export function holeBudget(count: number): HoleBudget {
  const n = Math.max(0, count);
  return { shown: Math.min(MAX_HOLES, n), hidden: Math.max(0, n - MAX_HOLES) };
}

/** Vai trò bề mặt chứa lỗ — tờ giấy cần lỗ to hơn ô đáp án thu nhỏ. */
export type PoolRole = 'sheet' | 'card';

/** Quy tắc bán kính theo vai trò (tỷ lệ trên cạnh ô) — thêm vai trò = thêm một dòng. */
const RADIUS_RULE: Readonly<Record<PoolRole, { readonly ratio: number }>> = {
  sheet: { ratio: 0.05 },
  card: { ratio: 0.055 },
};

/**
 * Độ dày của MỘT chấm (đơn vị thiết kế trên cạnh ô) — DỮ LIỆU, không phải chữ số viết trong
 * vòng lặp: `clear` là khe tối thiểu giữa HAI MÉP chấm, `min` là sàn bán kính.
 */
const DOT = { clear: 6, min: 1 } as const;

/** Điểm đã chuẩn hoá 0..1 — cùng hình dạng mà HolePool nhận, nhưng ở hệ px thì nhân `side`. */
export type HoleUnit = { readonly x: number; readonly y: number };

/** Khoảng cách GIỮA HAI TÂM ngắn nhất của một bộ điểm, quy về px của cạnh `side` (1 điểm ⇒ ∞). */
export function closestPair(units: readonly HoleUnit[], side: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const d = Math.hypot(units[i].x - units[j].x, units[i].y - units[j].y) * side;
      if (d < best) best = d;
    }
  }
  return best;
}

/**
 * Bán kính một lỗ khi `count` lỗ phải nằm gọn trong ô cạnh `side`, với `pair` = khoảng cách tâm
 * gần nhất của CHÍNH bộ điểm đang vẽ:
 *   · thưa (cả dải chiến dịch) ⇒ giữ đúng tỷ lệ DS từng vẽ, hình không đổi;
 *   · dày ⇒ co theo 1/sqrt(count) vì lỗ xếp thành lưới sqrt(count)×sqrt(count);
 *   · hai lỗ GẦN NHAU ⇒ co để giữa hai MÉP chấm còn `DOT.clear` — ảnh chụp thật Việc 3 có card
 *     bốn lỗ mà hai lỗ cách nhau 7,5 đơn vị: mật độ không phát hiện ra, phải đo từng cặp điểm.
 * Sàn `DOT.min` px để không bao giờ có lỗ vô hình.
 */
export function holeRadius(
  role: PoolRole, count: number, side: number, pair: number = Number.POSITIVE_INFINITY,
): number {
  const rule = RADIUS_RULE[role] ?? RADIUS_RULE.sheet;
  const room = (side * 0.45) / Math.sqrt(Math.max(1, count));
  const clear = (pair - DOT.clear) / 2;
  return Math.max(DOT.min, Math.min(side * rule.ratio, room, clear));
}

/**
 * Trần bán kính của ô cạnh `side`: giá trị `holeRadius` đạt được khi bộ điểm THƯA NHẤT
 * (một lỗ, không cặp nào để co). `layout.dotFieldSide` đọc đúng cửa này để chừa đệm cho ô đáp
 * án — bán kính mà khai thêm lần nữa ở tầng bố cục là hai sự thật của một hình tròn.
 */
export function maxDotRadius(role: PoolRole, side: number): number {
  return holeRadius(role, 1, side);
}

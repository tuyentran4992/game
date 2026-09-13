// Pattern: Data Contract
// TRÁCH NHIỆM: định nghĩa kiểu dữ liệu DÙNG CHUNG của lõi logic (Rat, FoldKind, LevelSpec, Option).
// RÀNG BUỘC: chỉ type/interface — 0 code chạy được, 0 import ngoài.
export type Rat = { readonly n: bigint; readonly d: bigint };

/**
 * Điểm 2D trên tờ giấy vuông cạnh 1.
 * RESOLUTION CONTRACT-AMBIGUITY-01 (tests/logic/helpers.ts): hợp đồng khung khai vị trí lỗ
 * bằng `Rat[]` — tự thân Rat[] không encode được (x, y) ⇒ quy ước ĐỘC NHẤT của module:
 * `Rat[]` là chuỗi FLAT [x0, y0, x1, y1, ...] (length luôn CHẴN, số lỗ = length/2).
 * Point là dạng đã giải mã; mọi encode/decode đi qua flatPoints()/toPoints() (rational.ts).
 */
export type Point = { readonly x: Rat; readonly y: Rat };

/**
 * RESOLUTION CONTRACT-AMBIGUITY-02 (tests/logic/helpers.ts): khung khai MỘT vị trí lỗ trong
 * `unfoldHolesWithCount(...): { at: Rat; layers: number }[]` — một Rat không chứa được (x, y).
 * RatPoint = Point ∩ Rat nên vẫn passed mọi nơi cần Rat vô hướng; chiều đọc Rat của nó
 * (n/d) là toạ độ x (quy ước ghi ở header foldRules.ts).
 */
export type RatPoint = Point & Rat;

export type FoldKind = 'H' | 'V' | 'D';

export type PunchAction = { readonly kind: 'punch'; readonly points: Rat[] };
export type CutAction = { readonly kind: 'cut'; readonly corner: 'BL' | 'BR' | 'TL' | 'TR'; readonly size: Rat };
export type SheetAction = PunchAction | CutAction;

export type Option = { readonly id: number; readonly holes: Rat[] };

export type LevelSpec = {
  readonly seed: string;
  readonly levelIndex: number;
  readonly chapter: number;
  readonly folds: FoldKind[];
  readonly action: SheetAction;
  readonly answerHoles: Rat[];
  readonly options: Option[];
  readonly correctIndex: number;
  readonly difficulty: number;
  readonly timerOn: boolean;
};

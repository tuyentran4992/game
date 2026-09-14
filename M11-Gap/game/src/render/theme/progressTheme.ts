// Pattern: Token (bảng màu vòng tiến trình)
// TRÁCH NHIỆM: MỘT nguồn duy nhất cho các màu mà palette giấy 8 chương (theme/paperTheme.ts)
//   KHÔNG có: màu "đang dùng" của card skin và nét nhấn của vòng tiến trình. Scene/component
//   B3b chỉ được phép import từ đây — khai lại hex trong scene là định nghĩa lại palette (PC-11).
// RÀNG BUỘC: module THUẦN, không import phaser (kiểu số nguyên màu do parseHex của B3a đổi);
//   hex phần thưởng lấy từ palette của manifest asset (src/render/generated/assetList.ts) —
//   khai lại một màu của asset là định nghĩa hai sự thật (PC-11).

import { MANIFEST_PALETTE } from '../generated/assetList';

/** Viền "đang dùng" (DS:108) — token SSOT, đúng MỘT lần trên toàn tầng render. */
export const PRIMARY = MANIFEST_PALETTE.primary;

/**
 * Vàng phần thưởng (pack B4: particle khi nhận sao) — lấy NGUYÊN VĂN từ palette của
 * ../assets/manifest.json (qua assetList đã sinh) ⇒ không có hex thứ hai cho cùng một màu.
 */
export const ACCENT = MANIFEST_PALETTE.accent;


// Pattern: helper (view thuần — không import phaser)
// TRÁCH NHIỆM: MỘT cửa duy nhất cho việc "chữ phải nằm TRONG ô mà layout đã phát ra" (V6.3 —
//   ảnh chụp thật: nhãn "Hint" rơi xuống DƯỚI hộp nút). Cỡ chữ gốc do paperTheme.TYPE_SIZES sở
//   hữu, ô do layout.buttonFace/cardArt/inkFace phát ra; file này chỉ NỐI hai nguồn.
// RÀNG BUỘC: không đo font bằng canvas (phải thuần + chạy được trong node); tỷ lệ em/char nằm ở
//   layout nên mọi component dùng chung MỘT phép ước lượng — không có hệ số thứ hai trong repo.

import { fitFontSize, type Box } from '../layout';
import { textStyle, type TextStyle } from '../theme/paperTheme';

/** Vai kiểu chữ — lấy thẳng từ chữ ký `textStyle` để repo không có TypeRole thứ hai. */
type TypeRole = Parameters<typeof textStyle>[0];

/** Cỡ chữ gốc (px) của một kiểu: đọc từ chính bảng kiểu chữ, không copy 30/38/44 sang file khác. */
export const basePx = (role: TypeRole): number => Number.parseInt(textStyle(role, '#000').fontSize, 10);

/** TextStyle của `role` nhưng đã THU cỡ cho `text` nằm gọn trong `box` (giữ nguyên token màu). */
export function fittedStyle(role: TypeRole, color: string, text: string, box: Box): TextStyle {
  return { ...textStyle(role, color), fontSize: `${fitFontSize(basePx(role), text, box)}px` };
}

/** Tâm một ô — nơi duy nhất component đặt chữ đã canh giữa (origin 0,5). */
export const centerOf = (box: Box): { readonly x: number; readonly y: number } => ({
  x: box.x + box.w / 2,
  y: box.y + box.h / 2,
});
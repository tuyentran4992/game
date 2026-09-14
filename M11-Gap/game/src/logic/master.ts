// Pattern: Registry (vòng Master — PC-18)
// TRÁCH NHIỆM: trả LỜI PHÁN QUYẾT của vòng chơi lại Master: khi nào được mở, màn mở đầu là
//   màn nào, tấm lòng sao riêng của nó dài bao nhiêu. View (EndScene) chỉ dispatch theo cờ này,
//   không được tự so sánh tổng sao với số màn (E2E PC-G-02: master là ẩn hint/timer, chơi lại
//   trọn chiến dịch — cờ do logic đưa xuống).
// RÀNG BUỘC: hàm THUẦN, 0 state module, 0 đồng hồ, 0 ngẫu nhiên (luật phiên B1); mọi độ dài và
//   dải màn DẪN XUẤT từ progression (STAR_SCALE/CAMPAIGN_LEVELS) ⇒ không có hằng thứ hai.

import { CAMPAIGN_LEVELS, LAST_LEVEL, STAR_SCALE, bestLevel } from './progression';

/** Bảng sao trắng của vòng master (DM:103) — độ dài lấy từ STAR_SCALE, không khai lại ở UI. */
export function blankMasterStars(): string {
  return STAR_SCALE.blank.repeat(STAR_SCALE.slots);
}

/** PC-18: master chỉ mở khi TRỌN số màn chiến dịch đã được chạm tới (bestLevel của logic). */
export function masterReady(stars: string): boolean {
  return bestLevel(stars) >= CAMPAIGN_LEVELS;
}

/** Màn mở đầu vòng master theo bảng sao master: chơi lại từ đầu, giữ đúng tiến trình master. */
export function masterLevel(masterStars: string): number {
  return Math.min(LAST_LEVEL, bestLevel(masterStars) + 1);
}

/**
 * Cửa vào vòng master cho tầng render (PC-G-02): chưa chạm trọn chiến dịch ⇒ null để scene
 * TẮT nút, đủ điều kiện ⇒ màn mở đầu của vòng master. Vì sao nằm ở logic: scene phải gọi MỘT
 * hàm phán quyết, không được đem `totalStars` so với số màn ở nơi bấm nút.
 */
export function enterMaster(stars: string): number | null {
  return masterReady(stars) ? masterLevel(blankMasterStars()) : null;
}

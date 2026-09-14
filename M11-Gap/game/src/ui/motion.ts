// Pattern: Probe surface (cửa ĐO HOẠT CẢNH cho QA)
// TRÁCH NHIỆM: một object duy nhất mô tả "giây này tờ giấy đang ở đâu của hoạt cảnh" để QA
//   (Playwright/vision) phân biệt ĐƯỢC CHUYỂN ĐỘNG với nhảy tức thì:
//     { phase, foldProgress, layerScales: number[], holeCount }
//   · foldProgress 0->1 khi giấy GẬP vào, 1->0 khi MỞ bung (0 = tờ phẳng, 1 = gói giấy kín);
//   · layerScales = tiến trình mở 0..1 của TỪNG lớp giấy (mảng dài đúng số lớp của đề);
//   · holeCount = số lỗ ĐANG hiện (scale > 0) — tăng dần theo nhịp stagger của `holePlan`.
// AI GHI: SheetView (hình) + PlayScene (pha). AI ĐỌC: QA qua `__pcMotion` — xem
//   src/platform/debug.ts::publishMotionProbe (mặt đó chỉ SỐNG ở kênh dev/standalone).
// RÀNG BUỘC: module THUẦN data, không window/document (tiền lệ ui/testids.ts: tầng render chỉ
//   ghi vào object này; việc công bố ra global là của cửa debug bị strip ở kênh nộp), không
//   đồng hồ, không phán quyết nghiệp vụ. Object KHÔNG bao giờ bị thay thế — holder giữ nguyên
//   tham chiếu nên mỗi lần ghi là QA thấy giá trị mới ngay.

/** Khoá pha hoạt cảnh — DỮ LIỆU, scene không viết chuỗi trần (PC-19 cho zone hiển thị). */
export const MOTION_PHASE = {
  boot: 'boot',
  folding: 'folding',
  folded: 'folded',
  unfolding: 'unfolding',
  holes: 'holes',
  explaining: 'explaining',
  result: 'result',
} as const;

export type MotionPhase = (typeof MOTION_PHASE)[keyof typeof MOTION_PHASE];

export type MotionProbe = {
  phase: MotionPhase;
  foldProgress: number;
  layerScales: number[];
  holeCount: number;
};

/** Bản đang sống — `__pcMotion` trỏ thẳng vào đây, không bao giờ gán lại object khác. */
export const MOTION: MotionProbe = {
  phase: MOTION_PHASE.boot,
  foldProgress: 0,
  layerScales: [],
  holeCount: 0,
};

export function setMotionPhase(phase: MotionPhase): void {
  MOTION.phase = phase;
}

/** Ghi tiến trình gấp + từng lớp (ghi TẠI CHỖ để một khung hình không đẻ một mảng mới). */
export function setMotionFold(foldProgress: number, layerScales: readonly number[]): void {
  MOTION.foldProgress = foldProgress;
  const live = MOTION.layerScales;
  for (let i = 0; i < layerScales.length; i += 1) live[i] = layerScales[i] ?? 0;
  live.length = layerScales.length;
}

export function setMotionHoles(holeCount: number): void {
  MOTION.holeCount = holeCount;
}
// M3 Juicy Merge — Daily Challenge Logic (logic THUẦN, testable)
// SPEC: Deterministic daily seed từ ngày YYYY-MM-DD, giới hạn 50 quả, mục tiêu 1.500 điểm.

export const DAILY_FRUIT_LIMIT = 50;
export const DAILY_TARGET_SCORE = 400;

export interface DailyChallengeState {
  isDailyMode: boolean;
  dateString: string;
  fruitsRemaining: number;
  targetScore: number;
  isVictory: boolean;
}

/**
 * Trả về chuỗi ngày hôm nay theo định dạng YYYY-MM-DD theo giờ địa phương.
 */
export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tạo seed số nguyên 32-bit từ chuỗi ngày YYYY-MM-DD.
 * Đảm bảo cùng một ngày luôn sinh ra seed hoàn toàn giống nhau.
 */
export function getDailySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash >>> 0;
  }
  return hash || 20260823;
}

/**
 * Kiểm tra xem người chơi đã hoàn thành Daily Challenge trong ngày hôm nay chưa.
 */
export function isDailyCompletedToday(
  lastCompletedDate: string | null | undefined,
  todayStr = getTodayDateString(),
): boolean {
  if (!lastCompletedDate) return false;
  return lastCompletedDate === todayStr;
}

/**
 * Khởi tạo trạng thái cho lượt chơi Daily Challenge.
 */
export function createDailyChallengeState(dateStr = getTodayDateString()): DailyChallengeState {
  return {
    isDailyMode: true,
    dateString: dateStr,
    fruitsRemaining: DAILY_FRUIT_LIMIT,
    targetScore: DAILY_TARGET_SCORE,
    isVictory: false,
  };
}

/**
 * Kiểm tra điều kiện hoàn thành mục tiêu chiến thắng Daily Challenge.
 */
export function evaluateDailyVictory(
  currentScore: number,
  targetScore = DAILY_TARGET_SCORE,
): boolean {
  return currentScore >= targetScore;
}

// M3 Juicy Merge — Daily Challenge Logic (logic THUẦN, testable)
// SPEC: Deterministic daily seed từ ngày YYYY-MM-DD, độ khó leo thang từ ngày 1 đến ngày 12+,
// mở khóa 3 quả Thần Thoại tại các mốc 3 ngày (Thanh Long 🐉), 6 ngày (Sầu Riêng 👑), 12 ngày (Dưa Hấu Thiên Hà 🌌).

export const DAILY_FRUIT_LIMIT = 50;
export const DAILY_TARGET_SCORE = 350;

export interface DailyDifficulty {
  dayLevel: number;
  fruitLimit: number;
  targetScore: number;
  unlockedLegendaryTier?: number;
  rewardName?: string;
}

export interface MilestoneReward {
  tier: number;
  name: string;
  emoji: string;
  milestoneDay: number;
}

export const DAILY_MILESTONES: readonly MilestoneReward[] = [
  { tier: 12, name: 'Dragon Fruit', emoji: '🐉', milestoneDay: 3 },
  { tier: 13, name: 'Royal Durian', emoji: '👑', milestoneDay: 6 },
  { tier: 14, name: 'Galaxy Watermelon', emoji: '🌌', milestoneDay: 12 },
];

/**
 * Calculate difficulty for the Daily Challenge run based on completed days count (Streak).
 */
export function getDailyDifficulty(completedDaysCount = 0): DailyDifficulty {
  const dayLevel = Math.max(1, completedDaysCount + 1);

  if (dayLevel === 1) return { dayLevel: 1, fruitLimit: 50, targetScore: 350 };
  if (dayLevel === 2) return { dayLevel: 2, fruitLimit: 50, targetScore: 380 };
  if (dayLevel === 3) return { dayLevel: 3, fruitLimit: 50, targetScore: 400, unlockedLegendaryTier: 12, rewardName: 'Dragon Fruit 🐉' };
  if (dayLevel === 4) return { dayLevel: 4, fruitLimit: 48, targetScore: 450 };
  if (dayLevel === 5) return { dayLevel: 5, fruitLimit: 48, targetScore: 480 };
  if (dayLevel === 6) return { dayLevel: 6, fruitLimit: 46, targetScore: 500, unlockedLegendaryTier: 13, rewardName: 'Royal Durian 👑' };
  if (dayLevel === 7) return { dayLevel: 7, fruitLimit: 45, targetScore: 550 };
  if (dayLevel === 8) return { dayLevel: 8, fruitLimit: 45, targetScore: 580 };
  if (dayLevel === 9) return { dayLevel: 9, fruitLimit: 45, targetScore: 600 };
  if (dayLevel === 10) return { dayLevel: 10, fruitLimit: 44, targetScore: 620 };
  if (dayLevel === 11) return { dayLevel: 11, fruitLimit: 44, targetScore: 650 };
  // Day 12+ (Cosmic Boss Day)
  return { dayLevel, fruitLimit: 42, targetScore: 700, unlockedLegendaryTier: 14, rewardName: 'Galaxy Watermelon 🌌' };
}

export interface DailyChallengeState {
  isDailyMode: boolean;
  dateString: string;
  dayLevel: number;
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
 * Khởi tạo trạng thái cho lượt chơi Daily Challenge với độ khó tương ứng số ngày đã thắng.
 */
export function createDailyChallengeState(
  dateStr = getTodayDateString(),
  completedDaysCount = 0,
): DailyChallengeState {
  const diff = getDailyDifficulty(completedDaysCount);
  return {
    isDailyMode: true,
    dateString: dateStr,
    dayLevel: diff.dayLevel,
    fruitsRemaining: diff.fruitLimit,
    targetScore: diff.targetScore,
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

/**
 * Kiểm tra các quả Thần Thoại cần được mở khóa dựa trên tổng số ngày thắng thử thách.
 */
export function getUnlockedMilestoneTiers(completedDaysCount: number): number[] {
  const tiers: number[] = [];
  for (const m of DAILY_MILESTONES) {
    if (completedDaysCount >= m.milestoneDay) {
      tiers.push(m.tier);
    }
  }
  return tiers;
}

/**
 * Kiểm tra xem khi hoàn thành mốc số ngày newCount có mở khóa quả mới không.
 */
export function checkMilestoneJustUnlocked(newCompletedDays: number): MilestoneReward | null {
  return DAILY_MILESTONES.find((m) => m.milestoneDay === newCompletedDays) ?? null;
}

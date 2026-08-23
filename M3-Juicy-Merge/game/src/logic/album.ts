// M3 Juicy Merge — Fruit Encyclopedia & Sticker Album (logic THUẦN, testable)
// SPEC: Quản lý 12 bậc quả, theo dõi tiến trình mở khóa, danh hiệu và phần thưởng khám phá.

export interface FruitInfo {
  tier: number;
  name: string;
  emoji: string;
  scoreGain: number;
  description: string;
}

export const FRUIT_ENCYCLOPEDIA: readonly FruitInfo[] = [
  { tier: 0, name: 'Cherry', emoji: '🍒', scoreGain: 1, description: 'Bé hạt tiêu nhưng cực kỳ mọng nước!' },
  { tier: 1, name: 'Strawberry', emoji: '🍓', scoreGain: 3, description: 'Thơm ngọt ngào, điểm bắt đầu của mọi combo.' },
  { tier: 2, name: 'Grape', emoji: '🍇', scoreGain: 6, description: 'Chùm nho tím lịm, lăn tròn lấp đầy khe hở.' },
  { tier: 3, name: 'Dekopon', emoji: '🍊', scoreGain: 10, description: 'Quả quýt có chỏm đầu đáng yêu siêu mọng nước.' },
  { tier: 4, name: 'Orange', emoji: '🍊', scoreGain: 15, description: 'Cam vàng rực rỡ, giàu vitamin giải tỏa căng thẳng.' },
  { tier: 5, name: 'Apple', emoji: '🍎', scoreGain: 21, description: 'Táo đỏ giòn tan, vững chãi làm bệ đỡ cho cả thùng.' },
  { tier: 6, name: 'Pear', emoji: '🍐', scoreGain: 28, description: 'Lê vàng thanh mát, hình dáng quả chuông độc đáo.' },
  { tier: 7, name: 'Peach', emoji: '🍑', scoreGain: 36, description: 'Đào hồng mềm mịn bồng bềnh như mây.' },
  { tier: 8, name: 'Pineapple', emoji: '🍍', scoreGain: 45, description: 'Dứa vua nhiệt đới, chạm vào đâu bừng sáng tới đó.' },
  { tier: 9, name: 'Melon', emoji: '🍈', scoreGain: 55, description: 'Dưa lưới thơm lừng, bước đệm vĩ đại tới dưa hấu!' },
  { tier: 10, name: 'Watermelon', emoji: '🍉', scoreGain: 66, description: 'SIÊU DƯA HẤU KHỔNG LỒ! Đỉnh cao của mọi người chơi!' },
  { tier: 11, name: 'Double Watermelon', emoji: '👑', scoreGain: 100, description: 'HUYỀN THOẠI BẤT TỬ! Bậc thầy nông dân tối thượng!' },
];

export interface AlbumProgress {
  unlockedCount: number;
  totalCount: number;
  percentage: number;
  title: string;
  isComplete: boolean;
}

/**
 * Kiểm tra xem quả vừa ghép có phải là loại quả hoàn toàn mới chưa từng mở khóa hay không.
 * Trả về true nếu là quả mới và tự động thêm vào danh sách unlockedTiers.
 */
export function checkNewFruitUnlocked(
  tier: number,
  unlockedTiers: Set<number>,
): { isNewDiscovery: boolean; fruitInfo: FruitInfo } {
  const fruitInfo = FRUIT_ENCYCLOPEDIA[tier] ?? FRUIT_ENCYCLOPEDIA[0];
  if (!unlockedTiers.has(tier)) {
    unlockedTiers.add(tier);
    return { isNewDiscovery: true, fruitInfo };
  }
  return { isNewDiscovery: false, fruitInfo };
}

/**
 * Tính toán tiến trình hoàn thành album và cấp danh hiệu tương ứng.
 */
export function getAlbumProgress(unlockedTiers: Set<number> | readonly number[]): AlbumProgress {
  const count = unlockedTiers instanceof Set ? unlockedTiers.size : new Set(unlockedTiers).size;
  const totalCount = FRUIT_ENCYCLOPEDIA.length;
  const percentage = Math.round((count / totalCount) * 100);

  let title = 'Tập Sự Vườn Cây 🌱';
  if (count >= 12) title = 'Bậc Thầy Nông Dân 👑';
  else if (count >= 9) title = 'Chuyên Gia Trái Cây 🍍';
  else if (count >= 6) title = 'Nông Dân Chăm Chỉ 🍎';
  else if (count >= 3) title = 'Người Làm Vườn Mới 🍓';

  return {
    unlockedCount: count,
    totalCount,
    percentage,
    title,
    isComplete: count >= totalCount,
  };
}

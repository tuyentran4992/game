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
  {
    tier: 0,
    name: "Cherry",
    emoji: "🍒",
    scoreGain: 1,
    description: "Tiny but incredibly juicy!",
  },
  {
    tier: 1,
    name: "Strawberry",
    emoji: "🍓",
    scoreGain: 3,
    description: "Sweet and fragrant, starting point of combos.",
  },
  {
    tier: 2,
    name: "Grape",
    emoji: "🍇",
    scoreGain: 6,
    description: "Deep purple grape cluster filling every gap.",
  },
  {
    tier: 3,
    name: "Dekopon",
    emoji: "🍊",
    scoreGain: 10,
    description: "Sweet plump mandarin with a cute top.",
  },
  {
    tier: 4,
    name: "Pomegranate",
    emoji: "🔴",
    scoreGain: 15,
    description: "Rich ruby pomegranate packed with juicy seeds.",
  },
  {
    tier: 5,
    name: "Orange",
    emoji: "🍊",
    scoreGain: 21,
    description: "Bright sunny orange packed with fresh citrus sweetness.",
  },
  {
    tier: 6,
    name: "Apple",
    emoji: "🍎",
    scoreGain: 28,
    description: "Crisp red apple, solid base for the bucket.",
  },
  {
    tier: 7,
    name: "Pear",
    emoji: "🍐",
    scoreGain: 36,
    description: "Refreshing golden pear with a unique bell shape.",
  },
  {
    tier: 8,
    name: "Peach",
    emoji: "🍑",
    scoreGain: 45,
    description: "Soft pink peach, gentle and fragrant.",
  },
  {
    tier: 9,
    name: "Pineapple",
    emoji: "🍍",
    scoreGain: 55,
    description: "Tropical king with radiant golden diamonds.",
  },
  {
    tier: 10,
    name: "Melon",
    emoji: "🍈",
    scoreGain: 66,
    description: "Aromatic honeydew melon, gateway to watermelon!",
  },
  {
    tier: 11,
    name: "Watermelon",
    emoji: "🍉",
    scoreGain: 100,
    description: "GIANT WATERMELON! The classic legendary achievement!",
  },
  {
    tier: 12,
    name: "Dragon Fruit",
    emoji: "🐉",
    scoreGain: 150,
    description: "MYTHICAL DRAGON FRUIT! Radiates cosmic energy.",
  },
  {
    tier: 13,
    name: "Durian",
    emoji: "👑",
    scoreGain: 250,
    description: "ROYAL GOLDEN DURIAN! The undisputed King of Fruits.",
  },
  {
    tier: 14,
    name: "Galaxy Watermelon",
    emoji: "🌌",
    scoreGain: 500,
    description: "COSMIC GALAXY WATERMELON! The Ultimate Tier 14 fruit.",
  },
];

export interface AlbumProgress {
  unlockedCount: number;
  totalCount: number;
  percentage: number;
  title: string;
  isComplete: boolean;
}

/**
 * Check if the merged fruit is newly discovered.
 * Returns true if new and automatically adds to unlockedTiers.
 */
export function checkNewFruitUnlocked(
  tier: number,
  unlockedTiers: Set<number>,
): { isNewDiscovery: boolean; fruitInfo: FruitInfo } {
  const fruitInfo =
    FRUIT_ENCYCLOPEDIA[tier] ?? (FRUIT_ENCYCLOPEDIA[0] as FruitInfo);
  if (!unlockedTiers.has(tier)) {
    unlockedTiers.add(tier);
    return { isNewDiscovery: true, fruitInfo };
  }
  return { isNewDiscovery: false, fruitInfo };
}

/**
 * Calculate album completion progress and rank title.
 */
export function getAlbumProgress(
  unlockedTiers: Set<number> | readonly number[],
): AlbumProgress {
  const count =
    unlockedTiers instanceof Set
      ? unlockedTiers.size
      : new Set(unlockedTiers).size;
  const totalCount = FRUIT_ENCYCLOPEDIA.length;
  const percentage = Math.round((count / totalCount) * 100);

  let title = "Novice Planter 🌱";
  if (count >= 15) title = "Cosmic Fruit King 🌌";
  else if (count >= 12) title = "Master Harvester 👑";
  else if (count >= 9) title = "Fruit Specialist 🍍";
  else if (count >= 6) title = "Hardworking Farmer 🍎";
  else if (count >= 3) title = "Green Thumb 🍓";

  return {
    unlockedCount: count,
    totalCount,
    percentage,
    title,
    isComplete: count >= totalCount,
  };
}

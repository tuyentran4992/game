// DATA-MODEL §2 — 12 NGUYÊN LIỆU. Pure TS, 0 Phaser.

export type Category = 'base' | 'sauce' | 'meat' | 'veg'

export interface Ingredient {
  readonly id: string
  readonly name: string // EN UI
  readonly vi: string // displayName Tieng Viet — BUGFIX-1 lenh 09/09: doc tren iPhone
  readonly category: Category
  readonly color: string
}

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'ing-base', name: 'Bread', vi: 'Bánh mì', category: 'base', color: '#C98F4E' },
  { id: 'ing-pate', name: 'Pâté', vi: 'Pâté gan', category: 'sauce', color: '#B07A6A' },
  { id: 'ing-mayo', name: 'Mayo', vi: 'Mayo', category: 'sauce', color: '#F3EBD8' },
  { id: 'ing-chili', name: 'Chili Sauce', vi: 'Tương ớt', category: 'sauce', color: '#E03A1F' },
  { id: 'ing-pork', name: 'Grilled Pork', vi: 'Thịt nướng', category: 'meat', color: '#8A5A33' },
  { id: 'ing-chicken', name: 'Chicken', vi: 'Gà xé', category: 'meat', color: '#E4B95B' },
  { id: 'ing-ham', name: 'Cold Cut', vi: 'Chả lụa', category: 'meat', color: '#EF9AA6' },
  { id: 'ing-cuke', name: 'Cucumber', vi: 'Dưa leo', category: 'veg', color: '#9FD3A0' },
  { id: 'ing-pickle', name: 'Pickles', vi: 'Đồ chua', category: 'veg', color: '#EFA54C' },
  { id: 'ing-herb', name: 'Cilantro', vi: 'Rau mùi', category: 'veg', color: '#2F8F4E' },
  { id: 'ing-chili-f', name: 'Chili Slices', vi: 'Ớt lát', category: 'veg', color: '#D92B1C' },
  { id: 'ing-top', name: 'Lid', vi: 'Vỏ trên', category: 'base', color: '#C98F4E' }
] as const

export const INGREDIENT_BY_ID: Readonly<Record<string, Ingredient>> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i])
)

// 10 nguyên liệu GIỮA (bỏ 2 base) — pool sinh order (DATA-MODEL §4)
export const ORDER_POOL: readonly string[] = INGREDIENTS.filter((i) => i.category !== 'base').map((i) => i.id)

export const SAUCE_IDS: readonly string[] = ids('sauce')
export const MEAT_IDS: readonly string[] = ids('meat')
export const VEG_IDS: readonly string[] = ids('veg')

function ids(c: Category): string[] {
  return INGREDIENTS.filter((i) => i.category === c).map((i) => i.id)
}

export function categoryOf(id: string): Category {
  return INGREDIENT_BY_ID[id].category
}

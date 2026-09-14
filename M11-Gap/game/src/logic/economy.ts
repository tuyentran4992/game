// Pattern: Registry+data
// TRÁCH NHIỆM: kinh tế "Mực" — PC-11 (thưởng lực cắt theo sao + mốc streak) và PC-12
//   (spa skin / album / huy hiệu). Bảng giá và mọi trần là DỮ LIỆU truyền qua THAM SỐ;
//   nguồn chính thức của chúng là config/ink.json · config/skins.json · config/album.json
//   (tầng platform đọc file rồi bơm vào đây — logic không tự mở file, không có hằng ngầm).
// RÀNG BUỘC: hàm THUẦN (0 I/O, 0 Date/random, 0 state module). Từ chối giao dịch trả về
//   KẾT QUẢ CÓ KIỂU (reason) kèm state giữ nguyên; chỉ lỗi lập trình (sao ngoài bảng) NÉM.

/** Ví của người chơi: Mực + danh sách skin đã có + skin đang đeo. */
export type Inventory = {
  ink: number;
  owned: string[];
  equipped: string;
};

/** Một mẫu ảnh trong album nếp (PC-12). */
export type AlbumItem = { id: string; title: string };

/** Một huy hiệu: id + cấp đã đạt. */
export type Badge = { id: string; level: number };

/** Mốc streak: chạm `at` màn thắng liên tiếp thì được `bonus` Mực. */
export type StreakTier = { readonly at: number; readonly bonus: number };

/** Bảng PC-11: Mực gốc theo 0..3 sao + các mốc streak (KHÔNG cộng dồn, chỉ mốc cao nhất). */
export type InkTable = {
  readonly baseByStars: readonly number[];
  readonly streakBonus: readonly StreakTier[];
};

/** Một dòng bảng giá skin (PC-12): giá tính bằng Mực, không có khái niệm tiền thật. */
export type SkinPrice = { readonly id: string; readonly ink: number };

/** Lý do từ chối — khoá của 2 bảng luật BUY_RULES / BADGE_RULES bên dưới. */
export type Denial =
  | 'unknown_skin'
  | 'already_owned'
  | 'insufficient_ink'
  | 'duplicate_badge'
  | 'cap_reached';

export type BuyResult = { ok: boolean; state: Inventory; reason?: Denial };
export type BadgeResult = { ok: boolean; badges: Badge[]; reason?: Denial };

// ------------------------------------------------------------ PC-11: Mực ---

/** Mực gốc theo số sao; sao ngoài bảng là lỗi lập trình ⇒ ném rõ (dữ liệu bẩn không tới đây). */
function baseInk(stars: number, table: InkTable): number {
  const base = table.baseByStars[stars];
  if (base === undefined) {
    throw new Error('ink thuong: so sao ngoai bang 0..' + (table.baseByStars.length - 1));
  }
  return base;
}

/** Thưởng streak = bonus của MỐC CAO NHẤT đã chạm (không cộng dồn mốc thấp hơn). */
function streakInk(streak: number, tiers: readonly StreakTier[]): number {
  let top: StreakTier | null = null;
  for (const tier of tiers) {
    if (tier.at <= streak && (top === null || tier.at > top.at)) top = tier;
  }
  return top === null ? 0 : top.bonus;
}

/** PC-11: Mực thưởng một màn = gốc theo sao + thưởng của mốc streak cao nhất đã chạm. */
export function inkAward(stars: number, streak: number, table: InkTable): number {
  return baseInk(stars, table) + streakInk(streak, table.streakBonus);
}

// -------------------------------------------------------- PC-12: spa skin ---

type BuyCtx = { inv: Inventory; skinId: string; price: SkinPrice | undefined };
type BuyRule = { reason: Denial; blocked: (c: BuyCtx) => boolean };

/** Bảng luật từ chối mua skin — thêm luật mới = thêm MỘT DÒNG, không rải if/else. */
const BUY_RULES: readonly BuyRule[] = [
  { reason: 'unknown_skin', blocked: (c) => c.price === undefined },
  { reason: 'already_owned', blocked: (c) => c.inv.owned.includes(c.skinId) },
  { reason: 'insufficient_ink', blocked: (c) => c.price !== undefined && c.inv.ink < c.price.ink },
];

const costOf = (price: SkinPrice | undefined): number => (price === undefined ? 0 : price.ink);

/** Mua skin bằng Mực: trừ đúng giá, thêm vào owned và equip luôn. Không sửa `inv` đầu vào. */
export function buySkin(inv: Inventory, skinId: string, prices: readonly SkinPrice[]): BuyResult {
  const ctx: BuyCtx = { inv, skinId, price: prices.find((row) => row.id === skinId) };
  const stop = BUY_RULES.find((rule) => rule.blocked(ctx));
  if (stop !== undefined) return { ok: false, state: inv, reason: stop.reason };
  const state: Inventory = {
    ink: ctx.inv.ink - costOf(ctx.price),
    owned: [...ctx.inv.owned, ctx.skinId],
    equipped: ctx.skinId,
  };
  return { ok: true, state };
}

// -------------------------------------------------- PC-12: album + huy hiệu ---

/** Nộp mẫu ảnh vào album: dedupe theo id (giữ lần xuất hiện ĐẦU), cắt dần theo `cap`. */
export function addAlbumItems(
  existing: readonly AlbumItem[],
  incoming: readonly AlbumItem[],
  cap: number,
): AlbumItem[] {
  const out: AlbumItem[] = [];
  const seen = new Set<string>();
  for (const item of [...existing, ...incoming]) {
    if (out.length >= cap || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({ id: item.id, title: item.title });
  }
  return out;
}

type BadgeCtx = { owned: readonly Badge[]; badge: Badge; cap: number };
type BadgeRule = { reason: Denial; blocked: (c: BadgeCtx) => boolean };

/** Bảng luật chặn huy hiệu: xét trùng (id, cấp) trước, hết trần sau. */
const BADGE_RULES: readonly BadgeRule[] = [
  {
    reason: 'duplicate_badge',
    blocked: (c) => c.owned.some((b) => b.id === c.badge.id && b.level === c.badge.level),
  },
  { reason: 'cap_reached', blocked: (c) => c.owned.length >= c.cap },
];

const copyBadges = (list: readonly Badge[]): Badge[] => list.map((b) => ({ id: b.id, level: b.level }));

/**
 * Tặng một huy hiệu. Bị chặn ⇒ trả về bản copy danh sách CŨ + reason (không mất gì).
 * Cùng id nhưng cấp khác ⇒ nâng cấp tại chỗ, số lượng không tăng.
 */
export function awardBadge(owned: readonly Badge[], badge: Badge, cap: number): BadgeResult {
  const ctx: BadgeCtx = { owned, badge, cap };
  const stop = BADGE_RULES.find((rule) => rule.blocked(ctx));
  if (stop !== undefined) return { ok: false, badges: copyBadges(owned), reason: stop.reason };
  const next = copyBadges(owned);
  const at = next.findIndex((b) => b.id === badge.id);
  const entry: Badge = { id: badge.id, level: badge.level };
  if (at < 0) next.push(entry);
  else next[at] = entry;
  return { ok: true, badges: next };
}

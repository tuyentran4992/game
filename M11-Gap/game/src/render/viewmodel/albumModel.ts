// Pattern: View Model + Data Table (danh mục album + huy hiệu)
// TRÁCH NHIỆM: ghép DANH MỤC nội dung (14 mẫu ảnh giấy + 6 huy hiệu — đúng bộ khoá asset trong
//   public/assets) với danh sách ĐÃ ĐẠT mà logic trả (save.album_items / save.badges) ⇒ mỗi
//   dòng mang cờ `unlocked`/`earned`. AlbumScene chỉ việc vẽ đủ số dòng nhận được: không tự cắt
//   theo trần, không tự cấp, và KHÔNG sở hữu danh sách id (PC-12 — ba điều đó bị test quét).
// RÀNG BUỘC: module THUẦN, 0 phaser, 0 đồng hồ; trần 14/6 là của logic/cache.ts (CAPS) và được
//   addAlbumItems/awardBadge cắt TRƯỚC KHI tới đây ⇒ bảng danh mục chỉ là thứ tự ô trên lưới.

import type { AlbumItem, Badge } from '../../logic/economy';

/** Một ô trên lưới album: `title` lấy từ chính bản ghi logic (mục chưa đạt không có nhãn). */
export type AlbumRow = {
  readonly id: string;
  readonly title: string;
  readonly unlocked: boolean;
};

/** Một ô huy hiệu: cấp do logic nâng, `earned` là cờ để BadgeIcon chọn silhouette hay nhân mực. */
export type BadgeRow = {
  readonly id: string;
  readonly level: number;
  readonly earned: boolean;
};

/** Thứ tự ô lưới = thứ tự danh mục; id là khoá asset, không phải chữ hiển thị. */
const ALBUM_CATALOGUE: readonly string[] = [
  'album_01', 'album_02', 'album_03', 'album_04', 'album_05', 'album_06', 'album_07',
  'album_08', 'album_09', 'album_10', 'album_11', 'album_12', 'album_13', 'album_14',
];

const BADGE_CATALOGUE: readonly string[] = [
  'badge_01', 'badge_02', 'badge_03', 'badge_04', 'badge_05', 'badge_06',
];

/** Dòng album theo danh mục, phủ đè những gì logic đã ghi nhận (dedupe theo id, giữ bản logic). */
export function albumRows(earned: readonly AlbumItem[]): AlbumRow[] {
  const byId = new Map(earned.map((item) => [item.id, item]));
  return ALBUM_CATALOGUE.map((id) => {
    const hit = byId.get(id);
    return { id, title: hit === undefined ? '' : hit.title, unlocked: hit !== undefined };
  });
}

/** Dòng huy hiệu: cùng id nhưng cấp cao hơn ⇒ BadgeIcon vẽ thêm chấm (logic đã nâng trong save). */
export function badgeRows(owned: readonly Badge[]): BadgeRow[] {
  const byId = new Map(owned.map((badge) => [badge.id, badge]));
  return BADGE_CATALOGUE.map((id) => {
    const hit = byId.get(id);
    return { id, level: hit === undefined ? 0 : hit.level, earned: hit !== undefined };
  });
}

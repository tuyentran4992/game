// Pattern: Generated Data (ĐỪNG SỬA TAY — 1 file = 1 nguồn sự thật)
// SINH BỞI scripts/gen-asset-list.mjs từ ../assets/manifest.json + ../assets/sfx-manifest.json.
//   BootScene nạp đúng danh sách này; thiếu file là script BÁO LỖI và exit 1 (cấm fallback im lặng).

export type AssetKind = 'skin' | 'album' | 'badge';

/** Một ảnh trong game: khoá texture + đường dẫn cục bộ (gốc = web root của bản build). */
export type ImageAsset = { readonly key: string; readonly path: string; readonly kind: AssetKind };

/** Một tiếng trong game. */
export type AudioAsset = { readonly key: string; readonly path: string };

/** Bảng màu nguyên văn của generator asset — tint/theme đọc ở đây, không khai lại hex trong scene. */
export const MANIFEST_PALETTE: Readonly<Record<string, string>> = {
  "ink": "#17324D",
  "crease": "#9FB3C8",
  "primary": "#1F6FEB",
  "accent": "#F5B301",
  "paper": "#FFFFFF",
  "cream": "#FFF7E8",
};

export const IMAGE_ASSETS: readonly ImageAsset[] = [
  { key: 'album_01', path: 'assets/album_01.png', kind: 'album' },
  { key: 'album_02', path: 'assets/album_02.png', kind: 'album' },
  { key: 'album_03', path: 'assets/album_03.png', kind: 'album' },
  { key: 'album_04', path: 'assets/album_04.png', kind: 'album' },
  { key: 'album_05', path: 'assets/album_05.png', kind: 'album' },
  { key: 'album_06', path: 'assets/album_06.png', kind: 'album' },
  { key: 'album_07', path: 'assets/album_07.png', kind: 'album' },
  { key: 'album_08', path: 'assets/album_08.png', kind: 'album' },
  { key: 'album_09', path: 'assets/album_09.png', kind: 'album' },
  { key: 'album_10', path: 'assets/album_10.png', kind: 'album' },
  { key: 'album_11', path: 'assets/album_11.png', kind: 'album' },
  { key: 'album_12', path: 'assets/album_12.png', kind: 'album' },
  { key: 'album_13', path: 'assets/album_13.png', kind: 'album' },
  { key: 'album_14', path: 'assets/album_14.png', kind: 'album' },
  { key: 'badge_01', path: 'assets/badge_01.png', kind: 'badge' },
  { key: 'badge_02', path: 'assets/badge_02.png', kind: 'badge' },
  { key: 'badge_03', path: 'assets/badge_03.png', kind: 'badge' },
  { key: 'badge_04', path: 'assets/badge_04.png', kind: 'badge' },
  { key: 'badge_05', path: 'assets/badge_05.png', kind: 'badge' },
  { key: 'badge_06', path: 'assets/badge_06.png', kind: 'badge' },
  { key: 'skin_cream', path: 'assets/skin_cream.png', kind: 'skin' },
  { key: 'skin_default', path: 'assets/skin_default.png', kind: 'skin' },
  { key: 'skin_dots', path: 'assets/skin_dots.png', kind: 'skin' },
  { key: 'skin_grid', path: 'assets/skin_grid.png', kind: 'skin' },
  { key: 'skin_kraft', path: 'assets/skin_kraft.png', kind: 'skin' },
  { key: 'skin_mizu', path: 'assets/skin_mizu.png', kind: 'skin' },
  { key: 'skin_origami', path: 'assets/skin_origami.png', kind: 'skin' },
  { key: 'skin_ruled', path: 'assets/skin_ruled.png', kind: 'skin' },
];

export const AUDIO_ASSETS: readonly AudioAsset[] = [
  { key: 'click', path: 'sfx/click.wav' },
  { key: 'correct', path: 'sfx/correct.wav' },
  { key: 'counter', path: 'sfx/counter.wav' },
  { key: 'fold', path: 'sfx/fold.wav' },
  { key: 'punch', path: 'sfx/punch.wav' },
  { key: 'star', path: 'sfx/star.wav' },
  { key: 'unfold', path: 'sfx/unfold.wav' },
  { key: 'wrong', path: 'sfx/wrong.wav' },
];

/** Ba danh mục id, dẫn xuất từ chính IMAGE_ASSETS (thêm asset = chạy lại script). */
export const SKIN_IDS: readonly string[] = ['skin_cream', 'skin_default', 'skin_dots', 'skin_grid', 'skin_kraft', 'skin_mizu', 'skin_origami', 'skin_ruled'];
export const ALBUM_IDS: readonly string[] = ['album_01', 'album_02', 'album_03', 'album_04', 'album_05', 'album_06', 'album_07', 'album_08', 'album_09', 'album_10', 'album_11', 'album_12', 'album_13', 'album_14'];
export const BADGE_IDS: readonly string[] = ['badge_01', 'badge_02', 'badge_03', 'badge_04', 'badge_05', 'badge_06'];

/** Đường dẫn của một khoá ảnh; không có trong manifest => undefined (nơi gọi phải BÁO, không đoán). */
export const imagePathOf = (key: string): string | undefined => IMAGE_ASSETS.find((a) => a.key === key)?.path;

/** Đường dẫn của một tiếng; cùng quy tắc "không có là null" như trên. */
export const audioPathOf = (key: string): string | undefined => AUDIO_ASSETS.find((a) => a.key === key)?.path;

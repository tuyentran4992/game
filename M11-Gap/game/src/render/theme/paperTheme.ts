// Pattern: Registry (bảng dữ liệu)
// TRÁCH NHIỆM: mỗi chương MỘT bộ token màu giấy (PC-L-11) + bảng kiểu chữ (DS:99) và khoá
//   asset giấy procedural. Thêm chương = THÊM MỘT DÒNG PALETTES, không thêm nhánh if.
// RÀNG BUỘC: module THUẦN — không import phaser, không đồng hồ, không ngẫu nhiên. `id` của
//   mỗi dòng là KHOÁ DO LOGIC SỞ HỮU (progression.paperThemeOf) ⇒ view không tự đặt theme.
// DÒNG 1 = token mặc định DS §1 nguyên văn; các dòng sau phân biệt bằng ít nhất một token.

import { CAMPAIGN, paperThemeOf } from '../../logic/progression';
import { ALBUM_IDS, BADGE_IDS, MANIFEST_PALETTE, SKIN_IDS } from '../generated/assetList';

export type PaperTheme = {
  readonly id: string;
  readonly paper: string;
  readonly crease: string;
  readonly ink: string;
  readonly bg: { readonly top: string; readonly bottom: string };
  readonly shade: string;
  readonly grain: string;
};

type PaletteRow = {
  readonly paper: string;
  readonly crease: string;
  readonly ink: string;
  readonly bgTop: string;
  readonly bgBottom: string;
  readonly shade: string;
  readonly grain: string;
};

/** 8 dòng token — giấy / nếp gấp / mực / hai đầu nền / bóng đổ / khoá texture. */
const PALETTES: readonly PaletteRow[] = [
  { paper: '#FFFFFF', crease: '#9FB3C8', ink: '#17324D', bgTop: '#FFF7E8', bgBottom: '#EADFC4', shade: '#E4D7BC', grain: 'skin_kraft' },
  { paper: '#FBF6EC', crease: '#A7B8A0', ink: '#233A2E', bgTop: '#F3F7EC', bgBottom: '#D8E3C9', shade: '#D3DCC5', grain: 'skin_origami' },
  { paper: '#FDFDFB', crease: '#C9C2D6', ink: '#2C2140', bgTop: '#F6F2FA', bgBottom: '#DCD3E8', shade: '#D6CCE4', grain: 'skin_mizu' },
  { paper: '#F4F1EA', crease: '#B7B3A8', ink: '#24221D', bgTop: '#EFEBE0', bgBottom: '#CFC7B6', shade: '#C9C0AC', grain: 'skin_ruled' },
  { paper: '#FCFBF4', crease: '#8FA9B8', ink: '#1D2B4A', bgTop: '#F7FAF2', bgBottom: '#DDE7D2', shade: '#D3E0C6', grain: 'skin_default' },
  { paper: '#EFF3F6', crease: '#7E93A3', ink: '#16303C', bgTop: '#E7F0F4', bgBottom: '#C3D3DC', shade: '#B7C9D3', grain: 'skin_grid' },
  { paper: '#E9EDF2', crease: '#9AA3B0', ink: '#22262E', bgTop: '#DCE3EC', bgBottom: '#AEB8C6', shade: '#9FA9B8', grain: 'skin_dots' },
  { paper: '#F8E9C4', crease: '#B9913B', ink: '#3A2A0B', bgTop: '#FBEFCB', bgBottom: '#D8B75E', shade: '#C79E3F', grain: 'skin_origami' },
];

/** Dòng dự phòng khi chương nhiều hơn bảng màu (không ném lúc boot — PC-B-01). */
const FALLBACK_PALETTE = PALETTES[0];

/** Duyệt theo CAMPAIGN (logic sở hữu số chương) ⇒ id luôn đúng, thêm dòng là thêm theme. */
export const PAPER_THEMES: readonly PaperTheme[] = CAMPAIGN.map((row, i) => {
  const p = PALETTES[i] ?? FALLBACK_PALETTE;
  return {
    id: paperThemeOf(row.chapter),
    paper: p.paper,
    crease: p.crease,
    ink: p.ink,
    bg: { top: p.bgTop, bottom: p.bgBottom },
    shade: p.shade,
    grain: p.grain,
  };
});

/** Chỉ số chương -> dòng theme; tra Map, KHÔNG phân nhánh; chương lạ về dòng 1. */
const ROW_BY_CHAPTER = new Map<number, PaperTheme>(
  PAPER_THEMES.map((theme, i) => [CAMPAIGN[i].chapter, theme]),
);

export function themeFor(chapter: number): PaperTheme {
  return ROW_BY_CHAPTER.get(chapter) ?? PAPER_THEMES[0];
}

type TypeRole = 'title' | 'heading' | 'label' | 'digit';

const TYPE_SIZES: Readonly<Record<TypeRole, number>> = {
  title: 96, heading: 44, label: 30, digit: 38,
};

const FAMILY = 'Fraunces';
const WEIGHT_HEAVY = '900';
const WEIGHT_BOLD = '700';

/** Hình dạng TextStyle của Phaser — khai ở đây để module này KHÔNG import phaser. */
export type TextStyle = {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontStyle: string;
  readonly color: string;
};

/** Kiểu chữ dựng từ BẢNG (DS:99) — scene không viết chuỗi font trần ở nơi gọi. */
export function textStyle(role: TypeRole, color: string): TextStyle {
  return {
    fontFamily: FAMILY,
    fontSize: TYPE_SIZES[role] + 'px',
    fontStyle: role === 'title' || role === 'digit' ? WEIGHT_HEAVY : WEIGHT_BOLD,
    color,
  };
}

/** '#RRGGBB' -> số nguyên màu cho Graphics/Shape (module khác không tự cắt chuỗi màu). */
export function parseHex(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

// ---------------------------------------------------------------------------
// B4 — REGISTRY ASSET THEO ID (8 da giấy / 14 mẫu album / 6 huy hiệu).
// Khoá và đường dẫn đến từ `src/render/generated/assetList.ts` (sinh từ
// ../assets/manifest.json bởi scripts/gen-asset-list.mjs) ⇒ thêm một da giấy mới là
// thêm một dòng manifest + chạy lại script, KHÔNG phải sửa scene nào.
// ---------------------------------------------------------------------------

export { ALBUM_IDS, BADGE_IDS, SKIN_IDS } from '../generated/assetList';

/** Một dòng registry da giấy: khoá texture thật + màu nhân để da đọc theo chương. */
export type SkinAsset = {
  readonly skinId: string;
  readonly assetKey: string;
  readonly tint: string;
};

/**
 * Da chuẩn khi id trong save không có ảnh (id của economy/config là `skin_classic`, ảnh
 * trên đĩa là `skin_default`) — MỘT dòng dự phòng duy nhất, khai ra ràng buộc.
 */
export const DEFAULT_SKIN_ID = 'skin_default';

/** Alias id-not-space (save/economy, config/skins.json) -> khoá asset (manifest). Thêm da = thêm dòng. */
const SKIN_ALIAS: Readonly<Record<string, string>> = {
  skin_classic: 'skin_default',
  skin_foil: 'skin_mizu',
};

/**
 * Tint = màu giấy của DÒNG PALETTE đang dùng chính da này (dòng đầu thắng, xem PALETTES
 * ở đầu file); da chưa gắn với chương nào lấy kem của manifest. Không có hex thứ hai.
 */
const paperTintOf = (assetKey: string): string =>
  PALETTES.find((row) => row.grain === assetKey)?.paper ?? MANIFEST_PALETTE.cream;

/** 8 dòng da giấy — dựng từ danh mục manifest nên số dòng LUÔN khớp đĩa (test render soi). */
export const SKIN_ASSETS: Readonly<Record<string, SkinAsset>> = Object.fromEntries(
  SKIN_IDS.map((assetKey) => [assetKey, { skinId: assetKey, assetKey, tint: paperTintOf(assetKey) }] as const),
);

/** Album 14 mẫu và huy hiệu 6 chiếc: id nội dung -> khoá texture cùng tên. */
export const ALBUM_ASSETS: Readonly<Record<string, string>> = Object.fromEntries(
  ALBUM_IDS.map((id) => [id, id] as const),
);

export const BADGE_ASSETS: Readonly<Record<string, string>> = Object.fromEntries(
  BADGE_IDS.map((id) => [id, id] as const),
);

/** Tra da theo id (kể cả id alias); id lạ => undefined — caller dùng `sheetSkinOf`. */
export function skinAssetOf(skinId: string): SkinAsset | undefined {
  const key = SKIN_ALIAS[skinId] ?? skinId;
  return SKIN_ASSETS[key];
}

/** Da của tờ giấy đang đeo: id lạ (save cũ, placeholder config) về da chuẩn `DEFAULT_SKIN_ID`. */
export function sheetSkinOf(skinId: string): SkinAsset {
  return skinAssetOf(skinId) ?? SKIN_ASSETS[DEFAULT_SKIN_ID];
}

/** Khoá ảnh của một mục album / một huy hiệu; id lạ => undefined (scene vẽ ô xám và BÁO). */
export const albumAssetOf = (albumId: string): string | undefined => ALBUM_ASSETS[albumId];

export const badgeAssetOf = (badgeId: string): string | undefined => BADGE_ASSETS[badgeId];

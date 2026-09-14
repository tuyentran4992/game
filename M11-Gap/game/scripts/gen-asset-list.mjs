#!/usr/bin/env node
/**
 * SINH DANH SÁCH ASSET TỪ MANIFEST (B4 — ART & JUICE).
 *
 * Vì sao phải sinh: danh sách preload nằm trong tay người gõ là định nghĩa hai sự thật
 * (manifest của scripts/gen_assets_m11.py và mảng string trong BootScene). Một trong hai
 * lệch nhau là game chạy thiếu ảnh mà không ai báo. Nên: doc manifest -> sinh
 * `src/render/generated/assetList.ts`; muốn thêm asset là thêm vào manifest rồi chạy lại.
 *
 * Chạy: node scripts/gen-asset-list.mjs [--check]
 *   --check = KHÔNG ghi file, chỉ xác minh file sinh ra đang khớp manifest + khớp đĩa
 *             (dùng cho người đọc CI; test node ở tests/render cũng soi cùng một bất biến).
 * Mã thoát: 0 = OK, 1 = manifest thiếu/lệch (BAO LỖI RÕ, không im lặng bỏ qua).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(HERE, '..');

/** Nơi đặt manifest: repo-local (`assets/`) hoặc module-root (`../assets/`) — thử theo thứ tự. */
const SOURCES = {
  assets: { candidates: ['assets/manifest.json', '../assets/manifest.json'] },
  sfx: { candidates: ['assets/sfx-manifest.json', '../assets/sfx-manifest.json'] },
};

/** Trần ĐẾ của từng loại ảnh — khớp pack B4 (8 skin / 14 mẫu album / 6 huy hiệu). */
const EXPECTED = { skin: 8, album: 14, badge: 6 };

/** Ảnh nộp kênh (icon/thumb) có trên đĩa nhưng KHÔNG nạp vào game. */
const OFFSCREEN = new Set(['icon', 'thumb']);

const OUT = join(GAME, 'src', 'render', 'generated', 'assetList.ts');
const problems = [];

function readManifest(name) {
  for (const rel of SOURCES[name].candidates) {
    const abs = resolve(GAME, rel);
    if (!existsSync(abs)) continue;
    try {
      return JSON.parse(readFileSync(abs, 'utf8'));
    } catch (e) {
      problems.push(`manifest ${kind} ở ${rel} KHÔNG parse được: ${e.message}`);
      return null;
    }
  }
  problems.push(`KHÔNG TÌM thấy manifest ${kind} (thử: ${SOURCES[kind].candidates.join(', ')})`);
  return null;
}

/** `file` trong manifest là đường dẫn gốc-module (`game/public/...`) -> hai kiểu đường dẫn. */
function pathsOf(file) {
  const rel = file.startsWith('game/') ? file.slice('game/'.length) : file;
  return { disk: join(GAME, rel), url: rel.replace(/^public\//, '') };
}

const byKey = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

const manifest = readManifest('assets');
const sfx = readManifest('sfx');

/** @type {{key:string,path:string,kind:string}[]} */
const images = [];
/** @type {{key:string,path:string}[]} */
const audios = [];

if (manifest && sfx) {
  for (const [key, row] of Object.entries(manifest.files)) {
    if (row.kind !== 'skin' && row.kind !== 'album' && row.kind !== 'badge' && !OFFSCREEN.has(row.kind)) {
      problems.push(`asset "${key}" có kind lạ "${row.kind}" — không biết có phải nạp vào game không`);
      continue;
    }
    const { disk, url } = pathsOf(row.file);
    if (!existsSync(disk)) problems.push(`asset "${key}" khai ở manifest nhưng THIẾU FILE trên đĩa: ${url}`);
    if (OFFSCREEN.has(row.kind)) continue;
    images.push({ key, path: url, kind: row.kind });
  }
  for (const [key, row] of Object.entries(sfx.files)) {
    const { disk, url } = pathsOf(row.file);
    if (!existsSync(disk)) problems.push(`âm thanh "${key}" khai ở sfx-manifest nhưng THIẾU FILE: ${url}`);
    audios.push({ key, path: url });
  }
  for (const [kind, want] of Object.entries(EXPECTED)) {
    const got = images.filter((row) => row.kind === kind).length;
    if (got !== want) problems.push(`manifest có ${got} asset loại "${kind}", pack B4 đòi ${want}`);
  }
  if (audios.length !== 8) problems.push(`sfx-manifest có ${audios.length} tiếng, pack B4 đòi 8`);
  images.sort(byKey);
  audios.sort(byKey);
}

if (problems.length > 0) {
  console.error('gen-asset-list.mjs — MANIFEST CÓ VẤN ĐỀ:');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}

const row = (x) => `  { key: '${x.key}', path: '${x.path}', kind: '${x.kind}' },`;
const audioRow = (x) => `  { key: '${x.key}', path: '${x.path}' },`;
const ids = (kind) => images.filter((x) => x.kind === kind).map((x) => `'${x.key}'`).join(', ');

const PALETTE = manifest.palette ?? {};
const paletteLines = Object.entries(PALETTE).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');

const body = `// Pattern: Generated Data (ĐỪNG SỬA TAY — 1 file = 1 nguồn sự thật)
// SINH BỞI scripts/gen-asset-list.mjs từ ../assets/manifest.json + ../assets/sfx-manifest.json.
//   BootScene nạp đúng danh sách này; thiếu file là script BÁO LỖI và exit 1 (cấm fallback im lặng).

export type AssetKind = 'skin' | 'album' | 'badge';

/** Một ảnh trong game: khoá texture + đường dẫn cục bộ (gốc = web root của bản build). */
export type ImageAsset = { readonly key: string; readonly path: string; readonly kind: AssetKind };

/** Một tiếng trong game. */
export type AudioAsset = { readonly key: string; readonly path: string };

/** Bảng màu nguyên văn của generator asset — tint/theme đọc ở đây, không khai lại hex trong scene. */
export const MANIFEST_PALETTE: Readonly<Record<string, string>> = {
${paletteLines}
};

export const IMAGE_ASSETS: readonly ImageAsset[] = [
${images.map(row).join('\n')}
];

export const AUDIO_ASSETS: readonly AudioAsset[] = [
${audios.map(audioRow).join('\n')}
];

/** Ba danh mục id, dẫn xuất từ chính IMAGE_ASSETS (thêm asset = chạy lại script). */
export const SKIN_IDS: readonly string[] = [${ids('skin')}];
export const ALBUM_IDS: readonly string[] = [${ids('album')}];
export const BADGE_IDS: readonly string[] = [${ids('badge')}];

/** Đường dẫn của một khoá ảnh; không có trong manifest => undefined (nơi gọi phải BÁO, không đoán). */
export const imagePathOf = (key: string): string | undefined => IMAGE_ASSETS.find((a) => a.key === key)?.path;

/** Đường dẫn của một tiếng; cùng quy tắc "không có là null" như trên. */
export const audioPathOf = (key: string): string | undefined => AUDIO_ASSETS.find((a) => a.key === key)?.path;
`;

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== body) {
    console.error('gen-asset-list.mjs — file sinh ra ĐÃ LỆCH với manifest, chạy lại: node scripts/gen-asset-list.mjs');
    process.exit(1);
  }
  console.log(`gen-asset-list.mjs — khớp: ${images.length} ảnh + ${audios.length} tiếng`);
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body, 'utf8');
console.log(`gen-asset-list.mjs — đã ghi src/render/generated/assetList.ts (${images.length} ảnh, ${audios.length} tiếng)`);

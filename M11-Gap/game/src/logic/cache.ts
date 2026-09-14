// Pattern: Bounded memo + Resource limits
// TRÁCH NHIỆM: (1) cái trần CHO các memo module-level của lõi (E6/A10) — memo của hàm THUẦN thì
//   vô hại về kết quả, nhưng không trần ⇒ một ca fuzz 10.000 màn giữ trọn mọi khoá đã thấy
//   (chuỗi nếp × điểm đục × nhát cắt) suốt vòng đời tiến trình; cacheSizes() là getter nhỏ để
//   test ĐO được trần thật, không phải tin lời comment.
//   (2) MỘT nguồn cho mọi TRẦN TÀI NGUYÊN của lõi (CAPS) + cách ĐO dung lượng thật (số byte
//   UTF-8): save.ts và recordsStore.ts báo kích thước blob PC-16, telemetry.ts giữ ring ≤ trần
//   PC-15. Ô nào CÓ nguồn trong config/*.json thì bị tests/logic/config-caps.test.ts đối chiếu
//   thẳng vào file config; ô nào lấy từ pack (telemetryCapBytes, snapshotKeep) thì test chốt
//   đúng giá trị đó — không có ô nào "tin lời comment".
// RANGE BUOC: 0 luật nghiệp vụ ở đây — chỉ cấu trúc chứa + trần + codec đo byte. Module Lá:
//   không import gì, nên mọi tầng khác đều lấy được mà không tạo vòng import.

/** Số mục tối đa của MỘT memo (mục lâu dùng nhất bị xoá khi vượt). */
export const CACHE_MAX = 512;

/**
 * Mọi trần tài nguyên của lõi, MỘT chỗ duy nhất (A8: không được khai lại trong save/records/
 * telemetry). Năm ô albumItems/badges/wallRowsPerLevel/ghostsPerLevel/days + starterSkin khớp
 * một key trong config/album.json · config/skins.json và bị tests/logic/config-caps.test.ts
 * đọc thẳng file config để đối chiếu ⇒ sửa config mà quên sửa đây là test ĐỎ, không im lặng.
 * Hai ô telemetryCapBytes/snapshotKeep KHÔNG có trong config (nguồn là pack PC-15) ⇒ cũng bị
 * test đó chốt lại, nêu rõ nguồn, để không ô nào tự do đổi âm thầm.
 */
export const CAPS = {
  albumItems: 14,
  badges: 6,
  wallRowsPerLevel: 5,
  ghostsPerLevel: 1,
  days: 365,
  /** PC-15: trần byte của ring telemetry (100 KiB). */
  telemetryCapBytes: 100 * 1024,
  /** Số event mới nhất được dựng snapshot xuống bộ ghi. */
  snapshotKeep: 32,
  /** Skin ai cũng có từ đầu — khớp key `starter` của config/skins.json. */
  starterSkin: 'skin_classic',
} as const;

/** Số byte UTF-8 của mot chuoi: ghep cap surrogate = 4 byte, nguoc lai theo bai. */
export function utf8Length(text: string): number {
  let bytes = 0;
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c < ONEBYTE_END) bytes += 1;
    else if (c < TWOBYTE_END) bytes += 2;
    else if (c >= HI_START && c < HI_END && i + 1 < text.length && isLowSurrogate(text, i + 1)) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
    i += 1;
  }
  return bytes;
}

const ONEBYTE_END = 0x80;
const TWOBYTE_END = 0x800;
const HI_START = 0xd800;
const HI_END = 0xdc00;

const isLowSurrogate = (text: string, at: number): boolean => {
  const next = text.charCodeAt(at);
  return next >= 0xdc00 && next < 0xe000;
};

/** Một memo có trần: memo() là đường nóng, size() phục vụ test. */
export type Cache<V> = {
  readonly memo: (key: string, make: () => V) => V;
  readonly size: () => number;
};

const tracked = new Map<string, { size: () => number }>();

/** Tạo memo LRU trần CACHE_MAX và đăng ký nó (theo tên) để test đo được kích thước thật. */
export function boundedCache<V>(name: string): Cache<V> {
  const map = new Map<string, V>();
  const dropOldest = (): void => {
    if (map.size <= CACHE_MAX) return;
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  };
  const memo = (key: string, make: () => V): V => {
    const hit = map.get(key);
    if (hit !== undefined) {
      map.delete(key); // chạm tới ⇒ coi như vừa dùng, không bị xoá oan
      map.set(key, hit);
      return hit;
    }
    const made = make();
    map.set(key, made);
    dropOldest();
    return made;
  };
  const api = { memo, size: () => map.size };
  tracked.set(name, api);
  return api;
}

/** Kích thước HIỆN TẠI của mọi memo trong lõi — test E6 chứng minh "gọi vượt trần vẫn không phình". */
export function cacheSizes(): { name: string; size: number }[] {
  return [...tracked.entries()].map(([name, c]) => ({ name, size: c.size() }));
}

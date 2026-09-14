// Pattern: Deterministic PRNG (thay Math.random — PC-02)
// TRÁCH NHIỆM: mọi biến thiên của đề đi qua ĐÂY: băm chuỗi seed (FNV-1a 32 bít), trải số
//   (mulberry32), tách DÒNG CHẢY riêng cho từng quyết định (chain/answer/options/index),
//   xoay mảng theo tất định và dựng chỉ mục. Không trạng thái toàn cục: mỗi dòng tự lập từ tag.
// CHỮA BỆNH GÌ: Math.random/Date.now bị cấm trong src/logic ⇒ "cùng seed cùng đề" phải là
//   hệ quả CẤU TRÚC, không phải quy ước kỷ luật.
import type { ChapterLevelConfig } from './types';

export type Rng = { readonly next: () => number; readonly int: (bound: number) => number };

/** Băm FNV-1a 32 bít (số nguyên không dấu) — tất định, không phụ thuộc thứ tự module. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ (text.charCodeAt(i) >> 8), 0x01000193);
  }
  return h >>> 0;
}

/** Luồng số mulberry32 khởi động từ hash(tag) — cùng tag ⇒ cùng dãy, không có global state. */
function rngFor(tag: string): Rng {
  let s = hash32(tag);
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (bound: number) => Math.floor(next() * bound) };
}

/** Tên dòng chảy — thêm quyết định ngẫu nhiên mới = thêm một nhóC, không thêm tham số lạ. */
export type StreamName = 'chain' | 'answer' | 'options' | 'index';

/**
 * Dòng chảy RIÊNG cho một quyết định của một màn. Khoá là toàn bộ input ảnh hưởng tới đề
 * (seed, levelIndex, mọi field cfg) ⇒ đổi cfg đổi luôn dãy số, không "dính" dòng cũ.
 */
export function stream(
  seed: string,
  levelIndex: number,
  cfg: ChapterLevelConfig,
  purpose: StreamName,
): Rng {
  return rngFor([seed, levelIndex, cfg.chapter, cfg.levelInChapter, cfg.foldCount,
    cfg.punchCount, cfg.useCut, cfg.useDiagonal, purpose].join('|'));
}

/** Xoay mảng theo tất định (không shuffle bằng Math.random). */
export function rotate<T>(xs: readonly T[], by: number): T[] {
  const k = xs.length === 0 ? 0 : ((by % xs.length) + xs.length) % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

/** [0..n-1] — chỉ mục cho các vòng quay theo seed/variant. */
export const range = (n: number): number[] => Array.from({ length: Math.max(0, n) }, (_, i) => i);

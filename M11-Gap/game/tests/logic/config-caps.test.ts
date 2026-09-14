// ============================================================================
// B1c rev2 · C10 (mục "comment mô tả test không tồn tại"): cache.ts nói từng ô CAPS bị
//   đối chiếu THẲNG vào config/album.json · config/skins.json — trước đây CHƯA có test nào
//   làm việc đó. File này dựng đúng cổng đã hứa: mỗi ô CAPS phải khai NGUỒN (file config
//   hoặc pack); sửa config mà quên sửa CAPS ⇒ ĐỎ, và CAPS có ô mới mà bảng nguồn thiếu
//   ⇒ typecheck đỏ (Record<keyof typeof CAPS>) lẫn test đỏ.
// ============================================================================
// tsconfig "types": [] ⇒ không có khai báo kiểu cho node:fs (vitest vẫn chạy trong node);
// bật riêng dòng import này, cùng cách i18n.test.ts / records-store.test.ts đã dùng.
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { existsSync, readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { CAPS } from '../../src/logic/cache'

type CapsKey = keyof typeof CAPS
/** Nguồn của một ô: file config + đường dẫn key bên trong. */
type Source = { readonly file: string; readonly path: readonly string[] }

/** BẢNG NGUỒN duy nhất: null = ô lấy từ pack (không có trong config). */
const SOURCES: Record<CapsKey, Source | null> = {
  albumItems: { file: 'config/album.json', path: ['caps', 'albumItems'] },
  badges: { file: 'config/album.json', path: ['caps', 'badges'] },
  wallRowsPerLevel: { file: 'config/album.json', path: ['caps', 'wallRowsPerLevel'] },
  ghostsPerLevel: { file: 'config/album.json', path: ['caps', 'ghostsPerLevel'] },
  days: { file: 'config/album.json', path: ['caps', 'days'] },
  starterSkin: { file: 'config/skins.json', path: ['starter'] },
  telemetryCapBytes: null,
  snapshotKeep: null,
}

/** Giá trị chốt cho ô KHÔNG có nguồn config — đổi là ĐỎ, phải đổi kèm lý do ở pack. */
const PACK_PIN: Partial<Record<CapsKey, string | number>> = {
  telemetryCapBytes: 100 * 1024,
  snapshotKeep: 32,
}

const KEYS = Object.keys(SOURCES) as CapsKey[]
const fromConfig = KEYS.filter((k) => SOURCES[k] !== null)
const fromPack = KEYS.filter((k) => SOURCES[k] === null)

function pick(root: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], root)
}
/** Đọc file config THẬT (logic không tự mở file — tầng test/nền tảng mới được mở). */
function configValue(source: Source): unknown {
  expect(existsSync(source.file), 'thiếu file ' + source.file).toBe(true)
  return pick(JSON.parse(readFileSync(source.file, 'utf8')) as unknown, source.path)
}

describe('A8/C10 · CAPS là nguồn duy nhất và có nguồn khai rõ', () => {
  it('mọi ô của CAPS có đúng một dòng trong bảng nguồn (không ô nào vô chủ)', () => {
    expect(KEYS.slice().sort()).toEqual((Object.keys(CAPS) as CapsKey[]).slice().sort())
    expect(fromConfig.length + fromPack.length).toBe(KEYS.length)
  });

  it('ô có nguồn config khớp TỪNG Ô với config/album.json · config/skins.json', () => {
    for (const key of fromConfig) {
      const source = SOURCES[key] as Source
      expect(CAPS[key], key + ' khac ' + source.file).toBe(configValue(source))
    }
  });

  it('ô lấy từ pack đúng giá trị chốt, và KHÔNG có trong config nào', () => {
    for (const key of fromPack) {
      expect(PACK_PIN[key], key + ' thieu PACK_PIN').toBe(CAPS[key])
    }
    expect(configValue({ file: 'config/album.json', path: ['caps', 'telemetryCapBytes'] })).toBeUndefined()
  });

  it('không có trần nào khai lại ở records/save: CAPS.starterSkin là chuỗi duy nhất', () => {
    expect(CAPS.starterSkin).toBe(configValue({ file: 'config/skins.json', path: ['starter'] }))
    expect(String(CAPS.starterSkin)).not.toContain(' ')
  });
});

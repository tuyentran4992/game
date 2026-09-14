// ============================================================================
// B1c rev2 · C10 "code chết": hồ sơ PHẢI có đường ghi thật.
//   Ba mắt STORAGE_KEY / encodeRecords / decodeRecords trước đây chỉ sống trong records.ts
//   cùng test của nó, còn SAVE_KEYS.records là khoá mồ côi (không lời setItem nào). Nay
//   logic/recordsStore.ts là mặt tiền đọc/ghi DUY NHẤT của blob hồ sơ và src/main.ts là
//   caller production. File này kiểm: (1) round-trip qua KV giả, (2) KV hỏng ⇒ kết quả có
//   kiểu, (3) CẤU TRÚC ⇒ mỗi mắt chuỗi có call site NGOÀI module khai ra nó.
//   Hợp đồng cũ ở records.test.ts giữ nguyên văn — chỉ thêm mặt tiền mới, không sửa gì.
// ============================================================================
// tsconfig đặt "types": [] (không @types/node) nhưng test chạy trong node: cần đọc nguồn
// thật để kiểm CẤU TRÚC (mỗi mắt chuỗi phải có call site) ⇒ bật riêng dòng import này,
// cùng cách mà i18n.test.ts (TC-I18-01) đã dùng.
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { readFileSync, readdirSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { STAR_SCALE } from '../../src/logic/progression'
import { decodeRecords, encodeRecords, STORAGE_KEY } from '../../src/logic/records'
import { readRecords, writeRecords } from '../../src/logic/recordsStore'
import type { RecordsInput } from '../../src/logic/recordsStore'
import { SAVE_KEYS } from '../../src/logic/save'
import type { KV } from '../../src/logic/save'

type MemKV = KV & { dump: () => Record<string, string> }

function makeKV(initial: Record<string, string> = {}): MemKV {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? String(data.get(key)) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
}

/** KV từ chối GHI (quota) — cùng bài kiểm tra như writeThrowingKV của save.test.ts. */
const quotaKV = (): KV => ({
  getItem: () => null,
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => undefined,
});

/** KV từ chối ĐỌC (private mode) ⇒ bản trắng CÓ KIỂU, không được làm chết game. */
const lockedKV = (): KV => ({
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => undefined,
  removeItem: () => undefined,
});

const BLANK_STARS = STAR_SCALE.blank.repeat(STAR_SCALE.slots);
const row = (levelIndex: number, ms: number, wrongTaps: number) => ({ levelIndex, ms, wrongTaps });
const utf8 = (text: string): number => new TextEncoder().encode(text).length;

const SAMPLE: RecordsInput = {
  stars: '1230'.repeat(STAR_SCALE.slots / 4),
  ghosts: [row(2, 9000, 1), row(4, 5000, 0)],
  walls: [row(4, 5000, 0), row(4, 6100, 2)],
};

/** Nội dung một file src để test CẤU TRÚC (chống cổng chết) — lấy từ thư mục thật. */
const listTs = (dir: string): string[] =>
  (readdirSync(dir) as unknown as string[]).filter((f: string) => f.endsWith('.ts'))
const srcPaths = (): string[] => [
  ...listTs('src').map((f: string) => 'src/' + f),
  ...listTs('src/logic').map((f: string) => 'src/logic/' + f),
];
const readSrc = (path: string): string => readFileSync(path, 'utf8');
const usersOf = (re: RegExp, except: string): string[] =>
  srcPaths().filter((p) => !p.endsWith(except) && re.test(readSrc(p)));

// ------------------------------------------------------------- hành vi ghi ---

describe('C10 · writeRecords/readRecords là đường ghi THẬT của blob hồ sơ', () => {
  it('ghi xuống ĐÚNG khoá SAVE_KEYS.records rồi đọc ngược ra nguyên bản đã encode', () => {
    const kv = makeKV();
    const w = writeRecords(kv, SAMPLE);
    expect(w.ok).toBe(true);
    expect(w.key).toBe(SAVE_KEYS.records);
    expect(kv.dump()[STORAGE_KEY]).toBe(encodeRecords(SAMPLE));
    expect(readRecords(kv)).toEqual({ ...decodeRecords(encodeRecords(SAMPLE)), source: 'storage' });
  });

  it('bytes báo theo UTF-8 THẬT của blob nằm trong KV (PC-15/16), không phải length chuỗi', () => {
    const kv = makeKV();
    const w = writeRecords(kv, SAMPLE);
    if (!w.ok) {
      throw new Error('writeRecords phai ok, reason=' + String(w.reason));
    }
    const stored = String(kv.getItem(STORAGE_KEY));
    expect(w.bytes).toBe(utf8(stored));
    expect(w.bytes).toBeGreaterThan(0);
  });

  it('whitelist field: input mang field của ĐỀ BÀI ⇒ xuống disk vẫn đúng ba key (TC-GEN-03)', () => {
    const dirty = {
      ...SAMPLE,
      ghosts: [{ ...row(4, 5000, 0), folds: 'HV', answer: [1, 2] }],
      spec: { options: [], correctIndex: 3 },
    } as unknown as RecordsInput;
    const kv = makeKV();
    writeRecords(kv, dirty);
    const stored = JSON.parse(String(kv.getItem(STORAGE_KEY))) as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(['ghosts', 'stars', 'walls']);
    expect(JSON.stringify(stored)).not.toContain('correctIndex');
    expect(readRecords(kv).ghosts).toEqual([row(4, 5000, 0)]);
  });

  it('stars rác bị codec tẩy NGAY LÚC GHI ⇒ disk chỉ nhận 120 ô trắng, đọc lại vẫn lành', () => {
    const kv = makeKV();
    writeRecords(kv, { stars: 'abc', ghosts: [], walls: [] });
    expect(kv.dump()[STORAGE_KEY]).toContain(BLANK_STARS);
    const r = readRecords(kv);
    expect(r.stars).toBe(BLANK_STARS);
    expect(r.ok).toBe(true);
    expect(r.source).toBe('storage');
  });
});

// ------------------------------------------------------- hỏng hóc CÓ KIỂU ---

describe('C10 · KV hỏng hoặc blob rác ⇒ KẾT QUẢ CÓ KIỂU, không ném (ERR-01)', () => {
  it('KV ném khi ghi ⇒ {ok:false, reason:kv_error} + bytes 0, không ném, không ghi dở', () => {
    const kv = makeKV();
    expect(writeRecords(kv, SAMPLE).ok).toBe(true);
    const before = kv.dump()[STORAGE_KEY];
    expect(writeRecords(quotaKV(), SAMPLE)).toEqual({
      ok: false, key: STORAGE_KEY, bytes: 0, reason: 'kv_error',
    });
    expect(kv.dump()[STORAGE_KEY]).toBe(before);
  });

  it('KV ném khi đọc ⇒ bản trắng source kv_error (không phải empty, không phải corrupt)', () => {
    const r = readRecords(lockedKV());
    expect(r.source).toBe('kv_error');
    expect(r).toMatchObject({ ok: false, stars: BLANK_STARS, ghosts: [], walls: [] });
  });

  it('chưa cất gì ⇒ source empty; blob đọc được mà không parse được ⇒ source corrupt', () => {
    expect(readRecords(makeKV()).source).toBe('empty');
    expect(readRecords(makeKV({ [STORAGE_KEY]: '' })).source).toBe('empty');
    const junk = readRecords(makeKV({ [STORAGE_KEY]: 'khong phai json' }));
    expect(junk.source).toBe('corrupt');
    expect(junk).toMatchObject({ ok: false, stars: BLANK_STARS, ghosts: [], walls: [] });
  });

  it('blob thiếu stars nhưng ghosts còn lành ⇒ recovered một phần, ok:false nêu rõ hỏng', () => {
    const partial = JSON.stringify({ ghosts: [row(4, 5000, 0)] });
    const r = readRecords(makeKV({ [STORAGE_KEY]: partial }));
    expect(r.ok).toBe(false);
    expect(r.source).toBe('corrupt');
    expect(r.ghosts).toEqual([row(4, 5000, 0)]);
    expect(r.stars).toBe(BLANK_STARS);
  });
});

// ------------------------------------------------- cấu trúc: không cổng chết ---

describe('C10 · call site thật trong đồ thị src (quét file, không tin comment)', () => {
  const codec = /STORAGE_KEY|encodeRecords|decodeRecords/;

  it('STORAGE_KEY/encodeRecords/decodeRecords có hộ dùng NGOÀI records.ts', () => {
    expect(usersOf(codec, 'logic/records.ts').map((p) => p.split('/').pop())).toContain(
      'recordsStore.ts',
    );
  });

  it('khoá hồ sơ có ĐƯỜNG GHI: đúng một lời setItem thật lấy khoá từ records.ts', () => {
    expect(usersOf(/setItem\(\s*STORAGE_KEY/, 'logic/records.ts')).toEqual(['src/logic/recordsStore.ts']);
  });

  it('recordsStore có caller production (src/main.ts), không phải chỉ test gọi nó', () => {
    expect(readSrc('src/main.ts')).toMatch(/readRecords\(|writeRecords\(/);
    expect(usersOf(/from '\.\/logic\/recordsStore'/, 'x')).toEqual(['src/main.ts']);
  });

  it('mọi khoá trong SAVE_KEYS có ÍT NHẤT một hộ dùng ngoài saveSchema.ts', () => {
    for (const name of Object.keys(SAVE_KEYS)) {
      const users = usersOf(new RegExp('SAVE_KEYS\\.' + name), 'logic/saveSchema.ts');
      expect(users.length, 'khoá ' + name + ' không ai dùng ⇒ mồ côi').toBeGreaterThan(0);
    }
  });

  it('STORAGE_KEY nối về registry của save.ts (A2), không phải chuỗi tự đặt', () => {
    expect(STORAGE_KEY).toBe(SAVE_KEYS.records);
    expect(srcPaths().some((p) => p.endsWith('logic/recordsStore.ts'))).toBe(true);
  });
});

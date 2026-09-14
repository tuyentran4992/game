// Pattern: Chain of Responsibility theo version (MIGRATIONS là DỮ LIỆU, không if/else dây).
// TRÁCH NHIỆM: NÂNG CẤP + ĐIỀN DEFAULT một blob đã parse (PC-16, ERR-01/02): đi hết chuỗi
//   MIGRATIONS từ version của blob tới SAVE_VERSION, rồi để lớp điền default của bảng FIELDS quét
//   phần thiếu/hỏng và cắt theo trần. Hình dạng blob + default + serialize: saveSchema.ts;
//   ghi + cứu hộ ba tầng: save.ts.
// RÀNG BUỘC: dữ liệu bẩn ⇒ KẾT QUẢ CÓ KIỂU (reason / filled / migrated / fromFuture), không ném.

import {
  cloneDef, FIELDS, FIELD_NAMES, isInt, isPlain, SAVE_VERSION,
} from './saveSchema';
import type { FieldName, FieldSpec, Save } from './saveSchema';

/**
 * MỘT bậc nâng cấp. `take(name)` mượn default của field trong FIELDS và KÊ nó vào `filled`,
 * nên "field này sinh ra ở version nào" là dữ liệu khai báo, không phải hệ quả im lặng của
 * vòng điền default. Thêm version mới = THÊM MỘT DÒNG MIGRATIONS + đổi SAVE_VERSION.
 */
export type Migration = {
  readonly from: number;
  readonly to: number;
  readonly migrate: (raw: Record<string, unknown>, take: (name: FieldName) => void) => void;
};

/** Blob v0 chỉ có level/stars/ink + wardrobe ngoài đời; phần còn lại là của v1 (pack §4). */
const V1_ADDED: readonly FieldName[] = [
  'skins_owned', 'album_items', 'badges', 'sound_on', 'rev', 'ghosts', 'walls', 'dates',
];

/** CHUỖI NÂNG CẤP — mỗi bước from → to một dòng; đi lần lượt tới SAVE_VERSION. */
export const MIGRATIONS: readonly Migration[] = [
  { from: 0, to: SAVE_VERSION, migrate: (_raw, take) => { for (const f of V1_ADDED) take(f); } },
];

export type Migrated = {
  save: Save;
  /** Field phải điền default (do blob thiếu, hỏng, hoặc vừa được migration khai sinh). */
  filled: string[];
  /** Blob đến từ version CAO HƠN lõi ⇒ chỉ báo, không wipe. */
  fromFuture: boolean;
  /** Nhãn các bậc đã chạy, ví dụ ['0->1'] — rỗng nghĩa là không nâng cấp gì (không im lặng). */
  migrated: readonly string[];
};

const stepOf = (version: number): Migration | undefined => MIGRATIONS.find((m) => m.from === version);

/** Điền default cho field thiếu/hỏng, chạy chuỗi nâng cấp, cắt theo trần CAPS; không ném. */
export function migrateSave(raw: unknown): Migrated {
  const src: Record<string, unknown> = isPlain(raw) ? { ...raw } : {};
  const filled: string[] = [];
  const fromFuture = isInt(src.version) && src.version > SAVE_VERSION;
  const migrated: string[] = [];
  let version = isInt(src.version) ? src.version : SAVE_VERSION;
  while (!fromFuture && version < SAVE_VERSION) {
    const step = stepOf(version);
    if (step === undefined) break; // mất bậc ⇒ dừng lại, lớp điền default vẫn giữ blob đọc được
    step.migrate(src, (name) => {
      if (src[name] !== undefined) return;
      src[name] = cloneDef(FIELDS[name].def);
      filled.push(name);
    });
    src.version = step.to;
    migrated.push(step.from + '->' + step.to);
    version = step.to;
  }
  const out: Record<string, unknown> = {};
  for (const name of FIELD_NAMES) {
    const spec: FieldSpec<unknown> = FIELDS[name];
    const value = src[name];
    if (spec.valid(value)) out[name] = spec.tidy === undefined ? value : spec.tidy(value);
    else {
      out[name] = cloneDef(spec.def);
      filled.push(name);
    }
  }
  return { save: out as Save, filled, fromFuture, migrated };
}

export type ParseReason = 'corrupt_json' | 'not_object';
export type ParseResult =
  | { ok: true; save: Save; reason?: undefined }
  | { ok: false; reason: ParseReason; save?: undefined };

/** Parse + migrate một chuỗi JSON. Chuỗi rác ⇒ kết quả có kiểu, KHÔNG ném (ERR-01). */
export function parseSave(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'corrupt_json' };
  }
  if (!isPlain(raw)) return { ok: false, reason: 'not_object' };
  return { ok: true, save: migrateSave(raw).save };
}

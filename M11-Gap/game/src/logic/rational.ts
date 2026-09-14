// Pattern: Value Object
// TRÁCH NHIỆM: số hữu tỉ trên lưới 2^n — so khớp vị trí lỗ CHÍNH XÁC (cấm dùng float);
//   + định nghĩa quy ước encode/decode FLAT [x0,y0,x1,y1,...] của mảng toạ độ
//     (CONTRACT-AMBIGUITY-01/02 khai trong tests/logic/helpers.ts — xem types.ts).
// VÌ SAO quy ước điểm nằm ở đây: nó là thuộc tính của GIÁ TRỊ Rat, không của gấp giấy.
//   foldRules/generator/validator chỉ TIÊU THỤ, không định nghĩa lại.
// RÀNG BUỘC: 0 import ngoài ./types; 0 float trong so khớp (toNumber chỉ để hiển thị/đo).
// NGƯỠNG tham khảo: ~120 dòng.
import type { Point, Rat, RatPoint } from './types';

const B0 = 0n;
const B1 = 1n;

// ---------------------------------------------------------------------------
// CỔNG VÀO (vòng C / F2): `gcd` lặp tới khi số dư bằng 0 — với bigint hợp lệ nó LUÔN
// DỪNG, nhưng Rat rác dựng tay (NaN, Infinity, string, number, mẫu 0) làm `y !== 0n`
// đúng vĩnh viễn ⇒ TREO VÔ HẠN (đo được: toạ độ NaN/Infinity/Rat-from-string).
// Vì vậy mọi điểm vào module đi qua need()/toBig() TRƯỚC khi chạm bất kỳ vòng lặp nào;
// gcd không bị "vá" bằng bộ đếm vòng lặp — input rác không tới được nó.
// ---------------------------------------------------------------------------
const isBig = (v: unknown): v is bigint => typeof v === 'bigint';

/** Rat dựng tay phải là {bigint, bigint ≠ 0}. Rat hợp lệ luôn hữu hạn (bigint không có NaN). */
function need(where: string, a: Rat): void {
  const box = a as Partial<Rat> | null | undefined;
  const n = box?.n;
  const d = box?.d;
  if (!isBig(n) || !isBig(d)) {
    throw new Error('rational.' + where + ': can Rat {bigint,Bigint}, thay ' + typeof n + '(' + String(n) + ')/' + typeof d + '(' + String(d) + ')');
  }
  if (d === B0) throw new Error('rational.' + where + ': mau so = 0');
}

function absBig(a: bigint): bigint {
  return a < B0 ? -a : a;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = absBig(a);
  let y = absBig(b);
  while (y !== B0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === B0 ? B1 : x;
}

/** number → bigint CHỈ khi là số nguyên hữu hạn; string/NaN/Infinity/số thực ⇒ NÉM (F2). */
function toBig(where: string, v: bigint | number): bigint {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number' && Number.isInteger(v)) return BigInt(v);
  throw new Error('rational.' + where + ': can bigint hoac so nguyen huu han, thay ' + typeof v + ' (' + String(v) + ')');
}

/** Rat đã rút gọn + mẫu dương — cổng duy nhất tạo Rat trong module. */
function norm(n: bigint, d: bigint): Rat {
  if (d === B0) throw new Error('rational: mẫu số = 0');
  const s = d < B0 ? -B1 : B1;
  const nn = n * s;
  const dd = d * s;
  const g = gcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

export function rat(n: bigint | number, d: bigint | number = 1n): Rat {
  return norm(toBig('rat n', n), toBig('rat d', d));
}

/** So theo GIÁ TRỊ bằng cross-multiply — đúng cả khi Rat chưa chuẩn hoá (mẫu âm, chưa rút gọn). */
function crossDiff(a: Rat, b: Rat): bigint {
  const sa = a.d < B0 ? -B1 : B1;
  const sb = b.d < B0 ? -B1 : B1;
  return a.n * sa * (b.d * sb) - b.n * sb * (a.d * sa);
}

export function add(a: Rat, b: Rat): Rat {
  need('add', a);
  need('add', b);
  return norm(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Rat, b: Rat): Rat {
  need('sub', a);
  need('sub', b);
  return norm(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Rat, b: Rat): Rat {
  need('mul', a);
  need('mul', b);
  return norm(a.n * b.n, a.d * b.d);
}

export function div(a: Rat, b: Rat): Rat {
  need('div', a);
  need('div', b);
  if (b.n === B0) throw new Error('rational: chia cho 0');
  return norm(a.n * b.d, a.d * b.n); // norm() lo mẫu âm
}

export function eq(a: Rat, b: Rat): boolean {
  need('eq', a);
  need('eq', b);
  return crossDiff(a, b) === B0;
}

export function cmp(a: Rat, b: Rat): -1 | 0 | 1 {
  need('cmp', a);
  need('cmp', b);
  const t = crossDiff(a, b);
  // 3 nhánh này là ĐỊNH NGHĨA của thứ tự (-1|0|1), không phải chuỗi luật nghiệp vụ.
  if (t < B0) return -1;
  return t > B0 ? 1 : 0;
}

/** Kênh hiển thị/đo duy nhất (render, raster bitmap). CẤM dùng để so khớp vị trí lỗ. */
export function toNumber(a: Rat): number {
  need('toNumber', a);
  return Number(a.n) / Number(a.d);
}

/** Chuỗi canonical theo GIÁ TRỊ — khoá dedupe lỗ (PC-02: 1/2 và 2/4 phải cùng key). */
export function key(a: Rat): string {
  need('key', a); // F2: key là chỗ gcd bị quay vô hạn khi Rat rác lọt vào
  const g = gcd(a.n, a.d);
  let n = a.n / g;
  let d = a.d / g;
  if (d < B0) {
    n = -n;
    d = -d;
  }
  return String(n) + '/' + String(d);
}

/** Khoá điểm 2D — dedupe lỗ theo cả hai trục. */
export function pointKey(p: Point): string {
  return key(p.x) + ',' + key(p.y);
}

/** 0 ≤ a ≤ 1 — ràng buộc "toạ độ hợp lệ" của validator (tờ giấy vuông cạnh 1). */
export function inUnit(a: Rat): boolean {
  return cmp(a, rat(0)) >= 0 && cmp(a, rat(1)) <= 0;
}

export function inSheet(p: Point): boolean {
  return inUnit(p.x) && inUnit(p.y);
}

export function point(x: Rat, y: Rat): Point {
  need('point.x', x); // F2: điểm rác cũng không lọt được vào simulator
  need('point.y', y);
  return { x, y };
}

/** Point mang cả mặt nạ Rat (CONTRACT-AMBIGUITY-02): chiều vô hướng n/d = toạ độ x. */
export function ratPoint(x: Rat, y: Rat): RatPoint {
  const q = point(x, y);
  return { x: q.x, y: q.y, n: q.x.n, d: q.x.d };
}

/** Decode Rat[] FLAT ⇒ Point[]. Mảng lẻ = vi phạm quy ước ⇒ báo rõ nguyên nhân. */
export function toPoints(coords: readonly Rat[]): Point[] {
  if (coords.length % 2 !== 0) {
    throw new Error('rational.toPoints: mảng toạ độ dài lẻ (' + coords.length + ') — ky vong FLAT [x0,y0,...]');
  }
  const out: Point[] = [];
  for (let i = 0; i < coords.length; i += 2) out.push(point(coords[i], coords[i + 1]));
  return out;
}

/** Encode Point[] ⇒ Rat[] FLAT. */
export function flatPoints(pts: readonly Point[]): Rat[] {
  const out: Rat[] = [];
  for (const q of pts) out.push(q.x, q.y);
  return out;
}

/** Hai danh sách điểm có cùng TẬP giá trị không (bỏ qua thứ tự và dạng chưa rút gọn). */
export function samePointSet(a: readonly Point[], b: readonly Point[]): boolean {
  const ka = new Set(a.map(pointKey));
  const kb = new Set(b.map(pointKey));
  if (ka.size !== kb.size) return false;
  for (const k of ka) if (!kb.has(k)) return false;
  return true;
}


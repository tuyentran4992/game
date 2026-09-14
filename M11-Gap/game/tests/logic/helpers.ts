// ============================================================================
// helpers.ts — BỘ DÙNG CHUNG cho batch B1a (NHÓM A: lõi hình học + sinh đề + validator).
// ĐÂY KHÔNG PHẢI 1 SUITE TEST: tên file không khớp pattern "tests/**/*.test.ts"
// nên vitest không thu nó.
//
// Vì sao tồn tại:
//  (1) Test hình học + sinh đề phải dựng được số hữu tỉ và điểm 2D mà KHÔNG phụ thuộc
//      rational.ts (đang NOT_IMPLEMENTED). Nếu helper gọi rat()/key() thì một lỗi ở
//      rational.ts sẽ làm đỏ toàn bộ batch ⇒ không cô lập được unit đang test (anti-pattern TDD).
//      rational.ts có file test riêng (rational.test.ts); ở đây tự rút gọn bằng bigint.
//  (2) Mọi con số ngưỡng đều có NGUỒN, không tự bịa (TEST-CASES §15 cấm thêm benchmark mới).
// ============================================================================

import type { ChapterLevelConfig } from '../../src/logic/generator'
import type { FoldKind, LevelSpec, Rat, SheetAction } from '../../src/logic/types'

/** Seed CỐ ĐỊNH cho toàn batch (PC-02: cùng seed + cùng levelIndex ⇒ cùng một đề). */
export const GAME_SEED = 'M11-GAP-B1A-FIXTURE'

/** Lưới raster của validator. NGUỒN: g08_generator.py — "G = 16  # 16x16 raster". */
export const GRID = 16

/** Ngưỡng "hai phương án khác nhau rõ ràng". NGUỒN: src/logic/validator.ts (header ghi
 *  "Gốc tham chiếu: g08_verify.py (bitmap + hamming >= 6)") và assert "mind >= 6" trong g08_verify.py.
 *  Ghi chú: Python còn đặt MIN_HAM = 12 cho ô-nhiễu-so-với-đáp-án; test chỉ gate ở 6 đúng như
 *  doc của validator.ts, không tự nâng ngưỡng (TEST-CASES §15). */
export const MIN_PAIR_DISTANCE = 6

/** Số đề của ca đếm bằng máy. NGUỒN: PC-03 (SPEC §6) + TC-GEN-05 "10.000 đề liên tiếp". */
export const STRESS_COUNT = 10000

// ---------------------------------------------------------------------------
// CONTRACT-AMBIGUITY-01 — kiến nghị cho chủ file src/logic/types.ts (B1a CẤM sửa src/).
// Rat = { n: bigint; d: bigint } là MỘT số hữu tỉ, nhưng Option.holes: Rat[] và
// PunchAction.points: Rat[] phải mô tả ĐIỂM 2D — tự thân Rat[] không encode được (x, y).
// Quy ước ĐỘC NHẤT mà batch test này giả định:
//      Rat[] = chuỗi toạ độ FLAT [x0, y0, x1, y1, ...] ⇒ length luôn CHẴN, số lỗ = length/2
// Toàn bộ encode/decode đi qua flatPts()/toPts() ở dưới: nếu chốt cách encode khác thì chỉ
// sửa 2 hàm này, không phải sửa cả batch. Layer.map(p: Rat) và FoldRule.reflect(p, size)
// cũng chỉ nhận 1 trục — cùng một vấn đề, xem fold-rules.test.ts.
// ---------------------------------------------------------------------------

export type Pt = { readonly x: Rat; readonly y: Rat }

const absBig = (a: bigint): bigint => (a < 0n ? -a : a)

function gcd(a: bigint, b: bigint): bigint {
  let x = absBig(a)
  let y = absBig(b)
  while (y !== 0n) {
    const t = x % y
    x = y
    y = t
  }
  return x === 0n ? 1n : x
}

/** Rat literal đã rút gọn + mẫu dương. Tự chứa, không đụng rational.ts đang đỏ. */
export function R(n: bigint, d: bigint = 1n): Rat {
  if (d === 0n) throw new Error('R(): mau so = 0')
  let nn = n
  let dd = d
  if (dd < 0n) {
    nn = -nn
    dd = -dd
  }
  const g = gcd(nn, dd)
  return { n: nn / g, d: dd / g }
}

/** Điểm (xn/xd, yn/yd) trên tờ giấy vuông cạnh 1 — lưới đơn vị như g01/g08. */
export function p(xn: number, xd: number, yn: number, yd: number): Pt {
  return { x: R(BigInt(xn), BigInt(xd)), y: R(BigInt(yn), BigInt(yd)) }
}

/** Điểm tâm tờ giấy = giao của hai nếp H,V (g01: "on BOTH creases = paper center"). */
export const CENTER: Pt = p(1, 2, 1, 2)

/** Encode danh sách điểm ⇒ Rat[] theo quy ước FLAT (CONTRACT-AMBIGUITY-01). */
export function flatPts(pts: readonly Pt[]): Rat[] {
  const out: Rat[] = []
  for (const q of pts) out.push(q.x, q.y)
  return out
}

/** Decode Rat[] ⇒ danh sách điểm. Lẻ phần tử = vi phạm quy ước, báo rõ nguyên nhân. */
export function toPts(coords: readonly Rat[]): Pt[] {
  if (coords.length % 2 !== 0) {
    throw new Error(
      'CONTRACT-AMBIGUITY-01: mang toa do dai le (' +
        coords.length +
        ') — ky vong FLAT [x0,y0,x1,y1,...], so lo = length/2',
    )
  }
  const out: Pt[] = []
  for (let i = 0; i < coords.length; i += 2) out.push({ x: coords[i], y: coords[i + 1] })
  return out
}

/** Chuỗi canonical của 1 Rat (đã rút gọn, mẫu dương) — không dùng rational.key() (đang đỏ). */
export function rk(a: Rat): string {
  const g = gcd(a.n, a.d)
  let n = a.n / g
  let d = a.d / g
  if (d < 0n) {
    n = -n
    d = -d
  }
  return String(n) + '/' + String(d)
}

export function pk(q: Pt): string {
  return rk(q.x) + ',' + rk(q.y)
}

/** Tập lỗ đã dedupe theo GIÁ TRỊ đúng và sorted — so sánh không phụ thuộc thứ tự trả về. */
export function holeSet(coords: readonly Rat[]): string[] {
  return [...new Set(toPts(coords).map(pk))].sort()
}

export function holeCount(coords: readonly Rat[]): number {
  return holeSet(coords).length
}

/** Số lỗ KHÁC nhau giữa 2 phương án (symmetric difference) — thước đo PC-04 "khác ≥1 lỗ". */
export function diffHoles(a: readonly Rat[], b: readonly Rat[]): number {
  const sa = new Set(holeSet(a))
  const sb = new Set(holeSet(b))
  let n = 0
  for (const k of sa) if (!sb.has(k)) n++
  for (const k of sb) if (!sa.has(k)) n++
  return n
}

/** Hai danh sách điểm có cùng TẬP giá trị không (bỏ qua thứ tự và dạng chưa rút gọn). */
export function samePoints(a: readonly Pt[], b: readonly Pt[]): boolean {
  return sameSet(flatPts(a), flatPts(b))
}

// ---------------------------------------------------------------------------
// CONTRACT-AMBIGUITY-02 — cùng một vấn đề với CONTRACT-AMBIGUITY-01, nhưng ở chỗ nguy hiểm
// hơn: khung hợp đồng khai một VỊ TRÍ 2D bằng MỘT Rat:
//   unfoldHolesWithCount(...): { at: Rat; layers: number }[]
// Rat = { n, d } không chứa được (x, y). Test giả định implementation trả về object vị trí
// có đủ 2 thành phần { x: Rat, y: Rat } (cách đọc tự nhiên nhất của "at"). Nếu chủ file
// chọn cách encode khác, hàm này báo ĐỎ kèm đúng tên lỗi để bắt buộc chốt hợp đồng.
// ---------------------------------------------------------------------------
export function posOf(at: Rat): Pt {
  const box = at as unknown as Partial<Pt>
  if (box && typeof box === 'object' && 'x' in box && 'y' in box) {
    return { x: (box as Pt).x, y: (box as Pt).y }
  }
  throw new Error(
    'CONTRACT-AMBIGUITY-02: vi tri lo "at" khong phai diem 2D {x,y} — ' +
      'can chot hop dong unfoldHolesWithCount trong src/logic/types.ts + foldRules.ts',
  )
}

export function sameSet(a: readonly Rat[], b: readonly Rat[]): boolean {
  const ka = holeSet(a)
  const kb = holeSet(b)
  return ka.length === kb.length && ka.every((k, i) => k === kb[i])
}

function inZeroOne(a: Rat): boolean {
  const g = gcd(a.n, a.d)
  const n = a.n / g
  let d = a.d / g
  if (d < 0n) d = -d
  return n >= 0n && n <= d
}

/** Mọi toạ độ nằm trong tờ giấy [0,1]×[0,1] — validator.ts ghi rõ "toạ độ hợp lệ". */
export function insideSheet(coords: readonly Rat[]): boolean {
  return toPts(coords).every((q) => inZeroOne(q.x) && inZeroOne(q.y))
}

/** Serialize đề ở mức GIÁ TRỊ (đã rút gọn) nhưng GIỮ THỨ TỰ mảng: một hàm thuần
 *  determinist (PC-02) phải trả về y hệt cả thứ tự, không chỉ cùng tập hợp. */
export function serializeSpec(spec: LevelSpec): string {
  const holes = (hs: readonly Rat[]) => '[' + hs.map(rk).join(',') + ']'
  const act =
    spec.action.kind === 'punch'
      ? 'punch:' + holes(spec.action.points)
      : 'cut:' + spec.action.corner + ':' + rk(spec.action.size)
  return JSON.stringify({
    seed: spec.seed,
    levelIndex: spec.levelIndex,
    chapter: spec.chapter,
    folds: spec.folds,
    action: act,
    answerHoles: holes(spec.answerHoles),
    options: spec.options.map((o) => ({ id: o.id, holes: holes(o.holes) })),
    correctIndex: spec.correctIndex,
    difficulty: spec.difficulty,
    timerOn: spec.timerOn,
  })
}

export function punchPointsOf(spec: LevelSpec): Pt[] {
  if (spec.action.kind !== 'punch') throw new Error('de khong phai punch (kind=' + spec.action.kind + ')')
  return toPts(spec.action.points)
}

// ---------------------------------------------------------------------------
// BẢNG THAM SỐ SINH ĐỀ DÙNG TRONG TEST — mỗi con số lấy nguyên văn từ:
//   · SPEC §6.1 (lộ trình dạy luật: ch4 cắt góc chéo, ch5 gấp 8 lớp, ch6 nếp chéo D,
//     ch7 nhiều lỗ)  ·  PC-01 (timer chỉ từ chương 7)
//   · DATA-MODEL §3.1 (8 chương × 15 màn = 120, chương = ceil(level/15), 1–3 lượt gấp)
// ---------------------------------------------------------------------------
export const CHAPTERS = 8
export const LEVELS_PER_CHAPTER = 15
export const CAMPAIGN_LEVELS = CHAPTERS * LEVELS_PER_CHAPTER // 120 (PC-01)

export function cfgFor(chapter: number, levelInChapter: number): ChapterLevelConfig {
  return {
    chapter,
    levelInChapter,
    foldCount: chapter >= 5 ? 3 : 2, // ch1-4 gấp làm 4; ch5 "GẤP 8 LỚP (thêm 1 nếp)" — SPEC §6.1
    punchCount: chapter >= 7 ? 2 : 1, // ch7 "Nhiều lỗ (2-3 lỗ)" — SPEC §6.1
    useCut: chapter >= 4, // ch4 "Cắt góc chéo (thay vì đục lỗ)" — SPEC §6.1
    useDiagonal: chapter >= 6, // ch6 "Nếp chéo D (gấp tam giác)" — SPEC §6.1
    timerOn: chapter >= 7, // PC-01 "timer chỉ từ chương 7"
  }
}

/** Dải chiến dịch THẬT: levelIndex 1..120, chương = ceil(level/15) (DATA-MODEL §3.1). */
export function cfgCampaign(levelIndex: number): ChapterLevelConfig {
  const chapter = Math.ceil(levelIndex / LEVELS_PER_CHAPTER)
  return cfgFor(chapter, levelIndex - (chapter - 1) * LEVELS_PER_CHAPTER)
}

/** Dải TỔNG HỢP cho ca đếm máy (TC-GEN-05 ghi rõ: "dải seed tổng hợp, không phải 120 màn
 *  chính"). Quét đều 8 chương × 15 màn ⇒ mọi biến thể cfg đều được chạy ≥1000 lần. */
export function cfgSweep(i: number): ChapterLevelConfig {
  return cfgFor(1 + (i % CHAPTERS), 1 + (i % LEVELS_PER_CHAPTER))
}

// ---------------------------------------------------------------------------
// FIXTURE DỰNG TAY cho validator (không qua generator) ⇒ test validator cô lập, và
// TC-GEN-08 cần "đề xấu" xấu thật. Toạ độ chọn theo lưới 1/8; khoảng cách đôi một trên
// lưới 16 (1 ô = 1 lỗ) đã kiểm bằng số: A-B = A-C = A-D = 12, B-C = B-D = C-D = 16.
// ---------------------------------------------------------------------------
/** Đáp án mẫu: gấp H,V + đục 1 lỗ NGOÀI nếp tại (1/4,1/4) ⇒ 4 lỗ (chân lý g01_fold_sim.py). */
export const FIX_ANSWER: Pt[] = [p(1, 4, 1, 4), p(3, 4, 1, 4), p(1, 4, 3, 4), p(3, 4, 3, 4)]
/** Nhiễu 1 — lỗi "quên nếp, đếm thô 2^n": 8 lỗ trải rộng. */
export const FIX_D1: Pt[] = [
  p(1, 8, 1, 8), p(7, 8, 1, 8), p(1, 8, 7, 8), p(7, 8, 7, 8),
  p(3, 8, 3, 8), p(5, 8, 3, 8), p(3, 8, 5, 8), p(5, 8, 5, 8),
]
/** Nhiễu 2 — lỗi "phản xạ sai trục". */
export const FIX_D2: Pt[] = [
  p(1, 8, 1, 4), p(7, 8, 1, 4), p(1, 8, 3, 4), p(7, 8, 3, 4),
  p(3, 8, 1, 8), p(5, 8, 1, 8), p(3, 8, 7, 8), p(5, 8, 7, 8),
]
/** Nhiễu 3 — lỗi "phản xạ sai trục còn lại". */
export const FIX_D3: Pt[] = [
  p(1, 4, 1, 8), p(3, 4, 1, 8), p(1, 4, 7, 8), p(3, 4, 7, 8),
  p(1, 8, 3, 8), p(7, 8, 3, 8), p(1, 8, 5, 8), p(7, 8, 5, 8),
]
/** Nhiễu "GẦN như đúng": chỉ khác đáp án 1 lỗ — đạt PC-04 chữ nghĩa nhưng KHÔNG đạt ngưỡng raster. */
export const FIX_NEAR: Pt[] = [p(1, 4, 1, 4), p(3, 4, 1, 4), p(1, 4, 3, 4), p(3, 8, 3, 4)]

export function mkSpec(
  sets: readonly (readonly Pt[])[],
  correctIndex: number,
  answer?: readonly Pt[],
): LevelSpec {
  const action: SheetAction = { kind: 'punch', points: flatPts([CENTER]) }
  return {
    seed: GAME_SEED,
    levelIndex: 1,
    chapter: 1,
    folds: ['H', 'V'] as FoldKind[],
    action,
    answerHoles: flatPts(answer ?? sets[correctIndex] ?? []),
    options: sets.map((s, i) => ({ id: i, holes: flatPts(s) })),
    correctIndex,
    difficulty: 2,
    timerOn: false,
  }
}

/** Đề TỐT chuẩn công thức: 1 đáp án + 3 nhiễu, mọi cặp cách nhau 12 ô lưới ≥ ngưỡng 6. */
export function goodSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3], 0)
}

/** Đề xấu 1 — PC-04: hai ô nhiễu GIỐNG HỆT nhau. */
export function duplicatedOptionSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_D1, FIX_D1, FIX_D3], 0)
}

/** Đề xấu 2 — PC-04/PC-03: ô nhiễu TRÙNG ĐÁP ÁN ⇒ có 2 ô khớp, "đúng 1 đáp án" sụp. */
export function distractorEqualsAnswerSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_D1, FIX_ANSWER, FIX_D3], 0)
}

/** Đề xấu 3 — PC-03: KHÔNG CÓ đáp án đúng trong 4 ô. */
export function noCorrectSpec(): LevelSpec {
  return mkSpec([FIX_D1, FIX_D2, FIX_D3, FIX_NEAR], 0, FIX_ANSWER)
}

/** Đề xấu 4 — PC-03: có đúng 1 ô khớp đáp án nhưng correctIndex trỏ SAI ô. */
export function wrongIndexSpec(): LevelSpec {
  return mkSpec([FIX_D1, FIX_D2, FIX_ANSWER, FIX_D3], 0)
}

/** Đề xấu 5 — PC-04: chỉ 3 phương án (phải đủ 4). */
export function threeOptionsSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_D1, FIX_D2], 0)
}

/** Đề xấu 6 — "toạ độ hợp lệ": một lỗ nằm NGOÀI tờ giấy tại (3/2, 1/4). */
export function outOfBoundsSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, [...FIX_D3, p(3, 2, 1, 4)]], 0)
}

/** Đề "gần như đúng" — dùng chứng minh minPairDistance bắt được, còn PC-04 chữ nghĩa thì đạt. */
export function nearDuplicateSpec(): LevelSpec {
  return mkSpec([FIX_ANSWER, FIX_NEAR, FIX_D1, FIX_D2], 0)
}

// ---------------------------------------------------------------------------
// MÔ HÌNH HÌNH HỌC + RASTER "VIẾT TAY" (VÒNG FIX B — review F-8: bỏ oracle tự tham chiếu).
// Vì sao phải dựng lại ở đây: rule PC-04 của validator đo bằng bitmapOf+hamming, và test cũ
// cũng đo bằng đúng 2 hàm đó ⇒ một công thức sai ở cả hai phía không bao giờ bị phát hiện.
// Toàn bộ mục này KHÔNG gọi src/logic (không bitmapOf/cellOf/hamming/unfoldPoints):
// affine được dựng bằng SỐ NGUYÊN trên lưới 1/8 — cùng định luật với g01_fold_sim.py
// (mỗi nếp = phản chiếu qua giữa packet HIỆN HÀNH; D = hoán vị trục; không đổi kích thước).
// ---------------------------------------------------------------------------

/** Một đơn vị tờ giấy = E phần tử ⇒ mọi toạ độ của generator nằm trên lưới 1/8. */
const E = 8

/** Affine nguyên 2 trục: X = a*x + b*y + e ; Y = c*x + d*y + f (hệ số theo lưới 1/8). */
export type HandMap = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number }

const handCompose = (o: HandMap, r: HandMap): HandMap => ({
  a: o.a * r.a + o.b * r.c,
  b: o.a * r.b + o.b * r.d,
  c: o.c * r.a + o.d * r.c,
  d: o.c * r.b + o.d * r.d,
  e: o.a * r.e + o.b * r.f + o.e,
  f: o.c * r.e + o.d * r.f + o.f,
})

/**
 * Danh sách lớp + kích thước packet (đơn vị 1/8) sau `folds`, dựng lại từ định luật gấp.
 * Đ3 (review F8 + VÒNG FIX D1): mô hình viết tay PHẢI ĐỘC LẬP VÀ ĐÚNG — nếp chéo D phản xạ
 * qua đường chéo x=y nên chỉ thực hiện được khi packet còn VUÔNG. Bản cũ copy nguyên giả
 * định "D = swap vô điều kiện" của src ⇒ oracle cùng sai với src nên không bao giờ bắt được
 * đề có lỗ ngoài tờ. Chuỗi sai ⇒ NÉM (src cũng phải ném — đó là điều kiện test được).
 */
export function handLayers(folds: readonly FoldKind[]): { maps: HandMap[]; w: number; h: number } {
  let w = E
  let h = E
  let maps: HandMap[] = [{ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }]
  folds.forEach((k, i) => {
    if (k === 'D' && w !== h) {
      throw new Error('handLayers: nếp D ở vị trí ' + (i + 1) + ' cần packet VUÔNG, lúc đó packet ' + w + 'x' + h + ' (đơn vị 1/' + E + ') — chuỗi ' + folds.join('') + ' không gấp được')
    }
    const r: HandMap =
      k === 'H' ? { a: -1, b: 0, c: 0, d: 1, e: w, f: 0 }
        : k === 'V' ? { a: 1, b: 0, c: 0, d: -1, e: 0, f: h }
          : { a: 0, b: 1, c: 1, d: 0, e: 0, f: 0 }
    maps = maps.map((m) => handCompose(m, r)).concat(maps)
    if (k === 'H') w = w / 2
    if (k === 'V') h = h / 2
  })
  return { maps, w, h }
}

/** Ảnh của một điểm packet (đơn vị 1/8) qua một lớp, ở đúng định dạng khoá của holeSet(). */
function handImage(m: HandMap, x: number, y: number): string {
  return pk({ x: R(BigInt(m.a * x + m.b * y + m.e), BigInt(E)), y: R(BigInt(m.c * x + m.d * y + m.f), BigInt(E)) })
}

/** Tập vị trí lỗ khi mở bung MỘT điểm đục (đã dedupe, sorted). */
function handOrbitOf(maps: readonly HandMap[], x: number, y: number): string[] {
  return [...new Set(maps.map((m) => handImage(m, x, y)))].sort()
}

/** Toàn bộ quỹ đạo đôi một khác nhau của lưới 1/8 nằm trong packet, sắp theo kích thước. */
export function handOrbitSizes(folds: readonly FoldKind[]): number[] {
  const { maps, w, h } = handLayers(folds)
  const sets = new Set<string>()
  for (let i = 0; i <= w; i++) for (let j = 0; j <= h; j++) sets.add(handOrbitOf(maps, i, j).join(';'))
  return [...sets].map((s) => s.split(';').length).sort((a, b) => a - b)
}

/**
 * Trần số điểm đục của một chuỗi nếp, tính TAY: quỹ đạo của các điểm đục rời nhau từng đôi
 * một, nên cực đại hoá số điểm = cộng dồn quỹ đạo NHỎ NHẤT sao cho tổng vị trí lỗ ≤ 2^số nếp.
 */
export function handCapacity(folds: readonly FoldKind[]): number {
  let used = 0
  let n = 0
  for (const s of handOrbitSizes(folds)) {
    if (used + s > 2 ** folds.length) break
    used += s
    n += 1
  }
  return n
}

/** Bội số 1/8 của một Rat (null nếu ngoài lưới — tức generator đã sinh điểm lạ). */
function eighths(a: Rat): number | null {
  const v = R(a.n, a.d)
  const num = v.n * BigInt(E)
  if (num % v.d !== 0n) return null
  return Number(num / v.d)
}

/**
 * "Bảng chân lý" của một đề punch: tập lỗ thu được khi mở bung chính các điểm đục
 * của action (Rat[] FLAT). null ⇒ có điểm đục ngoài lưới 1/8, không đo được bằng mô hình.
 */
export function handAnswerKeys(folds: readonly FoldKind[], punch: readonly Rat[]): string[] | null {
  const { maps } = handLayers(folds)
  const out = new Set<string>()
  for (let i = 0; i + 1 < punch.length; i += 2) {
    const x = eighths(punch[i])
    const y = eighths(punch[i + 1])
    if (x === null || y === null) return null
    for (const k of handOrbitOf(maps, x, y)) out.add(k)
  }
  return [...out].sort()
}

/** Ô raster (x:y) của một toạ độ — ⌊a*grid⌋ bằng bigint + clamp 0..grid-1, tự viết. */
function handCell(a: Rat, grid: number): number {
  const v = R(a.n, a.d)
  const i = Number((v.n * BigInt(grid)) / v.d)
  return i < 0 ? 0 : i > grid - 1 ? grid - 1 : i
}

/** Tập ô sáng của một phương án — thay cho bitmapOf() của validator. */
export function handCells(coords: readonly Rat[], grid: number): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i + 1 < coords.length; i += 2) out.add(handCell(coords[i], grid) + ':' + handCell(coords[i + 1], grid))
  return out
}

/** Số ảnh phân biệt của MỘT GÓC packet khi mở bung = số CỤM tổn thương một nhát cắt vùng
 *  góc đó phải để lại (§7.5 — oracle g01 đếm cụm). Mô hình số nguyên 1/8, KHÔNG gọi src. */
export function handCornerImages(folds: readonly FoldKind[], corner: 'BL' | 'BR' | 'TL' | 'TR'): number {
  const { maps, w, h } = handLayers(folds)
  const at: Record<'BL' | 'BR' | 'TL' | 'TR', [number, number]> = { BL: [0, 0], BR: [w, 0], TL: [0, h], TR: [w, h] }
  const [x, y] = at[corner]
  return handOrbitOf(maps, x, y).length
}

/** Gom tập ô "col:row" thành cụm 8-lân-cận — định nghĩa VIẾT TAY của "một vệt tổn thương". */
export function handCellClusters(cells: ReadonlySet<string>): string[][] {
  const left = new Set(cells)
  const out: string[][] = []
  while (left.size > 0) {
    const start = [...left][0] as string
    left.delete(start)
    const group = [start]
    const queue = [start]
    while (queue.length > 0) {
      const [c, r] = (queue.pop() as string).split(':').map(Number)
      for (let dc = -1; dc <= 1; dc++)
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue
          const k = c + dc + ':' + (r + dr)
          if (!left.has(k)) continue
          left.delete(k)
          group.push(k)
          queue.push(k)
        }
    }
    out.push(group.sort())
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}

/** Khoảng cách raster của 2 phương án = số ô lệch (|A Δ B|) — thay cho hamming(). */
export function handDistance(a: readonly Rat[], b: readonly Rat[], grid: number): number {
  const sa = handCells(a, grid)
  const sb = handCells(b, grid)
  let n = 0
  for (const k of sa) if (!sb.has(k)) n += 1
  for (const k of sb) if (!sa.has(k)) n += 1
  return n
}

/** Khoảng cách nhỏ nhất của mọi cặp phương án — phiên bản viết tay của minPairDistance. */
export function handPairwiseMinOf(sets: readonly (readonly Rat[])[], grid: number): number {
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) min = Math.min(min, handDistance(sets[i], sets[j], grid))
  return sets.length < 2 ? 0 : min
}
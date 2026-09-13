// ============================================================================
// B1a · NHÓM A — src/logic/foldRules.ts: unfoldHoles / unfoldHolesWithCount
// PHỦ TRỰC TIẾP TC-GEN-09 (lỗ TRÊN NẾP) + TC-GEN-10 (lỗ GIỮA mặt / ở mép) — rule PC-03.
//
// SỐ LIỆU CHÂN LÝ: lấy nguyên văn từ bản Python đã verify
//   /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers/img/show)
// đã chạy lại bằng số hữu tỉ chính xác để ghi ra bảng dưới đây (không ước lượng):
//   HV  lỗ NGOÀI nếp (1/4,1/4) -> 4 lỗ        HV  lỗ TRÊN nếp (1/2,1/4) -> 2 lỗ
//   HV  lỗ ở TÂM    (1/2,1/2) -> 1 lỗ         HVH lỗ chung   (1/8,3/8) -> 8 lỗ
//   HVH lỗ ở tâm    (1/2,1/2) -> 3 lỗ         HVH (1/4,1/2)  -> 2 lỗ ; HVH (0,0) -> 6 lỗ
//   D  lệch chéo -> 2 ; D  trên chéo -> 1 ; DV -> 4 ; DV trên nếp -> 3 ; HH -> 2 (4 lớp!)
// Lưới: tờ giấy vuông cạnh 1 (đúng đơn vị của g01/g08).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { unfoldHoles, unfoldHolesWithCount } from '../../src/logic/foldRules'
import type { FoldKind, Rat } from '../../src/logic/types'
import { R, p, pk, rk, flatPts, holeCount, holeSet, insideSheet, posOf, type Pt } from './helpers'

const ONE = R(1n)

type Truth = { readonly name: string; readonly folds: FoldKind[]; readonly punch: Pt[]; readonly holes: Pt[] }

/** Bảng chân lý — một dòng = một it() bên dưới. */
const TRUTH: Truth[] = [
  {
    // CHÂN LÝ #1 (đề bài yêu cầu): gấp H,V + đục 1 lỗ NGOÀI nếp ⇒ 4 lỗ.
    name: 'CHÂN LÝ: HV · 1 lỗ NGOÀI nếp (1/4,1/4) ⇒ 4 lỗ (4 lớp đều bị ăn)',
    folds: ['H', 'V'],
    punch: [p(1, 4, 1, 4)],
    holes: [p(1, 4, 1, 4), p(3, 4, 1, 4), p(1, 4, 3, 4), p(3, 4, 3, 4)],
  },
  {
    // CHÂN LÝ #2: lỗ TRÊN nếp ⇒ 2 lỗ — chính là câu copy §4.3 "that punch only makes 2 holes".
    name: 'CHÂN LÝ: HV · lỗ TRÊN NẾP x=1/2 tại (1/2,1/4) ⇒ 2 lỗ (2 lớp trùng khít, không phải 4)',
    folds: ['H', 'V'],
    punch: [p(1, 2, 1, 4)],
    holes: [p(1, 2, 1, 4), p(1, 2, 3, 4)],
  },
  {
    name: 'CHÂN LÝ: HV · lỗ TRÊN NẾP y=1/2 tại (1/4,1/2) ⇒ 2 lỗ (đối xứng trục kia)',
    folds: ['H', 'V'],
    punch: [p(1, 4, 1, 2)],
    holes: [p(1, 4, 1, 2), p(3, 4, 1, 2)],
  },
  {
    // CHÂN LÝ #3: lỗ ở TÂM tờ ⇒ 1 lỗ (cả 4 lớp gặp nhau tại một điểm).
    name: 'CHÂN LÝ: HV · lỗ ở TÂM (1/2,1/2) = giao hai nếp ⇒ 1 lỗ duy nhất',
    folds: ['H', 'V'],
    punch: [p(1, 2, 1, 2)],
    holes: [p(1, 2, 1, 2)],
  },
  {
    // CHÂN LÝ #4: H,V,H + 1 lỗ chung ⇒ 8 lỗ.
    name: 'CHÂN LÝ: HVH · lỗ chung (1/8,3/8) ⇒ 8 lỗ (đủ 8 lớp, không cặp nào trùng)',
    folds: ['H', 'V', 'H'],
    punch: [p(1, 8, 3, 8)],
    holes: [
      p(1, 8, 3, 8), p(1, 8, 5, 8), p(3, 8, 3, 8), p(3, 8, 5, 8),
      p(5, 8, 3, 8), p(5, 8, 5, 8), p(7, 8, 3, 8), p(7, 8, 5, 8),
    ],
  },
  {
    // CHÂN LÝ #5: H,V,H + lỗ ở tâm ⇒ 3 lỗ (tâm + 2 điểm giữa cạnh trái/phải).
    name: 'CHÂN LÝ: HVH · lỗ ở TÂM (1/2,1/2) ⇒ 3 lỗ (tâm 4 lớp + 2 điểm mép 2 lớp)',
    folds: ['H', 'V', 'H'],
    punch: [p(1, 2, 1, 2)],
    holes: [p(0, 1, 1, 2), p(1, 2, 1, 2), p(1, 1, 1, 2)],
  },
  {
    name: 'PC-03 · ch5-8: HVH · lỗ trên nếp mới x=1/4 tại (1/4,3/8) ⇒ 4 lỗ (2 lớp gộp một)',
    folds: ['H', 'V', 'H'],
    punch: [p(1, 4, 3, 8)],
    holes: [p(1, 4, 3, 8), p(1, 4, 5, 8), p(3, 4, 3, 8), p(3, 4, 5, 8)],
  },
  {
    name: 'PC-03 · ch5-8: HVH · lỗ trên nếp cũ y=1/2 tại (1/8,1/2) ⇒ 4 lỗ',
    folds: ['H', 'V', 'H'],
    punch: [p(1, 8, 1, 2)],
    holes: [p(1, 8, 1, 2), p(3, 8, 1, 2), p(5, 8, 1, 2), p(7, 8, 1, 2)],
  },
  {
    name: 'PC-03 · ch5-8: HVH · lỗ trên CẢ HAI nếp (1/4,1/2) ⇒ 2 lỗ',
    folds: ['H', 'V', 'H'],
    punch: [p(1, 4, 1, 2)],
    holes: [p(1, 4, 1, 2), p(3, 4, 1, 2)],
  },
  {
    name: 'PC-03 · ch3 (mép): HVH · góc packet (0,0) ⇒ 6 lỗ (có điểm rơi đúng mép thô, không phải 8)',
    folds: ['H', 'V', 'H'],
    punch: [p(0, 1, 0, 1)],
    holes: [p(0, 1, 0, 1), p(0, 1, 1, 1), p(1, 2, 0, 1), p(1, 2, 1, 1), p(1, 1, 0, 1), p(1, 1, 1, 1)],
  },
  {
    name: 'PC-03 · ch3 (mép): HV · góc thô (0,0) ⇒ 4 lỗ ở 4 góc tờ',
    folds: ['H', 'V'],
    punch: [p(0, 1, 0, 1)],
    holes: [p(0, 1, 0, 1), p(1, 1, 0, 1), p(0, 1, 1, 1), p(1, 1, 1, 1)],
  },
  {
    name: 'PC-03 · ch3 (mép ∩ nếp): HV · điểm (1/2,0) = nếp x ∧ mép thô y ⇒ 2 lỗ',
    folds: ['H', 'V'],
    punch: [p(1, 2, 0, 1)],
    holes: [p(1, 2, 0, 1), p(1, 2, 1, 1)],
  },
  {
    name: 'PC-03 · 1 nếp: H · (1/4,1/4) ⇒ 2 lỗ; V · (1/4,1/4) ⇒ 2 lỗ theo trục dọc',
    folds: ['H'],
    punch: [p(1, 4, 1, 4)],
    holes: [p(1, 4, 1, 4), p(3, 4, 1, 4)],
  },
  {
    name: 'PC-03 · 1 nếp trên nếp cũ: H · (1/2,1/4) nằm đúng nếp ⇒ 1 lỗ',
    folds: ['H'],
    punch: [p(1, 2, 1, 4)],
    holes: [p(1, 2, 1, 4)],
  },
  {
    name: 'PC-03 · V · (1/4,1/4) ⇒ 2 lỗ đối xứng trục ngang',
    folds: ['V'],
    punch: [p(1, 4, 1, 4)],
    holes: [p(1, 4, 1, 4), p(1, 4, 3, 4)],
  },
  {
    name: 'PC-03 · bẫy "số lớp ≠ số lỗ": HH (4 lớp, cùng trục) · (1/4,1/4) ⇒ chỉ 2 lỗ',
    folds: ['H', 'H'],
    punch: [p(1, 4, 1, 4)],
    holes: [p(1, 4, 1, 4), p(3, 4, 1, 4)],
  },
  {
    name: 'PC-03 · ch6 (chéo D): D · lỗ lệch chéo (1/4,3/5) ⇒ 2 lỗ hoán vị toạ độ',
    folds: ['D'],
    punch: [p(1, 4, 3, 5)],
    holes: [p(1, 4, 3, 5), p(3, 5, 1, 4)],
  },
  {
    name: 'PC-03 · ch6 (chéo D): D · lỗ TRÊN đường chéo (3/10,3/10) ⇒ 1 lỗ',
    folds: ['D'],
    punch: [p(3, 10, 3, 10)],
    holes: [p(3, 10, 3, 10)],
  },
  {
    name: 'PC-03 · ch6: D rồi V · (1/3,1/4) ⇒ 4 lỗ (mẫu số 3 — bắt buộc tính đúng bằng hữu tỉ)',
    folds: ['D', 'V'],
    punch: [p(1, 3, 1, 4)],
    holes: [p(1, 4, 1, 3), p(1, 3, 1, 4), p(1, 3, 3, 4), p(3, 4, 1, 3)],
  },
  {
    name: 'PC-03 · ch6: D rồi V · lỗ trên nếp chéo (1/3,1/3) ⇒ 3 lỗ',
    folds: ['D', 'V'],
    punch: [p(1, 3, 1, 3)],
    holes: [p(1, 3, 1, 3), p(1, 3, 2, 3), p(2, 3, 1, 3)],
  },
  {
    name: 'PC-03 · ch7 (nhiều lỗ): HV · 2 lỗ (1/4,1/4)+(1/2,1/2) ⇒ hiệp 5 vị trí (1 trùng tâm)',
    folds: ['H', 'V'],
    punch: [p(1, 4, 1, 4), p(1, 2, 1, 2)],
    holes: [p(1, 4, 1, 4), p(3, 4, 1, 4), p(1, 4, 3, 4), p(3, 4, 3, 4), p(1, 2, 1, 2)],
  },
  {
    name: 'PC-03 · thứ tự nếp có nghĩa: VH · (1/4,1/4) ⇒ 4 lỗ giống HV (kiểm không nhân đôi sai)',
    folds: ['V', 'H'],
    punch: [p(1, 4, 1, 4)],
    holes: [p(1, 4, 1, 4), p(3, 4, 1, 4), p(1, 4, 3, 4), p(3, 4, 3, 4)],
  },
]

describe('foldRules.unfoldHoles — mở bung 1 lỗ thành tập vị trí thật (TC-GEN-09/10 · PC-03)', () => {
  for (const t of TRUTH) {
    it('PC-03 · ' + t.name, () => {
      const got: Rat[] = unfoldHoles(t.folds, ONE, flatPts(t.punch))
      expect(holeSet(got)).toEqual(holeSet(flatPts(t.holes)))
      expect(got.length % 2).toBe(0) // CONTRACT-AMBIGUITY-01: FLAT [x0,y0,...]
      expect(holeCount(got)).toBe(got.length / 2) // không trả trùng vị trí 2 lần
      expect(insideSheet(got)).toBe(true) // mọi lỗ thật phải nằm trên tờ giấy
    })
  }

  it('PC-02 · nền determinism của PC-03: unfoldHoles là hàm thuần — gọi 2 lần cùng input ra cùng chuỗi toạ độ', () => {
    const a = unfoldHoles(['H', 'V', 'H'], ONE, flatPts([p(1, 8, 3, 8)]))
    const b = unfoldHoles(['H', 'V', 'H'], ONE, flatPts([p(1, 8, 3, 8)]))
    expect(a.map(rk)).toEqual(b.map(rk))
  })

  it('PC-03 · số lớp không phải số lỗ: HV · (1/2,1/4) cho 2 vị trí nhưng vẫn là 4 lớp giấy bị đục', () => {
    const holes = unfoldHoles(['H', 'V'], ONE, flatPts([p(1, 2, 1, 4)]))
    expect(holeCount(holes)).toBe(2)
    const withCount = unfoldHolesWithCount(['H', 'V'], ONE, flatPts([p(1, 2, 1, 4)]))
    expect(withCount.reduce((sum, h) => sum + h.layers, 0)).toBe(4)
  })
})

describe('foldRules.unfoldHolesWithCount — dữ liệu cho animation D1 (PC-03, lớp nào trùng lớp nào)', () => {
  it('PC-03 · D1: HV · lỗ ở tâm ⇒ ĐÚNG 1 vị trí với layers = 4 (bốn lớp ghép một lỗ)', () => {
    const got = unfoldHolesWithCount(['H', 'V'], ONE, flatPts([p(1, 2, 1, 2)]))
    expect(got.length).toBe(1)
    expect(pk(posOf(got[0].at))).toBe(pk(p(1, 2, 1, 2)))
    expect(got[0].layers).toBe(4)
  })

  it('PC-03 · D1: HV · lỗ trên nếp ⇒ 2 vị trí, mỗi vị trí layers = 2 ("2 lớp trùng khít")', () => {
    const got = unfoldHolesWithCount(['H', 'V'], ONE, flatPts([p(1, 2, 1, 4)]))
    const byPos = new Map(got.map((h) => [pk(posOf(h.at)), h.layers]))
    expect([...byPos.keys()].sort()).toEqual(['1/2,1/4', '1/2,3/4'])
    expect([...byPos.values()].sort()).toEqual([2, 2])
  })

  it('PC-03 · D1: HV · lỗ ngoài nếp ⇒ 4 vị trí, mỗi vị trí layers = 1', () => {
    const got = unfoldHolesWithCount(['H', 'V'], ONE, flatPts([p(1, 4, 1, 4)]))
    expect(got.length).toBe(4)
    expect(got.every((h) => h.layers === 1)).toBe(true)
  })

  it('PC-03 · D1: HVH · lỗ ở tâm ⇒ 3 vị trí với layers = 4 + 2 + 2 (tổng 8 lớp)', () => {
    const got = unfoldHolesWithCount(['H', 'V', 'H'], ONE, flatPts([p(1, 2, 1, 2)]))
    const byPos = new Map(got.map((h) => [pk(posOf(h.at)), h.layers]))
    // Khoá điểm theo helpers.rk/pk in dạng n/d CHUẨN HÓA: toạ độ nguyên in là '0/1', '1/1'
    // (đúng format mà it() phía trên dùng: '1/2,1/4'). layers 2+4+2 = 8 lớp đã kiểm bằng máy.
    expect(byPos.get('0/1,1/2')).toBe(2)
    expect(byPos.get('1/2,1/2')).toBe(4)
    expect(byPos.get('1/1,1/2')).toBe(2)
    expect(got.reduce((sum, h) => sum + h.layers, 0)).toBe(8)
  })

  it('PC-03 · hai API phải tự nhất quán: tập vị trí của unfoldHolesWithCount == unfoldHoles (mọi dòng bảng chân lý)', () => {
    for (const t of TRUTH) {
      const flat = flatPts(t.punch)
      const plain = holeSet(unfoldHoles(t.folds, ONE, flat))
      const counted = holeSet(flatPts(unfoldHolesWithCount(t.folds, ONE, flat).map((h) => posOf(h.at))))
      expect(counted, 'mismatch at: ' + t.name).toEqual(plain)
    }
  })

  it('PC-03 · đáp án đề chương 2 (lỗ trên nếp) KHÁC hẳn chương 1 (lỗ giữa mặt) — 2 vs 4 vị trí', () => {
    const face = unfoldHoles(['H', 'V'], ONE, flatPts([p(1, 4, 1, 4)]))
    const crease = unfoldHoles(['H', 'V'], ONE, flatPts([p(1, 2, 1, 4)]))
    expect(holeCount(face)).toBe(4)
    expect(holeCount(crease)).toBe(2)
    expect(holeSet(face)).not.toEqual(holeSet(crease))
  })
})
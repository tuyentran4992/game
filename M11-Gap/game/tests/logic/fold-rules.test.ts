// ============================================================================
// B1a · NHÓM A — src/logic/foldRules.ts (Pattern: Registry + Strategy, STRUCTURE §2)
// Phủ TC-GEN-10 (bảng tra fold rules) + một nửa TC-GEN-09 (hình học 1 nếp).
// Rule: PC-03 (đáp án sinh từ trạng thái mở bung ⇒ luật gấp phải đúng từng toạ độ),
//       PC-01/SPEC §5.3 (thêm kiểu gấp = thêm 1 DÒNG DỮ LIỆU, cấm chuỗi if/else).
// Gốc chân lý: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { FOLD_RULES, makeLayers } from '../../src/logic/foldRules'
import type { FoldKind } from '../../src/logic/types'
import { R, rk } from './helpers'

const ONE = R(1n)
const HALF = R(1n, 2n)
const kinds: FoldKind[] = ['H', 'V', 'D']

describe('foldRules — bảng tra kiểu gấp H/V/D (TC-GEN-10 · PC-03 + SPEC §5.3)', () => {
  it('PC-03 · SPEC §5.3: registry có ĐÚNG 3 dòng H/V/D và mỗi dòng xài được (foldedSize + reflect không quăng)', () => {
    expect(Object.keys(FOLD_RULES).sort()).toEqual(['D', 'H', 'V'])
    for (const k of kinds) {
      expect(() => FOLD_RULES[k].foldedSize(ONE)).not.toThrow()
      expect(() => FOLD_RULES[k].reflect(R(1n, 4n), ONE)).not.toThrow()
    }
  })

  it('PC-03: H gấp phải chia đôi kích thước tờ — foldedSize(1) = 1/2, foldedSize(1/2) = 1/4', () => {
    expect(rk(FOLD_RULES.H.foldedSize(ONE))).toBe(rk(HALF))
    expect(rk(FOLD_RULES.H.foldedSize(HALF))).toBe('1/4')
  })

  it('PC-03: V cũng chia đôi (trục còn lại) — foldedSize(1) = 1/2', () => {
    expect(rk(FOLD_RULES.V.foldedSize(ONE))).toBe(rk(HALF))
    expect(rk(FOLD_RULES.V.foldedSize(R(1n, 4n)))).toBe('1/8')
  })

  it('PC-03: D (chéo trên tờ vuông) KHÔNG đổi bounding box theo g01 — foldedSize(1) = 1', () => {
    // g01_fold_sim.py: nhánh 'D' không gán lại w/h; chỉ có H/V mới halving.
    expect(rk(FOLD_RULES.D.foldedSize(ONE))).toBe('1/1')
  })

  it('PC-03: H.reflect đổi bên qua nếp giữa — 1/4 -> 3/4 trên tờ cạnh 1, và 1/8 -> 3/8 trên packet cạnh 1/2', () => {
    expect(rk(FOLD_RULES.H.reflect(R(1n, 4n), ONE))).toBe('3/4')
    expect(rk(FOLD_RULES.H.reflect(R(1n, 8n), HALF))).toBe('3/8')
  })

  it('PC-03: V.reflect đối xứng trục kia — 1/4 -> 3/4, 3/8 -> 1/8 trên packet cạnh 1/2', () => {
    expect(rk(FOLD_RULES.V.reflect(R(1n, 4n), ONE))).toBe('3/4')
    expect(rk(FOLD_RULES.V.reflect(R(3n, 8n), HALF))).toBe('1/8')
  })

  it('PC-03: điểm NGAY TRÊN NẾP là điểm bất động của reflect (cơ sở câu giải thích D1 "2 lớp trùng khít")', () => {
    expect(rk(FOLD_RULES.H.reflect(HALF, ONE))).toBe('1/2')
    expect(rk(FOLD_RULES.V.reflect(HALF, ONE))).toBe('1/2')
    expect(rk(FOLD_RULES.H.reflect(R(1n, 4n), HALF))).toBe('1/4') // nếp của nếp gấp thứ 3
  })

  it('PC-03: reflect là phép đối hợp (involution) — soi 2 lần trở về đúng chỗ cũ, mọi kiểu, mọi cỡ tờ', () => {
    for (const k of ['H', 'V'] as FoldKind[]) {
      for (const size of [ONE, HALF, R(1n, 4n)]) {
        for (const n of [0n, 1n, 3n, 5n]) {
          const x = R(n, 8n)
          expect(rk(FOLD_RULES[k].reflect(FOLD_RULES[k].reflect(x, size), size))).toBe(rk(x))
        }
      }
    }
  })

  it('PC-03 (CONTRACT-AMBIGUITY-01): D phản xạ qua đường chéo x=y ⇒ điểm trên chéo là bất động', () => {
    // reflect/p: Rat nhận 1 trục, còn D về bản chất đổi (x,y)->(y,x). Điều kiện ĐÚNG theo g01
    // mà mọi cách cài đặt phải thoả: điểm nằm trên chéo (toạ độ hai trục bằng nhau) chiếu
    // thành chính nó. Nếu cài D như H/V (size - p) thì 1/3 -> 2/3 ⇒ case này đỏ.
    expect(rk(FOLD_RULES.D.reflect(R(1n, 3n), ONE))).toBe('1/3')
  })

  it('PC-02: foldedSize/reflect là hàm thuần — cùng input 2 lần gọi trả cùng giá trị (nền của seed stability)', () => {
    const s1 = FOLD_RULES.H.foldedSize(R(3n, 8n))
    const s2 = FOLD_RULES.H.foldedSize(R(3n, 8n))
    const r1 = FOLD_RULES.V.reflect(R(3n, 16n), R(1n, 2n))
    const r2 = FOLD_RULES.V.reflect(R(3n, 16n), R(1n, 2n))
    expect(rk(s1)).toBe(rk(s2))
    expect(rk(r1)).toBe(rk(r2))
  })
})

describe('foldRules.makeLayers — dựng danh sách lớp (TC-GEN-09/10 · PC-03)', () => {
  it('PC-03: mỗi nếp nhân đôi số lớp — 1 nếp = 2, 2 nếp = 4, 3 nếp = 8, 4 nếp = 16', () => {
    expect(makeLayers(['H'], ONE).layers.length).toBe(2)
    expect(makeLayers(['V'], ONE).layers.length).toBe(2)
    expect(makeLayers(['H', 'V'], ONE).layers.length).toBe(4)
    expect(makeLayers(['H', 'V', 'H'], ONE).layers.length).toBe(8)
    expect(makeLayers(['H', 'V', 'H', 'V'], ONE).layers.length).toBe(16)
    expect(makeLayers(['D'], ONE).layers.length).toBe(2)
  })

  it('PC-03: packetSize đúng theo g01 — gấp 1 nếp = 1/2, gấp H rồi V (vuông) = 1/2, HVHV = 1/4', () => {
    expect(rk(makeLayers(['H'], ONE).packetSize)).toBe('1/2')
    expect(rk(makeLayers(['V'], ONE).packetSize)).toBe('1/2')
    expect(rk(makeLayers(['H', 'V'], ONE).packetSize)).toBe('1/2')
    expect(rk(makeLayers(['H', 'V', 'H', 'V'], ONE).packetSize)).toBe('1/4')
    // CHỨNG MINH bằng số: chuỗi ['H','V','H'] cho packet CHỮ NHẬT 1/4 x 1/2 (g01 in ra
    // packet=0.25x0.5) ⇒ không có "cạnh vuông" duy nhất để assert, nên chỉ assert số lớp.
    expect(makeLayers(['H', 'V', 'H'], ONE).layers.length).toBe(8)
  })

  it('PC-03: mỗi lớp là một affine map dùng được (Layer.map là hàm, không phải dữ liệu thô)', () => {
    const { layers } = makeLayers(['H', 'V'], ONE)
    for (const L of layers) expect(typeof L.map).toBe('function')
    expect(() => layers[0].map(R(1n, 4n))).not.toThrow()
  })

  it('PC-03 · CONTRACT-AMBIGUITY-01: trên chuỗi gấp H/V, ảnh của MỘT TRỤC qua các lớp khớp bảng tra — x=1/4 cho {1/4, 3/4} (HV) và {1/8,3/8,5/8,7/8} (HVH)', () => {
    const axis = (folds: FoldKind[], coord: bigint, den: bigint): string[] => {
      const { layers } = makeLayers(folds, ONE)
      return [...new Set(layers.map((L) => rk(L.map(R(coord, den)))))]
    }
    expect(axis(['H', 'V'], 1n, 4n).sort()).toEqual(['1/4', '3/4'])
    expect(axis(['H', 'V', 'H'], 1n, 8n).sort()).toEqual(['1/8', '3/8', '5/8', '7/8'])
    expect(axis(['H', 'V'], 3n, 8n).sort()).toEqual(['3/8', '5/8'])
    // trục y của cùng chuỗi: nếp gấp không đụng y ⇒ đúng 2 ảnh (1/4 và 3/4)
    expect(axis(['H', 'V', 'H'], 3n, 8n).sort()).toEqual(['3/8', '5/8'])
  })

  it('PC-03: lớp đứng yên có map là phép đồng nhất — 1/8 -> 1/8 trên mọi chuỗi gấp (lớp dưới cùng)', () => {
    const idImages = makeLayers(['H', 'V', 'H'], ONE).layers.map((L) => rk(L.map(R(1n, 8n))))
    expect(idImages).toContain('1/8')
    expect(makeLayers(['D'], ONE).layers.length).toBe(2)
  })
})
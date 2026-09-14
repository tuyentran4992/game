// ============================================================================
// B1a · NHÓM A — src/logic/foldRules.ts (Pattern: Registry + Strategy, STRUCTURE §2)
// Phủ TC-GEN-10 (bảng tra fold rules) + một nửa TC-GEN-09 (hình học 1 nếp).
// Rule: PC-03 (đáp án sinh từ trạng thái mở bung ⇒ luật gấp phải đúng từng toạ độ),
//       PC-01/SPEC §5.3 (thêm kiểu gấp = thêm 1 DÒNG DỮ LIỆU, cấm chuỗi if/else).
// Gốc chân lý: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { FOLD_KIND_ALL, FOLD_RULES, firstFoldDefect, makeLayers, unfoldHoles, unfoldPoints } from '../../src/logic/foldRules'
import { classifyCluster, NOTCH_SPAN } from '../../src/logic/cutGeometry'
import { RASTER_CELL } from '../../src/logic/raster'
import type { Pt } from './helpers'
import type { FoldKind, Rat } from '../../src/logic/types'
import { GRID, R, flatPts, handAnswerKeys, handLayers, holeSet, insideSheet, p, pk, rk } from './helpers'

const ONE = R(1n)
const HALF = R(1n, 2n)
/** Một điểm lưới 1/8 nằm trong packet của mọi chuỗi 1..3 nếp. */
const P18 = p(1, 8, 1, 8)
/** Ảnh mở bung của MỘT điểm, ở dạng khoá sorted của helpers (oracle ĐỘC LẬP với src). */
const orbit = (folds: FoldKind[], q: Pt): string[] => holeSet(flatPts(unfoldPoints(folds, ONE, [q])))
/** So ảnh mở bung của src với mô hình viết tay handAnswerKeys (không dùng API nội bộ). */
const handOrbit = (folds: FoldKind[], q: Pt): string[] => handAnswerKeys(folds, flatPts([q])) as string[]

describe('foldRules — bảng registry kiểu nếp (TC-GEN-10 · PC-03 + SPEC §5.3)', () => {
  it('E5/A5: Object.keys(FOLD_RULES) phủ TOÀN BỘ FOLD_KIND_ALL — không so danh sách hardcode', () => {
    const keys = Object.keys(FOLD_RULES).sort()
    expect(FOLD_KIND_ALL.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length) // không trùng dòng
    expect([...FOLD_KIND_ALL].sort()).toEqual(keys) // mọi kiểu đều có dòng
    expect(FOLD_KIND_ALL.every((k) => FOLD_RULES[k] !== undefined)).toBe(true)
  })

  it('PC-03 · SPEC §5.3: mỗi dòng registry XÀI ĐƯỢC thật — mở bung một điểm đục trả ≥1 lỗ, nằm trong tờ', () => {
    for (const k of FOLD_KIND_ALL) {
      const holes = unfoldPoints([k], ONE, [P18])
      expect(holes.length, k).toBeGreaterThanOrEqual(1)
      expect(insideSheet(flatPts(holes)), k).toBe(true)
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

  it('PC-03: nếp H soi điểm qua nếp giữa — đục (1/4,1/4) mở ra đúng 2 lỗ (1/4,1/4) và (3/4,1/4)', () => {
    expect(orbit(['H'], p(1, 4, 1, 4))).toEqual(['1/4,1/4', '3/4,1/4'])
  })

  it('PC-03: nếp V soi qua nếp giữa trục còn lại — đục (1/4,1/4) mở ra (1/4,1/4) và (1/4,3/4)', () => {
    expect(orbit(['V'], p(1, 4, 1, 4))).toEqual(['1/4,1/4', '1/4,3/4'])
  })

  it('PC-03: điểm NGAY TRÊN NẾP là điểm bất động — lỗ không nhân đôi (cơ sở câu giải thích D1 "2 lớp trùng khít")', () => {
    expect(orbit(['H'], p(1, 2, 1, 4))).toEqual(['1/2,1/4'])
    expect(orbit(['V'], p(1, 4, 1, 2))).toEqual(['1/4,1/2'])
  })

  it('PC-03: đối hợp (soi 2 lần về chỗ cũ) đo bằng ảnh mở bung — mọi điểm lưới 1/8, chuỗi H và V', () => {
    const bad: string[] = []
    for (const folds of [['H'], ['V']] as FoldKind[][])
      for (let i = 0; i <= 8; i++)
        for (let j = 0; j <= 8; j++) {
          const q = p(i, 8, j, 8)
          const got = orbit(folds, q)
          if (got.length > 2) bad.push(folds.join('') + '@' + i + '/' + j + ' ra ' + got.length + ' lỗ (>2)')
          if (got.join(';') !== handOrbit(folds, q).join(';')) bad.push(folds.join('') + '@' + i + '/' + j + ' khác mô hình viết tay')
        }
    expect(bad, bad.slice(0, 4).join(' || ')).toEqual([])
  })

  it('PC-03 (CONTRACT-AMBIGUITY-01): D phản xạ qua chéo x=y ⇒ điểm trên chéo bất động, điểm khác chéo hoán vị trục', () => {
    expect(orbit(['D'], p(1, 3, 1, 3))).toEqual(['1/3,1/3'])
    expect(orbit(['D'], p(1, 8, 3, 8))).toEqual(['1/8,3/8', '3/8,1/8'])
  })

  it('PC-02: mở bung là hàm THUẦN — cùng (chuỗi, cỡ tờ, điểm đục) 2 lần gọi trả y hệt (nền của seed stability)', () => {
    const punch = flatPts([p(1, 8, 3, 8)])
    const a = holeSet(unfoldHoles(['H', 'V'], ONE, punch))
    const b = holeSet(unfoldHoles(['H', 'V'], ONE, punch))
    expect(a).toEqual(b)
    expect(a).toEqual(['1/8,3/8', '1/8,5/8', '7/8,3/8', '7/8,5/8'])
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

  it('PC-03: mỗi lớp đưa một điểm của packet VỀ một điểm hợp lệ TRONG tờ — mọi lớp của chuỗi HVH', () => {
    const { layers } = makeLayers(['H', 'V', 'H'], ONE)
    expect(layers.length).toBe(8)
    for (const L of layers) expect(insideSheet(flatPts([L.mapPoint(P18)]))).toBe(true)
  })

  it('PC-03 · CONTRACT-AMBIGUITY-01: ảnh mở bung KHỚP mô hình viết tay độc lập — 5 chuỗi, mọi điểm lưới 1/8', () => {
    const chains: FoldKind[][] = [['H', 'V'], ['H', 'V', 'H'], ['D', 'H', 'V'], ['H', 'H'], ['V', 'H']]
    const bad: string[] = []
    for (const folds of chains)
      for (let i = 0; i <= 8; i++)
        for (let j = 0; j <= 8; j++) {
          const q = p(i, 8, j, 8)
          if (orbit(folds, q).join(';') !== handOrbit(folds, q).join(';')) bad.push(folds.join('') + '@' + i + '/' + j)
        }
    expect(bad, bad.slice(0, 5).join(' ')).toEqual([])
  })

  it('PC-03 · bảng chân lý VIẾT TAY: HV đục (1/8,1/8) ⇒ 4 lỗ bốn góc; HVH ⇒ 8 lỗ (4 cột × 2 hàng)', () => {
    expect(orbit(['H', 'V'], P18)).toEqual(['1/8,1/8', '1/8,7/8', '7/8,1/8', '7/8,7/8'])
    // nếp H đầu + nếp H cuối nhân đôi HOÀNH (1/8,3/8,5/8,7/8); nếp V chỉ nhân đôi tung (1/8,7/8).
    expect(orbit(['H', 'V', 'H'], P18)).toEqual([
      '1/8,1/8', '1/8,7/8', '3/8,1/8', '3/8,7/8',
      '5/8,1/8', '5/8,7/8', '7/8,1/8', '7/8,7/8',
    ])
  })

  it('PC-03: lớp dưới cùng là đồng nhất ⇒ ảnh mở bung của một điểm LUÔN chứa chính nó', () => {
    const chains: FoldKind[][] = [['H'], ['V'], ['H', 'V'], ['H', 'V', 'H'], ['D']]
    for (const folds of chains) expect(orbit(folds, P18), folds.join('')).toContain(pk(P18))
  })

  // -------------------------------------------------------------------------
  // VÒNG FIX D1 · nếp chéo D chỉ gấp được khi packet CÒN VUÔNG (luật đặt trong
  // registry, không hardcode theo kiểu nếp) — chuỗi sai phải bị phát hiện ở TẦNG
  // HÌNH HỌC, không chờ generator trả đề có lỗ ngoài tờ.
  // -------------------------------------------------------------------------
  it('D1 · registry khai nếp nào cần vuông (H/V false, D true) — thêm kiểu nếp chỉ sửa bảng', () => {
    expect(FOLD_RULES.D.needsSquare).toBe(true)
    expect(FOLD_RULES.H.needsSquare).toBe(false)
    expect(FOLD_RULES.V.needsSquare).toBe(false)
  })

  it('D1 · firstFoldDefect = null khi packet còn vuông lúc gấp D: D, DH, DHV, HVD, VHD', () => {
    for (const chain of [['D'], ['D', 'H'], ['D', 'H', 'V'], ['H', 'V', 'D'], ['V', 'H', 'D']] as FoldKind[][]) {
      expect(firstFoldDefect(chain), chain.join('')).toBeNull()
    }
  })

  it('D1 · firstFoldDefect chỉ đúng nếp D sai chỗ (vị trí 1-based + packet chữ nhật lúc đó)', () => {
    const cases: [FoldKind[], number][] = [[['H', 'D'], 1], [['H', 'H', 'D'], 2], [['V', 'V', 'D'], 2], [['D', 'V', 'V', 'D'], 3]]
    for (const [chain, at] of cases) {
      const bad = firstFoldDefect(chain)
      expect(bad, chain.join('') + ' phải bị từ chối').not.toBeNull()
      expect(bad?.at).toBe(at)
      expect(bad?.kind).toBe('D')
      expect(rk(bad?.packet.w as Rat)).not.toBe(rk(bad?.packet.h as Rat))
    }
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX D2/D3 · §7.5 "phân loại tổn thương" phải CÓ TÁC DỤNG THẬT: ngưỡng đo bằng
// Ô RASTER (lưới 16×16 của validator) so với cỡ cắt, không phải "3×cỡ cắt" mù quáng —
// bản cũ khiến 1.165/1.165 cụm đều bị gọi là edge-notch ⇒ rule notch-vs-hole vô dụng.
// ---------------------------------------------------------------------------
describe('foldRules.classifyCluster — phân loại cụm cắt theo ô raster (§7.5 · FIX D2)', () => {
  /** Điểm tâm ô (col,row) của lưới raster 1/16 — đúng dạng cụm mà generator đưa vào. */
  const cell = (col: number, row: number): Pt => p(2 * col + 1, 2 * GRID, 2 * row + 1, 2 * GRID)
  /** Khối đặc cols×rows ô, gốc ở ô (0,0). Span mỗi trục = (số ô - 1)/RASTER_GRID. */
  const block = (cols: number, rows: number): Pt[] => {
    const out: Pt[] = []
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) out.push(cell(c, r))
    return out
  }
  const LEG_2CELL = R(2n, BigInt(GRID)) // đúng 2 Ô raster (cỡ cắt 1/8 của packet cạnh 1/2)
  const LEG_TINY = R(1n, 64n) // nhỏ hơn MỘT Ô: chỉ còn sàn raster phân biệt được hai lớp

  it('D2 · một ô đơn độc và cụm 2×2 là KHUYẾT MÉP; cụm 4×4 là LỖ TRÒN (cả hai lớp đều có)', () => {
    expect(classifyCluster(block(1, 1), LEG_2CELL)).toBe('edge-notch')
    expect(classifyCluster(block(2, 2), LEG_2CELL)).toBe('edge-notch')
    expect(classifyCluster(block(4, 4), LEG_2CELL)).toBe('full-hole')
  })

  it('D2 · ngưỡng sàn là NOTCH_SPAN Ô raster, không phải "3×cỡ cắt": cỡ 1/64 vẫn phân loại được', () => {
    // Bản cũ: lim = 3×(1/64) = 3/64, span cụm 2×2 = 4/64 ⇒ MỌI cụm đều lọt 'full-hole'.
    // Bản mới: sàn = (NOTCH_SPAN-1) ô = 2/16 = 8/64 ⇒ cụm 2×2 là notch, cụm ≥3×3 mới là lỗ.
    expect(rk(RASTER_CELL)).toBe('1/' + GRID)
    expect(rk(R(BigInt(NOTCH_SPAN) - 1n, BigInt(GRID)))).toBe('1/8') // sàn = 2 ô raster
    expect(classifyCluster(block(2, 2), LEG_TINY)).toBe('edge-notch')
    expect(classifyCluster(block(3, 3), LEG_TINY)).toBe('full-hole')
    expect(classifyCluster(block(4, 4), LEG_TINY)).toBe('full-hole')
  })

  it('D2 · phải rộng hơn CHÍNH cỡ nhát cắt ở CẢ hai chiều: dải 1 ô theo một trục là notch', () => {
    expect(classifyCluster(block(6, 1), LEG_TINY)).toBe('edge-notch') // một vệt dọc = mép bị cắn
    expect(classifyCluster(block(1, 6), LEG_TINY)).toBe('edge-notch')
    expect(classifyCluster([], LEG_2CELL)).toBe('edge-notch') // rỗng không phải lỗ
  })

  it('D2 · so đúng với cỡ cắt: cùng khối 4×4, leg nhỏ ⇒ lỗ tròn, leg to hơn vệt ⇒ khuyết mép', () => {
    expect(classifyCluster(block(4, 4), R(1n, 16n))).toBe('full-hole')
    expect(classifyCluster(block(4, 4), R(1n, 4n))).toBe('edge-notch')
  })

  it('D3 · hàm phân loại là THUẦN: cùng cụm + cùng leg ⇒ cùng lớp, không phụ thuộc thứ tự điểm', () => {
    const pts = block(4, 4)
    expect(classifyCluster(pts, LEG_2CELL)).toBe(classifyCluster(pts, LEG_2CELL))
    expect(classifyCluster(pts, LEG_2CELL)).toBe(classifyCluster([...pts].reverse(), LEG_2CELL))
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX D3 · oracle viết tay (helpers.handLayers) phải ĐỘC LẬP VÀ ĐÚNG với src.
// Bản cũ của handLayers copy nguyên giả định sai "D = swap vô điều kiện" ⇒ khi src sinh
// đề có lỗ ngoài tờ (bug D1) thì mô hình viết tay cũng sai y hệt, test không bao giờ đỏ.
// ---------------------------------------------------------------------------
describe('handLayers (oracle viết tay) áp luật vuông như src — FIX D1/D3', () => {
  /** Mọi chuỗi nếp độ dài 1..3 trên bảng chữ {H,V,D}: 3 + 9 + 27 = 39 chuỗi khác nhau. */
  const allChains = (): FoldKind[][] => {
    const kinds: FoldKind[] = ['H', 'V', 'D']
    const byKey = new Map<string, FoldKind[]>()
    for (const a of kinds)
      for (const b of [...kinds, undefined])
        for (const c of [...kinds, undefined]) {
          const chain = [a, b, c].filter((k): k is FoldKind => k !== undefined)
          byKey.set(chain.join(''), chain)
        }
    return [...byKey.values()].sort((x, y) => x.join('').localeCompare(y.join('')))
  }
  const handThrows = (chain: FoldKind[]): boolean => {
    try {
      handLayers(chain)
      return false
    } catch {
      return true
    }
  }

  it('D3 · handLayers NÉM với D sai chỗ và không NÉM với D trên packet vuông', () => {
    for (const chain of [['H', 'D'], ['H', 'H', 'D'], ['V', 'V', 'D'], ['D', 'V', 'V', 'D']] as FoldKind[][]) {
      expect(handThrows(chain), chain.join('')).toBe(true)
    }
    for (const chain of [['D'], ['D', 'H'], ['H', 'V', 'D']] as FoldKind[][]) {
      expect(handThrows(chain), chain.join('')).toBe(false)
    }
  })

  it('D3 · src và mô hình viết tay ĐỒNG Ý về hợp lệ trên 39 chuỗi, và tập lỗ khớp nhau', () => {
    const chains = allChains()
    expect(chains.length).toBe(39)
    const bad: string[] = []
    for (const chain of chains) {
      const srcSaysLegal = firstFoldDefect(chain) === null
      const handLegal = !handThrows(chain)
      if (srcSaysLegal !== handLegal) {
        bad.push(chain.join('') + ': src hợp lệ=' + srcSaysLegal + ' nhưng mô hình viết tay hợp lệ=' + handLegal)
        continue
      }
      if (!srcSaysLegal) continue
      // chuỗi hợp lệ ⇒ mở bung một điểm đục phải khớp mô hình viết tay VÀ nằm trong tờ giấy
      const punch = flatPts([p(1, 8, 1, 8)])
      const holes = unfoldHoles(chain, ONE, punch)
      const truth = handAnswerKeys(chain, punch) as string[]
      if (truth.join(';') !== holeSet(holes).join(';')) {
        bad.push(chain.join('') + ': tay=' + truth.join(';') + ' src=' + holeSet(holes).join(';'))
      }
      if (!insideSheet(holes)) bad.push(chain.join('') + ': có lỗ ngoài tờ giấy')
    }
    expect(bad, bad.slice(0, 6).join(' || ')).toEqual([])
  })
})
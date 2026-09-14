// ============================================================================
// layout.test.ts — LUOI AN TOAN CUA VONG SUA LAYOUT (camera COT DOC 720x1420).
//
// Vi sao file nay ton tai: ban cu quy moi so theo CHIEU CAO cua camera ngang 1920x1080 nen
//   · to giay ra 453,6 x 453,6 (mockup 480 x 480),
//   · o dap an ra 334,8 x 172,8 (NGANG, mockup 240 x 264 phai CAO hon rong),
//   · HUD sao (x 841->1079) CHONG hu Muc (x 953->1093) toi 126 don vi ma khong test nao do,
//     vi moi luc test chi kiem CHUOI trong file. Du day la SUAT TOAN HOC cua tung o.
//
// KHONG import phaser — thuan so, chay trong node (luat phien: test la hop dong).
// So neo: DESIGN-SPEC §4.1 (man choi) + §4.2 (Title). Doi so o layout.ts ma khong doi o DAY
// thi do; doi ca hai thi reviewer phai thay dong mockup nao bi sua.
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  CAMERA, layoutOf, TAP_MIN, SAFE_PAD, MIN_FONT_PX,
  innerRect, cardArt, holeField, buttonFace, inkFace, pressShift,
  dotFieldSide, frameStroke,
  fitFontSize, textWidthPx, textHeightPx, type Box, type Layout,
} from '../../src/render/layout'
import { holeRadius, maxDotRadius, closestPair, MAX_HOLES } from '../../src/render/holeView'
import { basePx } from '../../src/render/components/fitText'
import { levelSpec } from '../../src/logic/generator'
import { toNumber, toPoints } from '../../src/logic/rational'
import { CAMPAIGN_LEVELS, cfgCampaign, GAME_SEED } from './helpers'

// --- So lieu MOCKUP, chep nguyen van §4.1/§4.2 (don vi = cot 720x1420) --------
const COL_W = 720
const COL_H = 1420
/** Moi o HUD/nut phai cach mep cot it nhat bay nhieu (chong dinh mep tren dien thoai). */
const EDGE = 16
/** Khoang trong giua hai cot / hai hang cua luoi o dap an. */
const OPTION_GAP = 24
/** V6.1/V6.2: padding TOI THIEU noi dung -> vien cua mot o (so chot, khong phai cua layout). */
const PAD_MIN = 12
/**
 * V3 vong nay (san QA doc tu anh chup that): MOI cham, o 120 man phai cach VIEN TRONG it nhat
 * 2 px — "nam trong o" la chua du, vi cham nam BEN TAI o tam van co the de len net vien.
 * La so CUA TEST, khong import tu layout: lay hang doi cua layout do chinh no thi test xanh gia.
 */
const DOT_EDGE = 2
/** Nghi thuc cua `dotFieldSide` la dang max()/ty le nen so hoc trong test co the lech 1 ulp. */
const EPS = 1e-9
/** V6.4: khe doc giua to giay va hang o dap an dau tien / khe ngang giua hai card. */
const ROW_GAP = 24
const COL_GAP = 16
const L = layoutOf(COL_W, COL_H)

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h })

/** Vung + o + CAN cach mep khong (HUD/noit) — bang duy nhat, them vung = them mot dong. */
const REGIONS: readonly (readonly [string, (l: Layout) => Box, boolean])[] = [
  ['field', (l) => l.field, false],
  ['portrait', (l) => l.portrait, false],
  ['level', (l) => l.level, true],
  ['stars', (l) => l.stars, true],
  ['ink', (l) => l.ink, true],
  ['sound', (l) => l.sound, true],
  ['menu', (l) => l.menu, true],
  ['sheet', (l) => l.sheet, false],
  ['banner', (l) => l.banner, false],
  ['option-0', (l) => l.options[0], true],
  ['option-1', (l) => l.options[1], true],
  ['option-2', (l) => l.options[2], true],
  ['option-3', (l) => l.options[3], true],
  ['hint', (l) => l.hint, true],
  ['undo', (l) => l.undo, true],
  ['undoAd', (l) => l.undoAd, true],
  ['retry', (l) => l.retry, true],
  ['unfold', (l) => l.unfold, true],
  ['titleSheet', (l) => l.titleSheet, false],
  ['titleWord', (l) => l.titleWord, false],
  ['play', (l) => l.play, true],
  ['shop', (l) => l.shop, true],
  ['progress', (l) => l.progress, false],
]

/** O mockup tung px — so NGUYEN doi tuong, khong so gan dung. */
const MOCKUP: readonly (readonly [string, Box])[] = [
  ['level', box(16, 16, 300, 64)],
  ['sound', box(560, 16, 64, 64)],
  ['menu', box(640, 16, 64, 64)],
  ['stars', box(16, 88, 240, 64)],
  ['ink', box(560, 88, 144, 64)],
  ['sheet', box(120, 170, 480, 480)],
  ['banner', box(60, 690, 600, 60)],
  ['hint', box(108, 1312, 240, 72)],
  ['undo', box(372, 1312, 240, 72)],
  ['titleSheet', box(80, 180, 560, 560)],
  ['play', box(240, 980, 240, 88)],
  ['shop', box(240, 1096, 240, 72)],
]

/**
 * Nhom CAM chong nhau. undoAd KHONG nam trong nhom nao vi no dung lai dung o cua undo
 * (hai nut loai trau nhau — rect dang cho QA phai la o cua nut DANG hien).
 */
const NO_OVERLAP: readonly (readonly string[])[] = [
  ['level', 'stars', 'ink', 'sound', 'menu'],
  ['option-0', 'option-1', 'option-2', 'option-3'],
  ['hint', 'undo', 'retry', 'unfold'],
]

const region = (name: string): ((l: Layout) => Box) => {
  const row = REGIONS.find((r) => r[0] === name)
  expect(row, 'layout khong co vung ' + name).toBeDefined()
  return (row as readonly [string, (l: Layout) => Box, boolean])[1]
}

/** Dien tich chong lan cua hai o (0 khi chi cham mep — cham mep khong phai de nhau). */
function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** Khe giua bon mep cua o CON va o CHA. Am = con tran ra ngoai cha. */
function insetOf(child: Box, parent: Box): Record<'left' | 'top' | 'right' | 'bottom', number> {
  return {
    left: child.x - parent.x,
    top: child.y - parent.y,
    right: parent.x + parent.w - (child.x + child.w),
    bottom: parent.y + parent.h - (child.y + child.h),
  }
}

/** "Con nam trong cha, cach cha it nhat `min` o MOI mep" — mot loi khang dinh, bon mep. */
function expectInside(child: Box, parent: Box, what: string, min = 0): void {
  for (const [side, gap] of Object.entries(insetOf(child, parent))) {
    expect(gap, what + ' tran o mep ' + side + ' (khe ' + gap.toFixed(2) + ')').toBeGreaterThanOrEqual(min)
  }
}

/**
 * O chu ma component THAT se dung: canh giua `box`, co chu do `fitFontSize` quyet, be rong/cao
 * lay tu CUNG nguon uoc luong cua layout ⇒ test do dung hinh chu, khong do mot cong thuc khac.
 */
function textRect(box: Box, base: number, text: string): Box {
  const px = fitFontSize(base, text, box)
  const w = textWidthPx(px, text.length)
  const h = textHeightPx(px)
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/** Cac co so lo ma holeView co the dung cho mot o (day nhat -> thua nhat). */
const HOLE_COUNTS: readonly number[] = [1, 2, 4, 8, 16, 32, MAX_HOLES]

/** Copy THAT ma game hien thi tren nut (HUD §4.1 + Title §4.2 + nhan chuong cua map). */
const BUTTON_COPY: readonly string[] = [
  'Hint', 'Undo', 'Retry', 'Next', 'Back', 'Shop', 'Chapter 8', 'Continue — Level 120',
]

describe('V1 camera — cot doc 720x1420 la so CHOT, main.ts va layout.ts dung chung mot nguon', () => {
  it('CAMERA phat ra dung 720x1420 (main.ts dung Phaser.Game tu so nay, khong tu khai lai)', () => {
    expect(CAMERA.width).toBe(COL_W)
    expect(CAMERA.height).toBe(COL_H)
  })

  it('cot choi phu TOAN BO be ngang camera (ban ngang 1920 khien giay chi con 453,6)', () => {
    expect(L.field).toEqual(box(0, 0, COL_W, COL_H))
    expect(L.portrait).toEqual(L.field)
    expect(L.cx).toBe(COL_W / 2)
    expect(L.s).toBe(1) // 1 don vi thiet ke = 1 px the gioi khi camera khop mockup
  })
})

describe('V3.1 moi o nam trong cot va HUD/nut cach mep >= 16', () => {
  it('khong o nao tran ra ngoai 0..720 x 0..1420', () => {
    for (const [name, get] of REGIONS) {
      const b = get(L)
      expect(b.x, name + '.x duoi 0').toBeGreaterThanOrEqual(0)
      expect(b.y, name + '.y duoi 0').toBeGreaterThanOrEqual(0)
      expect(b.x + b.w, name + '.vuot phai').toBeLessThanOrEqual(COL_W)
      expect(b.y + b.h, name + '.vuot duoi').toBeLessThanOrEqual(COL_H)
    }
  })

  it('HUD va nut that cach me, khong ket sat le', () => {
    for (const [name, get, edged] of REGIONS) {
      if (!edged) continue
      const b = get(L)
      expect(b.x, name + '.sat me trai').toBeGreaterThanOrEqual(EDGE)
      expect(b.y, name + '.sat me tren').toBeGreaterThanOrEqual(EDGE)
      expect(COL_W - (b.x + b.w), name + '.sat me phai').toBeGreaterThanOrEqual(EDGE)
      expect(COL_H - (b.y + b.h), name + '.sat me duoi').toBeGreaterThanOrEqual(EDGE)
    }
  })
})

describe('V3.2 KHONG hai o nao chong nhau (bai hoc HUD sao de hu Muc 126 don vi)', () => {
  for (const group of NO_OVERLAP) {
    it('nhom ' + group.join(' + ') + ' doi mot khong de nhau', () => {
      const seen: string[] = []
      group.forEach((name, i) => {
        group.forEach((other, j) => {
          if (i >= j) return
          const area = overlapArea(region(name)(L), region(other)(L))
          if (area > 0) seen.push(name + ' ~ ' + other + ' = ' + area)
        })
      })
      expect(seen, 'o chong nhau => mot cu bam trung hai vung: ' + seen.join(', ')).toEqual([])
    })
  }

  it('ca hai hang HUD (ket y 152) khong de vao to giay (bat dau y 170)', () => {
    for (const h of [L.level, L.stars, L.ink, L.sound, L.menu]) {
      expect(h.y + h.h).toBeLessThan(L.sheet.y)
    }
  })

  it('giay -> luoi o dap an -> hang nut ket qua -> hang nut cong cu: khong chen nhau', () => {
    for (const o of L.options) expect(o.y).toBeGreaterThan(L.sheet.y + L.sheet.h)
    for (const o of L.options) expect(L.retry.y).toBeGreaterThan(o.y + o.h)
    expect(L.hint.y).toBeGreaterThan(L.retry.y + L.retry.h)
    expect(L.hint.y).toBeGreaterThan(L.unfold.y + L.unfold.h)
  })

  it('undoAd dung lai o undo (hai nut loai trau nhau) con retry KHAC unfold', () => {
    expect(L.undoAd).toEqual(L.undo)
    expect(L.retry).not.toEqual(L.unfold)
  })
})

describe('V3.3 so mockup §4.1/§4.2 la hop dong, khong phai goi y', () => {
  for (const [name, want] of MOCKUP) {
    it('layout.' + name + ' = x' + want.x + ' y' + want.y + ' ' + want.w + 'x' + want.h, () => {
      expect(region(name)(L)).toEqual(want)
    })
  }

  it('giay 480x480 la VUONG; moi o dap an 240x264 CAO hon rong (khong phai 334x172)', () => {
    expect(L.sheet.w).toBe(480)
    expect(L.sheet.h).toBe(480)
    for (const o of L.options) {
      expect(o.w).toBe(240)
      expect(o.h).toBe(264)
      expect(o.h).toBeGreaterThan(o.w)
    }
    for (const icon of [L.sound, L.menu]) {
      expect(icon.w).toBe(64)
      expect(icon.h).toBe(64)
    }
  })

  it('luoi 2x2 doi xung qua truc x = 360 va gap giua cot/hang dung 24', () => {
    const mid = COL_W / 2
    const [a, b, c, d] = L.options
    for (const pair of [[a, b], [c, d]] as const) {
      expect(pair[1].x - (pair[0].x + pair[0].w), 'gap giua hai cot').toBe(OPTION_GAP)
      expect(pair[0].x + pair[0].w + OPTION_GAP / 2, 'truc doi xung').toBe(mid)
    }
    for (const pair of [[a, c], [b, d]] as const) {
      expect(pair[1].y - (pair[0].y + pair[0].h), 'gap giua hai hang').toBe(OPTION_GAP)
    }
    expect(a.x).toBe(COL_W - (b.x + b.w)) // cot phai la anh soi guong cua cot trai
    expect(new Set(L.options.map((o) => o.x + ':' + o.y)).size).toBe(4)
  })
})

describe('V3.4 moi vung cham >= 44x44 (PC-U-05 — khong de lai vung bam vo hinh)', () => {
  it('moi o THUOC NHOM CHAM co ca hai canh >= TAP_MIN', () => {
    for (const [name, get, touch] of REGIONS) {
      if (!touch) continue
      const b = get(L)
      expect(b.w, name + '.w duoi nguong cham').toBeGreaterThanOrEqual(TAP_MIN)
      expect(b.h, name + '.h duoi nguong cham').toBeGreaterThanOrEqual(TAP_MIN)
    }
  })

  it('TAP_MIN van la 44 — tran cham toi thieu cua moi nen', () => {
    expect(TAP_MIN).toBe(44)
  })
})

describe('V3.5 camera CO DINH 720x1420: camera lech chi THU DEU + CAN GIUA cot', () => {
  it('layoutOf(720,1420) tra dung so mockup — do la truong hop production', () => {
    for (const [name, want] of MOCKUP) expect(region(name)(L)).toEqual(want)
  })

  it('layoutOf(1200,1600) cung bo cuc, chi nhan k = 1600/1420 va lech theo truc giua', () => {
    const off = layoutOf(1200, 1600)
    const k = 1600 / COL_H
    for (const [name, get] of REGIONS) {
      const a = get(L)
      const b = get(off)
      expect(b.w, name + '.w').toBeCloseTo(a.w * k, 6)
      expect(b.h, name + '.h').toBeCloseTo(a.h * k, 6)
      expect(b.y, name + '.y').toBeCloseTo(a.y * k, 6)
      // Lech theo truc doc cua COT (khong phai cua camera): hai dai letterbox deu nhau.
      expect(b.x + b.w / 2 - off.cx, name + '.lech theo truc giua')
        .toBeCloseTo((a.x + a.w / 2 - L.cx) * k, 6)
    }
    expect(off.s).toBeCloseTo(k, 9)
  })

  it('camera thap hon chieu cao cot (480x900): thu deu theo chieu cao, khong cat bot o nap', () => {
    const phone = layoutOf(480, 900)
    const k = 900 / COL_H
    expect(phone.field.h).toBeCloseTo(COL_H * k, 6)
    expect(phone.field.w).toBeCloseTo(COL_W * k, 6)
    expect(phone.field.x).toBeCloseTo((480 - COL_W * k) / 2, 6)
    expect(phone.sheet.w).toBeCloseTo(480 * k, 6)
    for (const [name, get] of REGIONS) {
      const b = get(phone)
      expect(b.x, name + '.am tren camera').toBeGreaterThanOrEqual(-0.001)
      expect(b.x + b.w, name + '.trao camera phai').toBeLessThanOrEqual(480 + 0.001)
      expect(b.y + b.h, name + '.trao camera duoi').toBeLessThanOrEqual(900 + 0.001)
    }
  })

  it('layoutOf la HAM THUAN: cung input => cung output (PC-B-04 reload 3 lan)', () => {
    expect(JSON.stringify(layoutOf(720, 1420))).toBe(JSON.stringify(layoutOf(720, 1420)))
    expect(JSON.stringify(layoutOf(1200, 1600))).toBe(JSON.stringify(layoutOf(1200, 1600)))
  })
})

// ===========================================================================
// V6 — LUOI AN TOAN THU HINH (5 loi trong anh chup that): nhan 1-2-3-4 ngoai card, cham lo de
// vien, chu "Hint" nam duoi hop nut, day to giay dam hang o dap an, so tien de vong sao thu ba.
// Ba loi dau la BUG HE QUY TOA DO: container ngai tai GOC TRAI-TREN cua o trong khi Rectangle lai
// ve theo TAM => lech di nua o. layout.ts git gium bang cach phat ra CHINH O VE (innerRect /
// cardArt / buttonFace / inkFace) va component chi ve dung o ay — nen test duoi day do ham cua
// layout, khong do chuoi trong file component (bai hoc "HUD chong 126 don vi" o dau file).
// ===========================================================================

describe('V6.1/V6.2 vung an TOAN trong o dap an: nhan so va cham lo khong de vien', () => {
  it('SAFE_PAD = 12 va innerRect thu DUNG 12 moi phia (mot ham duy nhat moi component dung)', () => {
    expect(SAFE_PAD).toBe(PAD_MIN)
    expect(innerRect(box(100, 200, 240, 264), SAFE_PAD)).toEqual(box(112, 212, 216, 240))
    // O hep hon 2*pad (camera dien thoai goi layoutOf lech): canh ve 0, KHONG co so am.
    expect(innerRect(box(0, 0, 10, 8), SAFE_PAD)).toEqual(box(12, 12, 0, 0))
  })

  it('nhan so nam o GOC TRONG cua vung an toan va khong de thumbnail giay', () => {
    for (const [i, card] of L.options.entries()) {
      const art = cardArt(card)
      expect(art.badge.x, 'option-' + i + ' nhan le mieng trai (khong phai goc trong)').toBe(card.x + PAD_MIN)
      expect(art.badge.y, 'option-' + i + ' nhan le mieng tren (khong phai goc trong)').toBe(card.y + PAD_MIN)
      expectInside(art.badge, innerRect(card, PAD_MIN), 'option-' + i + ' nhan so')
      expect(overlapArea(art.badge, art.paper), 'option-' + i + ': nhan so de len o giay').toBe(0)
      // Chu se dung phai nam trong chinh badge (day la loi "nhan tro ra ngoai card").
      expectInside(textRect(art.badge, basePx('label'), String(i + 1)), art.badge, 'option-' + i + ' chu nhan')
    }
  })

  it('moi cham lo (tam + ban kinh THAT cua holeView) con nguyen trong card, cach vien >= 2', () => {
    for (const [i, card] of L.options.entries()) {
      const art = cardArt(card)
      // Vien MA NHIN THAY: net cua khung giay ve theo tam nen an vao trong mot nua net.
      const frame = innerRect(art.paper, frameStroke(art.paper.w) / 2)
      for (const n of HOLE_COUNTS) {
        const r = holeRadius('card', n, art.holes.w)
        expect(r, 'option-' + i + ' lo vo hinh').toBeGreaterThanOrEqual(1)
        const dots = box(art.holes.x - r, art.holes.y - r, art.holes.w + 2 * r, art.holes.h + 2 * r)
        expectInside(dots, innerRect(card, PAD_MIN), 'option-' + i + ' bo ' + n + ' lo', DOT_EDGE - EPS)
        // Ca hai bien: vung an toan cua O va vien DA VE cua thumbnail (V3: cham dung vien la loi).
        expectInside(dots, frame, 'option-' + i + ' bo ' + n + ' lo cham khung giay', DOT_EDGE - EPS)
      }
    }
  })

  it('dem cham la PHUONG TRINH, khong phai ty le ty do: pad = ban kinh max + khe >= 2', () => {
    for (const card of L.options) {
      const art = cardArt(card)
      const pad = (art.paper.w - art.holes.w) / 2
      expect(pad, 'o tam loi phai nho hon khung giay').toBeGreaterThan(0)
      expect(pad - maxDotRadius('card', art.holes.w), 'khe con lai sau tru ban kinh cham')
        .toBeGreaterThanOrEqual(DOT_EDGE - EPS)
      expect(dotFieldSide(art.paper.w), 'dotFieldSide phai = canh o tam loi').toBeCloseTo(art.holes.w, 9)
      // Mot cham o SAT MEN duoi cung cua o tam loi van cach vien da ve dung cai khe da hua.
      const r = maxDotRadius('card', art.holes.w)
      const worst = box(art.holes.x - r, art.holes.y + art.holes.h - r, 2 * r, 2 * r)
      expectInside(worst, innerRect(art.paper, frameStroke(art.paper.w) / 2), 'cham sat me duoi', DOT_EDGE - EPS)
    }
  })

  it('holeField la o TAM cua chinh cardArt (khong co hai cong thuc cho mot chuyen)', () => {
    for (const card of L.options) expect(holeField(card)).toEqual(cardArt(card).holes)
  })

  it('kenh doc duoi sheet hang o dau tien >= 24; khe ngang hai card >= 16 (V6.4)', () => {
    for (const i of [0, 1]) {
      expect(L.options[i].y - (L.sheet.y + L.sheet.h), 'sheet -> option-' + i).toBeGreaterThanOrEqual(ROW_GAP)
    }
    expect(L.options[1].x - (L.options[0].x + L.options[0].w), 'hai card cung hang').toBeGreaterThanOrEqual(COL_GAP)
    expect(L.options[2].y - (L.options[0].y + L.options[0].h), 'hai card cung cot').toBeGreaterThanOrEqual(ROW_GAP)
  })
})

describe('V6.3/V6.5 chu trong nut va trong hop Muc (khong de vong sao thu ba)', () => {
  it('buttonFace: hinh + nhan deu trong vung an toan, khong de nhau', () => {
    for (const name of ['hint', 'undo', 'retry', 'unfold', 'play', 'shop', 'sound', 'menu'] as const) {
      const b = L[name]
      const inner = innerRect(b, PAD_MIN)
      for (const text of BUTTON_COPY) {
        const face = buttonFace(b, basePx('label'), text, true)
        expectInside(face.label, inner, name + ' nhan "' + text + '"')
        if (!face.showArt) continue
        expectInside(face.art, inner, name + ' hinh')
        expect(overlapArea(face.art, face.label), name + ': hinh de len chu').toBe(0)
      }
    }
  })

  it('moi copy THAT cua nut nam TRONG nut o co chu fitFontSize (khong con "Hint" duoi hop)', () => {
    for (const [name, b] of Object.entries({ hint: L.hint, undo: L.undo, retry: L.retry, unfold: L.unfold, play: L.play, shop: L.shop })) {
      for (const text of BUTTON_COPY) {
        const face = buttonFace(b, basePx('label'), text, true)
        const px = fitFontSize(basePx('label'), text, face.label)
        expect(px, name + ' "' + text + '": chu nho hon san doc duoc').toBeGreaterThanOrEqual(MIN_FONT_PX)
        expectInside(textRect(face.label, basePx('label'), text), b, name + ' chu "' + text + '"')
      }
    }
  })

  it('nut icon chi co hinh (HUD sound/menu): hinh duoc NGUYEN o trong, van canh giua', () => {
    for (const b of [L.sound, L.menu]) {
      const face = buttonFace(b, basePx('label'), '', true)
      expect(face.showArt, 'icon HUD bi an').toBe(true)
      expect(face.art).toEqual(innerRect(b, SAFE_PAD))
    }
  })

  it('copy dai hon cho ben hinh thi BO HINH de chu nam trong nut (ca that: PLAY §4.2)', () => {
    const short = buttonFace(L.hint, basePx('label'), 'Hint', true)
    expect(short.showArt, 'nut 240x72 co chu ngan ma mat icon').toBe(true)
    expect(short.art.w, 'hinh bay mu oi o trong nut').toBeGreaterThan(0)
    const long = buttonFace(L.play, basePx('label'), 'Continue — Level 120', true)
    expect(long.showArt, 'chu 20 ky tu van chen vao o icon => ca hai deu tran').toBe(false)
    expect(long.label).toEqual(innerRect(L.play, SAFE_PAD))
    expectInside(textRect(long.label, basePx('label'), 'Continue — Level 120'), L.play, 'chu PLAY')
  })

  it('inkFace: giot muc + chu so nam TRONG hop ink, khong cham cum sao ben trai', () => {
    const face = inkFace(L.ink)
    const inner = innerRect(L.ink, PAD_MIN)
    expectInside(face.drop, inner, 'giot muc')
    expectInside(face.digits, inner, 'o so muc')
    expect(overlapArea(face.digits, L.stars), 'so muc cham cum sao (V6.5)').toBe(0)
    for (const n of ['0', '40', '9999']) {
      expectInside(textRect(face.digits, basePx('digit'), n), L.ink, 'so muc "' + n + '"')
    }
  })

  it('pressShift giu TAM cua o: don lun co QUANH TAM chu khong chay ve goc trai-tren', () => {
    for (const b of [L.hint, L.options[0], L.play]) {
      const scale = 0.96
      const d = pressShift(b, scale)
      expect(b.x + b.w / 2, 'tam ngang giu nguyen').toBeCloseTo(b.x + d.x + (b.w * scale) / 2, 9)
      expect(b.y + b.h / 2, 'tam doc giu nguyen').toBeCloseTo(b.y + d.y + (b.h * scale) / 2, 9)
    }
  })

  it('layout van an toan o camera lech: moi o noi dung con nam trong 1200x1600', () => {
    const off = layoutOf(1200, 1600)
    for (const card of off.options) {
      const art = cardArt(card)
      expectInside(art.badge, innerRect(card, PAD_MIN), 'cam lech: nhan so')
      expectInside(art.holes, innerRect(card, PAD_MIN), 'cam lech: lo')
    }
    const face = buttonFace(off.hint, basePx('label'), 'Hint', true)
    expectInside(face.label, innerRect(off.hint, PAD_MIN), 'cam lech: nhan nut')
  })
})

// ===========================================================================
// V7 — CHẤM LỖ TRÊN TOÀN BỘ CHIẾN DỊCH: ba bất đẳng thức + một danh sách vi phạm.
// Ba con số của lần đo tạm được CHUYỂN THÀNH khẳng định (không còn throw để in số):
//   · nhỏ nhất của khoảng cách hai tâm = 7,17 (màn 35, ô 3, 4 chấm) ⇒ chốt sàn 6 px;
//   · bán kính lớn nhất = 8,93 = 0,055 x cạnh ô chấm 162,31 ⇒ vẫn lọt trong khe 14,6
//     giữa ô chấm và thumbnail (paper 191,52) mà V6.1 đã neo ở khối trên;
//   · số chấm mỗi ô chạy 1..48 ⇒ phải đo MẬT ĐỘ DÀY NHẤT, mẫu vài ô không bao giờ đỏ.
// Vì sao quét cả 120 màn: mật độ chấm là hàm của seed — màn xấu nhất (35) không nằm trong
//   10 màn đầu, nên mọi mẫu nhỏ đều xanh giả tạo (bài học "suite xanh, ảnh chụp đỏ").
// Vì sao message có lv + card + n: lần đỏ sau không phải viết test tạm để đo lại từ đầu.
// ===========================================================================

/** Sàn khoảng cách GIỮA HAI TÂM của hai chấm — nguồn: holeView `DOT.clear`. */
const DOT_PAIR_MIN = 6
/** Sàn bán kính "còn đọc được" — nguồn: holeView `DOT.min`. */
const DOT_RADIUS_MIN = 1

describe('V7 cham lo tren 120 man that: tron trong vung an toan, tam cach nhau >= 6, hai dia khong de nhau', () => {
  it('quet that du 120 man x 4 o (vong lap khong duoc im lang chay rong)', () => {
    expect(CAMPAIGN_LEVELS).toBe(120)
  })

  it('moi cham con nguyen trong innerRect(card, PAD_MIN); moi cap >= 6 px va 2r <= khoang tam', () => {
    const bad: string[] = []
    let cards = 0
    let capped = 0
    for (let lv = 1; lv <= CAMPAIGN_LEVELS; lv += 1) {
      const spec = levelSpec(GAME_SEED, lv, cfgCampaign(lv))
      for (let i = 0; i < spec.options.length; i += 1) {
        const units = toPoints(spec.options[i].holes).map((p) => ({ x: toNumber(p.x), y: toNumber(p.y) }))
        const card = L.options[i]
        const art = cardArt(card)
        const inner = innerRect(card, PAD_MIN)
        const side = art.holes.w
        const tag = 'lv' + lv + ' card' + i + ' n=' + units.length
        // CUNG mot cong thuc ma HolePool dung luc ve: hypot(dx,dy) * canh o cham.
        const pair = closestPair(units, side)
        const r = holeRadius('card', units.length, side, pair)
        cards += 1
        if (units.length > MAX_HOLES) bad.push(tag + ': nhieu hon tran ve ' + MAX_HOLES)
        if (r < DOT_RADIUS_MIN) bad.push(tag + ': ban kinh ' + r.toFixed(2) + ' < san ' + DOT_RADIUS_MIN)
        if (units.length > 1) {
          capped += 1
          if (pair < DOT_PAIR_MIN) bad.push(tag + ': hai cham cach nhau ' + pair.toFixed(2) + ' < ' + DOT_PAIR_MIN)
          // Hai DIA cham (khong phai hai tam) khong duoc chong len nhau.
          if (2 * r > pair) bad.push(tag + ': 2r=' + (2 * r).toFixed(2) + ' > khoang tam ' + pair.toFixed(2))
        }
        for (const u of units) {
          const dot = box(art.holes.x + u.x * side - r, art.holes.y + u.y * side - r, 2 * r, 2 * r)
          for (const [edge, gap] of Object.entries(insetOf(dot, inner))) {
            if (gap < 0) bad.push(tag + ': cham tran mep ' + edge + ' (' + gap.toFixed(2) + ')')
          }
        }
      }
    }
    expect(cards, 'phai do du bon o cua moi man').toBe(CAMPAIGN_LEVELS * 4)
    expect(capped, 'phai co it nhat mot cap cham de do khoang cach').toBeGreaterThan(0)
    expect(bad, 'vi pham cham lo (' + bad.length + '): ' + bad.slice(0, 12).join(' | ')).toEqual([])
  })
})

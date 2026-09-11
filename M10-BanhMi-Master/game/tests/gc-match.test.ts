// GC-10..GC-14 — match engine tests (TEST-CASES.md §A) — pure TS, khong Phaser.
import { describe, it, expect } from 'vitest'
import { createMatch, type Match, type MatchEvent } from '../src/core/match'

/** Tick 50ms toi da maxMs hoac khi predicate thoa man; tra toan bo events gom duoc */
function runUntil(m: Match, pred: (evs: MatchEvent[]) => boolean, maxMs = 120_000): MatchEvent[] {
  const all: MatchEvent[] = []
  let spent = 0
  while (spent < maxMs) {
    all.push(...m.tick(50))
    spent += 50
    if (pred(all)) return all
  }
  return all
}

function reachBuild(m: Match): void {
  if (m.state.phase === 'BUILD') return
  runUntil(m, (e) => e.some((x) => x.type === 'build_start'))
  expect(m.state.phase).toBe('BUILD')
}

/** Lap dung order hien tai + serve ngay */
function servePerfect(m: Match): MatchEvent[] {
  const evs: MatchEvent[] = []
  for (const id of m.state.order) evs.push(...m.tapLayer(id))
  evs.push(...m.tapServe())
  return evs
}

function toBuild(m: Match): MatchEvent[] {
  reachBuild(m)
  return servePerfect(m)
}

describe('GC-10 FAST bonus', () => {
  it('serve khi patience con 65% -> +5 tip + event fast', () => {
    const m = createMatch(42)
    reachBuild(m) // khach 1: flash 6s tat, patience 45s bat dau tụt
    m.tick(45_000 * 0.35) // -> con 65%
    expect(Math.round(m.state.patienceLeftMs)).toBe(29_250)
    const evs = servePerfect(m)
    expect(evs.some((e) => e.type === 'fast')).toBe(true)
    expect(evs.some((e) => e.type === 'happy' && e.tip === 35)).toBe(true) // 30*1.0 +5
  })
  it('serve khi patience con 59% -> khong FAST', () => {
    const m = createMatch(42)
    reachBuild(m)
    m.tick(45_000 * 0.41 + 100) // con <60%
    const evs = servePerfect(m)
    expect(evs.some((e) => e.type === 'fast')).toBe(false)
    expect(m.state.tips).toBe(30)
  })
})

describe('GC-11 patience walkout', () => {
  it('BUILD khong serve -> patience ve 0: strike+1, 0 tip, event walkout DUNG 1 lan', () => {
    const m = createMatch(42)
    const evs = runUntil(m, (e) => e.some((x) => x.type === 'walkout'), 60_000)
    expect(evs.filter((e) => e.type === 'walkout').length).toBe(1)
    expect(m.state.strikes).toBe(1)
    expect(m.state.tips).toBe(0)
    expect(m.state.stars).toBe(0)
  })
})

describe('GC-12 LOSE 3 strike', () => {
  it('3 walkout lien tiep -> LOSE tai strike 3, khong choi tiep khach #4', () => {
    const m = createMatch(42)
    const evs = runUntil(m, (e) => e.some((x) => x.type === 'lose'), 300_000)
    expect(m.state.phase).toBe('LOSE')
    expect(m.state.strikes).toBe(3)
    expect(m.state.customerIdx).toBe(2) // dang o khach 3, khach 4 khong xuat hien
    expect(evs.some((e) => e.type === 'customer_start' && e.customerIdx === 3)).toBe(false)
    m.tick(10_000) // tick tiep van LOC
    expect(m.state.phase).toBe('LOSE')
  })
})

describe('GC-13 khach #7 WAIT!', () => {
  it('sau flash tat +2.5s: doi dung 1 layer, patience pause 2.5s, dung 1 lan', () => {
    const m = createMatch(42)
    // phuc vu khach 1..6 hoan hao de toi khach 7
    for (let i = 0; i < 6; i++) {
      toBuild(m)
      runUntil(m, (e) => e.some((x) => x.type === 'customer_start'))
    }
    expect(m.state.customerIdx).toBe(6)
    reachBuild(m)
    const before = [...m.state.order]
    const w = runUntil(m, (e) => e.some((x) => x.type === 'wait'), 10_000)
    const wait = w.find((e) => e.type === 'wait')
    expect(wait).toBeTruthy()
    expect(wait!.customerIdx).toBe(6)
    const diffIdx = m.state.order.map((id, i) => (id !== before[i] ? i : -1)).filter((i) => i >= 0)
    expect(diffIdx.length).toBe(1) // moi ≠ cu tai DUNG 1 index
    // patience pause trong 1.5s replay + 1.0s dem = 2.5s
    const pAt = m.state.patienceLeftMs
    m.tick(2_400)
    expect(Math.round(m.state.patienceLeftMs)).toBe(Math.round(pAt))
    m.tick(600) // het pause -> tụt lai
    expect(m.state.patienceLeftMs).toBeLessThan(pAt)
    // dung 1 lan: giai doan sau khong con wait
    expect(m.tick(5_000).some((e) => e.type === 'wait')).toBe(false)
  })

  it('neu da dung HINT cho khach 7 TRUOC khi WAIT trigger -> khong co WAIT', () => {
    const m = createMatch(42)
    for (let i = 0; i < 6; i++) {
      toBuild(m)
      runUntil(m, (e) => e.some((x) => x.type === 'customer_start'))
    }
    reachBuild(m)
    expect(m.tapHint().some((e) => e.type === 'hint_replay')).toBe(true)
    const before = m.state.order.join(',')
    m.tick(6_000)
    expect(m.state.order.join(',')).toBe(before) // khong doi
    // ...va khach 7 van phase BUILD binh thuong (khong wait len)
    expect(m.state.phase).toBe('BUILD')
  })

  it('hint budget: toi da 1/khach, 3/ca', () => {
    const m = createMatch(42)
    reachBuild(m)
    expect(m.tapHint().some((e) => e.type === 'hint_replay')).toBe(true)
    expect(m.tapHint().some((e) => e.type === 'hint_denied')).toBe(true) // 1/khach
    m.tick(5_000)
    for (let c = 1; c <= 2; c++) {
      toBuild(m) // serve khach hien tai (khong con hint cho no nua)
      runUntil(m, (e) => e.some((x) => x.type === 'customer_start'))
      expect(m.state.customerIdx).toBe(c)
      reachBuild(m)
      expect(m.tapHint().some((e) => e.type === 'hint_replay')).toBe(true) // hint #2, #3
      m.tick(2_000)
    }
    toBuild(m)
    runUntil(m, (e) => e.some((x) => x.type === 'customer_start'))
    expect(m.state.customerIdx).toBe(3)
    expect(m.tapHint().some((e) => e.type === 'hint_denied')).toBe(true) // het 3/ca
  })
})

describe('GC-14 bot hoan hao 40 seed + rewarded continue', () => {
  it('WIN 40/40; 24 sao (bot serve truoc WAIT!); rank S; sendScore = tips', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const m = createMatch(seed)
      let guard = 0
      while (m.state.phase !== 'WIN' && m.state.phase !== 'LOSE' && guard++ < 3_000) {
        if (m.state.phase === 'BUILD') servePerfect(m)
        else m.tick(100)
      }
      const s = m.summary()
      expect(s.win, `seed ${seed} win`).toBe(true)
      // Bot serve NGAY khi flash tat — luon truoc nguong WAIT! (+2.5s) cua khach 7
      // nen don khach 7 van la don cu → khop tuyet doi 24/24.
      expect(s.stars, `seed ${seed} stars`).toBe(24)
      expect(s.strikes).toBe(0)
      expect(s.tips).toBeGreaterThanOrEqual(260)
      expect(s.rank).toBe('S')
      expect(s.sendScore).toBe(s.tips) // bridge: sendScore = tips
    }
  })

  it('rewarded continue: dung 1 lan/ca; lan LOSE thu 2 khong hieu ung nua', () => {
    const m = createMatch(42)
    runUntil(m, (e) => e.some((x) => x.type === 'lose'), 300_000)
    expect(m.state.phase).toBe('LOSE')
    expect(m.canContinue()).toBe(true)
    m.continueAfterAd() // hoi 1 strike
    expect(m.state.strikes).toBe(2)
    expect(m.state.phase).toBe('ENTER')
    expect(m.state.customerIdx).toBe(3) // tiep tu khach #4
    runUntil(m, (e) => e.some((x) => x.type === 'lose'), 300_000)
    expect(m.state.phase).toBe('LOSE')
    expect(m.canContinue()).toBe(false)
    expect(m.state.rewardedUsed).toBe(true)
  })
})

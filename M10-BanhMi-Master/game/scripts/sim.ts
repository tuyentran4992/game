// scripts/sim.ts — SIM HARNESS 40 SEED, 2 BOT (TEST-CASES §C). Chay: pnpm sim
// (node --experimental-strip-types — file nay CHI import core/data pure TS, khong Phaser.)
// Bot 1 "hoan hao": nho 100%, lap dung thu tu, serve ngay (serve <50ms sau flash tat).
// Bot 2 "hay quen": moi layer 25% nho SAI (doi id ngau nhien trong khay) + luon luong cu
//   (2.5s/layer + 10s moi layer nho sai — quen = CHAM, cu kham patience VIP).
import { createMatch } from '../src/core/match.ts'
import { mulberry32, pick } from '../src/core/rng.ts'
import { ORDER_POOL } from '../src/data/ingredients.ts'

const SEEDS = 40
const DT = 25 // ms moi buoc sim
const LAYER_S = 2.5 // bot hay quen: giay/layer (luong cu)
const HESIT_S = 10.0 // giay sa lay khi nho sai
const SERVE_DELAY_S = 0.6

type Policy = 'perfect' | 'forgetful'

interface ShiftResult {
  win: boolean
  shiftSec: number
  stars: number
  tips: number
  strikes: number
  utilMax: number // max (1 - patience con lai) luc SERVE
  rank: string
}

function runShift(seed: number, policy: Policy): ShiftResult {
  const m = createMatch(seed)
  const rng = mulberry32(seed * 7 + 13)
  let simMs = 0
  let buildClock = 0
  let inBuild = false
  let errFlags: boolean[] = []
  let placed = 0
  let nextAt = 0 // ms tich luy cua layer ke tiep (luong cu cong don)
  let serveAt = -1
  let utilMax = 0
  const forgetful = policy === 'forgetful'

  for (let step = 0; step < 40000; step++) {
    const phase = m.state.phase
    if (phase === 'WIN' || phase === 'LOSE') break
    if (phase === 'BUILD') {
      if (!inBuild) {
        inBuild = true
        buildClock = 0
        placed = 0
        serveAt = -1
        errFlags = m.state.order.map(() => forgetful && rng() < 0.25)
        nextAt = (forgetful ? LAYER_S + (errFlags[0] ? HESIT_S : 0) : 0.02) * 1000
      }
      buildClock += DT
      const order = m.state.order
      while (placed < order.length && buildClock >= nextAt) {
        const id = order[placed]!
        m.tapLayer(errFlags[placed] ? pick(ORDER_POOL, rng) : id)
        placed++
        if (placed < order.length) {
          nextAt += (forgetful ? LAYER_S + (errFlags[placed] ? HESIT_S : 0) : 0.02) * 1000
        }
      }
      if (placed >= order.length && serveAt < 0) {
        serveAt = buildClock + (forgetful ? SERVE_DELAY_S : 0.05) * 1000
      }
      if (serveAt >= 0 && buildClock >= serveAt) {
        const frac = m.state.patienceTotalMs > 0 ? m.state.patienceLeftMs / m.state.patienceTotalMs : 0
        utilMax = Math.max(utilMax, 1 - frac)
        m.tapServe()
        serveAt = -2
      }
    } else {
      inBuild = false
      serveAt = -1
    }
    m.tick(DT)
    simMs += DT
  }
  const s = m.summary()
  return {
    win: s.win,
    shiftSec: Math.round(simMs / 1000),
    stars: s.stars,
    tips: s.tips,
    strikes: s.strikes,
    utilMax,
    rank: s.rank
  }
}

const median = (xs: number[]): number => {
  const a = [...xs].sort((x, y) => x - y)
  return a[Math.floor(a.length / 2)] ?? 0
}

function report(policy: Policy): { [k: string]: number | string } {
  const rs = Array.from({ length: SEEDS }, (_, i) => runShift(i + 1, policy))
  const wins = rs.filter((r) => r.win).length
  const ranks = rs.map((r) => r.rank)
  return {
    winRate: wins,
    medShiftSec: median(rs.map((r) => r.shiftSec)),
    medStars: median(rs.map((r) => r.stars)),
    medTips: median(rs.map((r) => r.tips)),
    medStrikes: median(rs.map((r) => r.strikes)),
    utilMax: Math.max(...rs.map((r) => r.utilMax)),
    rankDist: `S:${ranks.filter((r) => r === 'S').length} A:${ranks.filter((r) => r === 'A').length} B:${ranks.filter((r) => r === 'B').length}`,
    tipGapVsPerfect: 0
  }
}

const perf = report('perfect')
const forget = report('forgetful')
const gap = 1 - (Number(forget.medTips) / Number(perf.medTips))
console.log(`\n=== SIM 40 SEED — ${new Date().toISOString().slice(0, 10)} ===`)
console.log('chi so                        | bot hoan hao          | bot hay quen (25%/layer)')
console.log('------------------------------|-----------------------|-------------------------')
console.log(`win rate                      | ${String(perf.winRate)}/40 (${Math.round(Number(perf.winRate) / 40 * 100)}%)${' '.repeat(15)}| ${String(forget.winRate)}/40 (${Math.round(Number(forget.winRate) / 40 * 100)}%)`)
console.log(`median shift time (s)         | ${perf.medShiftSec}${' '.repeat(25)}| ${forget.medShiftSec}`)
console.log(`median stars /24              | ${perf.medStars}${' '.repeat(25)}| ${forget.medStars}`)
console.log(`median tips                   | ${perf.medTips}${' '.repeat(25)}| ${forget.medTips} (-${Math.round(gap * 100)}%)`)
console.log(`patience-util max @serve      | ${(Number(perf.utilMax) * 100).toFixed(1)}%${' '.repeat(20)}| ${(Number(forget.utilMax) * 100).toFixed(1)}%`)
console.log(`strikes median                | ${perf.medStrikes}${' '.repeat(25)}| ${forget.medStrikes}`)
console.log(`rank dist                     | ${perf.rankDist}${' '.repeat(12)}| ${forget.rankDist}`)

const gates = [
  ['perfect win 40/40', perf.winRate === 40],
  ['perfect shift 70-140s', Number(perf.medShiftSec) >= 70 && Number(perf.medShiftSec) <= 140],
  ['perfect util <=70%', Number(perf.utilMax) <= 0.7],
  ['perfect stars >=22', Number(perf.medStars) >= 22],
  ['perfect tips >=260', Number(perf.medTips) >= 260],
  ['perfect strikes 0', Number(perf.medStrikes) === 0],
  ['forgetful win >=60%', Number(forget.winRate) >= 24],
  ['forgetful stars <=20', Number(forget.medStars) <= 20],
  ['forgetful tips -25%+', gap >= 0.25],
  ['forgetful strikes >=1', Number(forget.medStrikes) >= 1]
] as const
console.log('\nGATE §C:')
for (const [name, pass] of gates) console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`)
if (gates.some(([, p]) => !p)) process.exitCode = 1

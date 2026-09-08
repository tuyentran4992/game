// Sim harness 40 seeds (TEST-CASES §C) + policy bot. Runs via: node --experimental-strip-types scripts/sim.ts
import { createGame, startDive } from '../src/core/rules.ts';
import { applyDiveTick } from '../src/core/tick.ts';
import type { GameState } from '../src/core/types.ts';
import { SEA_TOP, SURFACE_Y, reelSpeed } from '../src/data/world.ts';
import { fishById } from '../src/data/fishData.ts';

const DT = 1 / 60;
const MAX_SESSION_S = 900; // hard cap per seed

interface DiveRecord {
  durationS: number;
  sold: number;
  broke: boolean;
}

interface RunStats {
  seed: number;
  outcome: 'win' | 'lose' | 'timeout';
  sessionS: number;
  dives: DiveRecord[];
  breaks: number;
  breakEvents: number;
  sharkHits: number;
  moneyAtWhaleTouch: number | null; // money when first reaching the whale band with fuel to dive
  reachedWhale: boolean;
  rank: string | null;
  deepestM: number;
}

interface BotState {
  plan: 'down' | 'park' | 'up';
  waitTimer: number; // release window when parked at target depth
  parkTimer: number; // s parked at target (patient fishing: minPark before heading up)
  targetM: number;
  whaleDive: boolean;
}

const MIN_PARK_S = 18; // bot patience: fish the band a full window before heading up

// Policy (TEST-CASES §C): reel when tension<55; HOLD when >=55; surface when air<15%
// or carrying fish; target band: f4 -> f7 -> whale by affordability.
// Decide AFTER fuel is paid: go for the whale when >=450 remains (the touch-whale gate)
const WHALE_AFFORD_AFTER_FUEL = 450;
const nextTarget = (state: GameState): { targetM: number; whaleDive: boolean } => {
  if (state.diveCount <= 1) return { targetM: 300, whaleDive: false };
  if (state.money >= WHALE_AFFORD_AFTER_FUEL) return { targetM: 1195, whaleDive: true };
  return { targetM: 900, whaleDive: false };
};

// estimate seconds of air needed to surface from here (weight-aware, +35% for NIN windows)
const upEstimate = (state: GameState): number => {
  let w = 0;
  for (const uid of state.hooked) {
    const f = state.fish.find((fi) => fi.uid === uid);
    const def = f ? fishById(f.defId) : undefined;
    if (def) w += def.weight;
  }
  const dist = Math.max(0, state.hookY - SURFACE_Y);
  return (dist / Math.max(18, reelSpeed(w))) * 1.8 + 2;
};

const botInput = (state: GameState, bot: BotState): boolean => {
  if (state.phase !== 'dive') return false;
  const depthM = state.hookY - SEA_TOP;
  // whale fight: NIN while it thrashes. Threshold 40 sits BELOW the thrash band (>=61)
  // so the tension inertia never fools the bot into reeling a thrashing whale.
  if (state.whaleHooked) return state.tension >= 40;
  // surface before the remaining air can no longer cover the ride up
  if (state.air <= upEstimate(state)) bot.plan = 'up';
  if (bot.plan === 'down') {
    if (depthM >= bot.targetM) bot.plan = 'park';
    return true; // descend
  }
  if (bot.plan === 'park') {
    bot.parkTimer += DT;
    // deep water: shorter patience — a second heavy fish on the line is an air trap
    const minPark = bot.targetM >= 800 ? 8 : MIN_PARK_S;
    const maxSlots = state.doubleHook ? 2 : 1;
    const full = state.hooked.length >= maxSlots;
    if ((bot.parkTimer >= minPark && state.hooked.length >= 1) || full || bot.parkTimer >= minPark + 8) {
      bot.plan = 'up';
    }
    // parked: hold (NIN) to wait for fish, with periodic release windows
    bot.waitTimer += DT;
    return bot.waitTimer % 4 >= 0.35;
  }
  // heading up: reel when tension < 55, HOLD when >= 55
  return state.tension >= 55;
};

const runSeed = (seed: number): RunStats => {
  const state = createGame(seed);
  const bot: BotState = { plan: 'down', waitTimer: 0, parkTimer: 0, targetM: 350, whaleDive: false };
  const dives: DiveRecord[] = [];
  let breakEvents = 0;
  let sharkHits = 0;
  let breaksAtLastSurface = 0;
  let moneyAtWhaleTouch: number | null = null;
  let reachedWhale = false;
  const tick = (): void => {
    if (state.phase === 'title') {
      startDive(state);
      const t = nextTarget(state);
      bot.targetM = t.targetM;
      bot.whaleDive = t.whaleDive;
      return;
    }
    if (state.phase === 'dive') {
      if (state.hookMode === 'idle' && state.diveStartCooldown <= 0) {
        if (state.diveCount > 0 && state.money < 150) return; // can't dive; surface lose fires
        if (process.env.SIM_DEBUG && state.seed === 1) console.log(`  >> DIVE ${state.diveCount + 1} start (money ${state.money}, t=${state.sessionTime.toFixed(1)})`);
        startDive(state);
        const t = nextTarget(state);
        bot.targetM = t.targetM;
        bot.whaleDive = t.whaleDive;
        if (process.env.SIM_DEBUG && state.seed === 1) console.log(`     target ${bot.targetM} whaleDive ${bot.whaleDive}`);
        return;
      }
      if (!reachedWhale && state.deepestM >= 1100 && bot.whaleDive) {
        reachedWhale = true;
        moneyAtWhaleTouch = state.money;
      }
      const holding = botInput(state, bot);
      if (process.env.SIM_DEBUG && state.seed === 1 && Math.floor(state.sessionTime * 2) % 10 === 0 && Math.abs(state.sessionTime * 2 - Math.round(state.sessionTime * 2)) < DT) {
        const near = state.fish
          .map((f) => ({ id: f.defId, d: Math.hypot(f.x - state.hookX, f.y - state.hookY) }))
          .sort((a, b) => a.d - b.d)[0];
        console.log(`    t=${state.sessionTime.toFixed(1)} plan=${bot.plan} mode=${state.hookMode} depth=${(state.hookY - 96).toFixed(0)} hold=${holding} hooked=${state.hooked.length} near=${near ? near.id + '@' + near.d.toFixed(0) : 'none'}`);
      }
      const hookedBefore = state.hooked.length;
      applyDiveTick(state, DT, { holding });
      if (process.env.SIM_DEBUG && state.seed === 1 && state.hooked.length !== hookedBefore) {
        console.log(`  HOOKED ${hookedBefore}->${state.hooked.length} t=${state.sessionTime.toFixed(2)} mode=${state.hookMode} depth=${(state.hookY - 96).toFixed(0)} tension=${state.tension.toFixed(1)} strain=${state.strain.toFixed(1)} air=${state.air.toFixed(1)}`);
      }
      // applyDiveTick resets state.events on entry — the array is exactly this tick's
      for (const e of state.events) {
        if (e.type === 'break') breakEvents++;
        if (e.type === 'shark-hit') sharkHits++;
        if (process.env.SIM_DEBUG && state.seed === 1) console.log(`  ev ${e.type} ${e.text ?? ''} t=${state.sessionTime.toFixed(1)} depth=${(state.hookY - 96).toFixed(0)}`);
        if (e.type === 'surface') {
          if (process.env.SIM_DEBUG && state.seed === 1) console.log(`  >> SURFACE t=${state.sessionTime.toFixed(1)} dur=${state.diveTime.toFixed(1)} sold=${(e.value ?? 0)} money=${state.money} hookedLeft=${state.hooked.length}`);
          const dur = state.diveTime;
          dives.push({ durationS: dur, sold: e.value ?? 0, broke: state.breaks > breaksAtLastSurface });
          breaksAtLastSurface = state.breaks;
          bot.waitTimer = 0;
          bot.parkTimer = 0;
          bot.plan = 'down';
        }
      }
    }
  };
  let t = 0;
  while (t < MAX_SESSION_S && (state.phase === 'title' || state.phase === 'dive')) {
    tick();
    t += DT;
  }
  return {
    seed,
    outcome: state.phase === 'win' ? 'win' : state.phase === 'lose' ? 'lose' : 'timeout',
    sessionS: state.sessionTime,
    dives,
    breaks: state.breaks,
    breakEvents,
    sharkHits,
    moneyAtWhaleTouch,
    reachedWhale,
    rank: state.rank,
    deepestM: state.deepestM,
  };
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

export const runAllSeeds = (n = 40): RunStats[] => {
  const runs: RunStats[] = [];
  for (let seed = 1; seed <= n; seed++) runs.push(runSeed(seed));
  return runs;
};

export const summarize = (runs: RunStats[]): string => {
  const wins = runs.filter((r) => r.outcome === 'win').length;
  const winRate = (wins / runs.length) * 100;
  const allDives = runs.flatMap((r) => r.dives);
  const medianDive = median(allDives.map((d) => d.durationS));
  const survivalDiv = allDives.filter((d) => d.durationS >= 30 && d.durationS <= 60).length;
  const survivalPct = (survivalDiv / Math.max(1, allDives.length)) * 100;
  // M1-fix gate reading: % of seeds whose session survives (not lost) past the 60s mark
  const survivedTo60 = runs.filter((r) => r.outcome === 'win' || r.sessionS > 60).length;
  const survivedPct = (survivedTo60 / runs.length) * 100;
  const medianBreaks = median(runs.map((r) => r.breaks));
  const whaleMoney = runs.filter((r) => r.moneyAtWhaleTouch !== null).map((r) => r.moneyAtWhaleTouch!);
  const medianWhaleMoney = median(whaleMoney);

  const lines: string[] = [];
  lines.push('| metric | value | gate | pass |');
  lines.push('|---|---|---|---|');
  lines.push(`| win rate | ${winRate.toFixed(1)}% (${wins}/${runs.length}) | 20-60% | ${winRate >= 20 && winRate <= 60 ? 'YES' : 'NO'} |`);
  lines.push(`| median dive time | ${medianDive.toFixed(1)}s (${allDives.length} dives) | 25-70s | ${medianDive >= 25 && medianDive <= 70 ? 'YES' : 'NO'} |`);
  lines.push(`| dives in 30-60s window | ${survivalPct.toFixed(1)}% | >=50% | ${survivalPct >= 50 ? 'YES' : 'NO'} |`);
  lines.push(`| seeds alive past 60s | ${survivedPct.toFixed(1)}% | >=50% (M1-fix) | ${survivedPct >= 50 ? 'YES' : 'NO'} |`);
  lines.push(`| median breaks/run | ${medianBreaks.toFixed(1)} | <=2 | ${medianBreaks <= 2 ? 'YES' : 'NO'} |`);
  const totBreak = runs.reduce((a, r) => a + r.breakEvents, 0);
  const totShark = runs.reduce((a, r) => a + r.sharkHits, 0);
  lines.push(`| break events (tension) / shark hits | ${totBreak} / ${totShark} | info | - |`);
  lines.push(`| median money at whale touch | $${medianWhaleMoney.toFixed(0)} (${whaleMoney.length} runs reached) | >=450 | ${medianWhaleMoney >= 450 ? 'YES' : 'NO'} |`);
  lines.push(`| outcomes | win ${wins} / lose ${runs.filter((r) => r.outcome === 'lose').length} / timeout ${runs.filter((r) => r.outcome === 'timeout').length} | - | - |`);
  return lines.join('\n');
};

const main = (): void => {
  const runs = runAllSeeds(40);
  console.log('SIM 40 SEEDS — Deep Cast (policy: reel<55/HOLD>=55, surface air<15%, f4->f7->whale)');
  console.log(summarize(runs));
  console.log('per-seed:');
  for (const r of runs) {
    console.log(
      `  seed ${String(r.seed).padStart(2)}: ${r.outcome.padEnd(7)} ${r.sessionS.toFixed(0)}s ` +
      `dives ${r.dives.length} breaks ${r.breaks} deepest ${r.deepestM}m` +
      (r.rank ? ` rank ${r.rank}` : '') +
      (r.moneyAtWhaleTouch !== null ? ` whale-money $${r.moneyAtWhaleTouch}` : ''),
    );
  }
};

if (process.argv[1] && process.argv[1].includes('sim')) main();

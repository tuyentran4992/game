// [BALANCE-M1] Deterministic newbie-bot sim — port 1:1 physics từ scenes/Gameplay.ts
// (canvas 720x1280, roadW 72%, hit window catH*0.52, spawn interval formula, safeTimeDelta
// 0.38, occupied-lane-at-top rule, swarm 22s, items 3s). Logic engine (score/level/difficulty/
// beeType roll/fever/shield) dùng NGUYÊN GameEngine + rng injectable → tái lập 100%.
// Policy bot = mô hình người mới QA-REPORT t_662df9e4 mô tả: scan 15Hz, đổi lane khi ong
// vào lane mình, delay phản xạ 300ms. KHÔNG phải bot tối ưu.

import { GameEngine } from '../GameEngine';
import { MECHANICS } from '../../config/mechanics';
import type { MechanicsConfig, BeeType } from '../types';

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimBee {
  y: number;
  x: number;
  lane: number;
  secondaryLane?: number;
  speedMult: number;
  dodged: boolean;
  isSwarm?: boolean;
  type: BeeType;
}


interface SimItem {
  y: number;
  x: number;
  lane: number;
  kind: 'fish' | 'shield' | 'magnet';
  collected: boolean;
}

export interface RunResult {
  seed: number;
  deathT: number | null; // null = sống hết sim
  score: number;
  level: number;
}

export interface SimPolicy {
  reactionMs: number; // độ trễ từ phát hiện → ra lệnh (QA: 300ms)
  scanHz: number;     // tần suất nhìn màn (QA bot: 15)
  leadFactor: number; // bao nhiêu giây tiếp cận thì bắt đầu phản ứng
  marginSec: number;  // khoảng đệm người mới nhảy TRƯỚC khi ong chạm vùng hit (calib bot QA)
}

export const NEWBIE_POLICY: SimPolicy = { reactionMs: 300, scanHz: 15, leadFactor: 1, marginSec: 0.45 };

// --- physics constants khớp Gameplay.ts (canvas logic 720x1280) ---
const W = 720;
const H = 1280;
const ROAD_W = W * 0.72;
const LANE_W = ROAD_W / 3;
const LEFT_EDGE = W / 2 - ROAD_W / 2;
const LANES = [LEFT_EDGE + 0.5 * LANE_W, LEFT_EDGE + 1.5 * LANE_W, LEFT_EDGE + 2.5 * LANE_W];
const CAT_Y = H * 0.78;
const CAT_SIZE = Math.min(120, LANE_W * 0.70);
const BEE_SIZE = Math.min(84, LANE_W * 0.50);
const HIT_Y = CAT_SIZE * 0.52;
const HIT_X = CAT_SIZE * 0.45;
// UPG2-N1 (t_79d2b77d): MOVE_MS cũ 120+35 literal — giờ đọc cfg.laneMoveMs + cfg.laneMoveDelayMs
// trong runNewbieGame (physics 1:1 scene theo MechanicsConfig). SAFE_TIME_DELTA thuộc miền
// collision (DEFAULT_TUNING T1d) — không thuộc scope N1.
const SAFE_TIME_DELTA = 0.38;

export function runNewbieGame(
  seed: number,
  horizonSec: number,
  policy: SimPolicy = NEWBIE_POLICY,
  cfg: MechanicsConfig = MECHANICS,
): RunResult {
  const rng = mulberry32(seed);
  const engine = new GameEngine(cfg, { rng });
  engine.startNewGame();
  // UPG2-N1: quãng thời gian mèo đổi làn theo config (tween + delay) — 1:1 với scene.
  const moveMs = cfg.laneMoveMs + cfg.laneMoveDelayMs;

  let t = 0;
  let lane = 1;
  let catX = LANES[1];
  let moveFromX = catX;
  let moveToX = catX;
  let moveEndT = 0; // thời điểm hoàn tất tween hiện tại
  let pendingMoveAt: number | null = null; // lệnh đã bấm, chờ reactionMs (đang delay)
  let pendingTarget = 1;
  let lastScan = -1;
  const bees: SimBee[] = [];
  const items: SimItem[] = [];
  let lastSpawn = 0;
  let lastItemSpawn = 0;
  let lastTick = 0;
  let lastSwarmTime = 8; // Gameplay.ts init: lastSwarmTime = elapsed + 8
  let swarmActive = false;
  let swarmEndT = 0;
  let magnetT = 0;
  let shield = false;

  const dt = 1 / 60;
  const scanGap = 1 / policy.scanHz;

  const ttc = (b: SimBee, speed: number) => (CAT_Y - b.y) / (speed * b.speedMult);
  const laneDanger = (l: number, speed: number) => {
    let min = Infinity;
    for (const b of bees) {
      if (b.y > CAT_Y) continue;
      if (b.lane === l || b.secondaryLane === l) min = Math.min(min, ttc(b, speed));
    }
    return min;
  };

  while (t < horizonSec) {
    const level = engine.getLevel();
    const diff = engine.difficulty(t, level);
    const speed = diff.speed;
    const isFever = engine.isFeverActive();

    // cat tween
    if (t < moveEndT) {
      const p = 1 - (moveEndT - t) / (moveMs / 1000);
      catX = moveFromX + (moveToX - moveFromX) * Math.min(1, Math.max(0, p));
    } else {
      catX = LANES[lane];
    }

    // --- BOT SCAN (15Hz) — quyết định theo thông tin tại thời điểm scan ---
    if (t - lastScan >= scanGap) {
      lastScan = t;
      const react = policy.reactionMs / 1000;
      const lead = (react + moveMs / 1000) * policy.leadFactor + policy.marginSec;
      const threat = bees.some(b => !b.dodged && b.y < CAT_Y + HIT_Y &&
        (b.lane === lane || b.secondaryLane === lane) && ttc(b, speed) < lead && ttc(b, speed) > 0);
      if (threat && pendingMoveAt === null && t >= moveEndT) {
        // chọn lane trống nhất trong 2 lane kề (người mới chỉ nhảy 1 bước, ưu tiên vào giữa)
        const cands = [lane - 1, lane + 1].filter(l => l >= 0 && l <= 2);
        const safe = cands
          .map(l => ({ l, danger: laneDanger(l, speed) }))
          .sort((a, b) => b.danger - a.danger || Math.abs(b.l - 1) - Math.abs(a.l - 1));
        if (safe.length > 0 && safe[0].danger > lead) {
          pendingMoveAt = t + react; // tín hiệu về não → ra lệnh sau reactionMs
          pendingTarget = safe[0].l;
        }
      }
    }
    if (pendingMoveAt !== null && t >= pendingMoveAt) {
      pendingMoveAt = null;
      if (pendingTarget !== lane) {
        moveFromX = catX;
        moveToX = LANES[pendingTarget];
        lane = pendingTarget; // Gameplay: currentLane đổi ngay khi bấm
        moveEndT = t + moveMs / 1000;
      }
    }

    // --- timers engine ---
    lastTick += dt;
    if (lastTick >= 1) {
      lastTick -= 1;
      engine.tickSecond();
    }
    engine.updateTimers(dt);
    magnetT = Math.max(0, magnetT - dt);

    // --- swarm event (khớp Gameplay: interval 22s, suppress 4.5s) ---
    if (!swarmActive && t - lastSwarmTime >= cfg.swarmIntervalSec) {
      lastSwarmTime = t;
      swarmActive = true;
      swarmEndT = t + 4.5;
      const safeLane = Math.floor(rng() * 3);
      for (let l = 0; l < 3; l++) {
        if (l === safeLane) {
          items.push({ y: -30, x: LANES[l], lane: l, kind: 'fish', collected: false });
        } else {
          bees.push({ y: -BEE_SIZE, x: LANES[l], lane: l, speedMult: 1.15, dodged: false, isSwarm: true, type: 'speedy' });
        }
      }
    }
    if (swarmActive && t >= swarmEndT) swarmActive = false;

    // --- spawn ong (công thức interval theo MechanicsConfig — UPG2-N1 đọc cfg) ---
    if (!swarmActive) {
      const spawnInterval = Math.max(
        cfg.spawnIntervalFloor,
        cfg.spawnIntervalBase - (speed - cfg.startSpeed) * cfg.spawnSpeedFactor - (level - 1) * cfg.spawnLevelFactor,
      );
      lastSpawn += dt;
      if (lastSpawn >= spawnInterval && bees.length < diff.spawnCount + 2) {
        lastSpawn = 0;
        // occupied-lane-at-top rule
        const occupied = new Set<number>();
        for (const b of bees) if (b.y < 200) { occupied.add(b.lane); if (b.secondaryLane !== undefined) occupied.add(b.secondaryLane); }
        if (occupied.size < 2) {
          const type = engine.rollBeeType(t, level);
          const speedMult = type === 'speedy' ? cfg.speedyMult : cfg.normalMult;
          const freeLanes = [0, 1, 2].filter(l => !occupied.has(l));
          const valid = freeLanes.filter(l => {
            const tNew = (CAT_Y + BEE_SIZE) / (speed * speedMult);
            const blocked = new Set<number>([l]);
            for (const b of bees) {
              const tB = (CAT_Y - b.y) / (speed * b.speedMult);
              if (tB > 0 && Math.abs(tNew - tB) < SAFE_TIME_DELTA) {
                blocked.add(b.lane);
                if (b.secondaryLane !== undefined) blocked.add(b.secondaryLane);
              }
            }
            return blocked.size < 3;
          });
          if (valid.length > 0) {
            const l = valid[Math.floor(rng() * valid.length)];
            bees.push({ y: -BEE_SIZE, x: LANES[l], lane: l, speedMult, dodged: false, type });
            // con thứ 2: lv>=5, không lane occupied, 25%
            if (level >= 5 && occupied.size === 0 && rng() < 0.25) {
              const rem = valid.filter(x => x !== l);
              if (rem.length > 0) {
                bees.push({ y: -BEE_SIZE, x: LANES[rem[0]], lane: rem[0], speedMult: 1.0, dodged: false, type: 'normal' });
              }
            }
          }
        }
      }
    }

    // --- items 3s ---
    lastItemSpawn += dt;
    if (lastItemSpawn >= 3.0 && items.length < 3) {
      lastItemSpawn = 0;
      const l = Math.floor(rng() * 3);
      const roll = rng();
      let kind: SimItem['kind'] = 'fish';
      if (roll > 0.88 && !shield) kind = 'shield';
      else if (roll > 0.76 && magnetT <= 0) kind = 'magnet';
      items.push({ y: -40, x: LANES[l], lane: l, kind, collected: false });
    }

    // --- di chuyển + va chạm ---
    for (const b of bees) {
      b.y += speed * b.speedMult * dt;
      b.x = LANES[b.lane];
      // dodge record
      if (!b.dodged && b.y > CAT_Y + CAT_SIZE * 0.4) {
        b.dodged = true;
        const inLane = b.lane === lane;
        if (!inLane) engine.registerDodge();
        if (b.isSwarm) {
          b.isSwarm = false;
        }
      }
      // hit
      const hitY = Math.abs(b.y - CAT_Y) < HIT_Y;
      const hitX = (b.lane === lane || Math.abs(b.x - catX) < HIT_X) && Math.abs(b.x - catX) < HIT_X;
      if (hitY && hitX) {
        if (isFever) {
          engine.destroyBeeInFever();
          b.y = H + 999;
        } else if (shield) {
          shield = false;
          b.y = H + 999;
        } else {
          return { seed, deathT: t, score: engine.score, level: engine.getLevel() };
        }
      }
    }
    for (let i = bees.length - 1; i >= 0; i--) if (bees[i].y > H + 80) bees.splice(i, 1);

    for (const it of items) {
      const mag = magnetT > 0 || isFever;
      it.y += (mag ? Math.max(speed * 0.85, (CAT_Y - it.y) * 6.5) : speed * 0.85) * dt;
      it.x = mag ? it.x + (catX - it.x) * 6.5 * dt : LANES[it.lane];
      if (!it.collected && Math.abs(it.y - CAT_Y) < 52 && Math.abs(it.x - catX) < 52) {
        it.collected = true;
        if (it.kind === 'fish') engine.collectFish();
        else if (it.kind === 'shield') shield = true;
        else magnetT = cfg.magnetDurationSec;
      }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].collected || items[i].y > H + 60) items.splice(i, 1);

    t += dt;
  }

  return { seed, deathT: null, score: engine.score, level: engine.getLevel() };
}

export function simulateWindow(
  n: number,
  fromSec: number,
  toSec: number,
  cfg: MechanicsConfig = MECHANICS,
  policy: SimPolicy = NEWBIE_POLICY,
): { survived: number; total: number; deaths: { seed: number; t: number }[]; ratio: number } {
  let survived = 0;
  const deaths: { seed: number; t: number }[] = [];
  for (let s = 1; s <= n; s++) {
    const early = runNewbieGame(s, fromSec, policy, cfg);
    if (early.deathT !== null) { deaths.push({ seed: s, t: early.deathT }); continue; }
    // sống tới fromSec (warmup che) → tính tiếp cửa sổ (engine mới = cùng seed ⇒ history giống hệt)
    const full = runNewbieGame(s, toSec, policy, cfg);
    if (full.deathT === null || full.deathT >= toSec - 1e-9) survived++;
    else deaths.push({ seed: s, t: full.deathT });
  }
  return { survived, total: n, deaths, ratio: survived / n };
}

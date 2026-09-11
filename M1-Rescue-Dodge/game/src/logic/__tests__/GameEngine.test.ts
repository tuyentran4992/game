import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { MECHANICS } from '../mechanics';
import type { BeeType } from '../types';

describe('GameEngine — score + combo', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('registerDodge cộng +1 điểm mỗi lần né', () => {
    const r1 = engine.registerDodge();
    expect(r1.scoreDelta).toBe(1);
    const r2 = engine.registerDodge();
    expect(engine.score).toBe(2);
    expect(r2.comboTriggered).toBe(false);
  });

  it('combo +5 mỗi 5 lần né liên tiếp (BR-15)', () => {
    for (let i = 0; i < 4; i++) engine.registerDodge();
    const fifth = engine.registerDodge(); // lần 5
    expect(fifth.comboTriggered).toBe(true);
    expect(fifth.comboBonus).toBe(5);
    // 5 lần né = 5 điểm + 5 combo = 10
    expect(engine.score).toBe(10);
    // lần 6 không combo
    const sixth = engine.registerDodge();
    expect(sixth.comboTriggered).toBe(false);
  });

  it('reset streak khi chạm ong (BR-15)', () => {
    engine.registerDodge(); engine.registerDodge(); engine.registerDodge();
    engine.registerHit();
    const r = engine.registerDodge();
    expect(r.comboTriggered).toBe(false); // streak đã reset, chưa đủ 5
    expect(engine.streak).toBe(1);
  });

  it('combo thứ 2 sau reset vẫn cộng +5 nếu đủ 5', () => {
    engine.registerHit();
    for (let i = 0; i < 5; i++) engine.registerDodge();
    expect(engine.score).toBe(5 + 5); // 5 né + 5 combo
  });
});

describe('GameEngine — level progression + palette (BR-14)', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('level = floor(score/22)+1 và KHÔNG reset (BALANCE-M1: mi 10→22)', () => {
    expect(engine.getLevel(0)).toBe(1);
    expect(engine.getLevel(21)).toBe(1);
    expect(engine.getLevel(22)).toBe(2);
    expect(engine.getLevel(43)).toBe(2);
    expect(engine.getLevel(44)).toBe(3);
    expect(engine.getLevel(66)).toBe(4);
  });

  it('registerDodge trả levelUp=true khi qua mốc 22 điểm (combo đẩy nhanh)', () => {
    // điểm = dodge + combo bonus mỗi 5 → mốc 22 tới ở cú né thứ 12
    let up: { levelUp: boolean; newLevel: number } | null = null;
    for (let i = 0; i < 30 && !up; i++) {
      const r = engine.registerDodge();
      if (r.levelUp) up = r;
    }
    expect(up!.levelUp).toBe(true);
    expect(up!.newLevel).toBe(2);
    expect(engine.score).toBeGreaterThanOrEqual(MECHANICS.milestoneInterval);
  });

  it('palette chuyển theo ngưỡng level (Level 1..9: ngày, 10..19: hoàng hôn, 20+: đêm)', () => {
    expect(engine.getPaletteIndex(1)).toBe(0);
    expect(engine.getPaletteIndex(9)).toBe(0);
    expect(engine.getPaletteIndex(10)).toBe(1);
    expect(engine.getPaletteIndex(19)).toBe(1);
    expect(engine.getPaletteIndex(20)).toBe(2);
    expect(engine.getPaletteIndex(50)).toBe(2);
  });

  it('palette index đúng khi bắt đầu và khi lên level cao', () => {
    expect(engine.paletteIndex).toBe(0);
  });
});

describe('GameEngine — kỷ lục mới (BR-16)', () => {
  it('khi score vượt best cũ → isNewRecord 1 lần/phiên', () => {
    const engine = new GameEngine(MECHANICS, { bestScore: 5 });
    engine.startNewGame();
    // 6 né: dodge1-5 => score 10 (combo +5 tại dodge 5), dodge6 => score 11
    for (let i = 0; i < 6; i++) engine.registerDodge();
    const end = engine.endGame();
    expect(end.isNewRecord).toBe(true);
    expect(end.bestScore).toBe(11);
    // record popup chỉ 1 lần/phiên
    expect(engine.recordShownThisSession).toBe(true);
  });

  it('không flag kỷ lục khi chưa vượt best', () => {
    const engine = new GameEngine(MECHANICS, { bestScore: 100 });
    engine.startNewGame();
    engine.registerDodge();
    const end = engine.endGame();
    expect(end.isNewRecord).toBe(false);
    expect(end.bestScore).toBe(100);
  });

  it('bestScore được giữ qua nhiều phiên; record không lặp trong cùng phiên', () => {
    const engine = new GameEngine(MECHANICS, { bestScore: 3 });
    engine.startNewGame();
    engine.registerDodge(); engine.registerDodge(); engine.registerDodge(); engine.registerDodge();
    const end = engine.endGame();
    expect(end.isNewRecord).toBe(true);
    expect(end.bestScore).toBe(4);
  });
});

// BR-17 curve D-A2 (chốt §5.1 card mẹ t_e1f6694d — comment id 23), hệ số chỉnh BALANCE-M1 t_2e94b3be:
// warmup 30s flat 160 → ramp 1.2px/s tới 90s → 5.0px/s sau 90s; levelSpeedStep 10; softcap 440 K=1.5.
describe('GameEngine — difficulty curve D-A2 (BR-17)', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('warmup = 30s: trong 30s đầu tốc độ = startSpeed (THẤP, giữ chân)', () => {
    expect(MECHANICS.warmupSeconds).toBe(30);
    expect(engine.difficulty(5).speed).toBe(MECHANICS.startSpeed);
    expect(engine.difficulty(0).speed).toBe(MECHANICS.startSpeed);
    expect(engine.difficulty(30).speed).toBe(MECHANICS.startSpeed);
  });

  it('khúc ramp sớm (30-90s): tốc độ ramp theo config B1 (0.85px/s), liên tục tại 2 mốc', () => {
    // UPG2-B1: số neo 1.2→0.85 theo điều khoản card (test cũ khóa giá trị cũ → cập nhật số neo,
    // công thức D-A2 giữ nguyên; khóa giá trị mới ở balanceB1.test.ts)
    expect(MECHANICS.earlyRampPerSec).toBe(0.85);
    expect(MECHANICS.earlyRampUntilSec).toBe(90);
    expect(engine.difficulty(40).speed).toBe(MECHANICS.startSpeed + 0.85 * 10);
    expect(engine.difficulty(90).speed).toBe(MECHANICS.startSpeed + 0.85 * 60);
    // liền mạch tại ranh giới 90s
    expect(engine.difficulty(90.001).speed).toBeCloseTo(engine.difficulty(90).speed, 1);
  });

  it('sau 90s: phần vượt ramp tính theo speedIncreasePerSec', () => {
    // difficulty(100) = startSpeed + 0.85*60 + speedIncreasePerSec*10
    expect(engine.difficulty(100).speed).toBe(MECHANICS.startSpeed + 51 + MECHANICS.speedIncreasePerSec * 10);
    expect(engine.difficulty(110).speed).toBe(MECHANICS.startSpeed + 51 + MECHANICS.speedIncreasePerSec * 20);
    expect(engine.difficulty(150).speed).toBe(MECHANICS.startSpeed + 51 + MECHANICS.speedIncreasePerSec * 60);
  });

  it('levelSpeedStep = 10: levelBonus = 10*(level-1)', () => {
    expect(MECHANICS.levelSpeedStep).toBe(10);
    expect(engine.difficulty(60, 5).speed).toBe(MECHANICS.startSpeed + 0.85 * 30 + 10 * 4);
  });

  it('tốc độ sau mốc maxSpeed tăng siêu chậm (soft cap K=1.5) thay vì bị chặn cứng', () => {
    const diff = engine.difficulty(300, 40);
    expect(diff.speed).toBeGreaterThan(MECHANICS.maxSpeed);
    expect(diff.speed).toBeLessThan(750);

    // Thời gian chơi cực lâu hoặc level cực cao vẫn tăng chậm, không phát nổ
    const crazyDiff = engine.difficulty(1000, 20);
    expect(crazyDiff.speed).toBeGreaterThan(MECHANICS.maxSpeed);
    expect(crazyDiff.speed).toBeLessThan(750);
  });


  it('monotonic: difficulty(180s,lv) > difficulty(60s,lv) mọi level', () => {
    for (const lv of [1, 5, 10, 20]) {
      expect(engine.difficulty(180, lv).speed).toBeGreaterThan(engine.difficulty(60, lv).speed);
    }
  });

  it('spawn rate tăng sau warmup 30s và chặn bởi spawnRateMax', () => {
    expect(engine.difficulty(5).spawnCount).toBe(1);
    expect(engine.difficulty(30).spawnCount).toBe(1);
    const d40 = engine.difficulty(40);
    expect(d40.spawnCount).toBeGreaterThan(1);
    const dMax = engine.difficulty(1000);
    expect(dMax.spawnCount).toBe(MECHANICS.spawnRateMax);
  });
});

describe('GameEngine — time score + lifecycle', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('tickSecond cộng +1/s trụ', () => {
    const r = engine.tickSecond();
    expect(r.scoreDelta).toBe(1);
    expect(engine.score).toBe(1);
  });

  it('startNewGame reset score/streak nhưng giữ best + tăng totalGames', () => {
    const e = new GameEngine(MECHANICS, { bestScore: 7 });
    e.startNewGame();
    e.registerDodge(); e.registerDodge();
    e.endGame();
    e.startNewGame();
    expect(e.score).toBe(0);
    expect(e.streak).toBe(0);
    expect(e.bestScore).toBe(7);
    expect(e.totalGamesPlayed).toBe(2);
  });

  it('continue (rewarded) tối đa 1 lần/game over (BR-10); reset khi new game', () => {
    expect(engine.canContinue()).toBe(true);
    engine.useContinue();
    expect(engine.canContinue()).toBe(false);
    engine.startNewGame();
    expect(engine.canContinue()).toBe(true);
  });

  it('interstitial chỉ từ lượt chơi thứ 2 (BR-09)', () => {
    // beforeEach đã startNewGame => totalGamesPlayed = 1
    expect(engine.shouldShowInterstitial()).toBe(false);
    engine.endGame();
    engine.startNewGame(); // total = 2
    expect(engine.shouldShowInterstitial()).toBe(true);
  });
});

describe('GameEngine — Phase 2: Fish Pickups, Shield, Magnet, Fever, Near-Miss', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('collectFish cộng +2 điểm và tích lũy số cá', () => {
    const r1 = engine.collectFish();
    expect(r1.scoreDelta).toBe(2);
    expect(engine.fish).toBe(1);
    expect(engine.totalFish).toBe(1);
    expect(engine.score).toBe(2);
    expect(engine.fever).toBe(MECHANICS.feverPerFish);
  });

  it('activateShield và tryUseShield cứu 1 lần va chạm', () => {
    expect(engine.shieldActive).toBe(false);
    engine.activateShield();
    expect(engine.shieldActive).toBe(true);

    // Va chạm lần 1 -> khiên cứu mạng, mất khiên
    const saved = engine.tryUseShield();
    expect(saved).toBe(true);
    expect(engine.shieldActive).toBe(false);

    // Va chạm lần 2 -> không còn khiên
    const savedAgain = engine.tryUseShield();
    expect(savedAgain).toBe(false);
  });

  it('activateMagnet bật thời gian hút cá', () => {
    expect(engine.isMagnetActive()).toBe(false);
    engine.activateMagnet(5);
    expect(engine.isMagnetActive()).toBe(true);
    expect(engine.magnetTimeRemaining).toBe(5);

    engine.updateTimers(3);
    expect(engine.magnetTimeRemaining).toBe(2);
    expect(engine.isMagnetActive()).toBe(true);

    engine.updateTimers(2.5);
    expect(engine.isMagnetActive()).toBe(false);
  });

  it('tích lũy Fever và kích hoạt Fever Mode khi đạt 100%', () => {
    expect(engine.isFeverActive()).toBe(false);
    expect(engine.fever).toBe(0);

    // Nạp fever qua ăn cá & né
    engine.addFever(50);
    expect(engine.fever).toBe(50);
    expect(engine.isFeverActive()).toBe(false);

    const triggered = engine.addFever(60); // Vượt 100%
    expect(triggered).toBe(true);
    expect(engine.isFeverActive()).toBe(true);
    expect(engine.feverTimeRemaining).toBe(MECHANICS.feverDurationSec);

    // Trong Fever: điểm x2
    const fishRes = engine.collectFish();
    expect(fishRes.scoreDelta).toBe(MECHANICS.pointsPerFish * 2);

    // Húc ong trong Fever
    const killRes = engine.destroyBeeInFever();
    expect(killRes.scoreDelta).toBe(MECHANICS.feverKillBonus);

    // Fever hết giờ
    const { feverEnded } = engine.updateTimers(5);
    expect(feverEnded).toBe(true);
    expect(engine.isFeverActive()).toBe(false);
    expect(engine.fever).toBe(0);
  });

  it('registerNearMiss cộng điểm thưởng và nạp Fever lớn', () => {
    const r = engine.registerNearMiss();
    expect(r.scoreDelta).toBe(MECHANICS.nearMissBonus);
    expect(engine.fever).toBe(MECHANICS.feverPerNearMiss);
  });

  it('endGame trả về đủ thông tin cá vàng', () => {
    engine.collectFish();
    engine.collectFish();
    const end = engine.endGame();
    expect(end.fish).toBe(2);
    expect(end.totalFish).toBe(2);
  });
});

describe('GameEngine — Phase 4: Enemy Variety & Swarm Events', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  // D-A2: gate ONLY theo elapsed (bỏ điều kiện level===1 dead-code) — 30s đầu chỉ 'normal'.
  it('rollBeeType trả về normal trong 30s đầu (mọi level, rng adversarial)', () => {
    const seeded = new GameEngine(MECHANICS, { rng: () => 0.42 }); // mọi roll rơi vào nhánh speedy/zigzag
    for (let i = 0; i < 20; i++) {
      expect(seeded.rollBeeType(5, 1)).toBe('normal');
      expect(seeded.rollBeeType(29.9, 10)).toBe('normal'); // qua gate level cũng vẫn normal nếu <30s
    }
  });

  it('speedy KHÔNG xuất hiện khi elapsed<30 với rng seeded; xuất hiện ngay sau 30s', () => {
    const seedRng = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
    const e = new GameEngine(MECHANICS, { rng: seedRng([0.1, 0.2, 0.3]) });
    for (let t = 0; t < 30; t++) {
      expect(e.rollBeeType(t, 1)).toBe('normal');
    }
    // elapsed >= 30, level 1: roll < 0.25 → speedy
    const e2 = new GameEngine(MECHANICS, { rng: () => 0.1 });
    expect(e2.rollBeeType(31, 1)).toBe('speedy');
    const types = new Set<BeeType>();
    const e3 = new GameEngine(MECHANICS, { rng: seedRng([0.1, 0.9]) });
    for (let i = 0; i < 10; i++) types.add(e3.rollBeeType(45, 1));
    expect(types.has('normal')).toBe(true);
    expect(types.has('speedy')).toBe(true);
  });

  it('rollBeeType tại Level 10+ (Hoàng hôn & Đêm) ra thêm ong zigzag', () => {
    const types = new Set<BeeType>();
    for (let i = 0; i < 100; i++) {
      types.add(engine.rollBeeType(30, 10));
    }
    expect(types.has('normal')).toBe(true);
    expect(types.has('speedy')).toBe(true);
    expect(types.has('zigzag')).toBe(true);
  });

  it('rollBeeType tại Stage 3 (hoặc level 20+) ra thêm ong stalker', () => {
    const stage3Engine = new GameEngine(MECHANICS);
    stage3Engine.stage = 3;
    const types = new Set<BeeType>();
    for (let i = 0; i < 200; i++) {
      types.add(stage3Engine.rollBeeType(35, 1));
    }
    expect(types.has('normal')).toBe(true);
    expect(types.has('speedy')).toBe(true);
    expect(types.has('zigzag')).toBe(true);
    expect(types.has('stalker')).toBe(true);
  });

  it('Stage 2 và Stage 3 cho phép ra đủ loại ong ngay từ Level 1 (elapsed < 30s)', () => {
    const stage2 = new GameEngine(MECHANICS);
    stage2.stage = 2;
    const s2Types = new Set<BeeType>();
    for (let i = 0; i < 50; i++) {
      s2Types.add(stage2.rollBeeType(5, 1));
    }
    expect(s2Types.has('zigzag')).toBe(true);
    expect(s2Types.has('speedy')).toBe(true);

    const stage3 = new GameEngine(MECHANICS);
    stage3.stage = 3;
    const s3Types = new Set<BeeType>();
    for (let i = 0; i < 100; i++) {
      s3Types.add(stage3.rollBeeType(5, 1));
    }
    expect(s3Types.has('stalker')).toBe(true);
    expect(s3Types.has('zigzag')).toBe(true);
    expect(s3Types.has('speedy')).toBe(true);
  });


  // D-A2 deterministic sim 90s: rng injectable, không Math.random thô.
  it('sim 90s deterministic: t<30s speed < 300px/s và 0 speedy bee; speed tăng đơn điệu', () => {
    let seedState = 0xC0FFEE;
    const mulberry32 = () => {
      seedState |= 0; seedState = (seedState + 0x6D2B79F5) | 0;
      let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const e = new GameEngine(MECHANICS, { rng: mulberry32 });
    e.startNewGame();

    let prevSpeed = 0;
    for (let t = 0; t <= 90; t++) {
      const speed = e.difficulty(t, e.getLevel()).speed;
      expect(speed).toBeGreaterThanOrEqual(prevSpeed); // monotonic không giảm
      prevSpeed = speed;
      if (t < 30) {
        // warmup flat theo thời gian (level 1 = mốc onboarding curve): <300px/s
        expect(e.difficulty(t, 1).speed).toBeLessThan(300);
        // 60 roll/giây cũng không được ra speedy trong warmup
        for (let i = 0; i < 60; i++) expect(e.rollBeeType(t, e.getLevel())).not.toBe('speedy');
      }
      // mô phỏng tick điểm để level tiến (giữ sim khớp engine state)
      e.registerDodge();
      if (t % 3 === 0) e.tickSecond();
    }
    // at 90s, riêng time-ramp (level 1): 160 + 2.5*60 = 310 < 440 — chưa chạm softcap
    expect(e.difficulty(90, 1).speed).toBeLessThanOrEqual(440);
  });

  it('shouldTriggerFatBeeBreather tính toán chính xác theo phương trình L(k) = 20 + 15k + 5k^2', () => {
    // k = 0 -> Level 20
    expect(engine.getNextFatBeeTargetLevel(0)).toBe(20);
    expect(engine.shouldTriggerFatBeeBreather(19)).toBe(false);
    expect(engine.shouldTriggerFatBeeBreather(20)).toBe(true);

    engine.consumeFatBeeBreather(); // k = 1 -> Level 40 (+20)
    expect(engine.getNextFatBeeTargetLevel()).toBe(40);
    expect(engine.shouldTriggerFatBeeBreather(39)).toBe(false);
    expect(engine.shouldTriggerFatBeeBreather(40)).toBe(true);

    engine.consumeFatBeeBreather(); // k = 2 -> Level 70 (+30)
    expect(engine.getNextFatBeeTargetLevel()).toBe(70);
    expect(engine.shouldTriggerFatBeeBreather(69)).toBe(false);
    expect(engine.shouldTriggerFatBeeBreather(70)).toBe(true);

    engine.consumeFatBeeBreather(); // k = 3 -> Level 110 (+40)
    expect(engine.getNextFatBeeTargetLevel()).toBe(110);

    engine.consumeFatBeeBreather(); // k = 4 -> Level 160 (+50)
    expect(engine.getNextFatBeeTargetLevel()).toBe(160);

    engine.consumeFatBeeBreather(); // k = 5 -> Level 220 (+60)
    expect(engine.getNextFatBeeTargetLevel()).toBe(220);
  });

  it('registerSwarmSurvive cộng +10 điểm và nạp +30% Fever', () => {
    const r = engine.registerSwarmSurvive();
    expect(r.scoreDelta).toBe(MECHANICS.swarmBonus);
    expect(engine.score).toBe(MECHANICS.swarmBonus);
    expect(engine.fever).toBe(MECHANICS.feverPerSwarm);
  });

  it('registerSwarmSurvive nhân đôi điểm trong Fever mode', () => {
    engine.addFever(100); // trigger fever
    expect(engine.isFeverActive()).toBe(true);
    const r = engine.registerSwarmSurvive();
    expect(r.scoreDelta).toBe(MECHANICS.swarmBonus * 2);
  });

  it('resumeGame bảo toàn score và fish, cấp khiên hồi sinh', () => {
    engine.score = 25;
    engine.fish = 4;
    engine.useContinue();
    engine.resumeGame();

    expect(engine.score).toBe(25);
    expect(engine.fish).toBe(4);
    expect(engine.shieldActive).toBe(true);
    expect(engine.canContinue()).toBe(false); // chỉ 1 lần continue per session
  });
});

describe('GameEngine — Meta Progression: Cat Skins & Shop', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS, { totalFish: 500 }); });

  it('mặc định sở hữu skin ginger', () => {
    expect(engine.isSkinUnlocked('ginger')).toBe(true);
    expect(engine.selectedSkin).toBe('ginger');
    expect(engine.getSelectedSkinTexture()).toBe('cat_idle');
  });

  it('mở khóa skin tuxedo trừ 450 cá vàng và tự trang bị', () => {
    const success = engine.unlockSkin('tuxedo');
    expect(success).toBe(true);
    expect(engine.totalFish).toBe(50);
    expect(engine.isSkinUnlocked('tuxedo')).toBe(true);
    expect(engine.selectedSkin).toBe('tuxedo');
    expect(engine.getSelectedSkinTexture()).toBe('cat_tuxedo');
  });

  it('không thể mở khóa skin nếu không đủ cá vàng', () => {
    const poorEngine = new GameEngine(MECHANICS, { totalFish: 100 });
    const success = poorEngine.unlockSkin('astro'); // giá 1800
    expect(success).toBe(false);
    expect(poorEngine.isSkinUnlocked('astro')).toBe(false);
    expect(poorEngine.totalFish).toBe(100);
  });

  it('chuyển đổi skin đã mở khóa thành công', () => {
    engine.unlockSkin('tuxedo');
    expect(engine.selectSkin('ginger')).toBe(true);
    expect(engine.selectedSkin).toBe('ginger');
    expect(engine.selectSkin('tuxedo')).toBe(true);
    expect(engine.selectedSkin).toBe('tuxedo');
  });
});

describe('GameEngine — Quests & Achievements', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS, { totalFish: 0 }); engine.startNewGame(); });

  it('tăng tiến độ quest né ong khi né thành công', () => {
    for (let i = 0; i < 5; i++) engine.registerDodge();
    const q = engine.getQuests().find(item => item.id === 'dodge_30');
    expect(q?.progress).toBe(5);
  });

  it('tăng tiến độ quest ăn cá vàng khi nhặt cá', () => {
    engine.collectFish();
    engine.collectFish();
    const q = engine.getQuests().find(item => item.id === 'collect_8_fish');
    expect(q?.progress).toBe(2);
  });

  it('hoàn thành và nhận thưởng quest', () => {
    engine.incrementQuest('survive_swarm', 1);
    const q = engine.getQuests().find(item => item.id === 'survive_swarm');
    expect(q?.progress).toBe(1);
    expect(engine.hasUnclaimedQuests()).toBe(true);

    const reward = engine.claimQuest('survive_swarm');
    expect(reward).toBe(25);
    expect(engine.totalFish).toBe(25);
    expect(q?.claimed).toBe(true);
    expect(engine.hasUnclaimedQuests()).toBe(false);
  });
});

describe('GameEngine — Stage-based Progression (Separate Stages)', () => {
  let engine: GameEngine;
  beforeEach(() => {
    engine = new GameEngine(MECHANICS);
    engine.startNewGame();
  });

  it('khởi tạo stage ban đầu là Stage 1 với target 20 điểm', () => {
    expect(engine.stage).toBe(1);
    expect(engine.stageScore).toBe(0);
    expect(engine.getStageTarget(1)).toBe(20);
    expect(engine.getStageTarget(2)).toBe(25);
    expect(engine.getStageTarget(3)).toBe(30);
    expect(engine.isStageComplete()).toBe(false);
  });

  it('hoàn thành level khi sống sót đủ 30 giây (Stage 1: Level 1..10)', () => {
    // Trong 29s đầu: né ong tích điểm thoải mái, KHÔNG kích hoạt stageClear giữa chừng
    for (let i = 0; i < 9; i++) {
      const res = engine.registerDodge();
      expect(res.stageClear).toBe(false);
    }
    for (let i = 0; i < 29; i++) {
      const res = engine.tickSecond();
      expect(res.stageClear).toBe(false);
      expect(res.levelClear).toBe(false);
    }
    expect(engine.isLevelComplete()).toBe(false);

    // Giây thứ 30: sống sót đủ 30s -> Hoàn thành Level 1!
    const finalRes = engine.tickSecond();
    expect(engine.isLevelComplete()).toBe(true);
    expect(finalRes.stageClear).toBe(true);
    expect(finalRes.levelClear).toBe(true);
    expect(finalRes.stageClearResult).toBeDefined();
    expect(finalRes.stageClearResult?.level).toBe(1);
    expect(finalRes.stageClearResult?.nextLevel).toBe(2);
    expect(finalRes.stageClearResult?.isStageComplete).toBe(false);
  });

  it('tính số sao chính xác theo thành tích stage', () => {
    // Case 1: 1 sao cơ bản khi vừa đủ điểm không combo / không cá
    engine.stageScore = 20;
    expect(engine.getStageStars()).toBe(1);

    // Case 2: 2 sao khi có nhặt cá hoặc combo >= 5
    engine.stageFish = 1;
    expect(engine.getStageStars()).toBe(2);

    // Case 3: 3 sao khi combo >= 10 và khiên không bị vỡ (stageShieldLost = false)
    engine.stageMaxCombo = 10;
    expect(engine.getStageStars()).toBe(3);

    // Nếu bị mất khiên trong stage, rớt về tối đa 2 sao
    engine.stageShieldLost = true;
    expect(engine.getStageStars()).toBe(2);
  });

  it('advanceToNextStage chuyển sang Stage 2 và reset tiến độ stage con', () => {
    engine.stageScore = 22;
    engine.stageFish = 3;
    engine.stageMaxCombo = 8;
    const clearRes = engine.completeStage();
    expect(clearRes.nextStage).toBe(2);
    expect(engine.bestStage).toBe(2);

    engine.advanceToNextStage();
    expect(engine.stage).toBe(2);
    expect(engine.stageScore).toBe(0);
    expect(engine.stageFish).toBe(0);
    expect(engine.stageMaxCombo).toBe(0);
    expect(engine.stageCleared).toBe(false);
    expect(engine.getStageTarget()).toBe(25);
  });

  it('completeStage tại Stage 3 đánh dấu isVictory = true và không vượt quá Stage 3', () => {
    engine.stage = 3;
    engine.stageLevel = 10;
    const res = engine.completeStage();
    expect(res.isVictory).toBe(true);
    expect(res.isStageComplete).toBe(true);
    expect(res.nextStage).toBe(3);

    engine.advanceToNextStage();
    expect(engine.stage).toBe(3);
    expect(engine.stageLevel).toBe(1);
  });

  it('retryCurrentStage bảo toàn điểm của stage trước và reset stage hiện tại', () => {
    // Giả sử hoàn thành Stage 1 với 20 điểm
    engine.score = 20;
    engine.advanceToNextStage(); // sang Stage 2

    // Chơi Stage 2 được 10 điểm và nhặt 2 cá
    engine.score += 10;
    engine.stageScore = 10;
    engine.fish += 2;
    engine.totalFish += 2;
    engine.stageFish = 2;

    // Đang chơi ở Level 4 của Stage 2
    engine.stageLevel = 4;

    // Retry Stage 2
    engine.retryCurrentStage();
    expect(engine.stage).toBe(2);
    expect(engine.stageLevel).toBe(1); // Vẫn giữ Stage 2, reset level về 1
    expect(engine.stageScore).toBe(0);
    expect(engine.stageFish).toBe(0);
    expect(engine.score).toBe(20); // Điểm Stage 1 được giữ nguyên

  });

  it('endGame báo cáo đúng stage hiện tại và bestStage', () => {
    engine.advanceToNextStage(); // Stage 2
    engine.advanceToNextStage(); // Stage 3
    const result = engine.endGame();
    expect(result.stage).toBe(3);
    expect(result.bestStage).toBe(3);
  });

  it('getProgressionLevel tính toán đúng cấp độ lũy tiến theo Stage và Level', () => {
    engine.startNewGame(); // Stage 1, Level 1
    expect(engine.getProgressionLevel()).toBe(1);

    engine.stageLevel = 10;
    expect(engine.getProgressionLevel()).toBe(10);

    engine.advanceToNextStage(); // Stage 2, Level 1
    expect(engine.stage).toBe(2);
    expect(engine.stageLevel).toBe(1);
    expect(engine.getProgressionLevel()).toBe(11);

    // Điểm cao tích lũy từ Stage 1 không làm nhảy vọt cấp độ Stage 2
    engine.score = 1669;
    expect(engine.getProgressionLevel()).toBe(11);

    // Không được kích hoạt Ong Chúa ở Stage 2 Level 1
    expect(engine.shouldTriggerFatBeeBreather()).toBe(false);

    // Ong Chúa mốc đầu tiên (target 20) chỉ xuất hiện ở Level 20 (Stage 2 Level 10)
    engine.stageLevel = 10;
    expect(engine.getProgressionLevel()).toBe(20);
    expect(engine.shouldTriggerFatBeeBreather()).toBe(true);

    engine.advanceToNextStage(); // Stage 3, Level 1
    expect(engine.getProgressionLevel()).toBe(21);
  });
});


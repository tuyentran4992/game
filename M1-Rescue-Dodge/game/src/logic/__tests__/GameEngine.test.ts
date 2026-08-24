import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { MECHANICS } from '../mechanics';

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

  it('level = floor(score/10)+1 và KHÔNG reset', () => {
    expect(engine.getLevel(0)).toBe(1);
    expect(engine.getLevel(9)).toBe(1);
    expect(engine.getLevel(10)).toBe(2);
    expect(engine.getLevel(19)).toBe(2);
    expect(engine.getLevel(20)).toBe(3);
    expect(engine.getLevel(30)).toBe(4);
  });

  it('registerDodge trả levelUp=true khi qua mốc 10 điểm (combo đẩy nhanh)', () => {
    // 4 né đầu = 4 điểm; né thứ 5 → combo +5 => score 10 => level 2
    for (let i = 0; i < 4; i++) engine.registerDodge();
    const milestone = engine.registerDodge(); // điểm 10
    expect(milestone.levelUp).toBe(true);
    expect(milestone.newLevel).toBe(2);
  });

  it('palette vòng lại sau 3 level (BR-14)', () => {
    expect(engine.getPaletteIndex(1)).toBe(0);
    expect(engine.getPaletteIndex(2)).toBe(1);
    expect(engine.getPaletteIndex(3)).toBe(2);
    expect(engine.getPaletteIndex(4)).toBe(0); // vòng lại
    expect(engine.getPaletteIndex(5)).toBe(1);
  });

  it('palette index đúng khi lên level qua dodge', () => {
    // 5 né => score 10 (combo) => level 2 => palette index 1
    for (let i = 0; i < 5; i++) engine.registerDodge();
    expect(engine.paletteIndex).toBe(1);
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

describe('GameEngine — difficulty curve (BR-17)', () => {
  let engine: GameEngine;
  beforeEach(() => { engine = new GameEngine(MECHANICS); engine.startNewGame(); });

  it('trong 10s đầu: tốc độ = startSpeed (THẤP, giữ chân)', () => {
    expect(engine.difficulty(5).speed).toBe(MECHANICS.startSpeed);
    expect(engine.difficulty(0).speed).toBe(MECHANICS.startSpeed);
    expect(engine.difficulty(10).speed).toBe(MECHANICS.startSpeed);
  });

  it('sau 10s: tốc độ tăng dần theo giây và level', () => {
    expect(engine.difficulty(15).speed).toBe(MECHANICS.startSpeed + MECHANICS.speedIncreasePerSec * 5);
    expect(engine.difficulty(20).speed).toBe(MECHANICS.startSpeed + MECHANICS.speedIncreasePerSec * 10);
  });

  it('tốc độ bị chặn bởi maxSpeed để vừa vặn phản xạ con người', () => {
    // Thời gian chơi cực lâu hoặc level cực cao
    const crazyDiff = engine.difficulty(1000, 20);
    expect(crazyDiff.speed).toBe(MECHANICS.maxSpeed);
    expect(crazyDiff.speed).toBeLessThanOrEqual(440);
  });

  it('spawn rate tăng sau 10s và chặn bởi spawnRateMax', () => {
    expect(engine.difficulty(5).spawnCount).toBe(1);
    const d20 = engine.difficulty(20);
    expect(d20.spawnCount).toBeGreaterThan(1);
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

  it('rollBeeType trả về normal trong 10s đầu Level 1', () => {
    for (let i = 0; i < 20; i++) {
      expect(engine.rollBeeType(5, 1)).toBe('normal');
    }
  });

  it('rollBeeType có thể ra speedy sau 10s', () => {
    const types = new Set();
    for (let i = 0; i < 50; i++) {
      types.add(engine.rollBeeType(15, 1));
    }
    expect(types.has('normal')).toBe(true);
    expect(types.has('speedy')).toBe(true);
  });

  it('rollBeeType tại Level 3+ ra đủ 4 loại ong', () => {
    const types = new Set();
    for (let i = 0; i < 100; i++) {
      types.add(engine.rollBeeType(30, 3));
    }
    expect(types.has('normal')).toBe(true);
    expect(types.has('speedy')).toBe(true);
    expect(types.has('fat')).toBe(true);
    expect(types.has('zigzag')).toBe(true);
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

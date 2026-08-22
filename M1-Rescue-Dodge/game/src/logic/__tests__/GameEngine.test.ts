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
    expect(engine.difficulty(5).speed).toBe(120);
    expect(engine.difficulty(0).speed).toBe(120);
    expect(engine.difficulty(10).speed).toBe(120);
  });

  it('sau 10s: tốc độ tăng liên tục theo giây', () => {
    expect(engine.difficulty(15).speed).toBe(120 + 8 * 5);
    expect(engine.difficulty(20).speed).toBe(120 + 8 * 10);
  });

  it('nhảy bậc tốc độ theo level (BR-17)', () => {
    // level 2: +20; level 3: +40
    expect(engine.difficulty(20, 2).speed).toBe(120 + 8 * 10 + 20);
    expect(engine.difficulty(30, 3).speed).toBe(120 + 8 * 20 + 40);
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

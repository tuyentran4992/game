// B1b — NUA B: tien trinh + sao (progression).
// Phu TC-PRG-01..08 + PC-PRG-05 (chapterOf) — moi case co ca input bun rieng.
//
// Hop dong progression.ts ma test nay roi (module chua ton tai => RED la DUNG):
//   CAMPAIGN: 8 dong {chapter, levels, firstLevel, lastLevel, vocabId, ruleId,
//            revealLevel, layers, timer, theme, unlockNeed}
//   chapterOf(level 1..120): number            -> 1..8
//   newFoldVocab(chapter 1..8): string         -> 1 tu vung moi / chuong
//   revealLevel(chapter 1..8): number          -> so man (1-based) lo luat cua chuong
//   revealRules(level 1..120): readonly string[] -> cac luat lo tai man do (toi da 1)
//   timerEnabled(chapter 1..8): boolean
//   paperThemeOf(chapter 1..8): string
//   bestLevel(stars): number                   -> vi tri man cuoi da cham (khac '0'), 0 neu chua
//   isChapterUnlocked(chapter 1..8, stars): boolean  — mo khoa theo TIEN TINH, khong theo tong sao
//
// Quy uoc index: level 1..120 va chapter 1..8 (1-based) — vi pack noi chapterOf(0) va
// chapterOf(121) la input bun, isChapterUnlocked(chapter 9) nem loi.
// Bang §6.1 chep TAY tu pack (oracle) — KHONG lay ham trong src/ lam oracle.

import * as VT from 'vitest';
import * as PG from '../../src/logic/progression';

const it = VT.it;
const expect = VT.expect;
const CAMPAIGN = PG.CAMPAIGN;
const bestLevel = PG.bestLevel;
const chapterOf = PG.chapterOf;
const isChapterUnlocked = PG.isChapterUnlocked;
const newFoldVocab = PG.newFoldVocab;
const paperThemeOf = PG.paperThemeOf;
const revealLevel = PG.revealLevel;
const revealRules = PG.revealRules;
const timerEnabled = PG.timerEnabled;

const LEN = 120;
const PER = 15;
const C0 = '0';
const C1 = '1';
const C3 = '3';

// ---- Bang §6.1 (chep tay, 8 dong) ----
const T_CHAPTER: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];
const T_LEVELS: readonly number[] = [15, 15, 15, 15, 15, 15, 15, 15];
const T_FIRST: readonly number[] = [1, 16, 31, 46, 61, 76, 91, 106];
const T_LAST: readonly number[] = [15, 30, 45, 60, 75, 90, 105, 120];
const T_VOCAB: readonly string[] = ['fold-h', 'fold-v', 'punch-one', 'fold-d',
  'cut-corner', 'snip-pair', 'stack-fold', 'mirror-cut'];
const T_RULE: readonly string[] = ['H', 'V', 'punch', 'D', 'cut', 'snip', 'stack', 'mirror'];
const T_REVEAL: readonly number[] = [7, 20, 35, 50, 65, 80, 95, 110];
const T_LAYERS: readonly number[] = [2, 3, 3, 4, 4, 4, 5, 6];
const T_TIMER: readonly boolean[] = [false, false, false, false, false, false, true, true];
const T_THEME: readonly string[] = ['kraft', 'washi', 'tissue', 'newsprint', 'rice',
  'glassine', 'foil', 'gold-leaf'];
const T_NEED: readonly number[] = [0, 12, 27, 42, 57, 72, 87, 102];

// ---- input bun ----
const CHAPTERS_DIRTY: readonly number[] = [0, 9, 12, -1, 1.5, Number.NaN];
const LEVELS_DIRTY: readonly number[] = [0, -7, 1.5, 121, Number.NaN];

function zeros(n: number): string {
  return C0.repeat(n);
}

// n man dau mang ky tu ch, phan con lai la '0'.
function lead(n: number, ch: string): string {
  return ch.repeat(n) + zeros(LEN - n);
}

// stars chuoi tu cac cap [level 1-based, ky tu]; vi tri khong nhap = '0'.
function mk(pairs: readonly (readonly [number, string])[]): string {
  const cells: string[] = [];
  for (let i = 0; i < LEN; i += 1) {
    cells.push(C0);
  }
  for (const pair of pairs) {
    cells[pair[0] - 1] = pair[1];
  }
  return cells.join('');
}

// tong sao trong bang sao — oracle cua rieng file test (khong lay ham src/).
function countStars(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    total += Number(s[i]);
  }
  return total;
}

// sao cua 12 man dau da cham, trong do man 10 va 11 la skip ('0').
const LOST_STARS: string = mk([[1, C1], [2, C1], [3, C1], [4, C1], [5, C1], [6, C1],
  [7, C1], [8, C1], [9, C1], [12, C1]]);

it('PC-PRG-01 / TC-PRG-01: CAMPAIGN du 8 dong va khop bang §6.1 tung truong', () => {
  expect(CAMPAIGN).toHaveLength(8);
  for (let i = 0; i < 8; i += 1) {
    const row = CAMPAIGN[i];
    expect(row.chapter).toBe(T_CHAPTER[i]);
    expect(row.levels).toBe(T_LEVELS[i]);
    expect(row.firstLevel).toBe(T_FIRST[i]);
    expect(row.lastLevel).toBe(T_LAST[i]);
    expect(row.vocabId).toBe(T_VOCAB[i]);
    expect(row.ruleId).toBe(T_RULE[i]);
    expect(row.revealLevel).toBe(T_REVEAL[i]);
    expect(row.layers).toBe(T_LAYERS[i]);
    expect(row.timer).toBe(T_TIMER[i]);
    expect(row.theme).toBe(T_THEME[i]);
    expect(row.unlockNeed).toBe(T_NEED[i]);
  }
});

it('PC-PRG-01 / TC-PRG-01: chapter*15 === 120, dai khong trung, khong rong o dau', () => {
  expect(T_CHAPTER.length * PER).toBe(LEN);
  let sum = 0;
  for (const row of CAMPAIGN) {
    sum += row.levels;
    expect(row.levels).toBe(PER);
    expect(row.chapter).toBeGreaterThan(0);
    expect(row.firstLevel).toBe((row.chapter - 1) * PER + 1);
    expect(row.lastLevel).toBe(row.firstLevel + row.levels - 1);
  }
  expect(sum).toBe(LEN);
  expect(new Set(CAMPAIGN.map((r) => r.chapter)).size).toBe(8);
  expect(new Set(CAMPAIGN.map((r) => r.vocabId)).size).toBe(8);
  expect(new Set(CAMPAIGN.map((r) => r.theme)).size).toBe(8);
});

it('PC-PRG-02 / TC-PRG-02: newFoldVocab 8 chuong doi mot khac, moi chuong dung 1 tu theo bang', () => {
  const got: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const vocab = newFoldVocab(T_CHAPTER[i]);
    expect(vocab).toBe(T_VOCAB[i]);
    expect(typeof vocab).toBe('string');
    expect(vocab.length).toBeGreaterThan(0);
    got.push(vocab);
  }
  expect(new Set(got).size).toBe(8);
});

it('PC-PRG-03 / TC-PRG-03: revealLevel khop bang §6.1, nam trong dai chuong, 8 muc doi mot khac', () => {
  const got: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const level = revealLevel(T_CHAPTER[i]);
    expect(level).toBe(T_REVEAL[i]);
    expect(level).toBeGreaterThanOrEqual(T_FIRST[i]);
    expect(level).toBeLessThanOrEqual(T_LAST[i]);
    // khot chong va cham 2 chuong: man lo luat khom nam hai man bien cua chuong
    expect(level).toBeGreaterThan(T_FIRST[i]);
    expect(level).toBeLessThan(T_LAST[i]);
    got.push(level);
    expect(revealRules(level)).toEqual([T_RULE[i]]);
  }
  expect(new Set(got).size).toBe(8);
});

it('PC-PRG-03 / TC-PRG-03: 2 chuong ke khong cung lo 2 luat tai 1 man (man bien)', () => {
  for (let i = 0; i < 7; i += 1) {
    for (const level of [T_LAST[i], T_FIRST[i + 1]]) {
      const rules = revealRules(level);
      expect(rules.length).toBeLessThanOrEqual(1);
      expect(rules.includes(T_RULE[i]) && rules.includes(T_RULE[i + 1])).toBe(false);
    }
  }
  // ca 120 man: toi da 1 luat lo / man, va tong cong dung 8 luat cua bang
  let revealed = 0;
  for (let level = 1; level <= LEN; level += 1) {
    const rules = revealRules(level);
    expect(rules.length).toBeLessThanOrEqual(1);
    revealed += rules.length;
  }
  expect(revealed).toBe(8);
});

it('PC-PRG-04 / TC-PRG-04: timerEnabled false cho chuong 1..6, true cho chuong 7..8', () => {
  for (let ch = 1; ch <= 6; ch += 1) {
    expect(timerEnabled(ch)).toBe(false);
    expect(timerEnabled(ch)).toBe(T_TIMER[ch - 1]);
  }
  expect(timerEnabled(7)).toBe(true);
  expect(timerEnabled(8)).toBe(true);
});

it('PC-PRG-05 / TC-PRG-05: stars 11 khoa ch2, 12 mo ch2, 15 mo ch2 (khong bat full sao)', () => {
  expect(bestLevel(lead(11, C1))).toBe(11);
  expect(isChapterUnlocked(2, lead(11, C1))).toBe(false);
  expect(bestLevel(lead(12, C1))).toBe(12);
  expect(isChapterUnlocked(2, lead(12, C1))).toBe(true);
  const fifteen = lead(15, C1);
  expect(bestLevel(fifteen)).toBe(15);
  expect(isChapterUnlocked(2, fifteen)).toBe(true);
  // 15/45 sao toi da cua chuong 1 => van mo duoc, chung minh khong bat full sao
  expect(isChapterUnlocked(3, fifteen)).toBe(false);
  expect(isChapterUnlocked(1, zeros(LEN))).toBe(true);
});

it('PC-PRG-06 / TC-PRG-06: 12 sao that + 3 man skip van mo chuong 2', () => {
  const twelvePlusSkips = lead(12, C1); // man 13..15 = skip ('0')
  expect(twelvePlusSkips[12]).toBe(C0);
  expect(bestLevel(twelvePlusSkips)).toBe(12);
  expect(isChapterUnlocked(2, twelvePlusSkips)).toBe(true);
  expect(isChapterUnlocked(2, mk([[1, C3], [2, C3], [3, C3], [4, C3]]))).toBe(false);
});

it('PC-PRG-07 / TC-PRG-07: choi lai mat sao van mo qua bestLevel — chong softlock', () => {
  const full = lead(12, C3); // 12 man dau 3 sao
  expect(isChapterUnlocked(2, full)).toBe(true);
  expect(countStars(full)).toBe(36);
  // sau khi choi lai: 12 man van da cham nhung chi con 10 sao (< nguong 12)
  expect(countStars(LOST_STARS)).toBe(10);
  expect(bestLevel(LOST_STARS)).toBe(12);
  expect(bestLevel(LOST_STARS)).toBe(bestLevel(full));
  expect(LOST_STARS).toHaveLength(LEN);
  expect(isChapterUnlocked(2, LOST_STARS)).toBe(true);
});

it('PC-PRG-05: chapterOf tra dung bien 1..8 va la ham thuan', () => {
  expect(chapterOf(1)).toBe(1);
  expect(chapterOf(PER)).toBe(1);
  expect(chapterOf(16)).toBe(2);
  expect(chapterOf(LEN)).toBe(8);
  for (let i = 0; i < 8; i += 1) {
    expect(chapterOf(T_FIRST[i])).toBe(T_CHAPTER[i]);
    expect(chapterOf(T_LAST[i])).toBe(T_CHAPTER[i]);
    const mid = T_FIRST[i] + 7;
    expect(chapterOf(mid)).toBe(chapterOf(mid));
  }
});

it('PC-PRG-05 / input bun: chapterOf nem loi ro voi 0, -7, 1.5, 121, NaN', () => {
  for (const bad of LEVELS_DIRTY) {
    expect(() => chapterOf(bad)).toThrow();
  }
});

it('PC-PRG-06 / input bun: chapter 9 va cac chapter hoai bo nem loi, khong tra bua', () => {
  const clean = lead(LEN, C1);
  for (const bad of CHAPTERS_DIRTY) {
    expect(() => newFoldVocab(bad)).toThrow();
    expect(() => revealLevel(bad)).toThrow();
    expect(() => timerEnabled(bad)).toThrow();
    expect(() => paperThemeOf(bad)).toThrow();
    expect(() => isChapterUnlocked(bad, clean)).toThrow();
  }
  expect(() => isChapterUnlocked(2, 'x'.repeat(LEN))).toThrow();
  expect(() => bestLevel('x'.repeat(LEN))).toThrow();
});

it('PC-PRG-08 / TC-PRG-08: paperThemeOf du 8 id, cung chuong thi cung id', () => {
  const ids: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const once = paperThemeOf(T_CHAPTER[i]);
    const twice = paperThemeOf(T_CHAPTER[i]);
    expect(once).toBe(T_THEME[i]);
    expect(twice).toBe(once);
    ids.push(once);
  }
  expect(new Set(ids).size).toBe(8);
});
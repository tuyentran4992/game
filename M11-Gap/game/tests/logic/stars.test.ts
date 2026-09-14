// B1b — NUA B: sao + hint mien phi. Phu TC-STR-01, TC-STR-02, TC-STR-03, TC-STR-05,
// TC-STR-08 va bang §3.3 stars.json (4 dong logic).
//
// Hop dong stars.ts ma test nay roi (module chua ton tai => RED la DUNG):
//   win(won: boolean, usedHint: boolean): number            tra 3 | 2 | 1
//   markSkip(level: number): string                        tra dung 1 ky tu '0'
//   applyResult(stars, level, got): string                 level 1-based, GHI DE (khong giu max)
//   sumStars(stars: string): number                        stars dai 120, ky tu '0'..'3'
//   freeHintAvailable(level, stars): boolean               ham thuan
// Ky vong chep TAY tu pack B1b — khong dan xuat tu src/.

import * as VT from 'vitest';
import * as ST from '../../src/logic/stars';

const it = VT.it;
const expect = VT.expect;
const applyResult = ST.applyResult;
const freeHintAvailable = ST.freeHintAvailable;
const markSkip = ST.markSkip;
const sumStars = ST.sumStars;
const win = ST.win;

const LEN = 120;
const C0 = '0';
const C1 = '1';
const C2 = '2';
const C3 = '3';
const C4 = '4';
const CX = 'x';

// Bang §3.3 stars.json — dung 4 dong logic: [won, usedHint, stars].
const STARS_ROWS: readonly (readonly [boolean, boolean, number])[] = [
  [true, false, 3],
  [true, true, 2],
  [false, false, 1],
  [false, true, 1],
];

const LEVELS_DIRTY: readonly number[] = [0, -7, 1.5, LEN + 1, Number.NaN];
const GOT_DIRTY: readonly number[] = [-1, 0, 1.5, 4, Number.NaN];
const STARS_X: string = CX.repeat(LEN);
const STARS_SHORT: string = C1.repeat(LEN - 1);
const STARS_LONG: string = C1.repeat(LEN + 1);
const STARS_EMPTY: string = '';

function zeros(n: number): string {
  return C0.repeat(n);
}

// n man dau mang ky tu ch, phan con lai la '0'.
function lead(n: number, ch: string): string {
  return ch.repeat(n) + zeros(LEN - n);
}

// stars chuoi tu cac cap [level 1-based, ky tu].
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

// chuoi con sau khi bo vi tri i (0-based) — de doi chieu cac cho khac khong doi.
function skipAt(s: string, i: number): string {
  return s.slice(0, i) + s.slice(i + 1);
}

it('PC-STR-01 / TC-STR-01: thang sach khong hint => win(true,false) === 3', () => {
  expect(win(true, false)).toBe(3);
});

it('PC-STR-02 / TC-STR-02: thang nhung co hint => win(true,true) === 2', () => {
  expect(win(true, true)).toBe(2);
});

it('PC-STR-03 / TC-STR-03: thua => win(false,·) === 1, ke ca khi kem hint', () => {
  expect(win(false, false)).toBe(1);
  expect(win(false, true)).toBe(1);
});

it('PC-STR-03 / bang §3.3: du 4 dong thang-thua x hint tra dung [3,2,1,1]', () => {
  expect(STARS_ROWS.map((r) => win(r[0], r[1]))).toEqual([3, 2, 1, 1]);
});

it('PC-STR-08 / TC-STR-08: markSkip(7) tra dung "0" va ghi vao bang sao => sumStars khong tang', () => {
  expect(markSkip(7)).toBe(C0);
  expect(markSkip(1)).toHaveLength(1);
  const before = lead(6, C1);
  const after = applyResult(before, 7, Number(markSkip(7)));
  expect(after).toHaveLength(LEN);
  expect(after[6]).toBe(C0);
  expect(sumStars(before)).toBe(6);
  expect(sumStars(after)).toBe(6);
});

it('PC-STR-04 / TC-STR-04: applyResult doi dung 1 vi tri, dai chuoi giu 120, cho khac y nguyen', () => {
  const before = lead(5, C2);
  const after = applyResult(before, 9, 3);
  expect(after).toHaveLength(LEN);
  expect(after[8]).toBe(C3);
  expect(skipAt(after, 8)).toBe(skipAt(before, 8));
});

it('PC-STR-04 / TC-STR-04: choi lai mat sao la GHI DE — 3 roi 1 sao con 1, khong giu max', () => {
  const three = applyResult(zeros(LEN), 4, 3);
  expect(three[3]).toBe(C3);
  expect(sumStars(three)).toBe(3);
  const one = applyResult(three, 4, 1);
  expect(one).toHaveLength(LEN);
  expect(one[3]).toBe(C1);
  expect(sumStars(one)).toBe(1);
});

it('PC-STR-07 / input bun: applyResult nem loi ro khi level va so sao ngoai hop le', () => {
  const clean = lead(3, C1);
  for (const bad of LEVELS_DIRTY) {
    expect(() => applyResult(clean, bad, 2)).toThrow();
  }
  for (const bad of GOT_DIRTY) {
    expect(() => applyResult(clean, 2, bad)).toThrow();
  }
  expect(() => applyResult(STARS_X, 2, 2)).toThrow();
  expect(() => applyResult(STARS_SHORT, 2, 2)).toThrow();
});

it('PC-STR-06: sumStars tinh dung 24 (bon 3 + ba 2 + sau 1); toan "0" => 0; toan "3" => 360', () => {
  const s = mk([[1, C3], [2, C3], [3, C3], [4, C3], [5, C2], [6, C2], [7, C2],
    [8, C1], [9, C1], [10, C1], [11, C1], [12, C1], [13, C1]]);
  expect(s).toHaveLength(LEN);
  expect(sumStars(s)).toBe(24);
  expect(sumStars(zeros(LEN))).toBe(0);
  expect(sumStars(lead(LEN, C3))).toBe(360);
});

it('PC-STR-07 / input bun: sumStars nem loi voi chuoi ngan, dai, ky tu "x" va "4"', () => {
  expect(() => sumStars(STARS_SHORT)).toThrow();
  expect(() => sumStars(STARS_LONG)).toThrow();
  expect(() => sumStars(STARS_X)).toThrow();
  expect(() => sumStars(STARS_EMPTY)).toThrow();
  expect(() => sumStars(mk([[3, C4]]))).toThrow();
});

it('PC-STR-05 / TC-STR-05: sau man 3 sao thi n+1 false con n+2 true', () => {
  const stars = mk([[20, C3], [21, C1]]);
  expect(freeHintAvailable(21, stars)).toBe(false);
  expect(freeHintAvailable(22, stars)).toBe(true);
});

it('PC-STR-05: chua co man 3 nao phia truoc => hint luon co; ham THUAN, khong mutate stars', () => {
  const stars = mk([[20, C2], [21, C1]]);
  const copy = stars;
  const first = freeHintAvailable(21, stars);
  expect(first).toBe(true);
  expect(freeHintAvailable(21, stars)).toBe(first);
  expect(freeHintAvailable(21, stars)).toBe(freeHintAvailable(21, stars));
  expect(stars).toBe(copy);
  expect(stars).toHaveLength(LEN);
});

it('PC-STR-07 / input bun: freeHintAvailable nem loi voi level ngoai dai 1..120', () => {
  const clean = lead(3, C1);
  for (const bad of LEVELS_DIRTY) {
    expect(() => freeHintAvailable(bad, clean)).toThrow();
  }
  expect(() => freeHintAvailable(5, STARS_X)).toThrow();
});
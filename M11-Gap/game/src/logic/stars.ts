// Pattern: Registry (bang sao)
// TRACH NHIEM: ket qua MOT MAN -> so sao (bang §3.3), va thao tac tren CHUOI NEN bang sao
//   dung CAMPAIGN_LEVELS ky tu '0'..'3' (DATA-MODEL §1.3) — khong trang thai, khong DOM, khong dong ho.
// RANGE BUOC: khong import levelState (2 nua B1b doc lap — pack §5); duoc doc CAMPAIGN cua
//   progression de 1 nguon do dai/nguong; moi input ban la loi lap trinh => NEM LOI ro (pack §5).
import { CAMPAIGN, FREE_HINT_GAP, isStarText, STAR_SCALE } from './progression';

/** Mot o bang sao: '0' = chua choi hoac da bo qua (skip). */
const UNSUNG = STAR_SCALE.blank;
/** Ky tu cua diem toi da = man 3 sao, nguon cua hint mien phi (PC-08). */
const THREE = String(STAR_SCALE.max);
/** Du lieu nguong — doc thang STAR_SCALE cua progression (A9: 1 nguon cho ca thang sao). */
const STAR_RULE = {
  slots: STAR_SCALE.slots, minStar: STAR_SCALE.min, maxStar: STAR_SCALE.max, hintGap: FREE_HINT_GAP,
} as const;

/** Bảng §3.3 stars.json — 4 dòng logic, KHÔNG có dòng 0★ (0 = chưa chơi, không phải kết quả). */
type StarRow = { readonly firstTry: boolean; readonly usedHint: boolean; readonly stars: 1 | 2 | 3 };
const STAR_ROWS: readonly StarRow[] = [
  { firstTry: true, usedHint: false, stars: 3 },
  { firstTry: true, usedHint: true, stars: 2 },
  { firstTry: false, usedHint: false, stars: 1 },
  { firstTry: false, usedHint: true, stars: 1 },
];

function checkedLevel(level: number): number {
  const slots = STAR_RULE.slots;
  if (!Number.isInteger(level) || level < 1 || level > slots) throw new Error('level ' + level + ' ngoai 1..' + slots);
  return level;
}

function checkedStars(stars: string): string {
  if (!isStarText(stars)) {
    throw new Error('stars phai la chuoi nen ' + STAR_RULE.slots + ' ky tu so 0..' + STAR_RULE.maxStar);
  }
  return stars;
}

/** O thu i (0-based) cua bang sao. */
const cellAt = (stars: string, i: number): string => stars[i];

function writeCell(stars: string, level: number, digit: string): string {
  const i = checkedLevel(level) - 1;
  return stars.slice(0, i) + digit + stars.slice(i + 1);
}

/**
 * TC-STR-01..03 / PC-06: sao cua MOT man, doc tu bang §3.3 —
 * thang khong hint = 3, thang co hint = 2, thua = 1 (khong ke hint).
 */
export function win(firstTry: boolean, usedHint: boolean): 1 | 2 | 3 {
  const row = STAR_ROWS.find((r) => r.firstTry === firstTry && r.usedHint === usedHint);
  if (!row) throw new Error('win: cap (firstTry, usedHint) = (' + firstTry + ', ' + usedHint + ') ngoai bang §3.3');
  return row.stars;
}

/**
 * TC-STR-08 / PC-08: dau BO QUA la o '0'.
 * Dang test markSkip(level) tra dung 1 ky tu; dang pack markSkip(stars, level) ghi de o do.
 */
export function markSkip(level: number): string;
export function markSkip(stars: string, level: number): string;
export function markSkip(first: number | string, level?: number): string {
  if (typeof first === 'number') {
    checkedLevel(first);
    return UNSUNG;
  }
  return writeCell(checkedStars(first), Number(level), UNSUNG);
}

/**
 * PC-STR-04: GHI DE (P1-03) — sao phan anh trinh that, khong giu max.
 * gained = 0 chi hop le tren con trong (ay la semantics cua markSkip); o da co sao ma bi ghi 0
 * la xoa lich su choi => loi lap trinh, NEM (TC-STR-08 tuong phan PC-STR-07).
 */
export function applyResult(stars: string, level: number, gained: number): string {
  const s = checkedStars(stars);
  const i = checkedLevel(level) - 1;
  if (!Number.isInteger(gained) || gained < STAR_RULE.minStar || gained > STAR_RULE.maxStar) {
    throw new Error('applyResult: so sao ' + gained + ' ngoai 0..' + STAR_RULE.maxStar);
  }
  if (gained === STAR_RULE.minStar && cellAt(s, i) !== UNSUNG) {
    throw new Error('applyResult: level ' + level + ' da co sao ' + cellAt(s, i) + " — chi markSkip ghi duoc '0'");
  }
  return s.slice(0, i) + String(gained) + s.slice(i + 1);
}

/** PC-STR-06: tong sao toan cuc (1 tham so) hoac trong mot chuong (2 tham so, pack §3). */
export function sumStars(stars: string): number;
export function sumStars(stars: string, chapter: number): number;
export function sumStars(stars: string, chapter?: number): number {
  const s = checkedStars(stars);
  if (chapter === undefined) {
    let total = 0;
    for (let i = 0; i < s.length; i += 1) total += Number(cellAt(s, i));
    return total;
  }
  const row = CAMPAIGN.find((r) => r.chapter === chapter);
  if (!row) throw new Error('sumStars: chapter ' + chapter + ' ngoai 1..' + CAMPAIGN.length);
  let part = 0;
  for (let level = row.firstLevel; level <= row.lastLevel; level += 1) part += Number(cellAt(s, level - 1));
  return part;
}

/** Man 3 SAO gan nhat TRUOC levelIndex (null = chua tung cho hint mien phi) — suy tu bang sao. */
function lastThreeStar(stars: string, levelIndex: number): number | null {
  for (let i = Math.min(stars.length, levelIndex) - 2; i >= 0; i -= 1) {
    if (cellAt(stars, i) === THREE) return i + 1;
  }
  return null;
}

/**
 * TC-STR-05 / PC-08: hint MIEN PHI co cooldown STAR_RULE.hintGap man — sau man 3★ o n thi
 * n+1 chua free, n+2 free lai. Tham so 2 nhan chuoi bang sao (test) hoac dung levelIndex
 * vua cho hint (pack §3). Ham THUAN: khong doc save, khong mutate stars.
 */
export function freeHintAvailable(level: number, lastFree: string | number | null): boolean {
  const n = checkedLevel(level);
  const last = typeof lastFree === 'string' ? lastThreeStar(checkedStars(lastFree), n) : lastFree;
  return last === null || n - last >= STAR_RULE.hintGap;
}

/** So chuong cua chien dich — dan xuat tu registry, khong hardcode o tang UI. */
export const CHAPTER_COUNT = CAMPAIGN.length;

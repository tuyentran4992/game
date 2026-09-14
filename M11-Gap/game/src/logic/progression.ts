// Pattern: Registry
// TRÁCH NHIỆM: bảng tien trinh chien dich (8 chuong x 15 man) + cac ham doc bang —
//   moi thu la DATA, them chuong = them mot dong CAMPAIGN, khong roi if/else (pack B1b §3).
// RANGE BUOC: khong import levelState/stars (cac module B1b doc lap — pack §5); khong dong ho,
//   khong ngau nhien, khong save; moi input ban la loi lap trinh => NEM LOI ro.
// §6.1 la NGUON SU THAT DUY NHAT; checkCampaign() bao chi dung dong voi test oracle (TC-PRG-01).

/** Tu vung MOI cua tung chuong (PC-PRG-02: moi chuong DUNG 1 tu). */
export type FoldVocabId =
  | 'fold-h' | 'fold-v' | 'punch-one' | 'fold-d' | 'cut-corner' | 'snip-pair' | 'stack-fold' | 'mirror-cut';

/** Nhip mot chuong 15 man (DATA-MODEL §3.1 + §9.1; "wow" gop vao breather). */
export type Archetype = 'teach' | 'practice' | 'combo' | 'checkpoint' | 'breather';

/** MOT dong bang §6.1 — ten field la hop dong voi save/manifest (B1c). */
export type ChapterRow = {
  readonly chapter: number;
  readonly levels: number;
  readonly firstLevel: number;
  readonly lastLevel: number;
  /** id tu vung hien thi trong bang tu dien. */
  readonly vocabId: FoldVocabId;
  /** id luat noi — khoa cua revealRules(level). */
  readonly ruleId: string;
  /** man (1-based, tuyen doi) lo luat cua chuong. */
  readonly revealLevel: number;
  readonly layers: number;
  readonly timer: boolean;
  readonly theme: string;
  /** tien tinh can dat (so man DA CHAM cuoi cung) de mo chuong — PC-PRG-05/06/07. */
  readonly unlockNeed: number;
};

/** So man moi chuong (DATA-MODEL §3.1). */
export const LEVELS_PER_CHAPTER = 15;
/** Tong so man cua chien dich (PC-01) — do dai duy nhat hop le cua chuoi stars. */
export const CAMPAIGN_LEVELS = 120;
/** NGUONG ~12/15 man da cham trong chuong truoc de mo chuong ke (PC-07). */
// KHONG PHAI cung mot luat voi dem hinh hoc 12 o src/render/layoutTable.ts (PADS.safe): day la
// SO SAO cua chien dich, doi o day khong dong den to ve nao va nguoc lai (gate G3 nghi ngong).
export const GATE_STARS = 12;
/** Cooldown 2 man giua 2 lan cho hint mien phi (PC-08) — tieu thu o stars.freeHintAvailable. */
export const FREE_HINT_GAP = 2;

/** §6.1 — 8 dong, chep tay tu SPEC, duoc checkCampaign() giu bat bien. */
export const CAMPAIGN: readonly ChapterRow[] = [
  { chapter: 1, levels: 15, firstLevel: 1, lastLevel: 15, vocabId: 'fold-h', ruleId: 'H',
    revealLevel: 7, layers: 2, timer: false, theme: 'kraft', unlockNeed: 0 },
  { chapter: 2, levels: 15, firstLevel: 16, lastLevel: 30, vocabId: 'fold-v', ruleId: 'V',
    revealLevel: 20, layers: 3, timer: false, theme: 'washi', unlockNeed: 12 },
  { chapter: 3, levels: 15, firstLevel: 31, lastLevel: 45, vocabId: 'punch-one', ruleId: 'punch',
    revealLevel: 35, layers: 3, timer: false, theme: 'tissue', unlockNeed: 27 },
  { chapter: 4, levels: 15, firstLevel: 46, lastLevel: 60, vocabId: 'fold-d', ruleId: 'D',
    revealLevel: 50, layers: 4, timer: false, theme: 'newsprint', unlockNeed: 42 },
  { chapter: 5, levels: 15, firstLevel: 61, lastLevel: 75, vocabId: 'cut-corner', ruleId: 'cut',
    revealLevel: 65, layers: 4, timer: false, theme: 'rice', unlockNeed: 57 },
  { chapter: 6, levels: 15, firstLevel: 76, lastLevel: 90, vocabId: 'snip-pair', ruleId: 'snip',
    revealLevel: 80, layers: 4, timer: false, theme: 'glassine', unlockNeed: 72 },
  { chapter: 7, levels: 15, firstLevel: 91, lastLevel: 105, vocabId: 'stack-fold', ruleId: 'stack',
    revealLevel: 95, layers: 5, timer: true, theme: 'foil', unlockNeed: 87 },
  { chapter: 8, levels: 15, firstLevel: 106, lastLevel: 120, vocabId: 'mirror-cut', ruleId: 'mirror',
    revealLevel: 110, layers: 6, timer: true, theme: 'gold-leaf', unlockNeed: 102 },
];

/**
 * THANG SAO — NGUON DU Y NHAT cua ca lõi: chữ số 0..3, ô trắng '0', số ô = số màn chiến dịch.
 * stars.ts / records.ts / save.ts đều đọc về đây (A9: trước đây `^[0-3]+$` bị viết lại ở 4 file
 * ⇒ đổi thang sao là phải sửa 4 file). Đổi thang = sửa DUY NHẤT STAR_SCALE.
 */
export const STAR_SCALE = {
  slots: CAMPAIGN_LEVELS, min: 0, max: 3, blank: '0',
} as const;

/** Chuỗi nen: moi ky tu la mot chu so sao trong thang (do dai khong kiem o day). */
const STAR_DIGIT = new RegExp('^[0-' + STAR_SCALE.max + ']+$');
/** Một ký tự đơn có phải chữ số sao hợp lệ không. */
export const isStarDigit = (ch: string): boolean => STAR_DIGIT.test(ch);
/** Cả chuỗi có phải chuỗi nen bảng sao không (độ dài + bộ chữ số). */
export const isStarText = (text: string): boolean =>
  text.length === STAR_SCALE.slots && STAR_DIGIT.test(text);

/** Bat bien §6.1: 8 chuong x LEVELS_PER_CHAPTER = CAMPAIGN_LEVELS, khong choong, khong tron bien. */
function checkCampaign(): void {
  if (LEVELS_PER_CHAPTER * CAMPAIGN.length !== CAMPAIGN_LEVELS) throw new Error('CAMPAIGN: tong so man sai');
  let end = 0;
  for (const row of CAMPAIGN) {
    const want = row.chapter === 1 ? 0 : end - (LEVELS_PER_CHAPTER - GATE_STARS);
    const okShape = row.levels === LEVELS_PER_CHAPTER && row.firstLevel === end + 1 && row.lastLevel === end + row.levels;
    const okReveal = row.revealLevel > row.firstLevel && row.revealLevel < row.lastLevel;
    if (!okShape || !okReveal || row.unlockNeed !== want) {
      throw new Error('CAMPAIGN: dong chuong ' + row.chapter + ' trai §6.1');
    }
    end = row.lastLevel;
  }
}
checkCampaign();

/**
 * Hai BIÊN của chiến dịch, DẪN XUẤT từ bảng CAMPAIGN (§6.1 đã bị checkCampaign chốt hình) —
 * không khai số lần thứ hai. Đây là NGUỒN DUY NHẤT của dải màn hợp lệ: tầng platform (?level=NN)
 * hỏi `isCampaignLevel`, không tự chép 1/120 xuống bảng của mình (A8).
 */
export const FIRST_LEVEL: number = CAMPAIGN[0].firstLevel;
export const LAST_LEVEL: number = CAMPAIGN[CAMPAIGN.length - 1].lastLevel;

/** Chữ số nguyên trong dải màn của chiến dịch (input bẩn: NaN / thực / ngoài dải ⇒ false). */
export const isCampaignLevel = (levelIndex: number): boolean =>
  Number.isInteger(levelIndex) && levelIndex >= FIRST_LEVEL && levelIndex <= LAST_LEVEL;

function rowOf(chapter: number): ChapterRow {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > CAMPAIGN.length) {
    throw new Error('chapter ' + chapter + ' ngoai 1..' + CAMPAIGN.length);
  }
  return CAMPAIGN[chapter - 1];
}

function levelOf(level: number): number {
  if (!isCampaignLevel(level)) {
    throw new Error('level ' + level + ' ngoai ' + FIRST_LEVEL + '..' + LAST_LEVEL);
  }
  return level;
}

function starsOf(stars: string): string {
  if (!isStarText(stars)) {
    throw new Error('stars phai la chuoi nen ' + STAR_SCALE.slots + ' ky tu so');
  }
  return stars;
}

/** PC-PRG-05: chuong cua mot man = ceil(level/15); input ban => NEM LOI ro. */
export function chapterOf(levelIndex: number): number {
  return Math.ceil(levelOf(levelIndex) / LEVELS_PER_CHAPTER);
}

/** PC-PRG-07: man CUOI DA CHAM (khac '0'), 0 neu chua choi gi — oracle chong tut khoa. */
export function bestLevel(stars: string): number {
  const s = starsOf(stars);
  for (let i = s.length - 1; i >= 0; i -= 1) if (s[i] !== STAR_SCALE.blank) return i + 1;
  return 0;
}

/** TC-PRG-03: man lo luat cua chuong (tuyen doi, nam giua 2 bien). */
export function revealLevel(chapter: number): number {
  return rowOf(chapter).revealLevel;
}

/** TC-PRG-03: cac luat lo tai man do — toi da 1, rong o man bien (khong kep 2 chuong cung lo). */
export function revealRules(levelIndex: number): readonly string[] {
  const n = levelOf(levelIndex);
  return CAMPAIGN.filter((row) => row.revealLevel === n).map((row) => row.ruleId);
}

/** TC-PRG-02: dung 1 tu vung moi cua chuong — doc thang tu registry. */
export function newFoldVocab(chapter: number): FoldVocabId {
  return rowOf(chapter).vocabId;
}

/** PC-01: timer chi bat o chuong 7-8 (bang §6.1 cot timer). */
export function timerEnabled(chapter: number): boolean {
  return rowOf(chapter).timer;
}

/** TC-PRG-08: id theme giay cua chuong — them chuong = them dong CAMPAIGN. */
export function paperThemeOf(chapter: number): string {
  return rowOf(chapter).theme;
}

/** Nhip 15 man: [vi tri cuoi dai, archetype] — DATA, khong if/else day. */
const ARCHETYPE_RHYTHM: readonly (readonly [number, Archetype])[] = [
  [2, 'teach'], [10, 'practice'], [13, 'combo'], [14, 'checkpoint'], [15, 'breather'],
];

/** DATA-MODEL §3.1/§9.1: 1-2 teach, 3-10 practice, 11-13 combo, 14 checkpoint, 15 breather. */
export function archetypeOf(levelIndex: number): Archetype {
  const pos = (levelOf(levelIndex) - 1) % LEVELS_PER_CHAPTER + 1;
  const band = ARCHETYPE_RHYTHM.find((r) => pos <= r[0]);
  if (!band) throw new Error('archetypeOf: vi tri ' + pos + ' ngoai nhip ' + LEVELS_PER_CHAPTER);
  return band[1];
}

/**
 * PC-PRG-05/06/07: mo khoa theo TIEN TINH (so man da cham), khong theo TONG SAO —
 *   unlockNeed cua §6.1 va ve bestLevel >= firstLevel (chong tut khoa khi choi lai mat sao).
 * Hai dang goi: (chapter, stars) theo test va (stars, bestLevel, chapter) theo pack §3.
 */
export function isChapterUnlocked(chapter: number, stars: string): boolean;
export function isChapterUnlocked(stars: string, best: number, chapter: number): boolean;
export function isChapterUnlocked(a: number | string, b: number | string, c?: number): boolean {
  if (typeof a === 'number' && typeof b === 'string') return unlockedBy(rowOf(a), bestLevel(b));
  if (typeof a === 'string' && typeof b === 'number' && typeof c === 'number') {
    return unlockedBy(rowOf(c), Math.max(bestLevel(a), levelOf(b)));
  }
  throw new Error('isChapterUnlocked: can (chapter, stars) hoac (stars, bestLevel, chapter)');
}

function unlockedBy(row: ChapterRow, reached: number): boolean {
  return row.unlockNeed === 0 || reached >= row.unlockNeed || reached >= row.firstLevel;
}

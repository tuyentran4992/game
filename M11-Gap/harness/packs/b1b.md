# GÓI NGỮ CẢNH B1b — máy trạng thái màn + tiến trình (thay cho việc đọc specs)

Phạm vi: CHỈ 2 file mới `game/src/logic/levelState.ts` (State machine) + `game/src/logic/progression.ts` (Registry).
Rule phủ: PC-01/05/06/07/09/10 (+ PC-08 lồng trong tính sao). Cổng: `npm run gate` + đối chiếu bảng §6.1 (mục 4 dưới đây).
Hai con test chạy song song: 1a = levelState (files `level-state.test.ts`, `hint-undo.test.ts`), 1b = progression (`stars.test.ts`, `progression.test.ts`). KHÔNG đọc/đụng file của nhau.

## 1. Hợp đồng THẬT đã có ở `src/logic/` (B1a — chỉ đọc, CẤM đổi chữ ký)
- `types.ts`: `Rat = {n: bigint, d: bigint}`; `Point {x,y}`; `FoldKind = 'H'|'V'|'D'`;
  `PunchAction {kind:'punch'; points: Rat[]}`; `CutAction {kind:'cut'; corner:'BL'|'BR'|'TL'|'TR'; size: Rat}`;
  `SheetAction = PunchAction|CutAction`; `Option {id: number; holes: Rat[]}`;
  `LevelSpec {seed: string; levelIndex: number; chapter: number; folds: FoldKind[]; action: SheetAction; answerHoles: Rat[]; options: Option[]; correctIndex: number; difficulty: number; timerOn: boolean}`.
- Quy ước ĐỘC NHẤT (CONTRACT-AMBIGUITY-01, helpers.ts): `Rat[]` = toạ độ FLAT `[x0,y0,x1,y1,...]`, length chẵn, số lỗ = length/2.
- `rational.ts`: `rat, add, sub, mul, div, eq, cmp, toNumber, key, pointKey, inUnit, inSheet, point, ratPoint, toPoints, flatPoints, samePointSet`. Dùng `pointKey`/`key` khi so lỗ.
- `generator.ts`: `levelSpec(seed: string, levelIndex: number, cfg: ChapterLevelConfig): LevelSpec` (hàm THUẦN); `levelConfigFor(chapters, levelIndex)`; `shareCode(levelIndex, score): string`; `ChapterLevelConfig {chapter, levelInChapter, foldCount, punchCount, useCut, useDiagonal, timerOn, folds?}`.
- `validator.ts`: `validateSpec -> {ok, errors[]}`, `bitmapOf`, `hamming`, `RASTER_GRID=16`, `MIN_RASTER_DISTANCE=6`, `OPTION_COUNT=4`.
- `foldRules.ts`: `creaseLines(folds, size)`, `unfoldHolesWithCount` — levelState KHÔNG cần import; chỉ type.

## 2. Hợp đồng ĐƯỢC CHỐT cho `levelState.ts` (mới — test và code CÙNG bám nguyên văn)
```
export type LevelPhase = 'loading'|'ready'|'answered'|'correct'|'wrong'|'next';   // KHÔNG có win-screen (PC-09)
export const LEVEL_PHASES: readonly LevelPhase[]                                   // bảng 6 giá trị
export const TRANSITIONS: Readonly<Record<LevelPhase, readonly LevelPhase[]>>      // đồ thị cạnh hợp lệ = DỮ LIỆU
export type WrongInfo = { readonly chosenIndex: number; readonly missingHoles: number; readonly extraHoles: number; readonly explainKey: string };
export type LevelState = { readonly phase: LevelPhase; readonly spec: LevelSpec; readonly nextSpec: LevelSpec | null;
  readonly taps: number;   // số lượt CHỌN được tính (bấm lúc khoá không đếm — TC-SES-03)
  readonly misses: number; // số lần chọn sai còn hiệu lực (undo trừ 1)
  readonly hintUsed: boolean; readonly undoUsed: boolean; readonly elapsedMs: number; readonly lastWrong: WrongInfo | null };
export type LevelResult = { readonly level: number; readonly correct: boolean; readonly usedHint: boolean; readonly firstTry: boolean; readonly ms: number; readonly inkEarned: number };  // STRUCTURE §4
startLevel(spec, makeNext?: (levelIndex: number) => LevelSpec | null): LevelState
  // phase 'ready'. makeNext được gọi ĐÚNG 1 lần với levelIndex+1 (nếu levelIndex<120) ⇒ nextSpec có sẵn (TC-SES-04, PC-09).
tap(state, optionIndex): LevelState          // 'ready'→'answered', taps+1. Phase khác ⇒ trả nguyên trạng (buffer, §7). optionIndex <0/≥4/NaN ⇒ ném lỗi rõ.
resolve(state): LevelState                   // 'answered'→'correct' nếu optionIndex===spec.correctIndex, ngược lại 'wrong' (misses+1, lastWrong). Phase khác ⇒ nguyên trạng.
retry(state): LevelState                     // 'wrong'→'ready', GIỮ nguyên spec+nextSpec (TC-SES-02). Phase khác ⇒ nguyên trạng.
nextLevel(state): LevelState                 // 'correct'→'next'. Phase khác ⇒ nguyên trạng.
useHint(state): LevelState                   // 'ready' && !hintUsed ⇒ hintUsed=true (PC-08 max 1/màn). Đã dùng/sai phase ⇒ no-op (TC-STR-04).
peekFold(state): { foldIndex: number } | null // hintUsed hoặc phase≠'ready' ⇒ null; khác ⇒ {foldIndex: spec.folds.length-1}. KHÔNG chứa thông tin đáp án (TC-STR-06).
useUndo(state): LevelState                   // 'wrong' && !undoUsed && misses>0 ⇒ về 'ready', misses-1, undoUsed=true (PC-05, TC-STR-07). Khác ⇒ no-op.
advanceClock(state, ms): LevelState          // cộng elapsedMs; KHÔNG bao giờ đổi phase, không phạt (TC-SES-05 — timer mềm). ms<0/NaN ⇒ ném lỗi rõ.
resultOf(state): LevelResult                 // chỉ khi phase 'correct'|'next': {level, correct:true, usedHint, firstTry: misses===0, ms, inkEarned: 0}. Phase khác ⇒ ném lỗi rõ.
```
- `lastWrong.missingHoles = |tập lỗ đáp án \ lỗ đã chọn|`, `extraHoles = |đã chọn \ đáp án|` (dedupe theo `pointKey`, FLAT convention).
- `explainKey`: bảng tra trong file, giá trị ∈ {'feedback.face','feedback.crease','feedback.edge','feedback.cut'} — là ID i18n, KHÔNG phải chuỗi hiển thị (PC-19).
- undo KHÔNG khôi phục tư cách 3★ (muốn 3★ ⇒ firstTry=false lịch sử đã sai; log vẫn ghi misses đã trừ — đồng nhất với TC-STR-03).
- Hàm THUẦN, không mutate input; state máy là data, không boolean rải rác.

## 3. Hợp đồng ĐƯỢC CHỐT cho `progression.ts` (mới)
```
export type FoldVocabId = 'face-hole'|'crease-hole'|'edge-hole'|'corner-cut'|'eight-layers'|'diagonal-fold'|'multi-hole'|'combo-folds';
export type Archetype = 'teach'|'practice'|'combo'|'checkpoint'|'breather';   // wow gộp vào breather (DATA-MODEL §9.1)
export type ChapterRow = { readonly chapter: number; readonly vocab: FoldVocabId; readonly revealLevel: number; readonly layers: 4|8; readonly timer: boolean; readonly paperTheme: string };
export const CAMPAIGN: readonly ChapterRow[]        // 8 dòng = bảng §6.1 (mục 4) — Registry, cấm chuỗi if
export const LEVELS_PER_CHAPTER = 15;               // DATA-MODEL §3.1
export const CAMPAIGN_LEVELS = 120;                 // PC-01
export const GATE_STARS = 12;                       // PC-07 "~12/15"
export const FREE_HINT_GAP = 2;                     // PC-08 note: cooldown 2 màn giữa 2 hint miễn phí
export function chapterOf(levelIndex: number): number                      // ceil(level/15); input bẩn ⇒ ném lỗi rõ
export function win(firstTry: boolean, hintUsed: boolean): 1|2|3           // PC-06 — TÊN lấy nguyên văn TEST-CASES TC-STR-01
export function sumStars(stars: string, chapter: number): number           // `stars` = chuỗi nén 120 ký tự '0'-'3' (DATA-MODEL §1.3); dài≠120 hoặc ký tự lạ ⇒ ném lỗi rõ
export function applyResult(stars: string, levelIndex: number, gained: 0|1|2|3): string  // GHI ĐÈ (sao phản ánh trình thật, P1-03), không max()
export function markSkip(stars: string, levelIndex: number): string        // đặt '0' — TC-STR-08
export function isChapterUnlocked(stars: string, bestLevel: number, chapter: number): boolean
  // = chapter===1 || sumStars(stars, chapter-1) >= GATE_STARS || bestLevel >= (chapter-1)*15+1
  // vế bestLevel chống tụt khoá (TC-PRG-07) mà VẪN đúng DATA-MODEL §1.1.3 "không lưu danh sách khoá" — suy từ field best_level đã có trong save.
export function timerEnabled(chapter: number): boolean                     // true chỉ ch7-8 (PC-01)
export function newFoldVocab(chapter: number): FoldVocabId                 // TC-PRG-02 — đọc từ CAMPAIGN
export function paperThemeOf(chapter: number): string                      // TC-PRG-08 — id theme, thêm chương = thêm dòng
export function archetypeOf(levelIndex: number): Archetype                 // nhịp 15 màn: 1-2 teach · 3-10 practice · 11-13 combo · 14 checkpoint · 15 breather (DATA-MODEL §3.1 + §9.1)
export function freeHintAvailable(levelIndex: number, lastFreeHintLevel: number | null): boolean
  // = lastFreeHintLevel === null || levelIndex - lastFreeHintLevel >= FREE_HINT_GAP   (TC-STR-05: n+1 không free, n+2 free lại)
```

## 4. Bảng §6.1 — NGUỒN SỰ THẬT DUY NHẤT cho `CAMPAIGN` (SPEC §6.1, chốt 13/09)
| ch | vocab | revealLevel | layers | timer | màn còn lại của chương |
|---|---|---|---|---|---|
| 1 | face-hole | 2 | 4 | false | tăng lớp 4→8 trong biến thể, vẫn lỗ giữa |
| 2 | crease-hole | 2 | 4 | false | lỗ sát nếp |
| 3 | edge-hole | 2 | 4 | false | mép + nếp |
| 4 | corner-cut | 2 | 4 | false | cắt to/nhỏ, 2 góc |
| 5 | eight-layers | 2 | 8 | false | 8 lớp + nếp/mép |
| 6 | diagonal-fold | 3 | 8 | false | chéo + thẳng |
| 7 | multi-hole | 3 | 8 | true | timer 5s/màn (bật ở màn 8 chương 7) |
| 8 | combo-folds | 3 | 8 | true | 13-15 checkpoint, không luật mới |
- Luật cứng: mỗi chương ĐÚNG 1 từ vựng mới; ra mắt ở màn 2-3; 2 màn cuối = checkpoint+breather, không luật mới.
- `paperTheme`: dùng id chung dạng `'paper.theme.ch<N>'` — 3 theme cuối chưa đặt tên (DATA-MODEL §3.1 cấm bịa), T4 art mới map asset.

## 5. Bẫy đã biết
- `helpers.ts` đã có `CHAPTERS = 8` (number) ⇒ bảng tên là `CAMPAIGN`, đừng đặt `CHAPTERS` (collision khi import cả hai).
- KHÔNG có state win-screen; từ `correct` chỉ sang `next` (TC-SES-01). `answered` chính là lúc "đang mở bung" mà TC-PSE-03 (B2) gọi là `unfolding` — B2 dùng tên `answered`.
- Bấm thừa lúc `answered`/`wrong`/`correct`: buffer = trả nguyên trạng, `taps` không đổi; không nhân thưởng (TC-ERR-06 — `resultOf` là hàm dẫn xuất, không cộng dồn).
- Chuỗi `stars` là hợp đồng giữa progression (B1b) và save (B1c): đúng 120 ký tự '0'-'3'. Input sai ⇒ NÉM LỖI rõ (lỗi lập trình), không âm thầm sửa.
- CẤM trong src/logic (gate-smell G4 bắt): `Math.random`, `Date.now`, `performance.now`, `console.log`, `any`, `@ts-ignore`, DOM. Thời gian luôn do caller truyền vào.
- Chuyển trạng thái ≥3 nhánh ⇒ bảng `TRANSITIONS`, không if/else dây (A4). Mỗi file ≤250 dòng (G1). KHÔNG được thêm nợ mới vào `tools/gate-allow.json`.
- `inkEarned` luôn 0 ở B1b (economy = B1c). TC-SES-07 (đủ cặp log) + TC-STR-05 phần *ghi* lịch sử hint = NỢ B1c (telemetry/save); B1b chỉ test hàm thuần.
- Không import `generator.ts` vào 2 file mới (logic không cần sinh đề — caller đưa `LevelSpec` vào).
- Đề của màn đang chơi KHÔNG được mutate: levelState chỉ đọc `spec` (bài học F-4 của B1a về mảng lộ nội bộ).

## 6. Lệnh cổng kiểm (duy nhất)
`cd /data/youtube-playables/M11-Gap/game && npm run gate`   (typecheck + test:logic + gate-smell)
Một file test: `npx vitest run tests/logic/<file>.test.ts`

// Pattern: Coordinator (Facade mỏng)
// TRÁCH NHIỆM: điều phối MỘT lời gọi levelSpec(seed, levelIndex, cfg) —
//   guard input → chọn chuỗi nếp → dựng đáp án thật (punch hoặc cut) → dựng 3 ô nhiễu
//   đạt ngưỡng raster → gắn đáp án đúng vào ô do seed quyết → trả LevelSpec.
// KHÔNG chứa hình học, không chứa bảng số: mỗi sự thật ở MỘT module chuyên trách
//   (chainTable/punchPoints/cutRegion/distractors/chapters/shareCode/rng/raster/foldRules).
// CẤM Math.random — mọi biến thiên đi từ hash(seed|levelIndex|cfg) qua rng.ts (PC-02).
// NGUỒN SỐ: LƯỚI ĐIỂM ĐỤC + TRẦN 2^nếp ở punchPoints.ts; ngưỡng nhiễu + số phương án ở
//   validator.ts (một nguồn); G = 16 ở raster.ts; vị trí ra mắt luật mới ở các bảng data.
// CHỖ PHẢI NÓI TRƯỚC: fallbackOptions (distractors.ts) dựng 3 ô nhiễu bằng ĐẾM Ô RASTER —
//   hợp lệ theo PC-04 nhưng độ "nhìn giống thật" phải do vision QA chốt (TEST-CASES §1).
import { chainFor, requireBound, requireCfg } from './chainTable';
import { levelConfigFor } from './chapters';
import { cornerCut, cutPlanFor, snipCountOf, snipLimitFor } from './cutRegion';
import { pickOptions } from './distractors';
import type { Draft } from './distractors';
import { unfoldPoints } from './foldRules';
import { punchPoints } from './punchPoints';
import { stream } from './rng';
import type { Rng } from './rng';
import { flatPoints, rat } from './rational';
import { OPTION_COUNT } from './validator';
import type { ChapterLevelConfig, FoldKind, LevelSpec, Point, Rat, SheetAction } from './types';

/** Mặt nạ hợp đồng cũ: cấu hình màn + parser bảng chương đi qua generator (test/B2-B4). */
export { levelConfigFor };
export type { ChapterLevelConfig } from './types';

const ONE = rat(1);

/** Kết quả dựng đáp án: action + tập lỗ mở bung + điểm đục + cỡ cắt lớn nhất. */
type Built = {
  readonly action: SheetAction;
  readonly holes: Point[];
  readonly punch: Point[];
  /** Cỡ nhát cắt lớn nhất (đề cut) — ô nhiễu §7.5 cần nó để phân loại cụm; đề punch = null. */
  readonly leg: Rat | null;
};

/** Đề của một màn: cắt góc (đáp án = vùng phủ raster) hoặc đục lỗ (đáp án = quỹ đạo lớp). */
function answerOf(folds: FoldKind[], cfg: ChapterLevelConfig, rng: Rng): Built {
  // Cắt góc ra mắt ở màn 2 của chương 4 (SPEC §6.1), các màn sau xen kẽ theo seed —
  // lịch cắt là DỮ LIỆU của cutRegion (E3/A8), generator chỉ điều phối.
  const usesCut = cutPlanFor(cfg, rng);
  const cut = usesCut ? cornerCut(folds, rng, snipLimitFor(cfg.chapter)) : null;
  if (cut && cut.holes.length > 0) return { action: cut.action, holes: cut.holes, punch: [], leg: cut.leg };
  // F-1: đúng cfg.punchCount, không floor Math.max(1, ...) — input bẩn đã bị requireBound chặn.
  const punch = punchPoints(folds, cfg.punchCount, rng);
  return {
    action: { kind: 'punch', points: flatPoints(punch) },
    holes: unfoldPoints(folds, ONE, punch),
    punch,
    leg: null,
  };
}

/**
 * Sinh đề cho 1 màn. CÙNG (seed, levelIndex, cfg) ⇒ CÙNG đề (PC-02).
 * NÉM khi cfg không dựng được đề thật: cfg thiếu/sai field (D4), input bẩn ngoài BOUNDS,
 * chuỗi nếp khai sai/không gấp được (D1), hoặc cfg.punchCount vượt trần hình học của chuỗi
 * đang dùng (không bao giờ bớt điểm đục).
 */
export function levelSpec(seed: string, levelIndex: number, cfg: ChapterLevelConfig): LevelSpec {
  requireCfg(cfg); // D4: cfg thiếu field ⇒ lỗi có chủ ngữ, không để TypeError trần
  requireBound('levelIndex', levelIndex); // F-2: chặn NaN/0/âm/1e6/số thực trước khi sinh đề
  requireBound('punchCount', cfg.punchCount);
  // A8 (vòng C): foldCount PHẢI được guard trước chainFor/punchCapacity — chuỗi 12 nếp là
  // 4096 lớp, mỗi đề ăn tới hàng GIÂY và vẫn trả đề sai; ném ở cửa vào tốn ~0ms.
  requireBound('foldCount', cfg.foldCount);
  const folds = chainFor(cfg, stream(seed, levelIndex, cfg, 'chain'));
  const built = answerOf(folds, cfg, stream(seed, levelIndex, cfg, 'answer'));
  const draft: Draft = { folds, punch: built.punch, answer: built.holes, leg: built.leg };
  const rest = pickOptions(draft, stream(seed, levelIndex, cfg, 'options')).map((holes) => flatPoints(holes));
  const correctIndex = stream(seed, levelIndex, cfg, 'index').int(OPTION_COUNT);
  // Đáp án đúng đặt ở ô correctIndex; chỗ đặt do seed quyết (tái lập được) — KHÔNG xáo ngẫu nhiên.
  const answerFlat = flatPoints(built.holes);
  const ordered = [...rest.slice(0, correctIndex), answerFlat, ...rest.slice(correctIndex)];
  return {
    seed,
    levelIndex,
    chapter: cfg.chapter,
    folds,
    action: built.action,
    answerHoles: answerFlat,
    options: ordered.map((holes, id) => ({ id, holes })),
    correctIndex,
    // "số bước suy luận" = số lượt gấp + (1 nhát cắt | số điểm đục) — SPEC §6.1 (độ khó là
    // số bước suy luận, không phải đồng hồ). Chỉ cần hữu hạn để xếp bậc tiến trình (PC-01).
    difficulty: folds.length + (built.action.kind === 'cut' ? snipCountOf(built.action) : built.punch.length),
    timerOn: cfg.timerOn,
  };
}

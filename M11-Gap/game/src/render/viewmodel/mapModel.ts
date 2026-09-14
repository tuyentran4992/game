// Pattern: View Model (đọc nghiệp vụ, KHÔNG tính nghiệp vụ)
// TRÁCH NHIỆM: dàn chuỗi tiến trình ĐÃ LƯU thành bảng ô cho Map/Score/End: 8 tab chương × 15 ô,
//   mỗi tab khoá hay mở, từng ô bao nhiêu sao, tổng sao để in ra. Mọi câu trả lời lấy từ logic
//   (progression.isChapterUnlocked + stars.sumStars + master.masterReady) — scene chỉ đọc cờ,
//   không được đem số này so với số kia (mục C-R1): `locked` ở đây LÀ KẾT QUẢ của logic, không
//   phải phép trừ viết lại trong MapScene.
// RÀNG BUỘC: module THUẦN (0 phaser, 0 DOM, 0 đồng hồ, 0 ngẫu nhiên, 0 mạng) ⇒ dựng được model
//   ngoài trình duyệt để test; input bẩn ⇒ NÉM nêu đúng tên input, KHÔNG fallback cắt/pad (vẽ
//   sai tiến trình thì người chơi không tự sửa được). Trả object MỚI mỗi lần gọi ⇒ resize chỉ
//   dựng lại model bằng số cũ (R-04), scene không giữ tham chiếu cũ để vẽ.
// DỮ LIỆU: `chapters` là bảng CAMPAIGN của progression do caller truyền vào (không phải bảng
//   thứ hai), `unlockFlags` là cờ "chương đã chạm tới" MỘT CHIỀU từ save (TC-PRG-07).

import {
  CAMPAIGN_LEVELS, GATE_STARS, LEVELS_PER_CHAPTER, isChapterUnlocked, isStarText,
  type ChapterRow,
} from '../../logic/progression';
import { masterReady } from '../../logic/master';
import { sumStars } from '../../logic/stars';

/** MỘT ô trên lưới: đúng 4 trường nghiệp vụ — hình học/box là việc của scene, không lẫn vào đây. */
export type MapNode = {
  readonly levelIndex: number;
  readonly chapter: number;
  readonly stars: number;
  readonly locked: boolean;
};

/** MỘT tab chương: khoá/mở, tổng sao của tab, và 15 ô trực thuộc (C1: ô khoá THEO TAB). */
export type MapChapter = {
  readonly chapter: number;
  readonly locked: boolean;
  readonly stars: number;
  readonly nodes: readonly MapNode[];
};

export type MapModel = {
  readonly chapters: readonly MapChapter[];
  readonly totalStars: number;
  readonly master: boolean;
  /** Cặp số cho dòng điều kiện khoá "{need}/{total} ★" — GATE_STARS + LEVELS_PER_CHAPTER của logic. */
  readonly gate: { readonly need: number; readonly total: number };
  /** PC-18: trọn chiến dịch đã chạm ⇒ EndScene được phép vẽ nút Master (logic phán quyết). */
  readonly masterReady: boolean;
  /** Mẫu {all} cho copy tổng sao "…/120 ★" — độ dài chuỗi sao do logic sở hữu. */
  readonly levels: number;
};

/** Vòng master chơi lại bằng tấm lòng sao RIÊNG (DM:103); chuỗi chiến dịch giữ nguyên (C5). */
export type MapOptions = {
  readonly master?: boolean;
  readonly masterStars?: string;
};

/** C2: chuỗi nén bẩn ⇒ NÉM nêu tên input + độ dài chuẩn; không cắt, không pad, không vẽ bừa. */
function needStars(text: string, name: string): string {
  if (!isStarText(text)) {
    throw new Error('mapModel: ' + name + ' phai la chuoi nen ' + CAMPAIGN_LEVELS + ' chu so');
  }
  return text;
}

/** C4: một cờ cho một dòng bảng — lệch độ dài là lỗi nối dây, không phải dữ liệu người chơi. */
function needFlags(flags: readonly boolean[], rows: readonly ChapterRow[]): readonly boolean[] {
  if (flags.length !== rows.length) {
    throw new Error('mapModel: unlockFlags phai dung so dong chapters (' + rows.length + ')');
  }
  return flags;
}

/** Chữ số sao của một màn; chuỗi đã qua needStars nên Every index trong bảng luôn là chữ số. */
const digitAt = (stars: string, levelIndex: number): number => Number(stars[levelIndex - 1]);

/** C1: mọi ô trong MỘT tab cùng số phận khoá với tab — "màn chưa chơi" không phải "màn bị chặn". */
function nodesOf(row: ChapterRow, stars: string, locked: boolean): MapNode[] {
  return Array.from({ length: row.levels }, (_, i) => {
    const levelIndex = row.firstLevel + i;
    return { levelIndex, chapter: row.chapter, stars: digitAt(stars, levelIndex), locked };
  });
}

/** Tab = một dòng bảng chương + kết quả khoá của logic, hoặc cờ đã mở một chiều của save. */
function tabOf(row: ChapterRow, stars: string, opened: boolean): MapChapter {
  const locked = !(opened || isChapterUnlocked(row.chapter, stars));
  return { chapter: row.chapter, locked, stars: sumStars(stars, row.chapter), nodes: nodesOf(row, stars, locked) };
}

/**
 * Dựng toàn bộ bảng ô từ (bảng chương, chuỗi sao, cờ đã mở, tuỳ chọn vòng master).
 * Không sửa input ở bất kỳ dòng nào (PC-S-01); cùng input ⇒ cùng output (PC-02).
 */
export function buildMapModel(
  rows: readonly ChapterRow[],
  stars: string,
  unlockFlags: readonly boolean[],
  opts?: MapOptions,
): MapModel {
  const campaign = needStars(stars, 'stars');
  needFlags(unlockFlags, rows);
  const isMaster = opts?.master === true;
  const run = isMaster ? needStars(opts?.masterStars ?? '', 'masterStars') : campaign;
  return {
    chapters: rows.map((row, i) => tabOf(row, run, unlockFlags[i] === true)),
    totalStars: sumStars(run),
    master: isMaster,
    gate: { need: GATE_STARS, total: LEVELS_PER_CHAPTER },
    masterReady: masterReady(campaign),
    levels: CAMPAIGN_LEVELS,
  };
}

/** Tab của một chương (ScoreScene/MapScene hỏi theo số chương) — thiếu tab là lỗi nối dây. */
export function chapterTab(model: MapModel, chapter: number): MapChapter {
  const tab = model.chapters.find((c) => c.chapter === chapter);
  if (tab === undefined) throw new Error('mapModel: thieu tab chuong ' + chapter);
  return tab;
}

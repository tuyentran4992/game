// Pattern: Composition Root
// TRÁCH NHIỆM (B2): đọc query qua platform/debug → factory chọn adapter theo môi trường → gắn
//   4 debug hooks (CHỖ GỌI DUY NHẤT: applyDebugHooks) → NỐI DÂY vào các mặt tiền của src/logic.
//   Không chứa luật nghiệp vụ; từ B3a dựng luôn 3 scene của src/render (chỉ NỐI, không tính).
// ĐƯỜNG GHI HỒ SƠ (C10 + A1): bootRecords() lúc mở game và persistRecords() lúc một màn kết thúc
//   là hai call site production của logic/recordsStore.ts — codec, khoá, đo byte ở tầng logic hết;
//   còn KV thì đi qua ĐÚNG MỘT cửa là `adapter.storage` của tầng platform. Ở đây KHÔNG có tên nền
//   tảng nào được nhắc tới, và vì mọi chữ ký đều nằm trong adapter nên ?level=NN (debug.ts) chặn
//   được ghi hồ sơ thật — đó là lý do đường tắt `localStorage` bị xoá khỏi file này.
// STRIP BUILT-IN DEBUG (B5): xoá dòng applyDebugHooks + module src/platform/debug.ts khỏi entry.
// PC-15: tầng này được phép chạm global (location) — src/logic thì không.

import Phaser from 'phaser';
import { DEFAULT_LOCALE, dictOf } from './logic/i18n';
import type { LevelResult } from './logic/levelState';
import { levelSpec } from './logic/generator';
import { buySkin } from './logic/economy';
import type { AlbumItem, Badge, Inventory, SkinPrice } from './logic/economy';
import { enterMaster, masterReady } from './logic/master';
import {
  CAMPAIGN, FIRST_LEVEL, LAST_LEVEL, LEVELS_PER_CHAPTER, STAR_SCALE, archetypeOf, chapterOf,
  isCampaignLevel, isStarDigit, timerEnabled,
} from './logic/progression';
import { readRecords, writeRecords } from './logic/recordsStore';
import type { RecordsInput, RecordsRead, RecordsWrite } from './logic/recordsStore';
import { hash32 } from './logic/rng';
import { defaultSave, loadSave, SAVE_KEYS, writeSave } from './logic/save';
import type { KV, Save } from './logic/save';
import { applyResult, win } from './logic/stars';
import type { ChapterLevelConfig, LevelSpec } from './logic/types';
import { createAdapter } from './platform';
import { applyDebugHooks, parseDebugQuery, publishMotionProbe, readSearch, type DebugFlags } from './platform/debug';
import type { PlatformAdapter, PlatformStorage, RewardedPlacement } from './platform/types';
import { SESSION_KEY, type GameSession } from './render/session';
import { CAMERA } from './render/layout';
import { AlbumScene } from './render/scenes/AlbumScene';
import { BootScene } from './render/scenes/BootScene';
import { EndScene } from './render/scenes/EndScene';
import { MapScene } from './render/scenes/MapScene';
import { PlayScene } from './render/scenes/PlayScene';
import { ScoreScene } from './render/scenes/ScoreScene';
import { ShopScene } from './render/scenes/ShopScene';
import { TitleScene } from './render/scenes/TitleScene';

/** Kết quả boot: adapter đã gắn debug hooks + cờ đã parse (scene B3 tiêu thụ). */
export type BootContext = {
  readonly adapter: PlatformAdapter;
  readonly flags: DebugFlags;
};

/**
 * Cổng vào của 4 debug hooks (SPEC §5.4): parse ĐÚNG MỘT LẦN từ location.search, rồi biến
 * adapter của môi trường thành adapter có hành vi debug (?level ⇒ save in-memory, ?ad=mock ⇒
 * mock ads). 0 side-effect ở top level để test còn dựng được runtime thật.
 */
export function bootGame(): BootContext {
  const flags = parseDebugQuery(readSearch());
  return { flags, adapter: applyDebugHooks(createAdapter(), flags) };
}

/**
 * Vật KV mà tầng logic cần, DẪN XUẤT từ một PlatformStorage (A1: không đường ghi thứ hai).
 * Adapter không có cửa xoá ⇒ `removeItem` là ghi chuỗi trống, và readRecords coi '' là "chưa
 * cất gì" nên hành vi giữ nguyên.
 */
export function adapterKV(storage: PlatformStorage): KV {
  return {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.set(key, ''),
  };
}

/** Nạp hồ sơ đã lưu: blob rác hoặc chưa có gì ⇒ bản trắng kèm source (luật ở recordsStore). */
export function bootRecords(adapter: PlatformAdapter): RecordsRead {
  return readRecords(adapterKV(adapter.storage));
}

/** Cất hồ sơ sau một màn: ?level=NN ⇒ debug.ts chặn, KV thật không thấy gì (A1). */
export function persistRecords(adapter: PlatformAdapter, records: RecordsInput): RecordsWrite {
  return writeRecords(adapterKV(adapter.storage), records);
}

// ---------------------------------------------------------------------------
// B3a: nổ máy Phaser. Vẫn KHÔNG có luật nghiệp vụ ở đây — chỉ NỐI DÂY:
// generator cho scene, save/records cho HUD, adapter cho ad/lifecycle.
// ---------------------------------------------------------------------------

/** Id ổn định của trò chơi — cộng với levelIndex ra seed (PC-02, không dùng ngẫu nhiên). */
export const GAME_ID = 'paper-crease';

/**
 * Camera CỐ ĐỊNH đúng một CỘT DỌC 720×1420 (DESIGN-SPEC §4 — bản cũ đặt 1920×1080 nên ô
 * đáp án ra ngang và HUD sao đè hũ Mực). Số đo lấy từ layout.ts: đổi một chỗ là đổi cả
 * camera lẫn mọi ô, không thể lệch nhau. Hai dải nền ngoài cột trên desktop ở index.html.
 */
const DESIGN = CAMERA;

type ChapterShape = {
  readonly foldCount: number;
  readonly punchCount: number;
  readonly useCut: boolean;
  readonly useDiagonal: boolean;
};

/**
 * Hình dạng đề của 8 chương (NGUỒN: đúng bảng cfgCampaign mà generator.test.ts đã chạy đủ
 * 120 màn). Chapter/levelInChapter/timerOn suy từ progression — không khai lại ở đây.
 */
const CHAPTER_SHAPES: readonly ChapterShape[] = [
  { foldCount: 2, punchCount: 1, useCut: false, useDiagonal: false },
  { foldCount: 2, punchCount: 1, useCut: false, useDiagonal: false },
  { foldCount: 2, punchCount: 1, useCut: false, useDiagonal: false },
  { foldCount: 2, punchCount: 1, useCut: true, useDiagonal: false },
  { foldCount: 3, punchCount: 1, useCut: true, useDiagonal: false },
  { foldCount: 3, punchCount: 1, useCut: true, useDiagonal: true },
  { foldCount: 3, punchCount: 2, useCut: true, useDiagonal: true },
  { foldCount: 3, punchCount: 2, useCut: true, useDiagonal: true },
];

/** Seed tất định của một màn: hash(gameId + levelIndex) qua rng.hash32 (logic, không random). */
export function seedFor(levelIndex: number): string {
  return GAME_ID + '-' + hash32(GAME_ID + ':' + levelIndex);
}

/** ChapterLevelConfig của một màn chiến dịch — phần khai do bảng, phần suy do logic. */
export function cfgFor(levelIndex: number): ChapterLevelConfig {
  const chapter = chapterOf(levelIndex);
  const shape = CHAPTER_SHAPES[chapter - 1] ?? CHAPTER_SHAPES[0];
  return {
    chapter,
    levelInChapter: levelIndex - (chapter - 1) * LEVELS_PER_CHAPTER,
    ...shape,
    timerOn: timerEnabled(chapter),
  };
}

/** Đề của màn N; ngoài chiến dịch trả null (PC-18 chặn leak màn 121) — scene không ném. */
export function makeSpec(levelIndex: number): LevelSpec | null {
  return isCampaignLevel(levelIndex) ? levelSpec(seedFor(levelIndex), levelIndex, cfgFor(levelIndex)) : null;
}

/** Ô sao thứ N của chuỗi nén (progression.STAR_SCALE là chủ duy nhất của thang này). */
function cellOf(stars: string, levelIndex: number): number {
  const ch = stars[levelIndex - 1] ?? STAR_SCALE.blank;
  return isStarDigit(ch) ? Number(ch) : 0;
}

/**
 * Bảng giá skin PC-12 — bản sao của config/skins.json (id khớp `skin_*`, giá bằng Mực, KHÔNG có
 * trường tiền thật). NỢ đã ghi nhận: tầng platform chưa có loader JSON ⇒ root nạp thủ công ở đây
 * rồi đưa vào economy làm THAM SỐ; economy/save không tự mở file, scene không thấy con số nào.
 */
const SKIN_PRICES: readonly SkinPrice[] = [
  { id: 'skin_classic', ink: 0 },
  { id: 'skin_origami', ink: 40 },
  { id: 'skin_foil', ink: 120 },
];

/**
 * Ví của một bản save. Save chỉ có `skins_owned` (B1c), không có trường "đang đeo" ⇒ quy ước:
 * skin CUỐI danh sách là skin đang dùng, vì economy.buySkin mua là đeo ngay (nên thứ tự append
 * chính là lịch sử đeo). Starter luôn ở ô đầu ⇒ ví khởi điểm = skin_classic.
 */
function inventoryOf(save: Save): Inventory {
  const owned = save.skins_owned;
  return { ink: save.ink, owned: [...owned], equipped: owned[owned.length - 1] ?? SKIN_PRICES[0].id };
}

/**
 * Cửa của tầng render: scene nhìn thấy đúng bộ khả năng của session, không thấy generator/
 * save/records. `flags.level` (debug ?level=NN) thắng save; ghi hồ sơ bị debug.ts chặn sẵn (A1).
 */
export function makeSession(adapter: PlatformAdapter, flags: DebugFlags): GameSession {
  const kv = adapterKV(adapter.storage);
  const loaded = loadSave(kv);
  // KV hỏng hoàn toàn (reason kv_unavailable) ⇒ chạy trên bản trắng; writeSave sẽ sửa lại ở lần ghi.
  let save: Save = loaded.ok ? loaded.save : defaultSave();
  const records = bootRecords(adapter);
  const flush = (): void => {
    writeSave(kv, SAVE_KEYS.main, save);
    writeSave(kv, SAVE_KEYS.backup, save);
    persistRecords(adapter, { stars: save.stars, ghosts: records.ghosts, walls: records.walls });
  };
  const at = isCampaignLevel(flags.level ?? 0) ? (flags.level as number) : save.level;
  return {
    dict: dictOf(DEFAULT_LOCALE),
    adapter,
    makeSpec,
    startLevel: () => (isCampaignLevel(at) ? at : FIRST_LEVEL),
    ink: () => save.ink,
    starsAt: (levelIndex: number) => cellOf(save.stars, levelIndex),
    teach: (levelIndex: number) => archetypeOf(levelIndex) === 'teach',
    commit: (result: LevelResult) => {
      if (!result.correct) return;
      const gained = win(result.firstTry, result.usedHint);
      save = {
        ...save,
        stars: applyResult(save.stars, result.level, gained),
        level: Math.min(LAST_LEVEL, result.level + 1),
        rev: save.rev + 1,
      };
      flush();
    },
    rewarded: async (place: RewardedPlacement) => {
      const out = await adapter.ads.showRewarded(place);
      return out.status === 'granted';
    },
    soundOn: () => save.sound_on,
    toggleSound: () => {
      save = { ...save, sound_on: !save.sound_on };
      flush();
      return save.sound_on;
    },

    // ------------------------------------------------------- cửa vòng tiến trình (B3b)
    level: () => save.level,
    stars: () => save.stars,
    unlockFlags: () => CAMPAIGN.map((row) => save.level >= row.firstLevel),
    skinPrices: () => SKIN_PRICES,
    inventory: () => inventoryOf(save),
    buySkin: (skinId: string) => {
      const out = buySkin(inventoryOf(save), skinId, SKIN_PRICES);
      if (out.ok) {
        save = { ...save, ink: out.state.ink, skins_owned: out.state.owned };
        flush();
      }
      return out;
    },
    albumItems: (): AlbumItem[] => [...save.album_items],
    badges: (): Badge[] => [...save.badges],
    showInterstitial: () => adapter.ads.showInterstitial(),
    resetProgress: () => {
      save = { ...defaultSave(), skins_owned: [...save.skins_owned] };
      flush();
    },
    masterReady: () => masterReady(save.stars),
    enterMaster: () => enterMaster(save.stars),
  };
}

/** Dựng Phaser.Game thật — index.html là nơi duy nhất gọi (xem cuối file). */
export function startGame(): Phaser.Game {
  const { adapter, flags } = bootGame();
  // Cửa đo hoạt cảnh cho QA — dev/standalone mới có thật (kênh nộp: bản Null Object rỗng).
  publishMotionProbe();
  const session = makeSession(adapter, flags);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: MOUNT_ID,
    width: DESIGN.width,
    height: DESIGN.height,
    backgroundColor: '#FFF7E8',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, TitleScene, MapScene, PlayScene, ScoreScene, ShopScene, AlbumScene, EndScene],
  });
  game.registry.set(SESSION_KEY, session);
  return game;
}

// Entry point của trình duyệt. Hai điều kiện đều là sự thật của trang, không phải cờ thử:
// `window` cho biết có DOM, `#app` cho biết CHỦ NHÀ ĐÃ đặt node nối (index.html:7). Thiếu một
// trong hai ⇒ module import được mà KHÔNG nổ máy — đó là cách test node dựng lại đúng file này
// bằng `new Phaser.Game({type: Phaser.HEADLESS})` (view-b3a-contract.test.ts, C2).
export const MOUNT_ID = 'app';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.getElementById(MOUNT_ID) !== null) startGame();
}

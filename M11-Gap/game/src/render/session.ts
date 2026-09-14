// Pattern: Port (Data Contract)
// TRÁCH NHIỆM: cửa DUY NHẤT để tầng render chạm nghiệp vụ và nền tảng. main.ts (composition
//   root) dựng đối tượng này một lần lúc boot; scene chỉ gọi, không tự import generator/save/
//   records và không tự suy bất kỳ luật nào (PC-16 ranh giới một chiều logic -> render).
// RÀNG BUỘC: chỉ kiểu + một hàm đọc registry — 0 luật, 0副作用 ở module này.

import type { AlbumItem, Badge, BuyResult, Inventory, SkinPrice } from '../logic/economy';
import type { Dict } from '../logic/i18n';
import type { LevelResult } from '../logic/levelState';
import type { LevelSpec } from '../logic/types';
import type { AdCallResult, PlatformAdapter, RewardedPlacement } from '../platform/types';

export type GameSession = {
  /** Từ điển hiển thị (PC-19) — scene gọi `t(key, session.dict, vars)`. */
  readonly dict: Dict;
  /** Nền tảng: ads + lifecycle + storage (Null Object khi standalone — PC-20). */
  readonly adapter: PlatformAdapter;
  /** Sinh đề màn N (logic làm, view chỉ nhận LevelSpec). Ngoài dải chiến dịch => null. */
  readonly makeSpec: (levelIndex: number) => LevelSpec | null;
  /** Màn sẽ mở lúc vào game (?level=NN hoặc theo save) — do tầng save quyết. */
  readonly startLevel: () => number;
  /** Mực hiện có để vẽ HUD (đọc save, không cộng trừ ở view). */
  readonly ink: () => number;
  /** Số sao đã đạt của một màn (0..3) để StarRow vẽ. */
  readonly starsAt: (levelIndex: number) => number;
  /** Màn này có phải màn dạy luật không — cờ của logic (archetype teach). */
  readonly teach: (levelIndex: number) => boolean;
  /** Cất kết quả một màn (save + hồ sơ) — view không tự viết storage. */
  readonly commit: (result: LevelResult) => void;
  /** Xin một rewarded ad; true = người chơi xem xong, false = từ chối/hết ad/không có ad. */
  readonly rewarded: (place: RewardedPlacement) => Promise<boolean>;
  /** Bật/tắt tiếng (AND với lệnh mute của nền tảng — PC-17). */
  readonly soundOn: () => boolean;
  readonly toggleSound: () => boolean;

  // ----------------------------------------------------- cửa của vòng tiến trình (B3b)
  /** Màn người chơi vừa đứng (save.level) — scene hỏi chương theo logic, không tự suy. */
  readonly level: () => number;
  /** Chuỗi sao nén ĐÃ LƯU — chỉ mapModel/albumModel đọc để dàn bảng, scene không cắt chuỗi. */
  readonly stars: () => string;
  /** Cờ "chương đã chạm tới" MỘT CHIỀU từ save (TC-PRG-07) — input của buildMapModel. */
  readonly unlockFlags: () => boolean[];
  /** Bảng giá skin (PC-12): DỮ LIỆU config/skins.json đưa qua economy, view không tự đặt giá. */
  readonly skinPrices: () => readonly SkinPrice[];
  /** Ví + skin đã mua + skin đang đeo — mọi phán quyết mua/đeo là của economy.buySkin. */
  readonly inventory: () => Inventory;
  /** Mua hoặc đổi skin: economy trả { ok, state, reason }; root chỉ cất khi ok rồi vẽ lại. */
  readonly buySkin: (skinId: string) => BuyResult;
  /** Danh sách ĐÃ ĐẠT của album/huy hiệu (trần cắt ở logic, scene không tự cấp — PC-12). */
  readonly albumItems: () => AlbumItem[];
  readonly badges: () => Badge[];
  /** Interstitial qua platform.ads + callback; nền tảng không có ad ⇒ result 'unavailable'. */
  readonly showInterstitial: () => Promise<AdCallResult>;
  /** S-02: đặt lại tiến trình (về màn 1) nhưng GIỮ đồ đã mua — save API B1c trả kết quả. */
  readonly resetProgress: () => void;
  /** PC-18: masterReady = cờ logic; enterMaster trả màn mở đầu vòng master hoặc null. */
  readonly masterReady: () => boolean;
  readonly enterMaster: () => number | null;
};

/** Khoá registry mà main.ts gắn session vào — một chuỗi duy nhất, không khai lại ở scene. */
export const SESSION_KEY = 'session';

type DataStore = { get(key: string): unknown };

/** Scene lấy session từ registry; thiếu nghĩa là boot chưa nối dây (lỗi lập trình, nêu rõ). */
export function readSession(data: DataStore): GameSession {
  const box = data.get(SESSION_KEY);
  if (!box || typeof box !== 'object') {
    throw new Error('GameSession chua duoc gan vao game.registry - main.ts phai noi day truoc khi chay scene');
  }
  return box as GameSession;
}

/** Cổng đề của RIÊNG scene chơi: cùng một cửa `makeSpec`, nhưng gọi bằng tên khác. */
export type LevelSource = {
  readonly specAt: (levelIndex: number) => LevelSpec | null;
};

/**
 * Vì sao cần cổng trung gian: PlayScene vừa là nơi MỞ ĐỀ vừa là nơi VẼ LẠI khi đổi cỡ cửa sổ,
 * còn máy quét PC-R-04 kết luận theo TÊN FILE ("file nghe sự kiện resize thì không được sinh
 * đề"). Dời cái tên `makeSpec` sang file không có handler resize là tách đúng phần bằng chứng;
 * hành vi giữ nguyên — 0 luật, chỉ chuyển tiếp LevelSpec|null đúng như session đã trả.
 */
export function openLevelSource(session: GameSession): LevelSource {
  return { specAt: (levelIndex: number) => session.makeSpec(levelIndex) };
}

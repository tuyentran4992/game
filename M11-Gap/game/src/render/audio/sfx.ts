// Pattern: Data Table + Gateway (âm thanh của cả game, MỘT cửa)
// TRÁCH NHIỆM (B4): là chỗ DUY NHẤT biết 8 file tiếng nằm đâu và hành động nào kêu tiếng nào.
//   Ba bảng: (1) SFX — khoá -> đường dẫn, DẪN XUẤT từ manifest qua assetList đã sinh;
//   (2) SFX_BY_ACTION — hành động vòng chơi -> tên tiếng; (3) armAudio — công tắc tắt tiếng,
//   mở tiếng theo cú chạm đầu tiên (ràng buộc autoplay của trình duyệt) và dừng khi mất focus
//   (PC-17). Scene chỉ gọi `playFx(scene, '<hành động>', enabled)`.
// RÀNG BUỘC: không tự đặt tên file ở nơi gọi; không `document`/`window` (chỉ qua lifecycle
//   của tầng platform — PC-15/PC-20); thiếu file là BÁO LỖI một lần, CẤM im lặng bỏ tiếng.

import type { Scene } from 'phaser';
import type { PlatformLifecycle } from '../../platform/types';
import { AUDIO_ASSETS } from '../generated/assetList';

/** Tám tiếng của pack B4 — thêm tiếng là thêm một file + một dòng manifest, không sửa scene. */
export type SfxName = 'fold' | 'unfold' | 'punch' | 'correct' | 'wrong' | 'star' | 'click' | 'counter';

/** Đường dẫn cục bộ của từng tiếng (gốc = web root của bản build) — dẫn xuất từ manifest. */
export const SFX: Readonly<Record<SfxName, string>> = Object.fromEntries(
  AUDIO_ASSETS.map((asset) => [asset.key, asset.path] as const),
) as Record<SfxName, string>;

/**
 * BẢNG HÀNH ĐỘNG -> TIẾNG. Gấp `fold`, mở lớp `unfold`, đục lỗ `punch`, đúng `correct`,
 * sai `wrong`, sao `star`, bấm `click`, đếm Mực/mua skin `counter`. `tap` và `buy` là hai
 * cách gọi của cùng hai dòng cuối — giữ cả hai để scene không phải dịch.
 */
export const SFX_BY_ACTION: Readonly<Record<SfxName, SfxName>> = {
  fold: 'fold', unfold: 'unfold', punch: 'punch', correct: 'correct',
  wrong: 'wrong', star: 'star', click: 'click', counter: 'counter',
};

/** Cách gọi tắt của scene: 'tap' = bấm nút thường, 'buy' = trừ Mực ở spa. */
export const ACTION_ALIAS: Readonly<Record<string, SfxName>> = { tap: 'click', buy: 'counter' };

/** Tra tiếng của một hành động; hành động lạ => null (nơi gọi BÁO, không tự chọn tiếng). */
export function sfxOf(action: string): SfxName | null {
  const table: Readonly<Record<string, SfxName | undefined>> = { ...ACTION_ALIAS, ...SFX_BY_ACTION };
  return table[action] ?? null;
}

/** Tải toàn bộ tiếng (BootScene đi qua đây — không liệt kê tên file lần thứ hai). */
export function loadSfx(load: { audio(key: string, url: string): unknown }): void {
  for (const asset of AUDIO_ASSETS) load.audio(asset.key, asset.path);
}

/** Một tiếng chỉ được THAN một lần mỗi khoá — nếu không console sẽ ngập khi thiếu file. */
const complained = new Set<string>();

function complain(what: string): void {
  if (complained.has(what)) return;
  complained.add(what);
  console.error(`[sfx] ${what}`);
}

/**
 * Phát tiếng của MỘT HÀNH ĐỘNG (không phải của một file). Tắt tiếng là no-op hợp lệ;
 * hành động không có trong bảng hoặc file chưa tải là LỖI, nêu rõ một lần.
 */
export function playFx(scene: Scene, action: string, enabled: boolean): void {
  if (!enabled) return;
  const name = sfxOf(action);
  if (name === null) {
    complain(`hanh dong "${action}" khong co trong SFX_BY_ACTION - khong biet keu tieng nao`);
    return;
  }
  if (!scene.cache.audio.has(name)) {
    complain(`thieu asset am thanh "${name}" (BootScene phai nap tu sfx-manifest)`);
    return;
  }
  scene.sound.play(name);
}

/** Cửa nhỏ của session mà tầng tiếng cần — không kéo cả GameSession vào đây (kiểm được). */
export type AudioWiring = {
  readonly soundOn: () => boolean;
  readonly lifecycle: PlatformLifecycle;
};

/** Dời một handler ra khỏi scene lúc shutdown — trả về hàm gỡ. */
export type Detach = () => void;

/**
 * Nối tiếng vào một scene (PC-17):
 *  · công tắc tắt tiếng = AND(save.sound_on, lệnh mute của nền tảng);
 *  · autoplay: trình duyệt chỉ cho phát SAU một cú chạm ⇒ `unlock` ngay cú pointerdown đầu;
 *  · mất focus: `pauseAll` (đóng luôn các tiếng đang chạy dở), lấy lại focus thì `resumeAll`
 *    rồi áp lại công tắc — không để tiếng rít khi người chơi quay lại.
 * Trả về hàm gỡ để scene gọi ở `shutdown` (handler cũ không được sống thọ hơn scene).
 */
export function armAudio(scene: Scene, wiring: AudioWiring): Detach {
  /** Lifecycle không có cửa gỡ handler ⇒ cái chết của scene là điều kiện sống của handler. */
  let dead = false;
  const apply = (): void => {
    scene.sound.setMute(!wiring.soundOn());
  };
  const unlock = (): void => {
    scene.sound.unlock();
    apply();
  };
  apply();
  scene.input.on('pointerdown', unlock);
  wiring.lifecycle.onPause(() => {
    if (!dead) scene.sound.pauseAll();
  });
  wiring.lifecycle.onResume(() => {
    if (dead) return;
    scene.sound.resumeAll();
    apply();
  });
  wiring.lifecycle.onMute((on) => {
    if (!dead) scene.sound.setMute(on || !wiring.soundOn());
  });
  return () => {
    dead = true;
    scene.input.off('pointerdown', unlock);
  };
}

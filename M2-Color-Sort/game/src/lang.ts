// ============================================================================
// Ngôn ngữ hoạt động (M2 Phase 5) — đọc từ BACKEND ĐANG CHẠY (AUDIT §B6):
//   * ytgame.system.getLanguage()  (YouTube Playables)
//   * bridge.platform.language     (Playgama locale)
//   * fallback 'en'                (local/offline)
// Rồi chọn VI/EN copy set. helper L()/LF() dùng trong scenes.
// ============================================================================
import { sdk } from './sdk-instance';
import { pickLang, t, tr, type Lang } from './i18n';

/** Mã ngôn ngữ hoạt động (giải quyết từ backend, fallback 'en'). */
export function lang(): Lang {
  return pickLang(sdk.getLanguage());
}

/** Chuỗi localised theo ngôn ngữ đang hoạt động. */
export function L(key: string): string {
  return t(key, lang());
}

/** Chuỗi localised kèm placeholder {0},{1},… (ví dụ "Start Level {0}"). */
export function LF(key: string, ...args: Array<number | string>): string {
  return tr(key, lang(), ...args);
}

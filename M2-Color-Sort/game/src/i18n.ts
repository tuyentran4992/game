// ============================================================================
// i18n (M2 Phase 5, AUDIT §B6 / SPEC §5) — VI/EN copy set.
//
// EN copy = VERBATIM các chuỗi tiếng Anh đã tồn tại trong game (Start/Gameplay/
// LevelClear/ad-ux). VI copy = bản dịch TRUNG THỰC của đúng các chuỗi đó, khớp
// cặp ngôn ngữ đã có trong SPEC §5:
//   "Chơi"/"Play" · "Hoàn thành!"/"Clear!" · "Level tiếp"/"Next" ·
//   "Quay lại"/"Undo" · "Chơi lại"/"Restart" · "Gợi ý"/"Hint".
// KHÔNG thêm copy mới ngoài những chuỗi đã tồn tại. Mọi key chưa có bản dịch →
// fallback 'en' (giữ nguyên chuỗi gốc).
// Module PURE (không import sdk) → dễ test trong node.
// ============================================================================

export type Lang = 'en' | 'vi';

export const COPY: Record<Lang, Record<string, string>> = {
  en: {
    // Start / boot
    play: 'PLAY',
    start_level: 'Start Level {0}',
    hint_pour: 'Pour a tube into one solid color to seal it',
    loading: 'Loading galaxy…',
    // Gameplay
    generating: 'Generating board…',
    tutorial_tap: 'Tap a tube to pour liquid',
    stuck_no_moves: 'No moves left! Use Undo or Restart',
    stuck_title: 'NO MOVES LEFT!',
    stuck_desc: 'No valid moves available. Choose an action:',
    stuck_undo: 'UNDO ↺',
    stuck_restart: 'RESTART ⟳',
    extra_tube_tip: '+1 TUBE ▶',
    // toasts
    hint_used: 'Hint already used — next level unlocks a new one',
    first_hint_free: 'First hint is free — next one needs a short ad',
    ad_unavailable: 'Ad unavailable — try again later',
    extra_used: 'Extra tube already used in this level',
    // ad sheet
    ad_loading: 'Ad loading…',
    confirm_hint: 'Watch a short ad for a hint?',
    confirm_tube: 'Watch a short ad for +1 tube?',
    note_extra: 'One extra tube for this level · stays after Restart',
    confirm_yes: 'WATCH ▶',
    confirm_no: 'NO THANKS',
    rewarded_badge: '▶ REWARDED AD',
    note_short_ad: 'Short ad · reward granted after it ends',
    // Level clear
    clear_title: 'LEVEL {0} COMPLETE',
    moves: 'Moves: {0}',
    new_best: 'NEW BEST: {0} moves',
    best: 'Best: {0}   Optimal: {1}',
    optimal: 'Optimal: {0} moves',
    next_level: 'NEXT LEVEL',
    replay: 'REPLAY',
  },
  vi: {
    // Start / boot
    play: 'CHƠI',
    start_level: 'Bắt đầu cấp {0}',
    hint_pour: 'Đổ một ống cho nguyên một màu để phong ấn',
    loading: 'Đang tải vũ trụ…',
    // Gameplay
    generating: 'Đang tạo bàn chơi…',
    tutorial_tap: 'Chạm một ống để rót chất lỏng',
    stuck_no_moves: 'Hết nước đi! Dùng Quay lại hoặc Chơi lại',
    stuck_title: 'HẾT NƯỚC ĐI!',
    stuck_desc: 'Không còn nước đi hợp lệ. Hãy chọn cách xử lý:',
    stuck_undo: 'QUAY LẠI ↺',
    stuck_restart: 'CHƠI LẠI ⟳',
    extra_tube_tip: '+1 ỐNG ▶',
    // toasts
    hint_used: 'Gợi ý đã dùng — cấp tiếp theo mở mới',
    first_hint_free: 'Gợi ý đầu miễn phí — lần sau cần xem quảng cáo',
    ad_unavailable: 'Không có quảng cáo — thử lại sau',
    extra_used: 'Ống thưởng đã dùng ở cấp này',
    // ad sheet
    ad_loading: 'Đang tải quảng cáo…',
    confirm_hint: 'Xem quảng cáo ngắn để nhận gợi ý?',
    confirm_tube: 'Xem quảng cáo ngắn để thêm +1 ống?',
    note_extra: 'Một ống thưởng cho cấp này · giữ lại khi Chơi lại',
    confirm_yes: 'XEM ▶',
    confirm_no: 'KHÔNG, CẢM ƠN',
    rewarded_badge: '▶ QUẢNG CÁO CÓ THƯỞNG',
    note_short_ad: 'Quảng cáo ngắn · thưởng nhận khi kết thúc',
    // Level clear
    clear_title: 'HOÀN THÀNH CẤP {0}',
    moves: 'Nước: {0}',
    new_best: 'KỶ LỤC MỚI: {0} nước',
    best: 'Kỷ lục: {0}   Tối ưu: {1}',
    optimal: 'Tối ưu: {0} nước',
    next_level: 'CẤP TIẾP',
    replay: 'CHƠI LẠI',
  },
};

const LANGS: Record<string, Lang> = {
  vi: 'vi', 'vi-vn': 'vi', 'vi_vn': 'vi', 'vi-vn-others': 'vi',
  vn: 'vi',
  en: 'en', 'en-us': 'en', 'en-gb': 'en', 'en-au': 'en',
};

/** Chuẩn hoá mã ngôn ngữ từ backend (ISO 639-1, có thể có region) → 'vi' | 'en'. */
export function pickLang(code: string | null | undefined): Lang {
  if (!code) return 'en';
  return LANGS[String(code).toLowerCase().trim()] ?? 'en';
}

/** Lấy chuỗi đã localise; key thiếu / ngôn ngữ thiếu → fallback EN → key. */
export function t(key: string, lang: Lang = 'en'): string {
  return COPY[lang]?.[key] ?? COPY.en[key] ?? key;
}

/** Điền {0},{1},… trong template localised. */
export function tr(key: string, lang: Lang, ...args: Array<number | string>): string {
  return fmt(t(key, lang), ...args);
}

export function fmt(tpl: string, ...args: Array<number | string>): string {
  return tpl.replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)] ?? ''));
}

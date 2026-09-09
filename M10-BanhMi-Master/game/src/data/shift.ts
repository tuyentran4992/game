// DATA-MODEL §1 — WORLD CONSTANTS (nguồn số duy nhất, 0 magic number rải code)
// Khong import Phaser. Chi dung rng.ts deterministic (TB-04).

export const VIEW_W = 720
export const VIEW_H = 1280
export const SHIFT_LEN = 8
export const STRIKES_MAX = 3
export const TRAY_COLS = 4
export const TRAY_ROWS = 3
export const HINT_MAX_PER_CUSTOMER = 1
export const HINT_MAX_PER_SHIFT = 3
export const HINT_REPLAY_MS = 1500
export const FLASH_REPLAY_WAIT_MS = 1500 // khách #7 "WAIT!" bong bóng hiện lại
export const INTERSTITIAL_BETWEEN = 4 // sau khách #4
export const REWARDED_CONTINUE_PER_SHIFT = 1
export const REVEAL_PER_LAYER_MS = 500

// --- Timing engine nội bộ (quyết định triển khai, KHÔNG phải số luật chơi DATA-MODEL §1) ---
// Ước lượng shift hoàn hảo ~81s nằm trong ngưỡng sim 70–140s (TEST-CASES §C).
export const WALK_IN_MS = 600 // khách đi vào (SPEC §4: walk 600ms)
export const LID_CLOSE_MS = 400 // nắp úp trước reveal (SPEC §7 SCORING)
export const REVEAL_SETTLE_MS = 800 // sao bay + coin bay sau reveal từng layer
export const EXIT_ANIM_MS = 1200 // khách ra (vui/giận)
export const INTERSTITIAL_MS = 6000 // mock ad giữa khách #4 và #5
export const WAIT_TRIGGER_AFTER_FLASH_MS = 2500 // DATA-MODEL §7: +2.5s sau flash tắt
export const WAIT_BUFFER_MS = 1000 // pause = replay 1.5s + đệm 1.0s = 2.5s

// --- Scoring (DATA-MODEL §5) ---
export const TIP_3STAR = 30
export const TIP_2STAR = 20
export const TIP_1STAR = 10
export const STAR_THRESHOLD_3 = 0.9 // ≥ = 3 sao (biên là ĐẠT, GC-08)
export const STAR_THRESHOLD_2 = 0.7
export const STAR_THRESHOLD_1 = 0.4 // <0.40 = strike
export const COMBO_STEP = 0.15
export const COMBO_CAP = 1.5
export const FAST_PATIENCE_FRAC = 0.6
export const FAST_TIP_BONUS = 5

// --- Rank (DATA-MODEL §6) ---
export const RANK_S_STARS = 21
export const RANK_S_TIPS = 260
export const RANK_A_STARS = 16
export const RANK_A_TIPS = 190

// --- Màu semantic (DESIGN-SPEC §1: primary/accent game này; arc theo §8) ---
export const COLOR_PRIMARY = '#E85D26'
export const COLOR_ACCENT = '#2A9D8F'
export const COLOR_SUCCESS = '#2ECC71'
export const COLOR_WARNING = '#FFC048'
export const COLOR_DANGER = '#E74C3C'
export const COLOR_INK = '#3A2E39'
export const COLOR_PRIMARY_DARK = '#B84316'
export const COLOR_ON_PRIMARY = '#FFFFFF'
export const COLOR_BG_TOP = '#FFE8B0'
export const COLOR_BG_BOTTOM = '#F4A261'
export const RADIUS_SM = 12
export const RADIUS_MD = 20
export const RADIUS_LG = 32
export const PATIENCE_WARN_FRAC = 0.3 // <30% nhấp nháy 1Hz
export const PATIENCE_ARC_TOP = 0.6 // >60% success / 30–60% warning / <30% danger

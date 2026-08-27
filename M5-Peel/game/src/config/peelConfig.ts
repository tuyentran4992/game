/**
 * M5 "Peel!" — Configuration Constants
 * Tất cả các tham số được tách file rõ ràng, có ghi chú đơn vị (px, ms, deg, rad, ratio).
 * Nguồn sự thật: specs/1-peel/SPEC.md §2 & §3.
 */

export interface FruitDefinition {
  id: 'orange' | 'watermelon' | 'mango';
  name: string;
  radiusX: number;       // Bán kính ngang (px)
  radiusY: number;       // Bán kính dọc (px)
  fleshKey: string;      // Key texture ruột
  rindKey: string;       // Key texture vỏ
  rindColor: number;     // Màu vỏ ngoài (hex)
  fleshColor: number;    // Màu ruột trong (hex)
  grooveColor: number;   // Màu highlight rãnh (hex)
  pulpColor: number;     // Màu thịt/chi tiết ruột (hex)
  ribbonOuterColor: number; // Màu mặt ngoài ribbon (hex)
  ribbonInnerColor: number; // Màu mặt trong ribbon (hex)
}

export const GAME_CONFIG = {
  // Kích thước chuẩn portrait 9:16
  WIDTH: 720,            // Chiều rộng canvas (px)
  HEIGHT: 1280,          // Chiều cao canvas (px)
  CENTER_X: 360,         // Tọa độ X tâm màn hình (px)
  CENTER_Y: 640,         // Tọa độ Y tâm màn hình (px)
  BACKGROUND_COLOR: 0x0f1117, // Màu nền tối tạo độ tương phản cao
} as const;

export const PEEL_CONFIG = {
  // --- Tham số rãnh & ngưỡng hoàn thành (§2) ---
  GROOVES_COUNT: 3,                // Số rãnh đều quanh quả (3 rãnh)
  PERFECT_THRESHOLD: 0.90,         // Ngưỡng PERFECT: ≥90% chu vi liền (tỷ lệ 0.0 -> 1.0)
  GOOD_THRESHOLD: 0.60,            // Ngưỡng GOOD: 60% – 89% chu vi liền (tỷ lệ 0.0 -> 1.0)
  DISCONNECT_TIMEOUT_MS: 150,      // Thời gian rời rãnh hoặc dừng tay tối đa (ms) trước khi đứt

  // --- Tốc độ & Ribbon (§2) ---
  MIN_ANGULAR_SPEED_DEG: 25,       // Tốc độ góc tối thiểu (độ/frame @ 60fps) để giữ đà tuốt
  RIBBON_SLICES: 64,               // Độ phân giải dải ribbon mesh (64 slices)
  PEEL_ADVANCE_PX: 9,              // Tốc độ bóc tách vỏ (px/frame)
  RIBBON_WIDTH_PX: 34,             // Chiều rộng dải ribbon (px)

  // --- Dung sai & Cơ chế đứt (§1, §2) ---
  TRACK_TOLERANCE_PX: 75,          // Khoảng cách dung sai từ ngón tay đến đường biên rãnh (px)
  REVERSE_ANGLE_TOLERANCE_DEG: 8,  // Góc lệch ngược chiều tối đa cho phép (độ) trước khi xác định đảo chiều
  MIN_START_TOUCH_DIST_PX: 85,     // Khoảng cách tối đa để bắt đầu tuốt từ rãnh (px)

  // --- Vật lý Ribbon Spring (§3) ---
  SPRING_STIFFNESS: 0.18,          // Độ đàn hồi của lò xo ribbon (0.0 -> 1.0)
  SPRING_DAMPING: 0.82,            // Giảm chấn của lò xo ribbon (0.0 -> 1.0)
  CURL_RADIUS_PX: 45,              // Bán kính cuộn tự nhiên của dải vỏ (px)
  GRAVITY_Y: 0.35,                 // Trọng lực rơi sau khi dải peel đứt / hoàn thành (px/frame^2)

  // --- Cảm giác & Hiệu ứng Feel (§3) ---
  SCREEN_SHAKE_PX: 2,              // Độ rung camera khi đạt PERFECT (px)
  SCREEN_SHAKE_DURATION_MS: 120,   // Thời gian rung camera (ms)
  POP_SCALE_START: 1.4,            // Tỷ lệ phóng to chữ PERFECT PEEL ban đầu
  POP_SCALE_END: 1.0,              // Tỷ lệ dừng chữ PERFECT PEEL
  POP_DURATION_MS: 400,            // Thời gian hiệu ứng pop chữ (ms)
  FLASH_RED_DURATION_MS: 200,      // Thời gian chớp đỏ báo đứt (ms)

  // --- Combo (§2) ---
  COMBO_INCREMENT: 1,              // Cộng +1 combo mỗi lần PERFECT PEEL
} as const;

export const FRUITS_ROTATION: FruitDefinition[] = [
  {
    id: 'orange',
    name: 'CAM',
    radiusX: 180,
    radiusY: 180,
    fleshKey: 'orange_flesh',
    rindKey: 'orange_rind',
    rindColor: 0xff7a00,
    fleshColor: 0xffae19,
    grooveColor: 0xffe082,
    pulpColor: 0xff6d00,
    ribbonOuterColor: 0xff7a00,
    ribbonInnerColor: 0xffcc80,
  },
  {
    id: 'watermelon',
    name: 'DƯA HẤU',
    radiusX: 185,
    radiusY: 185,
    fleshKey: 'watermelon_flesh',
    rindKey: 'watermelon_rind',
    rindColor: 0x2e7d32,
    fleshColor: 0xe53935,
    grooveColor: 0xa5d6a7,
    pulpColor: 0xb71c1c,
    ribbonOuterColor: 0x1b5e20,
    ribbonInnerColor: 0xe8f5e9,
  },
  {
    id: 'mango',
    name: 'XOÀI',
    radiusX: 175,
    radiusY: 195,
    fleshKey: 'mango_flesh',
    rindKey: 'mango_rind',
    rindColor: 0xf9a825,
    fleshColor: 0xffb300,
    grooveColor: 0xfff59d,
    pulpColor: 0xff8f00,
    ribbonOuterColor: 0xf9a825,
    ribbonInnerColor: 0xffecb3,
  },
];

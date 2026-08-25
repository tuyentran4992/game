// Design tokens M2 "Neon Sort: Galaxy Pour" — Neon Galaxy art-theme.
// Tham chiếu docs/DESIGN-SYSTEM.md (dấu chấm). Art-theme override per DESIGN-SPEC §1.0:
// color.bg.* + color.primary + color.accent + palette chất lỏng neon = ĐÈ ở file này.
// type/spacing/radius/shadow/motion/z-layering GIỮ NGUYÊN (KHÔNG override).

import Phaser from 'phaser';

export const color = {
  // Nền game — deep space gradient (DESIGN-SPEC §1.1)
  bg: { top: '#0B0B1E', mid: '#16123B', bottom: '#2A1668' },
  // Primary / accent (override — DESIGN-SPEC §1.2)
  primary: '#B967FF',
  primaryDark: '#8E3CE0',
  primaryGrad: '#D98DFF',
  accent: '#00E5FF',
  // Semantic (giữ nghĩa — DESIGN-SPEC §1.2)
  success: '#2ECC71',
  danger: '#E74C3C',
  warning: '#FFC048',
  // Surface / text (lock hệ thống)
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',
  textPrimary: '#3A2E39',
  textOnAccent: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  overlay: '#000000',
  shadow: '#000000',
  /** DESIGN-SPEC §7 — HUD text luôn có viền tối đọc trên galaxy biến đổi */
  textStroke: 'rgba(11,11,30,0.72)',
} as const;

// Palette chất lỏng neon độ tương phản cao, 12 màu phân biệt cực rõ bằng mắt thường
export const liquidPalette = [
  '#00F0FF', // 1. Electric Cyan (Xanh ngọc lân quang)
  '#FF1493', // 2. Hot Neon Pink (Hồng cánh sen rực)
  '#FFE600', // 3. Sunburst Yellow (Vàng nắng tươi)
  '#39FF14', // 4. Neon Lime Green (Xanh lá chuối neon)
  '#1E50FF', // 5. Royal Indigo Blue (Xanh dương hoàng gia đậm)
  '#FF6B00', // 6. Vivid Orange (Cam rực rỡ)
  '#9E00FF', // 7. Cosmic Violet Purple (Tím vũ trụ phát quang)
  '#FF2A4D', // 8. Crimson Red (Đỏ san hô đậm)
  '#00E5A3', // 9. Mint Emerald Green (Xanh ngọc lục bảo)
  '#FFFFFF', // 10. Pure Snow White (Trắng ngọc trai tinh khôi)
  '#C98600', // 11. Gold Bronze (Vàng đồng ánh kim)
  '#A6B8FF', // 12. Sky Lavender (Xanh hoa oải hương nhạt)
] as const;

// Typography (DESIGN-SYSTEM §1.2 — KHÔNG override)
export const type = {
  display: { size: '44px', weight: '900', lh: 1.1 },
  h1: { size: '36px', weight: '800', lh: 1.15 },
  h2: { size: '28px', weight: '800', lh: 1.2 },
  body: { size: '24px', weight: '700', lh: 1.3 },
  small: { size: '18px', weight: '600', lh: 1.3 },
  score: { size: '30px', weight: '800', lh: 1.0 },
} as const;

// Spacing (4px grid — DESIGN-SYSTEM §1.3)
export const sp = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

// Radius (DESIGN-SYSTEM §1.4)
export const radius = { sm: 12, md: 20, lg: 32, full: 'half' } as const;

// Shadow (DESIGN-SYSTEM §1.5) + nz.glow riêng Neon Galaxy (DESIGN-SPEC §1.4 — phụ trợ)
export const shadow = {
  btn: { dx: 0, dy: 6, blur: 12, alpha: 0.30 },
  panel: { dx: 0, dy: 10, blur: 24, alpha: 0.35 },
  char: { dx: 0, dy: 4, blur: 8, alpha: 0.25 },
} as const;

export const glow = {
  tube: { blur: 18, alpha: 0.30, color: '#00E5FF' },
  liquid: { blur: 12, alpha: 0.55 },
  primary: { blur: 24, alpha: 0.55, color: '#B967FF' },
} as const;

// FX juice (upgrade JUICE/INTERFACE) — hệ số phụ trợ, KHÔNG thay token core.
// Chỉ mô tả cường độ hiệu ứng; màu vẫn lấy từ color.* / liquidPalette.
export const fx = {
  /** alpha ống KHÔNG thể nhận nước khi đang chọn nguồn (~30%) */
  dimInvalid: 0.30,
  /** alpha khối ghost preview (nhấp nháy min→max) */
  ghostMin: 0.55,
  ghostMax: 1.0,
  /** frost kính khi seal */
  frostAlpha: 0.13,
  /** chu kỳ shimmer chậm của ống đã seal (ms) */
  shimmerLoopMs: 2600,
  /** vòng seal giữ lại sau khi "snap shut" */
  sealRingIdleAlpha: 0.55,
} as const;

// Motion (DESIGN-SYSTEM §1.6)
export const dur = {
  fast: 120,
  base: 200,
  slow: 400,
  pop: 250,
  hover: 180,
  scene: 200,
} as const;

// Z-layering (DESIGN-SYSTEM §1.7)
export const z = {
  bg: 0,
  actor: 10,
  hud: 20,
  tutorial: 30,
  overlay: 40,
  panel: 50,
} as const;

// Helper: fontStyle từ token
export function fontStyle(token: { size: string; weight: string; lh: number }, colorStr: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: token.size,
    // AUDIT §B5-3: pass real numeric weight token (900/800/…) — trước đây bị ép 'bold'.
    fontStyle: token.weight,
    color: colorStr,
    align: 'center',
    // DESIGN-SPEC §7: HUD text luôn có viền đậm đọc trên galaxy / panel sáng.
    stroke: color.textStroke,
    strokeThickness: 3,
  } as Phaser.Types.GameObjects.Text.TextStyle;
}

// Helper: convert hex string (#RRGGBB) → number cho Graphics.fillStyle/lineStyle
export function toColor(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

// Helper: sáng hóa hex (+25% — cho đỉnh lớp chất lỏng, DESIGN-SPEC §1.3 glow lớp 1)
export function lighten(hex: string, amount = 0.25): string {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  const r = Math.min(255, Math.round(c.red + (255 - c.red) * amount));
  const g = Math.min(255, Math.round(c.green + (255 - c.green) * amount));
  const b = Math.min(255, Math.round(c.blue + (255 - c.blue) * amount));
  return Phaser.Display.Color.GetColor(r, g, b).toString(16).padStart(6, '0').replace(/^/, '#');
}

// Helper: tối hóa hex (cho đường ngăn giữa 2 lớp chất lỏng, tone tối hơn 20%)
export function darken(hex: string, amount = 0.20): string {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  const r = Math.round(c.red * (1 - amount));
  const g = Math.round(c.green * (1 - amount));
  const b = Math.round(c.blue * (1 - amount));
  return '#' + Phaser.Display.Color.GetColor(r, g, b).toString(16).padStart(6, '0');
}

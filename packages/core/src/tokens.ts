/**
 * @game/core — Design Tokens
 *
 * Single source of truth for ALL visual properties.
 * Every game imports these, never hardcodes colors/sizes/fonts.
 */

// ─── Color Palette ────────────────────────────────────────────────────
// Neon Grid theme (default). Games override specific tokens in their own theme.ts.
export const palette = {
  // Backgrounds
  bg: 0x0a0a1a,         // Deep navy-black
  bgCard: 0x1a1a3e,     // Card surface
  bgOverlay: 0x000000,  // Modal overlay

  // Primary neon
  neonCyan: 0x00f5ff,
  neonMagenta: 0xff00ff,
  neonYellow: 0xffdd00,
  neonGreen: 0x00ff88,
  neonOrange: 0xff6600,
  neonRed: 0xff2244,
  neonBlue: 0x4488ff,

  // Surfaces
  surface: 0x1e1e3f,
  surfaceLight: 0x2a2a5a,
  surfaceDark: 0x12122e,

  // Text
  textPrimary: 0xffffff,
  textSecondary: 0x8888bb,
  textMuted: 0x555577,

  // Functional
  success: 0x00ff88,
  warning: 0xffdd00,
  error: 0xff2244,
  info: 0x4488ff,
} as const;

export type ColorKey = keyof typeof palette;

// ─── Gradients ────────────────────────────────────────────────────────
// Stored as arrays of {color, alpha, stop} for Phaser Graphics.fillGradientStyle
export const gradients = {
  btnPrimary: {
    topLeft: 0x00f5ff,
    topRight: 0x00f5ff,
    bottomLeft: 0x0088cc,
    bottomRight: 0x0088cc,
  },
  btnSecondary: {
    topLeft: 0xff00ff,
    topRight: 0xff00ff,
    bottomLeft: 0xcc0088,
    bottomRight: 0xcc0088,
  },
  btnGhost: {
    topLeft: 0xffffff,
    topRight: 0xffffff,
    bottomLeft: 0xccccdd,
    bottomRight: 0xccccdd,
  },
  panel: {
    topLeft: 0x1a1a3e,
    topRight: 0x1a1a3e,
    bottomLeft: 0x12122e,
    bottomRight: 0x12122e,
  },
  blockNeonCyan: {
    topLeft: 0x00f5ff,
    topRight: 0x00f5ff,
    bottomLeft: 0x0088cc,
    bottomRight: 0x006699,
  },
  blockNeonMagenta: {
    topLeft: 0xff00ff,
    topRight: 0xff00ff,
    bottomLeft: 0xcc0088,
    bottomRight: 0x990066,
  },
  blockNeonYellow: {
    topLeft: 0xffdd00,
    topRight: 0xffdd00,
    bottomLeft: 0xcc9900,
    bottomRight: 0x997700,
  },
  blockNeonGreen: {
    topLeft: 0x00ff88,
    topRight: 0x00ff88,
    bottomLeft: 0x00cc66,
    bottomRight: 0x009944,
  },
  blockNeonOrange: {
    topLeft: 0xff6600,
    topRight: 0xff6600,
    bottomLeft: 0xcc4400,
    bottomRight: 0x993300,
  },
  blockNeonRed: {
    topLeft: 0xff2244,
    topRight: 0xff2244,
    bottomLeft: 0xcc0033,
    bottomRight: 0x990022,
  },
  blockNeonBlue: {
    topLeft: 0x4488ff,
    topRight: 0x4488ff,
    bottomLeft: 0x2266cc,
    bottomRight: 0x004499,
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────
// Font families are loaded via Google Fonts in index.html
export const fonts = {
  display: {
    family: 'Poppins',
    weight: 800,  // ExtraBold for titles
  },
  heading: {
    family: 'Poppins',
    weight: 700,  // Bold
  },
  body: {
    family: 'Poppins',
    weight: 500,  // Medium
  },
  mono: {
    family: 'JetBrains Mono',
    weight: 600,  // SemiBold for scores
  },
} as const;

// Font sizes (in px, will be scaled by Phaser)
export const fontSizes = {
  title: 48,
  heading: 32,
  body: 22,
  small: 16,
  score: 36,
  scoreSmall: 24,
  button: 26,
  badge: 14,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,  // Pill shape
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────
// Drop shadow presets (used by UI components)
export const shadows = {
  // Small shadow for buttons
  button: {
    distance: 3,
    color: 0x000000,
    blur: 6,
    alpha: 0.5,
  },
  // Medium shadow for cards/panels
  card: {
    distance: 4,
    color: 0x000000,
    blur: 12,
    alpha: 0.6,
  },
  // Large shadow for modal
  modal: {
    distance: 8,
    color: 0x000000,
    blur: 24,
    alpha: 0.7,
  },
  // Neon glow (cyan)
  glowCyan: {
    distance: 0,
    color: 0x00f5ff,
    blur: 16,
    alpha: 0.6,
  },
  // Neon glow (magenta)
  glowMagenta: {
    distance: 0,
    color: 0xff00ff,
    blur: 16,
    alpha: 0.6,
  },
} as const;

// ─── Layout ───────────────────────────────────────────────────────────
export const layout = {
  // Safe area margins (mobile)
  safeMargin: 16,
  // Standard game area (portrait 9:16)
  gameWidth: 720,
  gameHeight: 1280,
  // Grid defaults
  gridSize: 8,          // 8x8 grid
  cellSize: 72,         // px per cell
  gridPadding: 8,       // px between cells
} as const;

// ─── Animation ────────────────────────────────────────────────────────
export const animation = {
  // Duration (ms)
  fast: 150,
  normal: 300,
  slow: 500,
  // Easing presets (Phaser strings)
  easeIn: 'Power2',
  easeOut: 'Power2',
  easeInOut: 'Sine.easeInOut',
  bounce: 'Bounce.easeOut',
  // Block drop
  blockDrop: 200,
  // Row clear
  rowClear: 400,
  // Score popup
  scorePopup: 800,
} as const;
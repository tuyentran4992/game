/**
 * @game/core — GameTheme interface
 *
 * Each game defines its own theme implementing this interface.
 * UI components can read theme for colors, fonts, spacing, etc.
 * Fallback to tokens.ts if no theme provided.
 */

export interface GameTheme {
  name: string;

  colors: {
    bg: number;
    bgCard: number;
    bgOverlay: number;
    surface: number;
    surfaceLight: number;
    surfaceDark: number;
    primary: number;
    primaryDark: number;
    secondary: number;
    secondaryDark: number;
    accent: number;
    success: number;
    warning: number;
    error: number;
    textPrimary: number;
    textSecondary: number;
    textMuted: number;
  };

  fonts: {
    display: string;
    heading: string;
    body: string;
    mono: string;
  };

  fontSizes: {
    title: number;
    heading: number;
    body: number;
    small: number;
    score: number;
    button: number;
    badge: number;
  };

  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };

  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };

  shadows: {
    button: { distance: number; color: number; blur: number; alpha: number };
    card: { distance: number; color: number; blur: number; alpha: number };
    modal: { distance: number; color: number; blur: number; alpha: number };
    glow: { distance: number; color: number; blur: number; alpha: number };
  };

  gradients: {
    btnPrimary: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };
    btnSecondary: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };
    panel: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };
  };

  animation: {
    fast: number;
    normal: number;
    slow: number;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };
}
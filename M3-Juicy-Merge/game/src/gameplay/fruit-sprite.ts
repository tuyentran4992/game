// M3 Juicy Merge — fruit sprite sizes / colors / texture fallback.
// DESIGN-SPEC §6 table: 12 fruit, diameters 48→244 (tier 0=cherry .. 11=watermelon),
// tuned for the mobile-first 720×1280 portrait world (bucket 640 wide). Render-only
// concerns live here (sizes + colors + fallback texture) so Gameplay stays thin and
// the size table is a single source for both physics radius and display size.
//
// Tier convention is 0-based (0 = cherry ... 11 = watermelon).

import Phaser from 'phaser';
import { color, toColor } from '../tokens';
import { fruitKey } from '../assets';

/** Sprite diameter (world px) per tier 0..11 — DESIGN-SPEC §6 (48 → 244). */
export const FRUIT_SIZES: readonly number[] = [
  48, 64, 80, 96, 112, 128, 144, 162, 180, 200, 220, 244,
];

/** Fallback fill color per tier (DESIGN-SPEC §6) for the geometric circle. */
export const FRUIT_COLORS: readonly string[] = [
  '#D32F2F', '#FF5C8A', '#9C27B0', '#FF9800', '#C62828', '#F57C00',
  '#E53935', '#E2D24A', '#FFB6C1', '#FDD835', '#81C784', '#4CAF50',
];

/** Diameter of a fruit of {@link tier} (world px). */
export function fruitDiameter(tier: number): number {
  return FRUIT_SIZES[tier] ?? FRUIT_SIZES[0];
}

/** Physics radius of a fruit of {@link tier} = diameter / 2. */
export function fruitRadius(tier: number): number {
  return fruitDiameter(tier) / 2;
}

/** Stable texture key for the generated geometric fallback (used when the real
 *  PNG sprite is missing — Phase C step 14b swaps in real sprites). */
export function fallbackKey(tier: number): string {
  return `${fruitKey(tier)}_fallback`;
}

/**
 * Resolve a renderable texture key for {@link tier}: the real sprite if the Boot
 * loader has it, otherwise the generated geometric fallback (guaranteed to exist
 * after this call). Idempotent — safe to call every drop.
 */
export function resolveFruitTexture(scene: Phaser.Scene, tier: number): string {
  const key = fruitKey(tier);
  if (scene.textures.exists(key)) return key;
  const fb = fallbackKey(tier);
  if (!scene.textures.exists(fb)) generateFallbackTexture(scene, tier);
  return fb;
}

/**
 * Generate a geometric fallback texture for {@link tier}: a colored circle with a
 * 6px darker border (DESIGN-SPEC §6 "viền đậm đồng tông") + a small leaf, so the
 * game never shows a missing-asset box while real sprites are pending (Phase C).
 */
function generateFallbackTexture(scene: Phaser.Scene, tier: number): void {
  const size = fruitDiameter(tier);
  const r = size / 2;
  const base = FRUIT_COLORS[tier] ?? FRUIT_COLORS[0];
  const g = scene.add.graphics();
  // dark border ring (viền đậm đồng tông, 6px)
  g.fillStyle(toColor(darken(base, 0.22)), 1);
  g.fillCircle(r, r, r);
  g.fillStyle(toColor(base), 1);
  g.fillCircle(r, r, Math.max(1, r - 6));
  // small leaf accent
  g.fillStyle(toColor(color.accent), 1);
  g.fillEllipse(r, r * 0.45, r * 0.55, r * 0.85);
  g.generateTexture(fallbackKey(tier), size, size);
  g.destroy();
}

/** Darken a hex color by {@link amount} (0..1) → hex string. */
function darken(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

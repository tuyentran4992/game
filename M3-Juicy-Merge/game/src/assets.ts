// M3 Juicy Merge — asset key manifest (source of truth for the loader).
// Mirrors `games/juicy-merge.yaml` §assets. Fruit keys are derived from the
// runtime chain (config.ts) so there is a single source: `fruit_<NN>_<name>`.
// Tier convention is 0-based: index 0 = cherry ... 11 = watermelon.

import { CONFIG } from './logic/config';

/** Stable sprite key for a 0-based tier, e.g. tier 0 -> `fruit_01_cherry`. */
export function fruitKey(tier: number): string {
  const name = CONFIG.chain[tier];
  return `fruit_${String(tier + 1).padStart(2, '0')}_${name}`;
}

/** All 12 fruit sprite keys in tier order (cherry -> watermelon). */
export const FRUIT_KEYS: readonly string[] = CONFIG.chain.map((_, i) => fruitKey(i));

/** Static (non-fruit) image keys from yaml §assets. Only `bucket` and
 *  `bg_gradient` are actually generated (loaded by the Boot scene); `logo`,
 *  `ui_icons`, and `danger_line` were NOT generated (image API refused in step
 *  14) and are drawn by code fallback (text/graphics), so they are not loaded. */
export const IMAGE_KEYS = [
  'bucket',
  'bg_gradient',
  'logo',
  'ui_icons',
  'danger_line',
] as const;

/** Audio keys from yaml §assets (sfx_* + bgm). */
export const AUDIO_KEYS = [
  'sfx_drop',
  'sfx_merge',
  'sfx_merge_big',
  'sfx_danger',
  'sfx_gameover',
  'bgm_main',
] as const;

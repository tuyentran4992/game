// Fishing line: multi-segment bowed curve rod->hook (DESIGN-SPEC §3 "curve động
// theo tension"). Feel (Stage C): slack dives hang a visible sag + sideways bow,
// reeling straightens it taut, an imminent bite (telegraph prospects) makes the
// line tremble and a hooked fight sends a travelling ripple down the wire.
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { findProspects } from './telegraph.ts';

const SEGMENTS = 24;

export class LineRenderer {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(9);
  }

  update(state: GameState, rodX: number, rodY: number, timeS: number): void {
    const g = this.g;
    g.clear();
    if (state.phase === 'title') return; // the title demo owns the line until the first dive

    const tension = state.tension;
    // color by tension level (DESIGN-SPEC §1): <55 gold, 55-80 orange, >80 red
    const color = tension > 80 ? 0xe71d36 : tension > 55 ? 0xff9f1c : 0xffd166;
    const width = tension > 80 ? 3 : 2;
    // rattle when >80: deterministic jitter (no Math.random in render either)
    const shake = tension > 80 ? Math.sin(timeS * 60) * 3 : 0;

    const prospecting = findProspects(state).length > 0;

    // sag profile: hanging slack while idle/descending, medium at NIN, taut under reel
    let sagY: number; // downward droop (px, peak mid-line)
    let bowX: number; // sideways bow (px, peak mid-line) — the current pushes the wire
    if (state.hookMode === 'reel') {
      sagY = Math.max(4, 24 - tension * 0.2);
      bowX = Math.max(8, 30 - tension * 0.28) + shake;
    } else if (state.hookMode === 'hold') {
      sagY = 15 + Math.sin(timeS * 9) * 2;
      bowX = 18 + Math.sin(timeS * 7) * 2;
    } else {
      sagY = 32 + Math.sin(timeS * 1.4) * 7;
      bowX = 34 + Math.sin(timeS * 0.9) * 8;
    }

    // travelling ripple amplitude: base breath, tremble before a bite, fight on the hook
    let waveAmp = 2.5;
    if (prospecting) waveAmp += 5; // the wire hums — something is about to take the bait
    if (state.hooked.length > 0) waveAmp += Math.min(6, tension * 0.07);
    if (state.hookMode === 'reel') waveAmp = Math.max(waveAmp, Math.min(9, 3 + tension * 0.05));
    // high-frequency tremble concentrated toward the hook end while a fish closes in
    const tremble = prospecting ? Math.sin(timeS * 70) * 1.5 : 0;

    g.lineStyle(width, color, 0.95);
    g.beginPath();
    g.moveTo(rodX, rodY);
    for (let i = 1; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const u = t * (1 - t) * 4; // 0 at both ends, 1 at mid-line
      const x = rodX + (state.hookX - rodX) * t
        + bowX * u
        + Math.sin(t * 9 - timeS * 11) * waveAmp * u
        + tremble * t;
      const y = rodY + (state.hookY - rodY) * t
        + sagY * u
        + Math.sin(t * 7 + timeS * 6) * 1.5 * u;
      g.lineTo(x, y);
    }
    g.strokePath();

    // tension vignette indicator line near hook when very high
    if (tension > 95) {
      g.lineStyle(1, 0xffffff, 0.6);
      g.beginPath();
      g.moveTo(state.hookX - 10, state.hookY - 14);
      g.lineTo(state.hookX + 10, state.hookY - 14);
      g.strokePath();
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

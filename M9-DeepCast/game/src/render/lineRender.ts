// Fishing line: Graphics quad-curve rod->hook, color/rattle by tension (DESIGN-SPEC §3).
// Rope feel: sag amplitude follows the hook state (slack while idle/descending, taut
// under reel tension) and a travelling sine wave runs down the line while reeling.
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';

const SEGMENTS = 20;

export class LineRenderer {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(9);
  }

  update(state: GameState, rodX: number, rodY: number, timeS: number): void {
    const g = this.g;
    g.clear();
    const tension = state.tension;
    // color by tension level (DESIGN-SPEC §1): <55 gold, 55-80 orange, >80 red
    const color = tension > 80 ? 0xe71d36 : tension > 55 ? 0xff9f1c : 0xffd166;
    const width = tension > 80 ? 3 : 2;
    // rattle when >80: deterministic jitter (no Math.random in render either)
    const shake = tension > 80 ? Math.sin(timeS * 60) * 4 : 0;

    // sideways bow amplitude: hanging slack bows wide, reel tension straightens it
    let sag = 46 + Math.sin(timeS * 1.4) * 10; // idle/descend slack
    if (state.hookMode === 'reel') sag = Math.max(6, 40 - tension * 0.45);
    if (state.hookMode === 'hold') sag = 26 + Math.sin(timeS * 9) * 3;
    const midX = (rodX + state.hookX) / 2 + sag + shake;
    const midY = (rodY + state.hookY) / 2 + Math.sin(timeS * 2) * 6;

    // travelling wave while the line is moving (reeling in feels alive)
    const waveAmp = state.hookMode === 'reel' ? Math.min(9, 3 + tension * 0.05) : 3;

    g.lineStyle(width, color, 0.95);
    g.beginPath();
    g.moveTo(rodX, rodY);
    for (let i = 1; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      // quadratic rod->control->hook, plus a sine ripple that travels toward the rod
      const base = (1 - t) * (1 - t);
      const x = base * rodX + 2 * (1 - t) * t * midX + t * t * state.hookX
        + Math.sin(t * 9 - timeS * 11) * waveAmp * t * (1 - t) * 4;
      const y = base * rodY + 2 * (1 - t) * t * midY + t * t * state.hookY;
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

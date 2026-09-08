// Fishing line: Graphics quad-curve rod->hook, color/rattle by tension (DESIGN-SPEC §3).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';

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
    const midX = (rodX + state.hookX) / 2 + shake + tension * 0.12;
    const midY = (rodY + state.hookY) / 2 + Math.sin(timeS * 2) * 6;

    g.lineStyle(width, color, 0.95);
    g.beginPath();
    g.moveTo(rodX, rodY);
    // quadratic curve rod->hook sampled by hand (Graphics has no bezier API in Phaser 4)
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      const x = (1 - t) * (1 - t) * rodX + 2 * (1 - t) * t * midX + t * t * state.hookX;
      const y = (1 - t) * (1 - t) * rodY + 2 * (1 - t) * t * midY + t * t * state.hookY;
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

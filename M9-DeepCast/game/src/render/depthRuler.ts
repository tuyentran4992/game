// Depth ruler (Stage C goal legibility): fixed right-edge rail 0-1200m with the four
// band marks (REEF / VENTS / WRECK / TRENCH) and a live depth marker — the player
// always sees where they are and what comes next. Screen-space (scrollFactor 0).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { BANDS, SEA_BOTTOM_M, depthPxToM } from '../data/world.ts';

const RAIL_X = 467;
const TOP_Y = 64; // clears the money bar / whale icon row
const BOT_Y = 724; // clears the sonar button tap zone (y >= 732)
const PX_PER_M = (BOT_Y - TOP_Y) / SEA_BOTTOM_M;
const yForM = (m: number): number => TOP_Y + m * PX_PER_M;

export class DepthRuler {
  private markerG: Phaser.GameObjects.Graphics;
  private markerText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const rail = scene.add.graphics().setScrollFactor(0).setDepth(20);
    // dark rail with a light inner edge so it reads on every band background
    rail.lineStyle(3, 0x1b2a41, 0.85);
    rail.beginPath();
    rail.moveTo(RAIL_X, TOP_Y - 4);
    rail.lineTo(RAIL_X, BOT_Y + 4);
    rail.strokePath();
    rail.lineStyle(1, 0xffffff, 0.35);
    rail.beginPath();
    rail.moveTo(RAIL_X - 1, TOP_Y - 4);
    rail.lineTo(RAIL_X - 1, BOT_Y + 4);
    rail.strokePath();

    // band boundary ticks + meter labels (0 / 250 / 600 / 950; 1200 keeps its tick
    // line only — a label there would collide with the marker text at the rail foot)
    const bounds = [0, ...BANDS.map((b) => b.botM)];
    for (const m of bounds) {
      const y = yForM(m);
      rail.lineStyle(2, 0xffffff, 0.6);
      rail.beginPath();
      rail.moveTo(RAIL_X - 5, y);
      rail.lineTo(RAIL_X + 5, y);
      rail.strokePath();
      if (m < SEA_BOTTOM_M) {
        scene.add
          .text(RAIL_X - 8, y, `${m}`, {
            fontFamily: 'sans-serif', fontSize: '7px', color: '#cfe8ff',
            stroke: '#1B2A41', strokeThickness: 2,
          })
          .setOrigin(1, 0.5)
          .setScrollFactor(0)
          .setDepth(21);
      }
    }

    // zone labels rotated along the rail, one per band (in-game band ids)
    for (const b of BANDS) {
      scene.add
        .text(RAIL_X, yForM((b.topM + b.botM) / 2), b.id.toUpperCase(), {
          fontFamily: 'sans-serif', fontSize: '9px', color: '#9fd8ff',
          stroke: '#1B2A41', strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setRotation(-Math.PI / 2)
        .setScrollFactor(0)
        .setDepth(21);
    }

    this.markerG = scene.add.graphics().setScrollFactor(0).setDepth(22);
    this.markerText = scene.add
      .text(RAIL_X - 12, TOP_Y, '0m', {
        fontFamily: 'sans-serif', fontSize: '11px', color: '#FFE66D',
        stroke: '#1B2A41', strokeThickness: 3,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(23);
  }

  update(state: GameState): void {
    const m = Math.min(SEA_BOTTOM_M, depthPxToM(state.hookY));
    const y = yForM(m);
    this.markerG.clear();
    this.markerG.fillStyle(0xffe66d, 1);
    this.markerG.fillTriangle(RAIL_X - 2, y, RAIL_X - 10, y - 5, RAIL_X - 10, y + 5);
    this.markerText.setText(`${Math.floor(m)}m`).setPosition(RAIL_X - 12, y);
  }

  get depthLabel(): string {
    return this.markerText.text;
  }
}

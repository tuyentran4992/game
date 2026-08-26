/**
 * Neon Grid — Gameplay Scene
 *
 * Thin orchestrator: connects pure TS logic ↔ Phaser rendering.
 * NO game logic here — all logic in src/logic/.
 */

import Phaser from 'phaser';
import { Button, ScoreText, Modal, ParticleEmitter } from '@game/core/ui';
import { palette, fonts, fontSizes, spacing, layout, animation } from '@game/core/tokens';
import { sdk } from '@game/sdk';
import {
  createEmptyGrid,
  placeShape,
  clearLines,
  canPlace,
  canPlaceAny,
  getValidPositions,
  type Grid,
  type Shape,
  type Position,
} from '../logic/board';
import { pickPieces } from '../logic/shapes';
import { scorePlacement } from '../logic/scoring';
import { GridRenderer, CELL, GRID_PX } from '../render/phaser-adapter';
import { theme } from '../ui/theme';

export class GameplayScene extends Phaser.Scene {
  // State
  private grid: Grid = createEmptyGrid();
  private score = 0;
  private combo = 0;
  private pieces: Shape[] = [];
  private selectedPieceIndex: number = -1;
  private isAnimating = false;

  // Renderers
  private gridRenderer!: GridRenderer;
  private gridX = 0;
  private gridY = 0;

  // UI
  private scoreText!: ScoreText;
  private comboText!: Phaser.GameObjects.Text | null = null;
  private pieceButtons: { container: Phaser.GameObjects.Container; shape: Shape }[] = [];
  private gameOverModal: Modal | null = null;

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x12122e, 0x12122e, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Grid position (centered, with room for HUD + pieces)
    this.gridX = (this.scale.width - GRID_PX) / 2;
    this.gridY = 160;

    this.gridRenderer = new GridRenderer(this, this.gridX, this.gridY);
    this.gridRenderer.drawBackground();

    // Score
    this.scoreText = new ScoreText(this, this.scale.width / 2, 60, 0, 'SCORE: ');
    this.scoreText.setPosition(this.scale.width / 2, 60);

    // Title
    this.add.text(this.scale.width / 2, 20, 'NEON GRID', {
      fontFamily: fonts.display.family,
      fontSize: '20px',
      fontStyle: '800',
      color: '#555577',
    }).setOrigin(0.5);

    // Initialize game
    this.grid = createEmptyGrid();
    this.score = 0;
    this.combo = 0;
    this.pieces = pickPieces();
    this.selectedPieceIndex = -1;
    this.isAnimating = false;
    this.gameOverModal = null;

    this.drawPieces();
    this.renderGrid();

    // Input: tap on grid to place
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating || this.selectedPieceIndex < 0) return;
      this.handleGridTap(pointer.x, pointer.y);
    });
  }

  // ── Piece buttons ─────────────────────────────────────────────────

  private drawPieces(): void {
    // Clear old
    this.pieceButtons.forEach(pb => pb.container.destroy());
    this.pieceButtons = [];

    const startY = this.gridY + GRID_PX + 30;
    const gap = 110;
    const totalW = 3 * 100 + 2 * 10;
    const startX = (this.scale.width - totalW) / 2;

    this.pieces.forEach((shape, i) => {
      const cx = startX + i * gap;
      const container = this.add.container(cx, startY);

      // Background card
      const card = this.add.graphics();
      card.fillStyle(0x1a1a3e, 1);
      card.fillRoundedRect(-48, -40, 96, 80, 10);
      if (this.selectedPieceIndex === i) {
        card.lineStyle(2, 0x00f5ff, 0.8);
        card.strokeRoundedRect(-48, -40, 96, 80, 10);
      }
      container.add(card);

      // Draw shape preview
      this.drawShapePreview(container, shape);

      // Interactive
      const hitArea = this.add.rectangle(cx, startY, 96, 80, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        if (this.isAnimating) return;
        this.selectedPieceIndex = this.selectedPieceIndex === i ? -1 : i;
        this.renderGrid();
        this.drawPieces();
      });

      this.pieceButtons.push({ container, shape });
    });
  }

  private drawShapePreview(container: Phaser.GameObjects.Container, shape: Shape): void {
    const g = this.add.graphics();
    const color = theme.blockColors[shape.color % theme.blockColors.length];
    const previewCell = 20;
    const rows = shape.cells.length;
    const cols = shape.cells[0].length;
    const ox = -(cols * previewCell) / 2;
    const oy = -(rows * previewCell) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape.cells[r][c] === 0) continue;
        const x = ox + c * (previewCell + 2);
        const y = oy + r * (previewCell + 2);
        g.fillStyle(color.fill, 0.9);
        g.fillRoundedRect(x, y, previewCell, previewCell, 3);
        g.fillStyle(0xffffff, 0.1);
        g.fillRoundedRect(x + 1, y + 1, previewCell - 2, previewCell / 2, { tl: 2, tr: 2, bl: 0, br: 0 });
      }
    }
    container.add(g);
  }

  // ── Input handling ─────────────────────────────────────────────────

  private handleGridTap(screenX: number, screenY: number): void {
    const pos = this.gridRenderer.screenToGrid(screenX, screenY);
    if (!pos) return;

    const shape = this.pieces[this.selectedPieceIndex];
    if (!shape) return;

    if (!canPlace(this.grid, shape, pos)) return;

    this.isAnimating = true;

    // Place the shape
    this.grid = placeShape(this.grid, shape, pos);

    // Check for clears
    const result = clearLines(this.grid);
    const cleared = result.clearedRows.length + result.clearedCols.length;

    if (cleared > 0) {
      // Clear animation
      this.combo++;
      const scEvent = scorePlacement(result.clearedRows, result.clearedCols, this.combo, false);
      this.score += scEvent.pointsEarned;

      // Animate clear
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 350,
        ease: 'Power2',
        onUpdate: (tween) => {
          this.gridRenderer.clear();
          this.gridRenderer.drawBackground();
          this.gridRenderer.drawGrid(this.grid);
          this.gridRenderer.drawClearHighlight(result.clearedRows, result.clearedCols, tween.getValue());
        },
        onComplete: () => {
          this.grid = result.grid;

          // Particle burst
          for (const r of result.clearedRows) {
            const cy = this.gridY + r * (CELL + 4) + CELL / 2;
            ParticleEmitter.burst(this, this.scale.width / 2, cy, theme.clearParticleColor, 10);
          }

          this.scoreText.setValue(this.score, true);
          this.renderGrid();
          this.afterPlace();
        },
      });
    } else {
      // No clear — just render
      this.combo = 0;
      this.renderGrid();
      this.afterPlace();
    }
  }

  private afterPlace(): void {
    // Remove used piece
    this.pieces.splice(this.selectedPieceIndex, 1);
    this.selectedPieceIndex = -1;

    // Check if we need new pieces
    if (this.pieces.length === 0) {
      this.pieces = pickPieces();
    }

    // Check game over
    if (!canPlaceAny(this.grid, this.pieces)) {
      this.handleGameOver();
      return;
    }

    this.drawPieces();
    this.isAnimating = false;
  }

  // ── Game Over ──────────────────────────────────────────────────────

  private handleGameOver(): void {
    // Save score
    const savedData = JSON.parse(localStorage.getItem('game_save') || '{}');
    if (this.score > (savedData.score || 0)) {
      localStorage.setItem('game_save', JSON.stringify({ score: this.score }));
    }
    sdk.saveData({ score: this.score });

    // Show game over modal
    this.gameOverModal = new Modal(this, 'GAME OVER', [
      {
        label: '🔄  RETRY',
        variant: 'primary',
        onClick: () => this.retry(),
      },
      {
        label: '🏠  MENU',
        variant: 'ghost',
        onClick: () => this.scene.start('Start'),
      },
    ], `Score: ${this.score}`);

    this.gameOverModal.show();

    // Interstitial ad
    sdk.showInterstitial();
  }

  private retry(): void {
    this.scene.start('Gameplay');
  }

  // ── Rendering ──────────────────────────────────────────────────────

  private renderGrid(): void {
    this.gridRenderer.clear();
    this.gridRenderer.drawBackground();
    this.gridRenderer.drawGrid(this.grid);

    // Ghost preview
    if (this.selectedPieceIndex >= 0) {
      const shape = this.pieces[this.selectedPieceIndex];
      const pointer = this.input.activePointer;
      const pos = this.gridRenderer.screenToGrid(pointer.x, pointer.y);
      if (pos && canPlace(this.grid, shape, pos)) {
        this.gridRenderer.drawGhost(shape, pos, this.grid);
      }
    }
  }
}
import Phaser from 'phaser';
import { Button, ScoreText, Modal, ParticleEmitter } from '@game/core/ui';
import { neonGridTheme, getBlockColor } from '../ui/theme';
import {
  createEmptyGrid, placeShape, clearLines, canPlace, canPlaceAny, getValidPositions,
  type Grid, type Shape, type Position,
} from '../logic/board';
import { pickPieces } from '../logic/shapes';
import { scorePlacement } from '../logic/scoring';
import { GridRenderer, CELL, GRID_PX } from '../render/phaser-adapter';

export class GameplayScene extends Phaser.Scene {
  private grid: Grid = createEmptyGrid();
  private score = 0;
  private combo = 0;
  private pieces: Shape[] = [];
  private selectedPieceIndex: number = -1;
  private isAnimating = false;
  private gridRenderer!: GridRenderer;
  private gridX = 0;
  private gridY = 0;
  private scoreText!: ScoreText;
  private pieceButtons: { container: Phaser.GameObjects.Container; shape: Shape }[] = [];
  private gameOverModal: Modal | null = null;
  private theme = neonGridTheme;

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    const t = this.theme;
    const bg = this.add.graphics();
    bg.fillGradientStyle(t.colors.bg, t.colors.bg, t.colors.surfaceDark, t.colors.surfaceDark, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    this.gridX = (this.scale.width - GRID_PX) / 2;
    this.gridY = 160;

    this.gridRenderer = new GridRenderer(this, this.gridX, this.gridY, this.theme);
    this.gridRenderer.drawBackground();

    this.scoreText = new ScoreText(this, this.scale.width / 2, 60, 0, 'SCORE: ', t);
    this.scoreText.setPosition(this.scale.width / 2, 60);

    this.add.text(this.scale.width / 2, 20, 'NEON GRID', {
      fontFamily: t.fonts.display,
      fontSize: '20px',
      fontStyle: '800',
      color: '#555577',
    }).setOrigin(0.5);

    this.grid = createEmptyGrid();
    this.score = 0;
    this.combo = 0;
    this.pieces = pickPieces();
    this.selectedPieceIndex = -1;
    this.isAnimating = false;
    this.gameOverModal = null;

    this.drawPieces();
    this.renderGrid();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating || this.selectedPieceIndex < 0) return;
      this.handleGridTap(pointer.x, pointer.y);
    });
  }

  private drawPieces(): void {
    this.pieceButtons.forEach(pb => pb.container.destroy());
    this.pieceButtons = [];
    const t = this.theme;

    const startY = this.gridY + GRID_PX + 30;
    const totalW = 3 * 100 + 2 * 10;
    const startX = (this.scale.width - totalW) / 2;

    this.pieces.forEach((shape, i) => {
      const cx = startX + i * 110;
      const container = this.add.container(cx, startY);

      const card = this.add.graphics();
      card.fillStyle(t.colors.surface, 1);
      card.fillRoundedRect(-48, -40, 96, 80, t.radii.md);
      if (this.selectedPieceIndex === i) {
        card.lineStyle(2, t.colors.primary, 0.8);
        card.strokeRoundedRect(-48, -40, 96, 80, t.radii.md);
      }
      container.add(card);

      this.drawShapePreview(container, shape);

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
    const color = getBlockColor(shape.color);
    const previewCell = 20;
    const rows = shape.cells.length;
    const cols = shape.cells[0].length;
    const ox = -(cols * previewCell) / 2;
    const oy = -(rows * previewCell) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape.cells[r][c] === 0) continue;
        g.fillStyle(color.fill, 0.9);
        g.fillRoundedRect(ox + c * 22, oy + r * 22, previewCell, previewCell, 3);
        g.fillStyle(0xffffff, 0.1);
        g.fillRoundedRect(ox + c * 22 + 1, oy + r * 22 + 1, previewCell - 2, previewCell / 2, { tl: 2, tr: 2, bl: 0, br: 0 });
      }
    }
    container.add(g);
  }

  private handleGridTap(screenX: number, screenY: number): void {
    const pos = this.gridRenderer.screenToGrid(screenX, screenY);
    if (!pos) return;

    const shape = this.pieces[this.selectedPieceIndex];
    if (!shape) return;
    if (!canPlace(this.grid, shape, pos)) return;

    this.isAnimating = true;
    this.grid = placeShape(this.grid, shape, pos);

    const result = clearLines(this.grid);
    const cleared = result.clearedRows.length + result.clearedCols.length;

    if (cleared > 0) {
      this.combo++;
      const scEvent = scorePlacement(result.clearedRows, result.clearedCols, this.combo, false);
      this.score += scEvent.pointsEarned;

      this.tweens.addCounter({
        from: 0, to: 1, duration: 350, ease: 'Power2',
        onUpdate: (tween) => {
          this.gridRenderer.clear();
          this.gridRenderer.drawBackground();
          this.gridRenderer.drawGrid(this.grid);
          this.gridRenderer.drawClearHighlight(result.clearedRows, result.clearedCols, tween.getValue());
        },
        onComplete: () => {
          this.grid = result.grid;
          for (const r of result.clearedRows) {
            ParticleEmitter.burst(this, this.scale.width / 2, this.gridY + r * (CELL + 4) + CELL / 2, this.theme.colors.primary, 10);
          }
          this.scoreText.setValue(this.score, true);
          this.renderGrid();
          this.afterPlace();
        },
      });
    } else {
      this.combo = 0;
      this.renderGrid();
      this.afterPlace();
    }
  }

  private afterPlace(): void {
    this.pieces.splice(this.selectedPieceIndex, 1);
    this.selectedPieceIndex = -1;

    if (this.pieces.length === 0) {
      this.pieces = pickPieces();
    }

    if (!canPlaceAny(this.grid, this.pieces)) {
      this.handleGameOver();
      return;
    }

    this.drawPieces();
    this.isAnimating = false;
  }

  private handleGameOver(): void {
    const saved = JSON.parse(localStorage.getItem('game_save') || '{}');
    if (this.score > (saved.score || 0)) {
      localStorage.setItem('game_save', JSON.stringify({ score: this.score }));
    }

    this.gameOverModal = new Modal(this, 'GAME OVER', {
      theme: this.theme,
      actions: [
        { label: '🔄  RETRY', variant: 'primary', onClick: () => this.scene.start('Gameplay') },
        { label: '🏠  MENU', variant: 'ghost', onClick: () => this.scene.start('Start') },
      ],
      subtext: `Score: ${this.score}`,
    });
    this.gameOverModal.show();
  }

  private renderGrid(): void {
    this.gridRenderer.clear();
    this.gridRenderer.drawBackground();
    this.gridRenderer.drawGrid(this.grid);

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
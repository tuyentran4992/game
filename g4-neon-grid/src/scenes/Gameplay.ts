/**
 * Neon Grid — Gameplay Scene (v2 with Meta Progression & Power-ups)
 */

import Phaser from 'phaser';
import { ParticleEmitter } from '@game/core/ui';
import { fonts } from '@game/core/tokens';
import { sdk } from '@game/sdk';
import {
  createEmptyGrid,
  placeShape,
  clearLines,
  canPlace,
  canPlaceAny,
  type Grid,
  type Shape,
  type Position,
  GRID_SIZE,
} from '../logic/board';
import { pickPieces, getAllShapes } from '../logic/shapes';
import { scorePlacement } from '../logic/scoring';
import { GridRenderer, CELL, PAD, GRID_PX } from '../render/phaser-adapter';
import { soundFx } from '../audio/audio-synth';
import { getActiveSkinPalette, theme } from '../ui/theme';
import { saveManager } from '../logic/save-manager';
import { createDailyChallenge, getDailyGoalLines } from '../logic/daily';
import { createMulberry32 } from '../logic/prng';
import { PowerUpManager } from '../logic/powerups';
import { evaluateAchievements, type RunSummary } from '../logic/achievements';
import { getSkinById } from '../logic/skins';
import type { DailyChallengeState, Achievement } from '../logic/types';

interface PieceSlot {
  slotX: number;
  slotY: number;
  container: Phaser.GameObjects.Container;
  cardGraphic: Phaser.GameObjects.Graphics;
  shapeGraphic: Phaser.GameObjects.Graphics;
  shape: Shape | null;
  index: number;
}

interface MoveHistory {
  grid: Grid;
  score: number;
  combo: number;
  pieces: (Shape | null)[];
}

export class GameplayScene extends Phaser.Scene {
  // Game Mode
  private isDailyMode: boolean = false;
  private dailyChallenge!: DailyChallengeState;
  private dailyRng?: () => number;

  // Game State
  private grid: Grid = createEmptyGrid();
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private totalLinesCleared = 0;
  private maxLinesInSingleMove = 0;
  private hadAllClear = false;
  private pieces: (Shape | null)[] = [];
  private isAnimating = false;
  private isGameOver = false;

  // Power-ups & Modes
  private powerUps = new PowerUpManager();
  private moveHistory: MoveHistory[] = [];
  private isBombMode: boolean = false;

  // Interaction State
  private selectedPieceIndex: number = -1;
  private isDragging: boolean = false;
  private dragPieceIndex: number = -1;
  private dragContainer: Phaser.GameObjects.Container | null = null;
  private dragGhostPos: Position | null = null;
  private touchOffsetY: number = -100;

  // Renderers & Coordinates
  private gridRenderer!: GridRenderer;
  private gridX = 0;
  private gridY = 0;

  // UI Elements
  private scoreTextObj!: Phaser.GameObjects.Text;
  private bestScoreTextObj!: Phaser.GameObjects.Text;
  private comboBadgeContainer!: Phaser.GameObjects.Container;
  private comboBadgeText!: Phaser.GameObjects.Text;
  private muteBtnText!: Phaser.GameObjects.Text;
  private pieceSlots: PieceSlot[] = [];

  // Toolbar & Daily HUD
  private undoBtnText!: Phaser.GameObjects.Text;
  private dailyProgressContainer?: Phaser.GameObjects.Container;
  private dailyProgressBar?: Phaser.GameObjects.Graphics;
  private dailyProgressText?: Phaser.GameObjects.Text;
  private bombModeIndicator?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Gameplay' });
  }

  init(data?: { isDaily?: boolean }): void {
    this.isDailyMode = !!data?.isDaily;
  }

  create(): void {
    this.isGameOver = false;
    this.isAnimating = false;
    this.isDragging = false;
    this.isBombMode = false;
    this.selectedPieceIndex = -1;
    this.dragPieceIndex = -1;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalLinesCleared = 0;
    this.maxLinesInSingleMove = 0;
    this.hadAllClear = false;
    this.score = 0;
    this.moveHistory = [];
    this.powerUps.resetForNewGame();

    const palette = getActiveSkinPalette();

    // 0. Setup Daily Mode if active
    if (this.isDailyMode) {
      this.dailyChallenge = createDailyChallenge(new Date(), saveManager.getData().daily);
      this.dailyRng = createMulberry32(this.dailyChallenge.seed);
    } else {
      this.dailyRng = undefined;
    }

    // Load Best Score
    this.bestScore = saveManager.getBestScore();

    // 1. Background Scene
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x040410, 0x040410, palette.gridBg, palette.gridBg, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    this.createAmbientDust();

    // Subtle background cyber grid lines
    const gridDeco = this.add.graphics();
    gridDeco.lineStyle(1, palette.gridColor, 0.04);
    for (let y = 0; y < this.scale.height; y += 60) {
      gridDeco.lineBetween(0, y, this.scale.width, y);
    }
    for (let x = 0; x < this.scale.width; x += 60) {
      gridDeco.lineBetween(x, 0, x, this.scale.height);
    }

    // 2. Setup Board Position
    this.gridX = Math.floor((this.scale.width - GRID_PX) / 2);
    this.gridY = 175;

    // Grid Ambient Backlight Glow
    const boardGlow = this.add.graphics();
    boardGlow.fillStyle(palette.gridColor, 0.04);
    boardGlow.fillCircle(this.scale.width / 2, this.gridY + GRID_PX / 2, GRID_PX * 0.7);

    this.gridRenderer = new GridRenderer(this, this.gridX, this.gridY);

    // 3. Create Top HUD Bar
    this.createTopHUD();

    // 4. Initialize Game Board & Pieces
    this.grid = createEmptyGrid();
    const rawPieces = pickPieces(this.dailyRng);
    this.pieces = [...rawPieces];

    this.createPieceTray(true);
    this.createPowerUpsToolbar();

    if (this.isDailyMode) {
      this.createDailyProgressHUD();
    }

    this.renderGrid();

    // 5. Global Input Listeners
    this.setupInputListeners();
  }

  // ── TOP HUD BAR ──────────────────────────────────────────────────

  private createTopHUD(): void {
    const cx = this.scale.width / 2;
    const palette = getActiveSkinPalette();

    // Glassmorphism HUD Backplate
    const hud = this.add.graphics();
    hud.fillStyle(palette.hudBg, 0.92);
    hud.fillRoundedRect(20, 15, this.scale.width - 40, 140, 18);
    hud.lineStyle(1.5, palette.hudBorder, 0.8);
    hud.strokeRoundedRect(20, 15, this.scale.width - 40, 140, 18);

    // Title Accent
    const modeTitle = this.isDailyMode ? '📅 DAILY CHALLENGE' : `⚡ ${palette.name.toUpperCase()} ⚡`;
    this.add.text(cx, 32, modeTitle, {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: `#${palette.scoreColor.toString(16).padStart(6, '0')}`,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Left: Current Score
    const scoreBoxX = cx - 140;
    this.add.text(scoreBoxX, 56, 'SCORE', {
      fontFamily: fonts.body.family,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#8888bb',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.scoreTextObj = this.add.text(scoreBoxX, 90, '0', {
      fontFamily: fonts.mono.family,
      fontSize: '34px',
      fontStyle: 'bold',
      color: `#${palette.scoreColor.toString(16).padStart(6, '0')}`,
      stroke: '#040410',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Right: Best Score / Target
    const bestBoxX = cx + 140;
    const bestLabel = this.isDailyMode ? '🎯 GOAL' : '🏆 BEST';
    const bestVal = this.isDailyMode ? `${this.dailyChallenge.goalLines} lines` : this.bestScore.toLocaleString();

    this.add.text(bestBoxX, 56, bestLabel, {
      fontFamily: fonts.body.family,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffd000',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.bestScoreTextObj = this.add.text(bestBoxX, 90, bestVal, {
      fontFamily: fonts.mono.family,
      fontSize: this.isDailyMode ? '26px' : '30px',
      fontStyle: 'bold',
      color: '#ffd000',
    }).setOrigin(0.5);

    // Center Combo Streak Badge
    this.comboBadgeContainer = this.add.container(cx, 125);
    const comboBg = this.add.graphics();
    comboBg.fillStyle(0xff3300, 0.25);
    comboBg.fillRoundedRect(-85, -14, 170, 28, 14);
    comboBg.lineStyle(1.5, 0xff6600, 0.8);
    comboBg.strokeRoundedRect(-85, -14, 170, 28, 14);
    this.comboBadgeContainer.add(comboBg);

    this.comboBadgeText = this.add.text(0, 0, '🔥 STREAK x1', {
      fontFamily: fonts.mono.family,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffaa00',
    }).setOrigin(0.5);
    this.comboBadgeContainer.add(this.comboBadgeText);
    this.comboBadgeContainer.setVisible(false);

    // Action Buttons (Sound & Pause)
    this.createHUDButtons();
  }

  private createHUDButtons(): void {
    // Sound Button
    const muteContainer = this.add.container(this.scale.width - 60, 52);
    const muteBg = this.add.graphics();
    muteBg.fillStyle(0x202044, 0.9);
    muteBg.fillRoundedRect(-22, -22, 44, 44, 12);
    muteBg.lineStyle(1.5, 0x404075, 0.9);
    muteBg.strokeRoundedRect(-22, -22, 44, 44, 12);
    muteContainer.add(muteBg);

    this.muteBtnText = this.add.text(0, 0, soundFx.isMuted ? '🔇' : '🔊', {
      fontSize: '20px',
    }).setOrigin(0.5);
    muteContainer.add(this.muteBtnText);

    const muteHit = this.add.rectangle(0, 0, 56, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    muteContainer.add(muteHit);

    muteHit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event?.stopPropagation?.();
      const muted = soundFx.toggleMute();
      this.muteBtnText.setText(muted ? '🔇' : '🔊');
      if (!muted) soundFx.playButtonClick();

      this.tweens.add({
        targets: muteContainer,
        scale: 0.88,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeInOut',
      });
    });

    // Pause Button
    const pauseContainer = this.add.container(60, 52);
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x202044, 0.9);
    pauseBg.fillRoundedRect(-22, -22, 44, 44, 12);
    pauseBg.lineStyle(1.5, 0x404075, 0.9);
    pauseBg.strokeRoundedRect(-22, -22, 44, 44, 12);
    pauseContainer.add(pauseBg);

    const pauseIcon = this.add.text(0, 0, '⏸', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    pauseContainer.add(pauseIcon);

    const pauseHit = this.add.rectangle(0, 0, 56, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    pauseContainer.add(pauseHit);

    pauseHit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event?.stopPropagation?.();
      soundFx.playButtonClick();

      this.tweens.add({
        targets: pauseContainer,
        scale: 0.88,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          this.showPauseModal();
        },
      });
    });
  }

  // ── POWER-UPS TOOLBAR ─────────────────────────────────────────────

  private createPowerUpsToolbar(): void {
    const cx = this.scale.width / 2;
    const trayY = this.gridY + GRID_PX + 25;
    const toolbarY = trayY + 175 + 35;

    const btnW = 146;
    const btnH = 48;
    const gap = 14;
    const startX = cx - (3 * btnW + 2 * gap) / 2 + btnW / 2;

    // Helper to build power-up button
    const buildBtn = (x: number, label: string, color: number, onClick: () => void) => {
      const cont = this.add.container(x, toolbarY);
      const bg = this.add.graphics();
      this.drawPowerUpButtonBg(bg, btnW, btnH, color);
      cont.add(bg);

      const txt = this.add.text(0, 0, label, {
        fontFamily: fonts.mono.family,
        fontSize: '14px',
        fontStyle: 'bold',
        color: `#${color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      cont.add(txt);

      const hit = this.add.rectangle(0, 0, btnW + 4, btnH + 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      cont.add(hit);

      hit.on('pointerover', () => {
        if (!this.isAnimating && !this.isGameOver) {
          this.tweens.add({ targets: cont, scale: 1.05, duration: 80, ease: 'Power2' });
        }
      });

      hit.on('pointerout', () => {
        this.tweens.add({ targets: cont, scale: 1.0, duration: 80, ease: 'Power2' });
      });

      hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event?.stopPropagation?.();
        this.tweens.add({
          targets: cont,
          scale: 0.90,
          duration: 60,
          yoyo: true,
          ease: 'Quad.easeInOut',
          onComplete: onClick,
        });
      });

      return { cont, txt };
    };

    // 1. Undo Button
    const undo = buildBtn(startX, `↺ Undo (${this.powerUps.undoRemaining})`, 0x00f5ff, () => this.handleUndo());
    this.undoBtnText = undo.txt;

    // 2. Shuffle Button
    buildBtn(startX + btnW + gap, '🔀 Shuffle 🎬', 0xffd000, () => this.handleShuffle());

    // 3. Bomb Button
    buildBtn(startX + 2 * (btnW + gap), '💣 Bomb 🎬', 0xff2255, () => this.handleBombToggle());

    // Bomb Targeting Mode Banner (Hidden)
    this.bombModeIndicator = this.add.container(cx, this.gridY - 24);
    const bombBanner = this.add.graphics();
    bombBanner.fillStyle(0xff2244, 0.3);
    bombBanner.fillRoundedRect(-160, -14, 320, 28, 14);
    bombBanner.lineStyle(1.5, 0xff2244, 0.9);
    bombBanner.strokeRoundedRect(-160, -14, 320, 28, 14);
    this.bombModeIndicator.add(bombBanner);

    const bombBannerText = this.add.text(0, 0, '💣 TAP ANY CELL TO DESTROY', {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.bombModeIndicator.add(bombBannerText);
    this.bombModeIndicator.setVisible(false);
  }

  private drawPowerUpButtonBg(g: Phaser.GameObjects.Graphics, w: number, h: number, color: number): void {
    g.fillStyle(0x151532, 0.9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(1.5, color, 0.7);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  }

  private handleUndo(): void {
    if (this.isAnimating || this.isGameOver) return;

    if (this.moveHistory.length === 0) {
      soundFx.playSnapback();
      return;
    }

    if (this.powerUps.canUseUndo()) {
      this.powerUps.useUndo();
      this.executeUndo();
    } else {
      // Rewarded Ad
      soundFx.playButtonClick();
      sdk.showRewarded().then((ok) => {
        if (ok) {
          this.executeUndo();
        }
      });
    }
  }

  private executeUndo(): void {
    const last = this.moveHistory.pop();
    if (!last) return;

    soundFx.playPickup();
    this.grid = last.grid.map(row => [...row]);
    this.score = last.score;
    this.combo = last.combo;
    this.pieces = last.pieces.map(p => (p ? { cells: p.cells.map(r => [...r]), color: p.color } : null));

    this.scoreTextObj.setText(this.score.toLocaleString());
    this.undoBtnText.setText(`↺ Undo (${this.powerUps.undoRemaining})`);
    saveManager.recordPowerUpUsage('undo');

    this.renderGrid();
    this.createPieceTray(false);
    ParticleEmitter.flash(this, 0x00f5ff, 100);
  }

  private handleShuffle(): void {
    if (this.isAnimating || this.isGameOver) return;
    soundFx.playButtonClick();

    sdk.showRewarded().then((ok) => {
      if (ok) {
        soundFx.playSpawn();
        saveManager.recordPowerUpUsage('shuffle');
        const newPieces = pickPieces(this.dailyRng);
        this.pieces = [...newPieces];
        this.createPieceTray(true);
        ParticleEmitter.flash(this, 0xffd000, 120);
      }
    });
  }

  private handleBombToggle(): void {
    if (this.isAnimating || this.isGameOver) return;
    soundFx.playButtonClick();

    if (this.isBombMode) {
      this.isBombMode = false;
      this.bombModeIndicator?.setVisible(false);
      return;
    }

    sdk.showRewarded().then((ok) => {
      if (ok) {
        this.isBombMode = true;
        this.bombModeIndicator?.setVisible(true);
        soundFx.playPickup();
      }
    });
  }

  private executeBomb(row: number, col: number): void {
    if (this.grid[row][col] === null) return;

    this.isBombMode = false;
    this.bombModeIndicator?.setVisible(false);

    // Explode cell
    this.grid[row][col] = null;
    soundFx.playDrop();
    saveManager.recordPowerUpUsage('bomb');

    const pos = this.gridRenderer.gridToPixel(row, col);
    ParticleEmitter.burst(this, pos.x, pos.y, 0xff2244, 25);
    ParticleEmitter.flash(this, 0xff2244, 100);
    this.cameras.main.shake(150, 0.01);

    this.renderGrid();
    this.checkNextTurn();
  }

  // ── DAILY PROGRESS HUD ────────────────────────────────────────────

  private createDailyProgressHUD(): void {
    const cx = this.scale.width / 2;
    const progressY = this.scale.height - 75;

    this.dailyProgressContainer = this.add.container(cx, progressY);

    const bg = this.add.graphics();
    bg.fillStyle(0x101026, 0.85);
    bg.fillRoundedRect(-180, -22, 360, 44, 12);
    bg.lineStyle(1.5, 0x00f5ff, 0.5);
    bg.strokeRoundedRect(-180, -22, 360, 44, 12);
    this.dailyProgressContainer.add(bg);

    this.dailyProgressBar = this.add.graphics();
    this.dailyProgressContainer.add(this.dailyProgressBar);

    this.dailyProgressText = this.add.text(0, 0, `Daily Target: 0/${this.dailyChallenge.goalLines} lines`, {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#00f5ff',
    }).setOrigin(0.5);
    this.dailyProgressContainer.add(this.dailyProgressText);

    this.updateDailyProgressHUD();
  }

  private updateDailyProgressHUD(): void {
    if (!this.dailyProgressText || !this.dailyProgressBar) return;

    const goal = this.dailyChallenge.goalLines;
    const cur = Math.min(goal, this.totalLinesCleared);

    this.dailyProgressText.setText(`Daily Target: ${cur}/${goal} lines`);

    this.dailyProgressBar.clear();
    const ratio = cur / goal;
    const barW = 340 * ratio;
    this.dailyProgressBar.fillStyle(0x00f5ff, 0.35);
    this.dailyProgressBar.fillRoundedRect(-170, -15, barW, 30, 8);

    if (cur >= goal && !this.dailyChallenge.completed) {
      this.dailyChallenge.completed = true;
      saveManager.markDailyComplete();
      this.showDailyCompleteModal();
    }
  }

  // ── PIECE TRAY & SPAWNING ──────────────────────────────────────────

  private createPieceTray(playSpawnAnim: boolean = true): void {
    this.pieceSlots.forEach(slot => slot.container.destroy());
    this.pieceSlots = [];

    const trayY = this.gridY + GRID_PX + 25;
    const slotW = 190;
    const slotH = 175;
    const gap = 20;
    const totalW = 3 * slotW + 2 * gap;
    const startX = (this.scale.width - totalW) / 2 + slotW / 2;

    if (playSpawnAnim) {
      soundFx.playSpawn();
    }

    for (let i = 0; i < 3; i++) {
      const slotX = startX + i * (slotW + gap);
      const slotCenterY = trayY + slotH / 2;

      const container = this.add.container(slotX, slotCenterY);
      const cardGraphic = this.add.graphics();
      const shapeGraphic = this.add.graphics();

      container.add(cardGraphic);
      container.add(shapeGraphic);

      const slot: PieceSlot = {
        slotX,
        slotY: slotCenterY,
        container,
        cardGraphic,
        shapeGraphic,
        shape: this.pieces[i] || null,
        index: i,
      };

      this.pieceSlots.push(slot);
      this.renderSlot(slot);

      if (playSpawnAnim && slot.shape) {
        container.setScale(0);
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 260,
          delay: i * 60,
          ease: 'Back.easeOut',
        });
      }

      // Hit area
      const hitArea = this.add.rectangle(0, 0, slotW, slotH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isAnimating || this.isGameOver || !slot.shape || this.isBombMode) return;
        this.startDrag(slot, pointer);
      });
    }
  }

  private renderSlot(slot: PieceSlot): void {
    const { cardGraphic, shapeGraphic, shape, index } = slot;
    cardGraphic.clear();
    shapeGraphic.clear();

    const w = 190;
    const h = 175;
    const isSelected = this.selectedPieceIndex === index;
    const palette = getActiveSkinPalette();

    // Slot Card Backplate
    cardGraphic.fillStyle(palette.gridBg, 0.85);
    cardGraphic.fillRoundedRect(-w / 2, -h / 2, w, h, 14);

    if (isSelected) {
      cardGraphic.lineStyle(2.5, palette.scoreColor, 0.9);
      cardGraphic.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else {
      cardGraphic.lineStyle(1.5, palette.hudBorder, 0.7);
      cardGraphic.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    }

    if (!shape) return;

    // Draw Thumbnail Preview
    const previewCell = 28;
    const previewPad = 3;
    const rows = shape.cells.length;
    const cols = shape.cells[0].length;
    const shapeW = cols * previewCell + (cols - 1) * previewPad;
    const shapeH = rows * previewCell + (rows - 1) * previewPad;
    const ox = -shapeW / 2;
    const oy = -shapeH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape.cells[r][c] === 0) continue;
        const x = ox + c * (previewCell + previewPad);
        const y = oy + r * (previewCell + previewPad);
        GridRenderer.drawSingleBlock(shapeGraphic, x, y, previewCell, shape.color, 1.0, 5);
      }
    }
  }

  // ── DRAG & DROP INTERACTION ────────────────────────────────────────

  private startDrag(slot: PieceSlot, pointer: Phaser.Input.Pointer): void {
    if (!slot.shape) return;

    this.isDragging = true;
    this.dragPieceIndex = slot.index;
    this.selectedPieceIndex = slot.index;

    soundFx.playPickup();

    slot.shapeGraphic.setAlpha(0.2);

    this.dragContainer = this.add.container(pointer.x, pointer.y + this.touchOffsetY);
    this.dragContainer.setDepth(200);

    const shape = slot.shape;
    const g = this.add.graphics();
    const rows = shape.cells.length;
    const cols = shape.cells[0].length;
    const shapeW = cols * CELL + (cols - 1) * PAD;
    const shapeH = rows * CELL + (rows - 1) * PAD;
    const ox = -shapeW / 2;
    const oy = -shapeH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape.cells[r][c] === 0) continue;
        const x = ox + c * (CELL + PAD);
        const y = oy + r * (CELL + PAD);
        GridRenderer.drawSingleBlock(g, x, y, CELL, shape.color, 0.95, 8);
      }
    }

    this.dragContainer.add(g);
    this.dragContainer.setScale(0.7);

    this.tweens.add({
      targets: this.dragContainer,
      scale: 1.0,
      duration: 120,
      ease: 'Back.easeOut',
    });

    this.updateGhostPreview(pointer.x, pointer.y + this.touchOffsetY);
  }

  private setupInputListeners(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragContainer || this.dragPieceIndex < 0) return;

      const targetX = pointer.x;
      const targetY = pointer.y + this.touchOffsetY;
      this.dragContainer.setPosition(targetX, targetY);

      this.updateGhostPreview(targetX, targetY);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.dragPieceIndex >= 0) {
        const targetX = pointer.x;
        const targetY = pointer.y + this.touchOffsetY;
        this.handleDrop(targetX, targetY);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating || this.isGameOver || this.isDragging) return;

      // Handle Bomb click
      if (this.isBombMode) {
        const pos = this.gridRenderer.screenToGrid(pointer.x, pointer.y);
        if (pos) {
          this.executeBomb(pos.row, pos.col);
        }
        return;
      }

      // Board Tap-to-Place
      if (this.selectedPieceIndex >= 0) {
        const pos = this.gridRenderer.screenToGrid(pointer.x, pointer.y);
        if (pos) {
          this.executePlacement(this.selectedPieceIndex, pos);
        }
      }
    });
  }

  private updateGhostPreview(screenX: number, screenY: number): void {
    if (this.dragPieceIndex < 0) return;
    const shape = this.pieces[this.dragPieceIndex];
    if (!shape) return;

    const rows = shape.cells.length;
    const cols = shape.cells[0].length;
    const shapeW = cols * CELL + (cols - 1) * PAD;
    const shapeH = rows * CELL + (rows - 1) * PAD;

    const topLeftX = screenX - shapeW / 2 + CELL / 2;
    const topLeftY = screenY - shapeH / 2 + CELL / 2;

    const pos = this.gridRenderer.screenToGrid(topLeftX, topLeftY);

    this.renderGrid();

    if (pos && canPlace(this.grid, shape, pos)) {
      this.dragGhostPos = pos;
      this.gridRenderer.drawGhost(shape, pos, this.grid, true);
    } else {
      this.dragGhostPos = null;
    }
  }

  private handleDrop(screenX: number, screenY: number): void {
    const slotIndex = this.dragPieceIndex;
    const slot = this.pieceSlots[slotIndex];
    const shape = this.pieces[slotIndex];

    if (shape && this.dragGhostPos && canPlace(this.grid, shape, this.dragGhostPos)) {
      const finalPos = this.dragGhostPos;
      if (this.dragContainer) {
        this.dragContainer.destroy();
        this.dragContainer = null;
      }
      this.isDragging = false;
      this.dragPieceIndex = -1;
      this.dragGhostPos = null;

      this.executePlacement(slotIndex, finalPos);
    } else {
      soundFx.playSnapback();
      this.dragGhostPos = null;

      if (this.dragContainer && slot) {
        this.tweens.add({
          targets: this.dragContainer,
          x: slot.slotX,
          y: slot.slotY,
          scale: 0.6,
          duration: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (this.dragContainer) {
              this.dragContainer.destroy();
              this.dragContainer = null;
            }
            if (slot.shapeGraphic) {
              slot.shapeGraphic.setAlpha(1.0);
            }
            this.isDragging = false;
            this.dragPieceIndex = -1;
            this.renderGrid();
          },
        });
      } else {
        if (slot && slot.shapeGraphic) {
          slot.shapeGraphic.setAlpha(1.0);
        }
        this.isDragging = false;
        this.dragPieceIndex = -1;
        this.renderGrid();
      }
    }
  }

  // ── PLACEMENT & LINE CLEAR LOGIC ───────────────────────────────────

  private executePlacement(pieceIdx: number, pos: Position): void {
    const shape = this.pieces[pieceIdx];
    if (!shape || !canPlace(this.grid, shape, pos)) return;

    // Save history for Undo
    this.moveHistory.push({
      grid: this.grid.map(row => [...row]),
      score: this.score,
      combo: this.combo,
      pieces: this.pieces.map(p => (p ? { cells: p.cells.map(r => [...r]), color: p.color } : null)),
    });

    this.isAnimating = true;
    soundFx.playDrop();

    // Track shape stat
    const allShapes = getAllShapes();
    const shapeMatchIdx = allShapes.findIndex(def =>
      def.cells.length === shape.cells.length &&
      def.cells[0].length === shape.cells[0].length &&
      def.cells.every((r, ri) => r.every((c, ci) => c === shape.cells[ri][ci]))
    );
    if (shapeMatchIdx >= 0) {
      saveManager.recordShapeUsage(shapeMatchIdx);
    }

    // 1. Mutate grid
    this.grid = placeShape(this.grid, shape, pos);

    // 2. Consume piece
    this.pieces[pieceIdx] = null;
    this.selectedPieceIndex = -1;
    if (this.pieceSlots[pieceIdx]) {
      this.pieceSlots[pieceIdx].shape = null;
      this.renderSlot(this.pieceSlots[pieceIdx]);
    }

    // 3. Check for line clears
    const result = clearLines(this.grid);
    const clearedLines = result.clearedRows.length + result.clearedCols.length;

    if (clearedLines > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.totalLinesCleared += clearedLines;
      if (clearedLines > this.maxLinesInSingleMove) this.maxLinesInSingleMove = clearedLines;

      const isAllClear = result.grid.every(row => row.every(cell => cell === null));
      if (isAllClear) this.hadAllClear = true;

      const scEvent = scorePlacement(result.clearedRows, result.clearedCols, this.combo, isAllClear);
      this.updateScore(scEvent.pointsEarned);

      soundFx.playClear(clearedLines, this.combo);
      if (this.combo >= 2 || clearedLines >= 3) {
        soundFx.playComboFanfare();
      }

      if (clearedLines >= 2 || this.combo >= 2 || isAllClear) {
        ParticleEmitter.flash(this, 0x00f5ff, 90);
      }
      const shakeIntensity = Math.min(0.018, 0.006 + clearedLines * 0.003 + this.combo * 0.0025);
      this.cameras.main.shake(200, shakeIntensity);

      this.spawnFloatingPopup(result.clearedRows, result.clearedCols, scEvent.pointsEarned, clearedLines, this.combo, isAllClear);
      this.updateComboHUD();

      if (this.isDailyMode) {
        this.updateDailyProgressHUD();
      }

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 360,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          this.gridRenderer.clear();
          this.gridRenderer.drawBackground();
          this.gridRenderer.drawGrid(this.grid);
          this.gridRenderer.drawClearHighlight(result.clearedRows, result.clearedCols, tween.getValue() ?? 0);
        },
        onComplete: () => {
          this.grid = result.grid;

          for (const r of result.clearedRows) {
            const py = this.gridY + r * (CELL + PAD) + CELL / 2;
            ParticleEmitter.burst(this, this.scale.width / 2, py, theme.clearParticleColor, 18);
            ParticleEmitter.burst(this, this.scale.width / 2 - 120, py, 0xffffff, 10);
            ParticleEmitter.burst(this, this.scale.width / 2 + 120, py, 0xffffff, 10);
          }
          for (const c of result.clearedCols) {
            const px = this.gridX + c * (CELL + PAD) + CELL / 2;
            ParticleEmitter.burst(this, px, this.gridY + GRID_PX / 2, 0xff00ff, 18);
            ParticleEmitter.burst(this, px, this.gridY + GRID_PX / 2 - 120, 0xffffff, 10);
            ParticleEmitter.burst(this, px, this.gridY + GRID_PX / 2 + 120, 0xffffff, 10);
          }

          this.renderGrid();
          this.checkNextTurn();
        },
      });
    } else {
      this.combo = 0;
      this.updateComboHUD();
      this.renderGrid();
      this.checkNextTurn();
    }
  }

  private updateComboHUD(): void {
    if (this.combo > 1) {
      this.comboBadgeContainer.setVisible(true);
      this.comboBadgeText.setText(`🔥 STREAK x${this.combo}`);
      this.tweens.add({
        targets: this.comboBadgeContainer,
        scale: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    } else {
      this.comboBadgeContainer.setVisible(false);
    }
  }

  private updateScore(addedPoints: number): void {
    const oldScore = this.score;
    this.score += addedPoints;

    this.tweens.addCounter({
      from: oldScore,
      to: this.score,
      duration: 300,
      onUpdate: (tween) => {
        const val = Math.round(tween.getValue() ?? 0);
        this.scoreTextObj.setText(val.toLocaleString());
      },
    });

    this.tweens.add({
      targets: this.scoreTextObj,
      scale: 1.25,
      duration: 90,
      yoyo: true,
      ease: 'Power2',
    });

    if (!this.isDailyMode && this.score > this.bestScore) {
      this.bestScore = this.score;
      this.bestScoreTextObj.setText(this.bestScore.toLocaleString());
      saveManager.setBestScore(this.bestScore);
    }
  }

  private spawnFloatingPopup(
    rows: number[],
    cols: number[],
    points: number,
    lines: number,
    combo: number,
    isAllClear: boolean
  ): void {
    let text = `+${points}`;
    let color = '#00f5ff';

    if (isAllClear) {
      text = `🌟 ALL CLEAR! +${points} 🌟`;
      color = '#ffd000';
    } else if (lines >= 4) {
      text = `⚡ MEGA CLEAR! +${points} ⚡`;
      color = '#ff00ff';
    } else if (lines === 3) {
      text = `🔥 TRIPLE! +${points}`;
      color = '#ff6600';
    } else if (lines === 2) {
      text = `✨ DOUBLE! +${points}`;
      color = '#00ff88';
    } else if (combo > 1) {
      text = `🔥 COMBO x${combo}! +${points}`;
      color = '#ffdd00';
    }

    const cx = this.scale.width / 2;
    const cy = this.gridY + GRID_PX / 2 - 20;

    const popup = this.add.text(cx, cy, text, {
      fontFamily: fonts.display.family,
      fontSize: lines >= 3 || combo >= 3 ? '32px' : '26px',
      fontStyle: '800',
      color: color,
      stroke: '#080816',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: popup,
      y: cy - 70,
      scale: { from: 0.6, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private checkNextTurn(): void {
    const remaining = this.pieces.filter(p => p !== null) as Shape[];
    if (remaining.length === 0) {
      const newPieces = pickPieces(this.dailyRng);
      this.pieces = [...newPieces];
      this.createPieceTray(true);
    } else {
      this.pieceSlots.forEach((slot, i) => {
        slot.shape = this.pieces[i];
        this.renderSlot(slot);
      });
    }

    const activePieces = this.pieces.filter(p => p !== null) as Shape[];
    if (!canPlaceAny(this.grid, activePieces)) {
      this.handleGameOver();
      return;
    }

    this.isAnimating = false;
  }

  // ── PAUSE MODAL ───────────────────────────────────────────────────

  private showPauseModal(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.container(0, 0).setDepth(400);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.add(bg);

    const modalContent = this.add.container(0, 0);
    overlay.add(modalContent);

    const card = this.add.graphics();
    card.fillStyle(0x121228, 0.96);
    card.fillRoundedRect(cx - 200, cy - 180, 400, 360, 20);
    card.lineStyle(2, theme.scoreColor, 0.7);
    card.strokeRoundedRect(cx - 200, cy - 180, 400, 360, 20);
    modalContent.add(card);

    const title = this.add.text(cx, cy - 120, 'GAME PAUSED', {
      fontFamily: fonts.display.family,
      fontSize: '32px',
      fontStyle: '800',
      color: '#ffffff',
    }).setOrigin(0.5);
    modalContent.add(title);

    const resumeBtn = this.createModalButton(cx, cy - 30, '▶  RESUME', '#00f5ff', () => {
      soundFx.playButtonClick();
      overlay.destroy();
    });
    modalContent.add(resumeBtn);

    const restartBtn = this.createModalButton(cx, cy + 45, '🔄  RESTART', '#ffd000', () => {
      soundFx.playButtonClick();
      overlay.destroy();
      this.scene.restart({ isDaily: this.isDailyMode });
    });
    modalContent.add(restartBtn);

    const menuBtn = this.createModalButton(cx, cy + 120, '🏠  MAIN MENU', '#ff2255', () => {
      soundFx.playButtonClick();
      overlay.destroy();
      this.scene.start('Start');
    });
    modalContent.add(menuBtn);

    modalContent.setScale(0.85);
    modalContent.setAlpha(0);
    this.tweens.add({
      targets: modalContent,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  // ── DAILY COMPLETE MODAL ──────────────────────────────────────────

  private showDailyCompleteModal(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const rewardSkin = getSkinById(this.dailyChallenge.rewardSkinId);

    saveManager.unlockSkin(rewardSkin.id);
    soundFx.playComboFanfare();

    const overlay = this.add.container(0, 0).setDepth(500);

    const bg = this.add.graphics();
    bg.fillStyle(0x04040e, 0.88);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.add(bg);

    const modalContent = this.add.container(0, 0);
    overlay.add(modalContent);

    const card = this.add.graphics();
    card.fillStyle(0x12122c, 0.98);
    card.fillRoundedRect(cx - 220, cy - 200, 440, 400, 24);
    card.lineStyle(2, 0xffd000, 0.9);
    card.strokeRoundedRect(cx - 220, cy - 200, 440, 400, 24);
    modalContent.add(card);

    const title = this.add.text(cx, cy - 140, '📅 DAILY COMPLETE! 🌟', {
      fontFamily: fonts.display.family,
      fontSize: '26px',
      fontStyle: '800',
      color: '#ffd000',
    }).setOrigin(0.5);
    modalContent.add(title);

    const desc = this.add.text(cx, cy - 80, `Cleared ${this.dailyChallenge.goalLines} lines target!`, {
      fontFamily: fonts.body.family,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    modalContent.add(desc);

    const rewardLabel = this.add.text(cx, cy - 20, `Reward: 🎨 ${rewardSkin.name} Skin!`, {
      fontFamily: fonts.mono.family,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#00ff88',
    }).setOrigin(0.5);
    modalContent.add(rewardLabel);

    const claimBtn = this.createModalButton(cx, cy + 90, '🎁  CLAIM & CONTINUE', '#00f5ff', () => {
      soundFx.playButtonClick();
      overlay.destroy();
    });
    modalContent.add(claimBtn);

    ParticleEmitter.burst(this, cx, cy - 140, 0xffd000, 30);
    ParticleEmitter.burst(this, cx, cy - 140, 0x00f5ff, 30);
  }

  // ── GAME OVER & ACHIEVEMENTS ──────────────────────────────────────

  private handleGameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isAnimating = true;

    soundFx.playGameOver();

    // Record stats
    saveManager.recordGameStats(this.totalLinesCleared, this.score, this.maxCombo);

    // Evaluate Achievements
    const runSummary: RunSummary = {
      score: this.score,
      maxCombo: this.maxCombo,
      maxLinesInSingleMove: this.maxLinesInSingleMove,
      hadAllClear: this.hadAllClear,
      totalLinesThisGame: this.totalLinesCleared,
      isDailyCompleted: this.isDailyMode && this.dailyChallenge.completed,
      usedAll3Pieces: true,
    };

    const newUnlocks = evaluateAchievements(
      saveManager.getData().stats,
      runSummary,
      saveManager.getData().achievements,
      saveManager.getData().daily.completed ? 1 : 0
    );

    newUnlocks.forEach(ach => {
      saveManager.unlockAchievement(ach.id);
      if (ach.rewardSkinId !== null) {
        saveManager.unlockSkin(ach.rewardSkinId);
      }
    });

    const isNewHigh = !this.isDailyMode && (this.score >= this.bestScore && this.score > 0);

    this.time.delayedCall(400, () => {
      this.showGameOverModal(isNewHigh, newUnlocks);
      sdk.showInterstitial();
    });
  }

  private showGameOverModal(isNewHigh: boolean, newUnlocks: Achievement[]): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.container(0, 0).setDepth(500);

    const bg = this.add.graphics();
    bg.fillStyle(0x04040e, 0.88);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.add(bg);

    const modalContent = this.add.container(0, 0);
    overlay.add(modalContent);

    const cardH = newUnlocks.length > 0 ? 540 : 480;
    const card = this.add.graphics();
    card.fillStyle(0x12122c, 0.98);
    card.fillRoundedRect(cx - 240, cy - cardH / 2, 480, cardH, 24);
    card.lineStyle(2, isNewHigh ? 0xffd000 : 0x00f5ff, 0.85);
    card.strokeRoundedRect(cx - 240, cy - cardH / 2, 480, cardH, 24);
    modalContent.add(card);

    const titleText = isNewHigh ? '🏆 NEW RECORD! 🏆' : 'GAME OVER';
    const titleColor = isNewHigh ? '#ffd000' : '#ff2255';

    const title = this.add.text(cx, cy - cardH / 2 + 50, titleText, {
      fontFamily: fonts.display.family,
      fontSize: '32px',
      fontStyle: '800',
      color: titleColor,
    }).setOrigin(0.5);
    modalContent.add(title);

    // Score
    const scoreVal = this.add.text(cx, cy - cardH / 2 + 130, this.score.toLocaleString(), {
      fontFamily: fonts.mono.family,
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    modalContent.add(scoreVal);

    // Sub-stats (Best, Lines, Streak)
    const statsBox = this.add.graphics();
    statsBox.fillStyle(0x18183a, 0.9);
    statsBox.fillRoundedRect(cx - 200, cy - cardH / 2 + 175, 400, 70, 12);
    modalContent.add(statsBox);

    const statText1 = this.add.text(cx - 130, cy - cardH / 2 + 210, `BEST\n${this.bestScore.toLocaleString()}`, {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      align: 'center',
      color: '#ffd000',
    }).setOrigin(0.5);
    modalContent.add(statText1);

    const statText2 = this.add.text(cx, cy - cardH / 2 + 210, `LINES\n${this.totalLinesCleared}`, {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      align: 'center',
      color: '#00f5ff',
    }).setOrigin(0.5);
    modalContent.add(statText2);

    const statText3 = this.add.text(cx + 130, cy - cardH / 2 + 210, `MAX STREAK\nx${this.maxCombo}`, {
      fontFamily: fonts.mono.family,
      fontSize: '13px',
      align: 'center',
      color: '#ff6600',
    }).setOrigin(0.5);
    modalContent.add(statText3);

    // Achievement Unlock Notice if any
    let offsetAction = cy - cardH / 2 + 280;
    if (newUnlocks.length > 0) {
      const achBadge = this.add.text(cx, offsetAction, `🏆 UNLOCKED: ${newUnlocks.map(u => u.name).join(', ')}!`, {
        fontFamily: fonts.mono.family,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#00ff88',
      }).setOrigin(0.5);
      modalContent.add(achBadge);
      offsetAction += 40;
    }

    // Play Again Button
    const retryBtn = this.createModalButton(cx, offsetAction + 25, '🔄  PLAY AGAIN', '#00f5ff', () => {
      soundFx.playButtonClick();
      overlay.destroy();
      this.scene.restart({ isDaily: this.isDailyMode });
    });
    modalContent.add(retryBtn);

    // Menu Button
    const menuBtn = this.createModalButton(cx, offsetAction + 90, '🏠  MAIN MENU', '#8888bb', () => {
      soundFx.playButtonClick();
      overlay.destroy();
      this.scene.start('Start');
    });
    modalContent.add(menuBtn);

    modalContent.setScale(0.85);
    modalContent.setAlpha(0);
    this.tweens.add({
      targets: modalContent,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });

    if (isNewHigh || newUnlocks.length > 0) {
      ParticleEmitter.burst(this, cx, cy - 180, 0xffd000, 25);
      ParticleEmitter.burst(this, cx, cy - 180, 0x00f5ff, 25);
    }
  }

  private createModalButton(x: number, y: number, text: string, colorHex: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = 340;
    const h = 52;

    const bg = this.add.graphics();
    const c = Phaser.Display.Color.HexStringToColor(colorHex).color;
    bg.fillStyle(c, 0.15);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(1.5, c, 0.8);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    container.add(bg);

    const label = this.add.text(0, 0, text, {
      fontFamily: fonts.display.family,
      fontSize: '19px',
      fontStyle: 'bold',
      color: colorHex,
    }).setOrigin(0.5);
    container.add(label);

    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.94,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: callback,
      });
    });
    return container;
  }

  private createAmbientDust(): void {
    const dustColors = [0x00f5ff, 0xff00ff, 0xffd000, 0x00ff88];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const radius = 1.5 + Math.random() * 2.5;
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      const dot = this.add.circle(x, y, radius, color, 0.15 + Math.random() * 0.3);
      dot.setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: dot,
        y: y - 35 - Math.random() * 50,
        x: x + (Math.random() - 0.5) * 25,
        alpha: { from: dot.alpha, to: 0.05 },
        duration: 2600 + Math.random() * 2800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }
  }

  // ── GRID RENDERING ────────────────────────────────────────────────

  private renderGrid(): void {
    this.gridRenderer.clear();
    this.gridRenderer.drawBackground();
    this.gridRenderer.drawGrid(this.grid);

    if (this.selectedPieceIndex >= 0 && !this.isDragging) {
      const shape = this.pieces[this.selectedPieceIndex];
      if (shape) {
        const pointer = this.input.activePointer;
        const pos = this.gridRenderer.screenToGrid(pointer.x, pointer.y);
        if (pos && canPlace(this.grid, shape, pos)) {
          this.gridRenderer.drawGhost(shape, pos, this.grid, true);
        }
      }
    }
  }
}
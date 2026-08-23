import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, glow, fontStyle, toColor, liquidPalette } from '../tokens';
import {
  drawGalaxyBg,
  drawTube,
  renderLiquid,
  renderPourTransition,
  drawButton,
  drawHudCapsule,
  drawPourStream,
  drawHintArc,
  synthAudio,
  TubeViews,
  GalaxyBgObjects,
} from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';
import {
  createBoard,
  doMove,
  undoMove,
  restartBoard,
  addExtraTube,
  hintMove,
  isLegal,
  isClean,
  BoardState,
  Move,
} from '../logic/color-sort';

interface TubeUI {
  views: TubeViews;
  index: number;
}

export class GameplayScene extends Phaser.Scene {
  private board!: BoardState;
  private tubeUIs: TubeUI[] = [];
  private selected: number | null = null;
  private levelLabel!: Phaser.GameObjects.Text;
  private moveLabel!: Phaser.GameObjects.Text;
  private audioBtnText!: Phaser.GameObjects.Text;
  private bgObjects!: GalaxyBgObjects;
  private stuckTooltip: Phaser.GameObjects.Container | null = null;
  private isAnimating = false;
  private toolbarBtns: Phaser.GameObjects.Container[] = [];
  private origTubePositions: { x: number; y: number }[] = [];
  private pourStreamG!: Phaser.GameObjects.Graphics;
  private hintArcG!: Phaser.GameObjects.Graphics;
  private hintArcTimer: Phaser.Time.TimerEvent | null = null;
  private boardZone: Phaser.GameObjects.Zone | null = null;
  private completedTubes = new Set<number>();

  constructor() {
    super({ key: 'GameplayScene' });
  }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    const level = Math.max(1, ctx.currentLevel);
    this.board = createBoard(MECHANICS, level, level * 7919 + 13);
    this.selected = null;
    this.isAnimating = false;
    this.completedTubes.clear();

    // 1. Nền vũ trụ Deep Space HD (Static, 0 overhead)
    this.bgObjects = drawGalaxyBg(this);

    // 2. Graphics layer
    this.pourStreamG = this.add.graphics().setDepth(z.actor + 3);
    this.hintArcG = this.add.graphics().setDepth(z.actor + 5);

    // 3. HUD
    this.drawHud(width, height);

    // 4. Bố cục ống nghiệm
    this.layoutBoard(width, height);

    // 5. Toolbar dưới cùng
    this.drawToolbar(width, height);

    // 6. Tutorial banner nếu mới
    if (!ctx.tutorialSeen) this.showTutorial(width, height);

    this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
    this.scale.on('resize', (g: Phaser.Structs.Size) => this.onResize(g));

    if (this.cache.audio.exists('bgm_main')) {
      this.sound.play('bgm_main', { loop: true, volume: 0.3 });
    }
  }

  // ==========================================================================
  // HUD (TOP BAR)
  // ==========================================================================
  private drawHud(width: number, _height: number) {
    const topY = sp[4] + 28;

    // 1. LEVEL BADGE
    const levelW = 120, levelH = 46;
    const levelX = sp[4] + levelW / 2 + 8;
    drawHudCapsule(this, levelX, topY, levelW, levelH, color.primary);

    this.levelLabel = this.add.text(
      levelX,
      topY,
      `Lv ${this.board.level}`,
      fontStyle(type.score, color.accent),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.levelLabel.setShadow(0, 2, 'rgba(0,0,0,0.6)', 4, false, true);
    this.levelLabel.setData('testid', 'level-label');

    // 2. MOVES COUNTER
    const moveW = 130, moveH = 46;
    const moveX = levelX + levelW / 2 + moveW / 2 + 12;
    drawHudCapsule(this, moveX, topY, moveW, moveH, color.primaryDark);

    this.moveLabel = this.add.text(
      moveX,
      topY,
      `⤵ ${this.board.moveCount}`,
      fontStyle(type.score, color.surface),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.moveLabel.setShadow(0, 2, 'rgba(0,0,0,0.6)', 4, false, true);
    this.moveLabel.setData('testid', 'move-count');

    // 3. AUDIO TOGGLE
    const audioW = 54, audioH = 46;
    const audioX = width - sp[4] - audioW / 2 - 8;
    const audioCapsule = drawHudCapsule(this, audioX, topY, audioW, audioH, color.accent);

    this.audioBtnText = this.add.text(
      audioX,
      topY,
      this.sound.mute ? '🔇' : '🔊',
      fontStyle(type.h2, color.surface),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.audioBtnText.setData('testid', 'audio-toggle');

    const audioZone = this.add.zone(audioX, topY, audioW, audioH).setDepth(z.hud + 2).setInteractive({ useHandCursor: true });
    audioZone.on('pointerdown', () => {
      this.sound.mute = !this.sound.mute;
      synthAudio.setMute(this.sound.mute);
      this.audioBtnText.setText(this.sound.mute ? '🔇' : '🔊');
      synthAudio.playClick();
      this.tweens.add({
        targets: [this.audioBtnText, audioCapsule],
        scale: 0.9,
        duration: dur.fast,
        yoyo: true,
        ease: 'quad.out',
      });
    });
  }

  // ==========================================================================
  // BOARD LAYOUT
  // ==========================================================================
  private layoutBoard(width: number, height: number) {
    for (const t of this.tubeUIs) t.views.container.destroy();
    this.tubeUIs = [];
    this.origTubePositions = [];

    const tubeCount = this.board.tubes.length;
    const capacity = this.board.capacity;

    let cols: number;
    if (width >= 1500) cols = Math.min(7, Math.ceil(tubeCount / 2));
    else if (width >= 900) cols = Math.ceil(tubeCount / 2);
    else cols = Math.min(5, Math.ceil(tubeCount / 2));
    cols = Math.max(1, cols);
    const rows = Math.ceil(tubeCount / cols);

    const boardAreaH = height * 0.58;
    const maxTubeH = Math.min(230, (boardAreaH - sp[5] * (rows + 1)) / rows);
    const tubeH = Math.max(120, maxTubeH);
    const tubeW = Math.max(46, Math.min(90, tubeH * 0.42));
    const gapX = Math.max(12, Math.min(28, (width - cols * tubeW) / (cols + 1)));
    const gapY = Math.max(16, sp[5]);

    const boardW = cols * tubeW + (cols - 1) * gapX;
    const boardH = rows * tubeH + (rows - 1) * gapY;
    const startX = (width - boardW) / 2 + tubeW / 2;
    const startY = height * 0.48 - boardH / 2 + tubeH / 2;

    for (let i = 0; i < tubeCount; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = startX + c * (tubeW + gapX);
      const y = startY + r * (tubeH + gapY);

      this.origTubePositions.push({ x, y });

      const views = drawTube(this, tubeW, tubeH, capacity);
      views.container.setPosition(x, y);
      views.container.setData('testid', `tube-${i}`);
      views.container.setData('tubeIndex', i);

      renderLiquid(views, this.board.tubes[i]);

      views.container.setSize(Math.max(48, tubeW), Math.max(48, tubeH));
      views.container.setInteractive({ useHandCursor: true });
      views.container.on('pointerdown', () => this.onTubeTap(i));

      this.tubeUIs.push({ views, index: i });
    }

    if (!this.boardZone) {
      this.boardZone = this.add.zone(width / 2, height * 0.5, width, height).setDepth(z.bg).setInteractive();
      this.boardZone.setData('testid', 'board');
    }
  }

  // ==========================================================================
  // TUBE SELECTION
  // ==========================================================================
  private clearHint() {
    this.hintArcG.clear();
    if (this.hintArcTimer) {
      this.hintArcTimer.remove();
      this.hintArcTimer = null;
    }
  }

  private onTubeTap(i: number) {
    if (this.isAnimating || this.board.win) return;
    this.clearHint();

    if (this.selected === null) {
      if (this.board.tubes[i].length === 0) {
        this.shakeTube(i);
        synthAudio.playBuzz();
        return;
      }
      this.selected = i;
      synthAudio.playClick();
      this.updateSelection();
      return;
    }

    if (i === this.selected) {
      this.selected = null;
      synthAudio.playClick();
      this.updateSelection();
      return;
    }

    const from = this.selected;
    this.selected = null;
    this.updateSelection();
    this.attemptPour(from, i);
  }

  private updateSelection() {
    for (const t of this.tubeUIs) {
      const isSel = (t.index === this.selected);
      const orig = this.origTubePositions[t.index];

      this.tweens.killTweensOf(t.views.container);

      if (isSel) {
        this.children.bringToTop(t.views.container);
        this.tweens.add({
          targets: t.views.container,
          y: orig.y - 20,
          scale: 1.05,
          duration: 120,
          ease: 'cubic.out',
        });
        t.views.glowRing.setAlpha(0.85);
      } else {
        t.views.glowRing.setAlpha(0);
        this.tweens.add({
          targets: t.views.container,
          x: orig.x,
          y: orig.y,
          angle: 0,
          scale: 1.0,
          duration: 120,
          ease: 'cubic.out',
        });
      }
    }
  }

  // ==========================================================================
  // 60 FPS ULTRA SMOOTH POURING ANIMATION PIPELINE
  // ==========================================================================
  private attemptPour(from: number, to: number) {
    const isMoveLegal = isLegal(this.board.tubes, from, to, this.board.capacity);

    if (!isMoveLegal) {
      this.shakeTube(from);
      synthAudio.playBuzz();
      this.playSfx('sfx_error', 0.4);
      this.selected = from;
      this.updateSelection();
      return;
    }

    // Trạng thái mảng màu trước khi đổ
    const srcBefore = this.board.tubes[from].slice();
    const dstBefore = this.board.tubes[to].slice();
    const pourColorHex = srcBefore[srcBefore.length - 1];

    const move = doMove(this.board, from, to);
    if (!move) return;

    this.isAnimating = true;

    // Cập nhật Move counter
    this.moveLabel.setText(`⤵ ${this.board.moveCount}`);

    const srcUI = this.tubeUIs[from];
    const dstUI = this.tubeUIs[to];
    const origSrc = this.origTubePositions[from];
    const origDst = this.origTubePositions[to];

    const isPouringRight = origDst.x >= origSrc.x;
    const targetAngle = isPouringRight ? 55 : -55;
    const pourTargetX = origDst.x + (isPouringRight ? -srcUI.views.width * 0.68 : srcUI.views.width * 0.68);
    const pourTargetY = origDst.y - dstUI.views.height * 0.6;

    this.children.bringToTop(srcUI.views.container);

    // BƯỚC 1: Bay và nghiêng ống siêu mượt (140ms)
    this.tweens.add({
      targets: srcUI.views.container,
      x: pourTargetX,
      y: pourTargetY,
      angle: targetAngle,
      duration: 140,
      ease: 'cubic.out',
      onComplete: () => {
        // BƯỚC 2: Rót nước tức thời (180ms)
        this.runFastPour(from, to, srcBefore, dstBefore, pourColorHex, move.count, () => {
          // BƯỚC 3: Thu ống về vị trí gốc (140ms)
          this.tweens.add({
            targets: srcUI.views.container,
            x: origSrc.x,
            y: origSrc.y,
            angle: 0,
            duration: 140,
            ease: 'cubic.out',
            onComplete: () => {
              this.isAnimating = false;
              this.checkTubeCompletionCelebration(to);

              if (this.board.win) {
                this.time.delayedCall(300, () => this.onLevelClear());
              } else if (this.board.stuck) {
                this.showStuckTooltip();
              }
            },
          });
        });
      },
    });
  }

  // Rót nước O(1) hiệu năng cao
  private runFastPour(
    from: number,
    to: number,
    srcBefore: string[],
    dstBefore: string[],
    colorHex: string,
    count: number,
    onComplete: () => void,
  ) {
    const srcUI = this.tubeUIs[from];
    const dstUI = this.tubeUIs[to];
    const isPouringRight = dstUI.views.container.x >= srcUI.views.container.x;

    const startX = srcUI.views.container.x + (isPouringRight ? srcUI.views.width * 0.35 : -srcUI.views.width * 0.35);
    const startY = srcUI.views.container.y + srcUI.views.height * 0.12;
    const endX = dstUI.views.container.x;
    const endY = dstUI.views.container.y - dstUI.views.height * 0.44;

    synthAudio.playGlug(1);
    this.playSfx('sfx_pour', 0.35);

    // Mảng nền tĩnh của nguồn (sau khi đã bớt đi lớp đổ)
    const srcBase = srcBefore.slice(0, srcBefore.length - count);
    const dstBase = dstBefore.slice();

    const animData = { t: 0 };
    this.tweens.add({
      targets: animData,
      t: 1.0,
      duration: 180,
      ease: 'linear',
      onUpdate: () => {
        const progress = animData.t;

        // Vẽ dòng nước
        drawPourStream(this.pourStreamG, startX, startY, endX, endY, colorHex, 5);

        // Render nguồn rút dần
        renderPourTransition(srcUI.views, srcBase, colorHex, (1 - progress), true);

        // Render đích dâng dần
        renderPourTransition(dstUI.views, dstBase, colorHex, progress, false);
      },
      onComplete: () => {
        this.pourStreamG.clear();

        // Vẽ tĩnh chuẩn xác kết quả
        renderLiquid(srcUI.views, this.board.tubes[from]);
        renderLiquid(dstUI.views, this.board.tubes[to]);

        // Ripple nhẹ tại đích
        this.spawnSurfaceRipple(dstUI, colorHex);

        onComplete();
      },
    });
  }

  private spawnSurfaceRipple(dstUI: TubeUI, colorHex: string) {
    const { width: tubeW, height: tubeH, container } = dstUI.views;
    const currentLen = this.board.tubes[dstUI.index].length;
    const layerH = (tubeH - 8) / this.board.capacity;
    const surfaceY = tubeH / 2 - 4 - currentLen * layerH;

    const rip = this.add.ellipse(
      container.x,
      container.y + surfaceY,
      tubeW * 0.8,
      6,
      toColor(colorHex),
      0.8,
    ).setDepth(z.actor + 4);

    this.tweens.add({
      targets: rip,
      scaleX: 1.25,
      alpha: 0,
      duration: 200,
      ease: 'quad.out',
      onComplete: () => rip.destroy(),
    });
  }

  // ==========================================================================
  // TUBE COMPLETED FANFARE
  // ==========================================================================
  private checkTubeCompletionCelebration(tubeIndex: number) {
    const tube = this.board.tubes[tubeIndex];
    if (tube.length === this.board.capacity && isClean(tube)) {
      if (!this.completedTubes.has(tubeIndex)) {
        this.completedTubes.add(tubeIndex);
        this.celebrateCompletedTube(tubeIndex);
      }
    }
  }

  private celebrateCompletedTube(tubeIndex: number) {
    const ui = this.tubeUIs[tubeIndex];
    if (!ui) return;

    synthAudio.playTubeComplete();
    const { width: tubeW, height: tubeH, completionFx } = ui.views;
    completionFx.removeAll(true);

    const cap = this.add.graphics();
    cap.fillStyle(toColor(color.primary), 0.9);
    cap.fillRoundedRect(-tubeW * 0.35, -tubeH / 2 - 6, tubeW * 0.7, 7, 3);
    cap.lineStyle(1.5, toColor('#FFFFFF'), 0.8);
    cap.strokeRoundedRect(-tubeW * 0.35, -tubeH / 2 - 6, tubeW * 0.7, 7, 3);
    cap.setScale(0);
    completionFx.add(cap);

    this.tweens.add({
      targets: cap,
      scale: 1,
      duration: 250,
      ease: 'back.out',
    });
  }

  private shakeTube(i: number) {
    const ui = this.tubeUIs[i];
    if (!ui) return;
    const ox = this.origTubePositions[i].x;
    this.tweens.add({
      targets: ui.views.container,
      x: ox + 5,
      duration: 40,
      yoyo: true,
      repeat: 3,
      ease: 'quad.inout',
      onComplete: () => {
        ui.views.container.x = ox;
      },
    });
  }

  // ==========================================================================
  // TOOLBAR
  // ==========================================================================
  private drawToolbar(width: number, height: number) {
    for (const b of this.toolbarBtns) b.destroy();
    this.toolbarBtns = [];

    const y = height - sp[5] - 36;
    const margin = sp[4];
    const availW = Math.max(0, width - margin * 2);

    const idealBtnW = 86;
    const idealGapX = sp[5];
    const minBtnW = 48;
    const minGapX = sp[2];

    let btnW: number = idealBtnW;
    let gapX: number = idealGapX;
    let total = 3 * btnW + 2 * gapX;

    if (total > availW) {
      gapX = minGapX;
      total = 3 * btnW + 2 * gapX;
      if (total > availW) {
        btnW = Math.max(minBtnW, Math.floor((availW - 2 * minGapX) / 3));
        gapX = Math.max(minGapX, Math.floor((availW - 3 * btnW) / 2));
      }
    }
    total = 3 * btnW + 2 * gapX;
    const startX = (width - total) / 2 + btnW / 2;

    const defs = [
      { testid: 'undo-btn', text: '↺', action: () => this.onUndo(), icon: 'undo' as const },
      { testid: 'restart-btn', text: '⟳', action: () => this.onRestart(), icon: 'restart' as const },
      { testid: 'hint-btn', text: '💡', action: () => this.onHint(), icon: 'hint' as const },
    ];

    defs.forEach((d, i) => {
      const x = startX + i * (btnW + gapX);
      const btn = drawButton(this, x, y, d.text, {
        variant: 'ghost',
        width: btnW,
        height: 62,
        textType: type.h2,
        testid: d.testid,
        icon: d.icon,
      });

      btn.container.on('pointerdown', (
        _p: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        d.action();
      });

      this.toolbarBtns.push(btn.container);
    });
  }

  // ==========================================================================
  // CONTROLLER ACTIONS
  // ==========================================================================
  private onUndo() {
    if (this.isAnimating) return;
    this.clearHint();
    const undone = undoMove(this.board);
    if (!undone) {
      synthAudio.playBuzz();
      this.playSfx('sfx_error', 0.3);
      return;
    }
    this.moveLabel.setText(`⤵ ${this.board.moveCount}`);
    for (const t of this.tubeUIs) {
      renderLiquid(t.views, this.board.tubes[t.index]);
    }
    synthAudio.playGlug(1);
    this.playSfx('sfx_pour', 0.3);
    this.selected = null;
    this.updateSelection();
  }

  private onRestart() {
    if (this.isAnimating) return;
    this.clearHint();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, () => {
      this.board = restartBoard(MECHANICS, this.board);
      this.selected = null;
      this.completedTubes.clear();
      this.moveLabel.setText(`⤵ 0`);
      for (const t of this.tubeUIs) {
        renderLiquid(t.views, this.board.tubes[t.index]);
      }
      this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
      synthAudio.playClick();
      this.playSfx('sfx_click', 0.3);
    });
  }

  private async onHint() {
    if (this.isAnimating || this.board.win) return;
    this.clearHint();

    const earned = await sdk.requestRewardedAd('hint');
    if (!earned) return;

    const hint = hintMove(this.board);
    if (!hint) {
      this.showStuckTooltip('No moves left! Use ↺ Undo or ⟳ Restart 💡');
      return;
    }

    const srcPos = this.origTubePositions[hint.from];
    const dstPos = this.origTubePositions[hint.to];
    const srcUI = this.tubeUIs[hint.from];
    const dstUI = this.tubeUIs[hint.to];

    synthAudio.playHint();

    // 1. Lift source tube
    this.selected = hint.from;
    this.updateSelection();

    // 2. Pulse destination tube
    dstUI.views.glowRing.setAlpha(0.85);
    this.tweens.add({
      targets: dstUI.views.glowRing,
      alpha: 0,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });

    // 3. Draw energy hint arc
    const startX = srcPos.x;
    const startY = srcPos.y - srcUI.views.height * 0.45;
    const endX = dstPos.x;
    const endY = dstPos.y - dstUI.views.height * 0.45;

    drawHintArc(this.hintArcG, startX, startY, endX, endY, 1.0);

    this.hintArcTimer = this.time.delayedCall(3000, () => {
      this.clearHint();
    });
  }

  public async requestExtraTube(): Promise<boolean> {
    if (this.board.extraTubeUsed >= MECHANICS.reward.extraTube.maxExtra) return false;
    const earned = await sdk.requestRewardedAd('extra_tube');
    if (!earned) return false;

    addExtraTube(this.board);
    this.layoutBoard(this.scale.width, this.scale.height);
    const last = this.tubeUIs[this.tubeUIs.length - 1];
    last.views.container.setScale(0);
    this.tweens.add({ targets: last.views.container, scale: 1, duration: dur.pop, ease: 'back.out' });
    synthAudio.playTubeComplete();
    return true;
  }

  private showStuckTooltip(msg = 'No moves left! Use ↺ Undo or ⟳ Restart 💡') {
    if (this.stuckTooltip) return;
    const { width, height } = this.scale;
    const y = height - sp[5] - 92;

    const t = this.add.text(0, 0, msg, fontStyle(type.small, color.warning))
      .setOrigin(0.5);
    t.setShadow(0, 2, color.shadow, 3, false, true);

    const w = t.width + sp[4] * 2, h = t.height + sp[3];
    const g = this.add.graphics().setDepth(z.tutorial);
    g.fillStyle(toColor('#120D2C'), 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);
    g.lineStyle(1.5, toColor(color.warning), 0.8);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.md);

    this.stuckTooltip = this.add.container(width / 2, y, [g, t]).setDepth(z.tutorial).setAlpha(0);
    this.tweens.add({
      targets: this.stuckTooltip,
      alpha: 1,
      duration: dur.base,
      ease: 'quad.out',
      onComplete: () => this.time.delayedCall(3000, () => {
        if (this.stuckTooltip) {
          this.tweens.add({
            targets: this.stuckTooltip,
            alpha: 0,
            duration: dur.base,
            onComplete: () => {
              this.stuckTooltip?.destroy();
              this.stuckTooltip = null;
            },
          });
        }
      }),
    });
    synthAudio.playBuzz();
  }

  private showTutorial(width: number, height: number) {
    const t = this.add.text(width / 2, height * 0.36, 'Tap a tube to pour liquid ✨', fontStyle(type.body, color.surface))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    t.setShadow(0, 2, color.shadow, 4, false, true);
    this.tweens.add({
      targets: t,
      alpha: 1,
      duration: dur.base,
      onComplete: () => this.time.delayedCall(3000, () => {
        this.tweens.add({ targets: t, alpha: 0, duration: dur.base, onComplete: () => t.destroy() });
      }),
    });
    ctx.tutorialSeen = true;
    void ctx.save();
  }

  private onLevelClear() {
    this.clearHint();
    synthAudio.playLevelClear();
    this.playSfx('sfx_clear', 0.5);
    ctx.onLevelClear(this.board.level, this.board.moveCount);
    void ctx.save();
    this.scene.start('LevelClearScene', {
      level: this.board.level,
      moves: this.board.moveCount,
      optimal: this.board.optimalMoves,
      best: ctx.getBestMovesForLevel(this.board.level),
    });
  }

  private playSfx(key: string, volume = 0.35) {
    if (this.sound.mute) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private onResize(g: Phaser.Structs.Size) {
    this.clearHint();
    this.bgObjects.g.destroy();
    if (this.bgObjects.bgImage) this.bgObjects.bgImage.destroy();

    this.bgObjects = drawGalaxyBg(this);
    this.layoutBoard(g.width, g.height);
    this.drawToolbar(g.width, g.height);

    if (this.audioBtnText) {
      this.audioBtnText.setPosition(g.width - sp[4] - 27 - 8, sp[4] + 28);
    }
  }
}

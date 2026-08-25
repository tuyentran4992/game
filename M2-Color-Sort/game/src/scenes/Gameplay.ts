import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fx, fontStyle, toColor, liquidPalette } from '../tokens';
import {
  drawGalaxyBg,
  drawTube,
  renderLiquid,
  renderPourTransition,
  drawButton,
  drawHudCapsule,
  drawPourStream,
  drawHintArc,
  showGhostPreview,
  clearGhostPreview,
  sealTube,
  unsealTube,
  spawnNeonBurst,
  synthAudio,
  TubeViews,
  GalaxyBgObjects,
} from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';
import { computeBoardLayout, tubePosition, BoardLayout } from '../logic/layout';
import {
  createBoard,
  doMove,
  undoMove,
  restartBoard,
  addExtraTube,
  hintMove,
  isLegal,
  isClean,
  moveCount as legalMoveCount,
  BoardState,
} from '../logic/color-sort';

interface TubeUI {
  views: TubeViews;
  index: number;
}

/** Alpha của ống KHÔNG thể nhận nước khi đang chọn nguồn (~30% — tokens.fx.dimInvalid). */
const DIM_INVALID_ALPHA = fx.dimInvalid;

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
  private hudObjects: Phaser.GameObjects.GameObject[] = [];
  private origTubePositions: { x: number; y: number }[] = [];
  private pourStreamG!: Phaser.GameObjects.Graphics;
  private hintArcG!: Phaser.GameObjects.Graphics;
  private hintArcTimer: Phaser.Time.TimerEvent | null = null;
  private boardZone: Phaser.GameObjects.Zone | null = null;
  private sealPipsG!: Phaser.GameObjects.Graphics;
  /** index các ống đang ở trạng thái SEAL (đầy + 1 màu duy nhất) */
  private sealedTubes = new Set<number>();
  private layout!: BoardLayout;

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
    this.sealedTubes.clear();
    // thang ngũ cung bắt đầu lại mỗi level → melody seal luôn đi từ nốt gốc
    synthAudio.resetSealScale(0);

    // 1. Nền vũ trụ Deep Space HD (Static, 0 overhead)
    this.bgObjects = drawGalaxyBg(this);

    // 2. Graphics layer
    this.pourStreamG = this.add.graphics().setDepth(z.actor + 3);
    this.hintArcG = this.add.graphics().setDepth(z.actor + 5);
    this.sealPipsG = this.add.graphics().setDepth(z.hud);
    this.sealPipsG.setData('testid', 'seal-progress');

    // 3. HUD
    this.drawHud(width, height);

    // 4. Bố cục ống nghiệm (responsive — logic/layout.ts)
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
    for (const o of this.hudObjects) o.destroy();
    this.hudObjects = [];

    const topY = sp[4] + 28;

    // 1. LEVEL BADGE
    const levelW = 120, levelH = 46;
    const levelX = sp[4] + levelW / 2 + 8;
    this.hudObjects.push(drawHudCapsule(this, levelX, topY, levelW, levelH, color.primary));

    this.levelLabel = this.add.text(
      levelX,
      topY,
      `Lv ${this.board.level}`,
      fontStyle(type.score, color.accent),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.levelLabel.setShadow(0, 2, 'rgba(0,0,0,0.6)', 4, false, true);
    this.levelLabel.setData('testid', 'level-label');
    this.hudObjects.push(this.levelLabel);

    // 2. MOVES COUNTER
    const moveW = 130, moveH = 46;
    const moveX = levelX + levelW / 2 + moveW / 2 + 12;
    this.hudObjects.push(drawHudCapsule(this, moveX, topY, moveW, moveH, color.primaryDark));

    this.moveLabel = this.add.text(
      moveX,
      topY,
      `⤵ ${this.board.moveCount}`,
      fontStyle(type.score, color.surface),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.moveLabel.setShadow(0, 2, 'rgba(0,0,0,0.6)', 4, false, true);
    this.moveLabel.setData('testid', 'move-count');
    this.hudObjects.push(this.moveLabel);

    // 3. AUDIO TOGGLE
    const audioW = 54, audioH = 46;
    const audioX = width - sp[4] - audioW / 2 - 8;
    const audioCapsule = drawHudCapsule(this, audioX, topY, audioW, audioH, color.accent);
    this.hudObjects.push(audioCapsule);

    this.audioBtnText = this.add.text(
      audioX,
      topY,
      synthAudio.isMuted() ? '🔇' : '🔊',
      fontStyle(type.h2, color.surface),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.audioBtnText.setData('testid', 'audio-toggle');
    this.hudObjects.push(this.audioBtnText);

    const audioZone = this.add.zone(audioX, topY, audioW, audioH).setDepth(z.hud + 2).setInteractive({ useHandCursor: true });
    audioZone.on('pointerdown', () => {
      // MỘT DÒNG: bus audio duy nhất (synth + sfx file) — DESIGN-SPEC §7
      synthAudio.setMuted(!synthAudio.isMuted());
      this.audioBtnText.setText(synthAudio.isMuted() ? '🔇' : '🔊');
      synthAudio.playClick();
      this.tweens.add({
        targets: [this.audioBtnText, audioCapsule],
        scale: 0.9,
        duration: dur.fast,
        yoyo: true,
        ease: 'quad.out',
      });
    });
    this.hudObjects.push(audioZone);

    this.renderSealPips(width);
  }

  /** Dãy pip nhỏ dưới HUD: số ống đã SEAL / tổng số màu (2 kênh: hình + màu). */
  private renderSealPips(width: number) {
    if (!this.sealPipsG) return;
    const g = this.sealPipsG;
    g.clear();

    const total = this.board.colors.length;
    if (total <= 0) return;

    const r = 5;
    const gap = 9;
    const spanW = total * (r * 2) + (total - 1) * gap;
    const startX = Math.max(sp[4] + r, Math.min(width - sp[4] - spanW, width / 2 - spanW / 2));
    const y = sp[4] + 28 + 23 + 12;
    const done = this.sealedTubes.size;

    for (let i = 0; i < total; i++) {
      const cx = startX + i * (r * 2 + gap) + r;
      if (i < done) {
        g.fillStyle(toColor(color.accent), 0.95);
        g.fillCircle(cx, y, r);
        g.lineStyle(1.5, toColor('#FFFFFF'), 0.8);
        g.strokeCircle(cx, y, r + 1.5);
      } else {
        g.fillStyle(toColor('#FFFFFF'), 0.14);
        g.fillCircle(cx, y, r);
        g.lineStyle(1.2, toColor(color.primary), 0.55);
        g.strokeCircle(cx, y, r);
      }
    }
  }

  // ==========================================================================
  // BOARD LAYOUT (responsive — nhiều ống vẫn chơi được ở 9:16)
  // ==========================================================================
  private layoutBoard(width: number, height: number) {
    for (const t of this.tubeUIs) {
      this.tweens.killTweensOf(t.views.container);
      t.views.container.destroy();
    }
    this.tubeUIs = [];
    this.origTubePositions = [];

    const tubeCount = this.board.tubes.length;
    const capacity = this.board.capacity;

    this.layout = computeBoardLayout(width, height, tubeCount, {
      hudH: 104,
      toolbarH: 126,
      marginX: sp[4],
    });
    const { tubeW, tubeH, hitW, hitH } = this.layout;

    for (let i = 0; i < tubeCount; i++) {
      const { x, y } = tubePosition(this.layout, i);
      this.origTubePositions.push({ x, y });

      const views = drawTube(this, tubeW, tubeH, capacity);
      views.container.setPosition(x, y);
      views.container.setData('testid', `tube-${i}`);
      views.container.setData('tubeIndex', i);

      renderLiquid(views, this.board.tubes[i]);

      views.container.setSize(hitW, hitH);
      views.container.setInteractive({ useHandCursor: true });
      views.container.on('pointerdown', () => this.onTubeTap(i));

      this.tubeUIs.push({ views, index: i });
    }

    // phục hồi trạng thái SEAL (sau resize / extra tube) — không animate, không âm
    for (const idx of this.sealedTubes) {
      const ui = this.tubeUIs[idx];
      const tube = this.board.tubes[idx];
      if (ui && tube && tube.length > 0) sealTube(this, ui.views, tube[0], true);
    }

    this.updateSelection();

    if (!this.boardZone) {
      this.boardZone = this.add.zone(width / 2, height * 0.5, width, height).setDepth(z.bg).setInteractive();
      this.boardZone.setData('testid', 'board');
    } else {
      this.boardZone.setPosition(width / 2, height * 0.5).setSize(width, height);
    }
  }

  // ==========================================================================
  // TUBE SELECTION + GHOST PREVIEW + DIM ỐNG KHÔNG HỢP LỆ
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
    const sel = this.selected;
    const pourHex = (sel !== null && this.board.tubes[sel].length > 0)
      ? this.board.tubes[sel][this.board.tubes[sel].length - 1]
      : null;

    for (const t of this.tubeUIs) {
      const orig = this.origTubePositions[t.index];
      const views = t.views;
      this.tweens.killTweensOf(views.container);
      this.tweens.killTweensOf(views.glowRing);
      clearGhostPreview(this, views);

      if (sel === null) {
        views.glowRing.setAlpha(0);
        this.tweens.add({
          targets: views.container,
          x: orig.x,
          y: orig.y,
          angle: 0,
          scale: 1,
          alpha: 1,
          duration: dur.fast,
          ease: 'cubic.out',
        });
        continue;
      }

      if (t.index === sel) {
        // NGUỒN: nâng lên + glow pulse (DESIGN-SPEC §5 A2)
        this.children.bringToTop(views.container);
        this.tweens.add({
          targets: views.container,
          y: orig.y - 20,
          x: orig.x,
          scale: 1.05,
          alpha: 1,
          duration: dur.fast,
          ease: 'cubic.out',
        });
        views.glowRing.setAlpha(0.55);
        this.tweens.add({
          targets: views.glowRing,
          alpha: 1,
          duration: dur.slow,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inout',
        });
        continue;
      }

      // ĐÍCH: hợp lệ → ghost preview đúng số lát; không hợp lệ → mờ 30%
      const count = pourHex !== null
        ? legalMoveCount(this.board.tubes, sel, t.index, this.board.capacity)
        : 0;

      if (count > 0 && pourHex) {
        this.tweens.add({
          targets: views.container,
          x: orig.x,
          y: orig.y,
          angle: 0,
          scale: 1,
          alpha: 1,
          duration: dur.fast,
          ease: 'cubic.out',
        });
        showGhostPreview(this, views, this.board.tubes[t.index].length, pourHex, count);
        views.glowRing.setAlpha(0.28);
      } else {
        views.glowRing.setAlpha(0);
        this.tweens.add({
          targets: views.container,
          x: orig.x,
          y: orig.y,
          angle: 0,
          scale: 1,
          alpha: DIM_INVALID_ALPHA,
          duration: dur.fast,
          ease: 'cubic.out',
        });
      }
    }
  }

  // ==========================================================================
  // POUR JUICE — 3 nhịp: nghiêng → rót (mượt, nhiều lát) → về chỗ
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

    // Move-count cập nhật NGAY (feel instant — DESIGN-SPEC §5)
    this.bumpMoveLabel();

    const srcUI = this.tubeUIs[from];
    const dstUI = this.tubeUIs[to];
    const origSrc = this.origTubePositions[from];
    const origDst = this.origTubePositions[to];

    const isPouringRight = origDst.x >= origSrc.x;
    const targetAngle = isPouringRight ? 55 : -55;
    const pourTargetX = origDst.x + (isPouringRight ? -srcUI.views.width * 0.68 : srcUI.views.width * 0.68);
    const pourTargetY = origDst.y - dstUI.views.height * 0.6;

    this.children.bringToTop(srcUI.views.container);
    this.tweens.killTweensOf(srcUI.views.container);
    this.tweens.killTweensOf(srcUI.views.glowRing);
    srcUI.views.glowRing.setAlpha(0.7);

    // BƯỚC 1: bay + nghiêng ống (dur.fast → cảm giác nhanh nhẹn)
    this.tweens.add({
      targets: srcUI.views.container,
      x: pourTargetX,
      y: pourTargetY,
      angle: targetAngle,
      alpha: 1,
      duration: 140,
      ease: 'cubic.out',
      onComplete: () => {
        // BƯỚC 2: rót — thời lượng theo số lát (mượt, không nhảy bậc)
        this.runPour(from, to, srcBefore, dstBefore, pourColorHex, move.count, () => {
          // BƯỚC 3: thu ống về vị trí gốc
          this.tweens.add({
            targets: srcUI.views.container,
            x: origSrc.x,
            y: origSrc.y,
            angle: 0,
            duration: 140,
            ease: 'cubic.out',
            onComplete: () => {
              srcUI.views.glowRing.setAlpha(0);
              this.isAnimating = false;
              this.syncSeals(true);

              if (this.board.win) {
                this.time.delayedCall(260, () => this.onLevelClear());
              } else if (this.board.stuck) {
                this.showStuckTooltip();
              }
            },
          });
        });
      },
    });
  }

  private runPour(
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

    synthAudio.playGlug(dstBefore.length);
    this.playSfx('sfx_pour', 0.35);

    // Mảng nền tĩnh của nguồn (sau khi đã bớt đi lớp đổ) + của đích
    const srcBase = srcBefore.slice(0, srcBefore.length - count);
    const dstBase = dstBefore.slice();

    const animData = { t: 0 };
    this.tweens.add({
      targets: animData,
      t: 1.0,
      duration: 150 + count * 45,
      ease: 'sine.inout',
      onUpdate: () => {
        const progress = animData.t;
        const thickness = 4 + Math.min(3, count);

        drawPourStream(this.pourStreamG, startX, startY, endX, endY, colorHex, thickness);

        // nguồn rút dần / đích dâng dần — CÙNG 1 tween (đồng bộ)
        renderPourTransition(srcUI.views, srcBase, colorHex, 1 - progress, count);
        renderPourTransition(dstUI.views, dstBase, colorHex, progress, count);
      },
      onComplete: () => {
        this.pourStreamG.clear();

        renderLiquid(srcUI.views, this.board.tubes[from]);
        renderLiquid(dstUI.views, this.board.tubes[to]);

        // "drop" mềm khi khối chất lỏng đáp xuống + ripple mặt thoáng
        const fillRatio = this.board.tubes[to].length / this.board.capacity;
        synthAudio.playDrop(fillRatio);
        this.spawnSurfaceRipple(dstUI, colorHex);
        this.flashTubeMouth(dstUI, color.success);

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
    ).setDepth(z.actor + 4).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: rip,
      scaleX: 1.3,
      alpha: 0,
      duration: dur.pop,
      ease: 'quad.out',
      onComplete: () => rip.destroy(),
    });
  }

  /** Vành miệng ống đích nhấp 1 lần (DESIGN-SPEC §5 A3). */
  private flashTubeMouth(ui: TubeUI, hex: string) {
    const { width: tubeW, height: tubeH, container } = ui.views;
    const line = this.add.rectangle(container.x, container.y - tubeH / 2, tubeW * 0.9, 4, toColor(hex), 0.9)
      .setDepth(z.actor + 4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: line,
      alpha: 0,
      scaleX: 1.2,
      duration: dur.base,
      ease: 'quad.out',
      onComplete: () => line.destroy(),
    });
  }

  private bumpMoveLabel() {
    this.moveLabel.setText(`⤵ ${this.board.moveCount}`);
    this.tweens.killTweensOf(this.moveLabel);
    this.moveLabel.setScale(1);
    this.tweens.add({
      targets: this.moveLabel,
      scale: 1.18,
      duration: dur.pop / 2,
      yoyo: true,
      ease: 'quad.out',
    });
  }

  // ==========================================================================
  // SEAL MOMENT — ống 1 màu duy nhất + đầy → frost + ring khép + shimmer + nốt nhạc
  // ==========================================================================
  private isSealable(index: number): boolean {
    const tube = this.board.tubes[index];
    return tube.length === this.board.capacity && isClean(tube);
  }

  /**
   * Đồng bộ trạng thái SEAL của toàn bộ ống với board.
   * `withFx` = false → phục hồi im lặng (undo/restart): không animate, không nốt nhạc.
   */
  private syncSeals(withFx: boolean) {
    let newlySealed = 0;

    for (const t of this.tubeUIs) {
      const idx = t.index;
      const sealable = this.isSealable(idx);
      const wasSealed = this.sealedTubes.has(idx);

      if (sealable && !wasSealed) {
        this.sealedTubes.add(idx);
        const hex = this.board.tubes[idx][0];
        sealTube(this, t.views, hex, !withFx);
        if (withFx) {
          newlySealed++;
          // nốt kế tiếp ĐI LÊN thang ngũ cung (mỗi seal 1 nốt)
          synthAudio.playSealNote();
          this.playSfx('sfx_clear', 0.22);
          const { container, width: tubeW } = t.views;
          spawnNeonBurst(this, container.x, container.y, [hex, color.accent, '#FFFFFF'], 12, tubeW * 1.6, z.actor + 6);
        }
      } else if (!sealable && wasSealed) {
        this.sealedTubes.delete(idx);
        unsealTube(this, t.views);
        renderLiquid(t.views, this.board.tubes[idx]);
      }
    }

    if (newlySealed > 0 || this.sealPipsG) this.renderSealPips(this.scale.width);
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
  /** UNDO = TỨC THÌ & MIỄN PHÍ (không animation dài — task §3). */
  private onUndo() {
    if (this.isAnimating) return;
    this.clearHint();
    const undone = undoMove(this.board);
    if (!undone) {
      synthAudio.playBuzz();
      this.playSfx('sfx_error', 0.3);
      return;
    }
    this.bumpMoveLabel();

    // render lại ngay (0 delay) + pop nhẹ 2 ống liên quan cho dễ theo dõi
    for (const t of this.tubeUIs) {
      renderLiquid(t.views, this.board.tubes[t.index]);
    }
    this.syncSeals(false);

    for (const idx of [undone.from, undone.to]) {
      const ui = this.tubeUIs[idx];
      if (!ui) continue;
      this.tweens.killTweensOf(ui.views.container);
      ui.views.container.setScale(0.94);
      this.tweens.add({
        targets: ui.views.container,
        scale: 1,
        duration: dur.fast,
        ease: 'quad.out',
      });
    }

    synthAudio.playGlug(0);
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
      for (const t of this.tubeUIs) unsealTube(this, t.views);
      this.sealedTubes.clear();
      synthAudio.resetSealScale(0);
      this.moveLabel.setText(`⤵ 0`);
      for (const t of this.tubeUIs) {
        renderLiquid(t.views, this.board.tubes[t.index]);
      }
      this.renderSealPips(this.scale.width);
      this.updateSelection();
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

    // 1. Lift source tube (kèm ghost preview trên đích — thấy ngay sẽ đổ mấy lát)
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
    this.selected = null;
    this.layoutBoard(this.scale.width, this.scale.height);
    const last = this.tubeUIs[this.tubeUIs.length - 1];
    last.views.container.setScale(0);
    this.tweens.add({ targets: last.views.container, scale: 1, duration: dur.pop, ease: 'back.out' });
    synthAudio.playRewardTube();
    this.hideStuckTooltip();
    return true;
  }

  private hideStuckTooltip() {
    if (!this.stuckTooltip) return;
    const tip = this.stuckTooltip;
    this.stuckTooltip = null;
    this.tweens.add({
      targets: tip,
      alpha: 0,
      duration: dur.base,
      onComplete: () => tip.destroy(),
    });
  }

  private showStuckTooltip(msg = 'No moves left! Use ↺ Undo or ⟳ Restart 💡') {
    if (this.stuckTooltip) return;
    const { width, height } = this.scale;
    const y = height - sp[5] - 92;

    const t = this.add.text(0, 0, msg, fontStyle(type.small, color.warning))
      .setOrigin(0.5);
    t.setShadow(0, 2, color.shadow, 3, false, true);

    const canExtra = this.board.extraTubeUsed < MECHANICS.reward.extraTube.maxExtra;
    const w = t.width + sp[4] * 2, h = t.height + sp[3];
    const g = this.add.graphics().setDepth(z.tutorial);
    g.fillStyle(toColor('#120D2C'), 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);
    g.lineStyle(1.5, toColor(color.warning), 0.8);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.md);

    const items: Phaser.GameObjects.GameObject[] = [g, t];
    this.stuckTooltip = this.add.container(width / 2, y, items).setDepth(z.tutorial).setAlpha(0);

    // Rewarded EXTRA TUBE (M2-06) — chỉ hiện khi đang kẹt và còn suất
    if (canExtra) {
      const extra = drawButton(this, 0, -h / 2 - 34, '+1 TUBE', {
        variant: 'glass',
        width: 132,
        height: 44,
        textType: type.small,
        testid: 'extra-tube-btn',
      });
      extra.container.on('pointerdown', (
        _p: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        void this.requestExtraTube();
      });
      this.stuckTooltip.add(extra.container);
    }

    this.tweens.add({
      targets: this.stuckTooltip,
      alpha: 1,
      duration: dur.base,
      ease: 'quad.out',
      onComplete: () => this.time.delayedCall(4000, () => this.hideStuckTooltip()),
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

  // ==========================================================================
  // LEVEL CLEAR — burst neon tại board + melody resolve, rồi chuyển scene mượt
  // ==========================================================================
  private onLevelClear() {
    this.clearHint();
    this.selected = null;
    this.isAnimating = true;

    // melody resolve (khớp thang seal) + sfx file nếu có
    synthAudio.playLevelClear(this.sealedTubes.size);
    this.playSfx('sfx_clear', 0.5);

    // flash các ống đã seal + burst hạt neon từ giữa board
    this.tubeUIs.forEach((t, i) => {
      if (!this.sealedTubes.has(t.index)) return;
      this.tweens.add({
        targets: t.views.container,
        scale: 1.08,
        duration: dur.fast,
        delay: i * 40,
        yoyo: true,
        ease: 'quad.out',
      });
      this.tweens.add({
        targets: t.views.sealRing,
        alpha: 1,
        duration: dur.base,
        delay: i * 40,
        yoyo: true,
      });
    });

    const cx = this.scale.width / 2;
    const cy = this.layout ? this.layout.startY + this.layout.boardH / 2 - this.layout.tubeH / 2 : this.scale.height * 0.45;
    spawnNeonBurst(this, cx, cy, liquidPalette, 34, Math.min(280, this.scale.width * 0.55), z.tutorial);

    ctx.onLevelClear(this.board.level, this.board.moveCount);
    void ctx.save();

    // chuyển scene mượt (fade) — DESIGN-SPEC §5 A8
    this.time.delayedCall(360, () => {
      this.cameras.main.fadeOut(dur.base, 0, 0, 0);
      this.time.delayedCall(dur.base, () => {
        this.scene.start('LevelClearScene', {
          level: this.board.level,
          moves: this.board.moveCount,
          optimal: this.board.optimalMoves,
          best: ctx.getBestMovesForLevel(this.board.level),
          seals: this.sealedTubes.size,
        });
      });
    });
  }

  private playSfx(key: string, volume = 0.35) {
    if (this.sound.mute || synthAudio.isMuted()) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private onResize(g: Phaser.Structs.Size) {
    this.clearHint();
    this.bgObjects.g.destroy();
    if (this.bgObjects.bgImage) this.bgObjects.bgImage.destroy();

    this.bgObjects = drawGalaxyBg(this);
    this.drawHud(g.width, g.height);
    this.layoutBoard(g.width, g.height);
    this.drawToolbar(g.width, g.height);
    if (this.stuckTooltip) this.stuckTooltip.setPosition(g.width / 2, g.height - sp[5] - 92);
  }
}

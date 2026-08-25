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
  drawMovesArrow,
  drawSoundIcon,
  showGhostPreview,
  clearGhostPreview,
  sealTube,
  unsealTube,
  spawnNeonBurst,
  synthAudio,
  TubeViews,
  GalaxyBgObjects,
} from '../ui';
import { LevelClearOverlay } from '../level-clear-overlay';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { inputGate } from '../input-gate';
import { showAdConfirm, showAdLoading, showToast } from '../ad-ux';
import { L } from '../lang';
import { AD_FLOW_TIMEOUT_MS, AD_WATCHDOG_MS, canBuyExtraTube, hintGrant, raceTimeout } from '../logic/ad-pacing';
import { startBgmOnce } from '../bgm';
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
  getCachedBoard,
  prefetchBoard,
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
  private audioIconG!: Phaser.GameObjects.Graphics;
  /** AUDIT §B5-4: in-scene level-clear overlay (board preserved). */
  private clearOverlay: LevelClearOverlay | null = null;
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
  /** P0-2: hint đã dùng ở level này? (persist trong session block = hint_used_this_level) */
  private hintUsedThisLevel = false;
  /** B2-5: đang chờ 1 quảng cáo → chặn mọi action khác (không double-spend) */
  private adBusy = false;
  /** B2-6: slot toolbar CỐ ĐỊNH cho rewarded +1 ống (trước đây chỉ nằm trong tooltip) */
  private extraTubeBtn: Phaser.GameObjects.Container | null = null;
  private hintBtn: Phaser.GameObjects.Container | null = null;
  /** AUDIT P-1: lấy reference để gỡ đúng handler khi scene SHUTDOWN (scale không tự off). */
  private onResizeBound!: (g: Phaser.Structs.Size) => void;
  /** overlay "Generating…" trong lúc sinh board cold (AUDIT §B3). */
  private generatingOverlay: { root: Phaser.GameObjects.Container; spin: Phaser.Tweens.Tween; pulse: Phaser.Tweens.Tween } | null = null;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  /** AUDIT §B3: hiện "Generating…" + deferred 1 frame TRƯỚC khi sinh board cold. */
  private showGenerating() {
    if (this.generatingOverlay) return;
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const root = this.add.container(cx, cy).setDepth(z.overlay + 60);
    const t = this.add.text(0, 42, L('generating'), fontStyle(type.small, color.accent)).setOrigin(0.5);
    t.setShadow(0, 2, color.shadow, 4, false, true);
    const ring = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(5, toColor(color.primary), 0.28);
    ring.strokeCircle(0, 0, 24);
    ring.lineStyle(5, toColor(color.accent), 1);
    ring.beginPath();
    ring.arc(0, 0, 24, -Math.PI / 2, Math.PI / 5, false);
    ring.strokePath();
    root.add([ring, t]);
    const spin = this.tweens.add({ targets: ring, angle: 360, duration: 700, repeat: -1, ease: 'linear' });
    const pulse = this.tweens.add({ targets: t, alpha: 0.45, duration: 620, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.generatingOverlay = { root, spin, pulse };
  }

  private hideGenerating() {
    const o = this.generatingOverlay;
    this.generatingOverlay = null;
    if (!o) return;
    o.spin.remove();
    o.pulse.remove();
    if (o.root.scene) this.tweens.add({ targets: o.root, alpha: 0, duration: dur.base, onComplete: () => o.root.destroy() });
    else o.root.destroy();
  }

  /** deferred 1 frame (để canvas render overlay trước khi main thread đè công việc sinh board). */
  private nextFrame(): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(0, () => resolve());
    });
  }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    const level = Math.max(1, ctx.currentLevel);
    const seed = level * 7919 + 13;

    // P0-2: RESUME giữa level nếu save có session hợp lệ (đúng board + undo stack),
    // ngược lại: board memoized / prefetch cho level này → TỨC THÌ; cold path →
    // overlay "Generating…" + deferred 1 frame (AUDIT §B3 kill high-level freeze).
    const resumed = ctx.resumeBoard(level);
    if (resumed) {
      this.board = resumed;
    } else {
      const cached = getCachedBoard(level, seed);
      if (cached) {
        this.board = cached;
      } else {
        this.showGenerating();
        await this.nextFrame();
        this.board = createBoard(MECHANICS, level, seed);
        this.hideGenerating();
      }
    }
    this.hintUsedThisLevel = resumed ? ctx.hintUsedForSession(level) : false;
    this.selected = null;
    this.isAnimating = false;
    this.sealedTubes.clear();
    // AUDIT P-3: BGM loop start ĐÚNG 1 lần (không phải mỗi level); tiếp tục xuyên level.
    startBgmOnce(this.game);
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

    // 4. Bố cục ống nghiệm (responsive — logic/layout.ts, capacity-aware)
    this.layoutBoard(width, height);

    // 4b. Phục hồi trạng thái SEAL im lặng (quan trọng khi resume giữa level)
    this.syncSeals(false);

    // 5. Toolbar dưới cùng
    this.drawToolbar(width, height);

    // 6. Tutorial banner nếu mới
    if (!ctx.tutorialSeen) this.showTutorial(width, height);

    this.cameras.main.fadeIn(dur.scene, 0, 0, 0);

    // AUDIT P-1 — scale resize listener leak: giữ reference + GỠ khi scene shutdown
    // (Phaser KHÔNG tự gọi shutdown() — ta đăng ký events.once('shutdown')).
    this.onResizeBound = (g: Phaser.Structs.Size) => this.onResize(g);
    this.scale.on('resize', this.onResizeBound);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResizeBound);
    });

    // 7. Snapshot ngay khi vào level → refresh giữa level không mất tiến độ
    this.persist();
  }

  /** P0-2: chụp board + undo stack vào save (debounce ≥1 s ở context). */
  private persist() {
    ctx.snapshot(this.board, this.hintUsedThisLevel);
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

    // 2. MOVES COUNTER (⤵ → vector arrow, AUDIT §B5-6)
    const moveW = 130, moveH = 46;
    const moveX = levelX + levelW / 2 + moveW / 2 + 12;
    this.hudObjects.push(drawHudCapsule(this, moveX, topY, moveW, moveH, color.primaryDark));

    const moveIcon = drawMovesArrow(this, toColor(color.accent), 30)
      .setPosition(moveX - 30, topY).setDepth(z.hud + 1);
    this.hudObjects.push(moveIcon);

    this.moveLabel = this.add.text(
      moveX + 12,
      topY,
      `${this.board.moveCount}`,
      fontStyle(type.score, color.surface),
    ).setOrigin(0.5).setDepth(z.hud + 1);
    this.moveLabel.setShadow(0, 2, 'rgba(0,0,0,0.6)', 4, false, true);
    this.moveLabel.setData('testid', 'move-count');
    this.hudObjects.push(this.moveLabel);

    // 3. AUDIO TOGGLE (🔊/🔇 → vector sound icon, AUDIT §B5-6)
    const audioW = 54, audioH = 46;
    const audioX = width - sp[4] - audioW / 2 - 8;
    const audioCapsule = drawHudCapsule(this, audioX, topY, audioW, audioH, color.accent);
    this.hudObjects.push(audioCapsule);

    this.audioIconG = drawSoundIcon(this, toColor(color.surface), 30, synthAudio.isMuted())
      .setPosition(audioX, topY).setDepth(z.hud + 1);
    this.audioIconG.setData('testid', 'audio-toggle');
    this.hudObjects.push(this.audioIconG);

    const audioZone = this.add.zone(audioX, topY, audioW, audioH).setDepth(z.hud + 2).setInteractive({ useHandCursor: true });
    audioZone.on('pointerdown', () => {
      // MỘT DÒNG: bus audio duy nhất (synth + sfx file) — DESIGN-SPEC §7
      synthAudio.setMuted(!synthAudio.isMuted());
      this.redrawAudioIcon();
      ctx.setMuted(synthAudio.isMuted());   // P0-2: mute sống qua reload
      synthAudio.playClick();
      this.tweens.add({
        targets: [this.audioIconG, audioCapsule],
        scale: 0.9,
        duration: dur.fast,
        yoyo: true,
        ease: 'quad.out',
      });
    });
    this.hudObjects.push(audioZone);

    this.renderSealPips(width);
  }

  /** Vẽ lại icon âm lượng (mute/unmute) vào graphics đã tồn tại (AUDIT §B5-6). */
  private redrawAudioIcon() {
    if (!this.audioIconG) return;
    drawSoundIcon(this, toColor(color.surface), 30, synthAudio.isMuted(), this.audioIconG);
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
      capacity: this.board.capacity,   // AUDIT §B3: capacity-aware layer height
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
    // B2 PRE-ROLL GATE: không nhận tap trước khi game sẵn sàng / đang pause (ad).
    if (!inputGate.enabled || this.adBusy) return;
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
              this.persist();   // P0-2: lưu sau MỖI nước đổ (debounce ≥1 s)

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
    this.moveLabel.setText(`${this.board.moveCount}`);
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
    this.extraTubeBtn = null;
    this.hintBtn = null;

    const y = height - sp[5] - 36;
    const margin = sp[4];
    const availW = Math.max(0, width - margin * 2);

    // B2-6: 4 slot — UNDO / RESTART / HINT (rewarded) / +1 TUBE (rewarded, LUÔN hiện)
    const defs = [
      { testid: 'undo-btn', text: '↺', action: () => this.onUndo(), icon: 'undo' as const, ad: false },
      { testid: 'restart-btn', text: '⟳', action: () => this.onRestart(), icon: 'restart' as const, ad: false },
      { testid: 'hint-btn', text: '💡', action: () => { void this.onHint(); }, icon: 'hint' as const, ad: true },
      { testid: 'extra-tube-btn', text: '+1', action: () => this.onExtraTubeTap(), icon: null, ad: true, small: true },
    ];
    const n = defs.length;

    const idealBtnW = 78;
    const idealGapX = sp[4];
    const minBtnW = 48;      // vẫn ≥44 px touch target ở 320 px
    const minGapX = sp[2];

    let btnW: number = idealBtnW;
    let gapX: number = idealGapX;
    let total = n * btnW + (n - 1) * gapX;

    if (total > availW) {
      gapX = minGapX;
      total = n * btnW + (n - 1) * gapX;
      if (total > availW) {
        btnW = Math.max(minBtnW, Math.floor((availW - (n - 1) * minGapX) / n));
        gapX = Math.max(minGapX, Math.floor((availW - n * btnW) / (n - 1)));
      }
    }
    total = n * btnW + (n - 1) * gapX;
    const startX = (width - total) / 2 + btnW / 2;
    const btnH = 62;

    defs.forEach((d, i) => {
      const x = startX + i * (btnW + gapX);
      const btn = drawButton(this, x, y, d.text, {
        variant: 'ghost',
        width: btnW,
        height: btnH,
        // '+1' là CHỮ (không icon) → cỡ nhỏ hơn để không tràn khi toolbar bị nén
        textType: 'small' in d && d.small ? type.body : type.h2,
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

      // Badge ▶ nhỏ = "nút này chạy quảng cáo có thưởng" (B2-6 discoverability)
      if (d.ad) this.addAdBadge(btn.container, btnW, btnH);
      if (d.testid === 'extra-tube-btn') this.extraTubeBtn = btn.container;
      if (d.testid === 'hint-btn') this.hintBtn = btn.container;

      this.toolbarBtns.push(btn.container);
    });

    this.refreshRewardButtons();
  }

  /** Badge ▶ (tròn, neon) ở góc trên-phải nút → báo trước "có quảng cáo". */
  private addAdBadge(container: Phaser.GameObjects.Container, w: number, h: number) {
    const bx = w / 2 - 9;
    const by = -h / 2 + 9;
    const g = this.add.graphics();
    g.fillStyle(toColor(color.accent), 0.22);
    g.fillCircle(bx, by, 12);
    g.fillStyle(toColor(color.accent), 1);
    g.fillCircle(bx, by, 9);
    g.fillStyle(toColor('#07223A'), 1);
    g.fillTriangle(bx - 3, by - 4.5, bx - 3, by + 4.5, bx + 4.5, by);
    container.add(g);
    container.setData('adBadge', g);
  }

  /**
   * B2-4/B2-6 — trạng thái 2 nút thưởng luôn phản ánh ĐÚNG luật:
   *   * 💡 mờ khi đã dùng gợi ý ở level này (1 gợi ý/level), badge ▶ tắt khi miễn phí.
   *   * ＋1 mờ + vô hiệu khi đã mua ống thưởng / hết `max_extra`.
   */
  private refreshRewardButtons() {
    const maxExtra = MECHANICS.reward.extraTube.maxExtra;
    const canExtra = canBuyExtraTube(this.board.extraTubeUsed, maxExtra);
    if (this.extraTubeBtn) {
      const btn = this.extraTubeBtn;
      btn.setAlpha(canExtra ? 1 : 0.34);
      btn.setData('disabled', !canExtra);
      const badge = btn.getData('adBadge') as Phaser.GameObjects.Graphics | undefined;
      if (badge) badge.setAlpha(canExtra ? 1 : 0.25);
      if (canExtra) btn.setInteractive({ useHandCursor: true });
      else btn.setInteractive({ useHandCursor: false });   // vẫn nhận tap → giải thích, không im lặng
    }

    if (this.hintBtn) {
      const grant = hintGrant(
        { hintUsedThisLevel: this.hintUsedThisLevel, freeHintUsed: ctx.freeHintUsed },
        { oncePerLevel: MECHANICS.reward.hint.hintOncePerLevel, costAd: MECHANICS.reward.hint.costAd },
      );
      this.hintBtn.setAlpha(grant.allowed ? 1 : 0.34);
      this.hintBtn.setData('disabled', !grant.allowed);
      const badge = this.hintBtn.getData('adBadge') as Phaser.GameObjects.Graphics | undefined;
      // gợi ý ĐẦU TIÊN miễn phí → không hiện badge quảng cáo (không hứa sai)
      if (badge) badge.setAlpha(grant.allowed && grant.requiresAd ? 1 : 0.18);
    }
  }

  // ==========================================================================
  // CONTROLLER ACTIONS
  // ==========================================================================
  /** UNDO = TỨC THÌ & MIỄN PHÍ (không animation dài — task §3). */
  private onUndo() {
    if (!inputGate.enabled || this.adBusy || this.isAnimating) return;
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
    this.persist();   // P0-2: undo cũng phải lưu (undo stack + moves)
  }

  private onRestart() {
    if (!inputGate.enabled || this.adBusy || this.isAnimating) return;
    this.clearHint();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, () => {
      this.board = restartBoard(MECHANICS, this.board);
      this.selected = null;
      for (const t of this.tubeUIs) unsealTube(this, t.views);
      this.sealedTubes.clear();
      synthAudio.resetSealScale(0);
      this.moveLabel.setText(`0`);

      // P0-3: số ống của board sau restart PHẢI khớp số tube UI. Nếu lệch
      // (ống thưởng), dựng lại toàn bộ board thay vì render vào UI không tồn tại.
      if (this.board.tubes.length !== this.tubeUIs.length) {
        this.layoutBoard(this.scale.width, this.scale.height);
      } else {
        for (const t of this.tubeUIs) {
          renderLiquid(t.views, this.board.tubes[t.index]);
        }
      }
      this.syncSeals(false);
      this.renderSealPips(this.scale.width);
      this.updateSelection();
      this.refreshRewardButtons();   // P0-3: ống thưởng ĐÃ mua vẫn giữ qua Restart
      this.persist();   // P0-2: restart = trạng thái mới cần lưu
      this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
      synthAudio.playClick();
      this.playSfx('sfx_click', 0.3);
    });
  }

  // ---------------------------------------------------------------- HINT ---
  /**
   * B2-4/B2-5 — luật gợi ý (trước đây `hintOncePerLevel` là DEAD CODE):
   *   1. Gợi ý ĐẦU TIÊN trong đời = MIỄN PHÍ (onboarding grant, dạy cơ chế).
   *   2. Sau đó: ĐÚNG 1 gợi ý / level, và phải xem rewarded ad.
   *   3. Trước ad luôn có sheet xác nhận + kiểm tra ad khả dụng + spinner;
   *      ad lỗi → toast "Ad unavailable", KHÔNG im lặng no-op.
   */
  private async onHint() {
    if (!inputGate.enabled || this.adBusy) return;
    if (this.isAnimating || this.board.win) return;

    const grant = hintGrant(
      { hintUsedThisLevel: this.hintUsedThisLevel, freeHintUsed: ctx.freeHintUsed },
      { oncePerLevel: MECHANICS.reward.hint.hintOncePerLevel, costAd: MECHANICS.reward.hint.costAd },
    );

    if (!grant.allowed) {
      // 1 gợi ý/level — nói rõ lý do thay vì nút "chết"
      showToast(this, L('hint_used') );
      synthAudio.playBuzz();
      return;
    }

    // (1) Gợi ý miễn phí đầu tiên: KHÔNG quảng cáo. Chỉ tiêu suất khi thực sự
    //     có nước gợi ý (board bí → không "ăn" suất miễn phí của người chơi).
    if (!grant.requiresAd) {
      if (this.applyHint()) {
        ctx.markFreeHintUsed();
        showToast(this, L('first_hint_free'));
        this.refreshRewardButtons();
      }
      return;
    }

    // (2) Ad khả dụng? Kiểm tra TRƯỚC khi mời xem.
    if (!sdk.isRewardedAvailable()) {
      showToast(this, L('ad_unavailable'));
      return;
    }

    // (3) Sheet xác nhận — không bao giờ vào ad khi chưa hỏi.
    showAdConfirm(this, {
      title: L('confirm_hint'),
      confirmText: L('confirm_yes'),
      cancelText: L('confirm_no'),
      onConfirm: () => { void this.runRewarded('hint', () => { this.applyHint(); }); },
    });
  }

  /**
   * Luồng rewarded dùng chung (hint + extra-tube): spinner → ad → grant/toast.
   * KHÔNG bao giờ cấp thưởng khi ad thất bại lúc SDK có mặt (B2-1).
   */
  private async runRewarded(tag: 'hint' | 'extra-tube', onEarned: () => void): Promise<boolean> {
    if (this.adBusy) return false;
    this.adBusy = true;
    const spinner = showAdLoading(this, L('ad_loading'));
    let earned = false;
    try {
      const ad = sdk.requestRewardedAd(tag);
      // 2 nhịp chờ (B2-5, "không bao giờ đứng hình"):
      //   nhịp 1 — 6 s: nếu ad ĐÃ xong/đã bị đóng thì biết ngay.
      //   nhịp 2 — chỉ chờ tiếp khi platform ĐÃ pause game (⇒ ad thật đang chạy,
      //            người chơi đang xem 15-30 s). Chưa pause = no-fill → thoát ngay.
      const quick = await raceTimeout<'earned' | 'denied' | 'pending'>(
        ad.then((v) => (v ? 'earned' : 'denied')),
        AD_WATCHDOG_MS,
        'pending',
      );
      if (quick === 'pending') earned = inputGate.isPaused ? await ad : false;
      else earned = quick === 'earned';
    } catch (e) {
      console.warn('[ads] rewarded threw', e);
      earned = false;
    } finally {
      spinner.destroy();
      this.adBusy = false;
    }

    if (!earned) {
      showToast(this, L('ad_unavailable'));
      return false;
    }
    onEarned();
    return true;
  }

  /**
   * Vẽ gợi ý (đã được cấp phép) — KHÔNG tự đổ hộ người chơi (M2-06).
   * Trả false khi board KHÔNG còn nước gợi ý ⇒ caller không tiêu suất/không tính ad.
   */
  private applyHint(): boolean {
    this.clearHint();
    const hint = hintMove(this.board);
    if (!hint) {
      this.showStuckTooltip(L('stuck_no_moves'));
      return false;
    }

    this.hintUsedThisLevel = true;
    this.persist();   // P0-2: hint_used_this_level vào session block
    this.refreshRewardButtons();

    const srcPos = this.origTubePositions[hint.from];
    const dstPos = this.origTubePositions[hint.to];
    const srcUI = this.tubeUIs[hint.from];
    const dstUI = this.tubeUIs[hint.to];
    if (!srcPos || !dstPos || !srcUI || !dstUI) return true;

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
    return true;
  }

  // ---------------------------------------------------------- EXTRA TUBE ---
  /** Slot toolbar cố định (B2-6) — luôn thấy, có badge ▶, mờ khi hết suất. */
  private onExtraTubeTap() {
    if (!inputGate.enabled || this.adBusy) return;
    if (this.isAnimating || this.board.win) return;

    if (!canBuyExtraTube(this.board.extraTubeUsed, MECHANICS.reward.extraTube.maxExtra)) {
      showToast(this, L('extra_used'));
      synthAudio.playBuzz();
      return;
    }
    if (!sdk.isRewardedAvailable()) {
      showToast(this, L('ad_unavailable'));
      return;
    }
    showAdConfirm(this, {
      title: L('confirm_tube'),
      note: L('note_extra'),
      confirmText: L('confirm_yes'),
      cancelText: L('confirm_no'),
      onConfirm: () => { void this.requestExtraTube(); },
    });
  }

  /** Thực thi mua ống thưởng (sheet xác nhận đã hiển thị ở onExtraTubeTap). */
  public async requestExtraTube(): Promise<boolean> {
    if (!canBuyExtraTube(this.board.extraTubeUsed, MECHANICS.reward.extraTube.maxExtra)) return false;
    // B2-8: tag chuẩn hoá 'extra-tube' (khớp TEST-CASES PC-08), không còn 'extra_tube'.
    return this.runRewarded('extra-tube', () => this.grantExtraTube());
  }

  private grantExtraTube() {
    addExtraTube(this.board);
    this.selected = null;
    this.layoutBoard(this.scale.width, this.scale.height);
    this.syncSeals(false);
    const last = this.tubeUIs[this.tubeUIs.length - 1];
    if (last) {
      last.views.container.setScale(0);
      this.tweens.add({ targets: last.views.container, scale: 1, duration: dur.pop, ease: 'back.out' });
    }
    synthAudio.playRewardTube();
    this.hideStuckTooltip();
    this.refreshRewardButtons();   // hết suất → nút ＋1 xám lại ngay
    this.persist();   // P0-2: ống thưởng đã trả bằng quảng cáo → phải lưu ngay
  }

  /** Kéo chú ý tới slot ＋1 trên toolbar khi board bí (B2-6 discoverability). */
  private pulseExtraTubeBtn() {
    const btn = this.extraTubeBtn;
    if (!btn || btn.getData('disabled')) return;
    this.tweens.killTweensOf(btn);
    btn.setScale(1);
    this.tweens.add({
      targets: btn,
      scale: 1.12,
      duration: 320,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inout',
      onComplete: () => btn.setScale(1),
    });
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

  private showStuckTooltip(msg = L('stuck_no_moves')) {
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

    // Rewarded EXTRA TUBE (M2-06 / B2-6): lối vào CHÍNH giờ là slot toolbar cố định
    // ('extra-tube-btn'). Tooltip chỉ là shortcut phụ + kéo chú ý xuống toolbar
    // (không auto-hide mất cơ hội mua như trước).
    if (canExtra) {
      const extra = drawButton(this, 0, -h / 2 - 34, L('extra_tube_tip'), {
        variant: 'glass',
        width: 148,
        height: 44,
        textType: type.small,
        testid: 'extra-tube-tip-btn',
      });
      extra.container.on('pointerdown', (
        _p: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.onExtraTubeTap();
      });
      this.stuckTooltip.add(extra.container);
      this.pulseExtraTubeBtn();
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
    // AUDIT §B5-1/§B5-7: upper clear space right ABOVE the board + dark backdrop so it
    // never covers the tube mouths; wordWrap so it never clips at 320 px.
    const boardTop = this.layout ? this.layout.startY : height * 0.3;
    const y = Math.max(sp[4] + 64, boardTop - 46);
    const wrapW = Math.min(width - 48, 460);
    const msg = L('tutorial_tap');

    const t = this.add.text(0, 0, msg, {
      ...fontStyle(type.body, color.surface),
      fontStyle: type.body.weight,
      wordWrap: { width: wrapW },
    }).setOrigin(0.5);

    const w = Math.min(t.width + sp[6], width - 40);
    const h = t.height + sp[4];

    const g = this.add.graphics().setDepth(z.tutorial);
    g.fillStyle(toColor('#120D2C'), 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);
    g.lineStyle(1.5, toColor(color.accent), 0.55);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.md);

    const root = this.add.container(width / 2, y, [g, t]).setDepth(z.tutorial).setAlpha(0);
    this.tweens.add({
      targets: root,
      alpha: 1,
      duration: dur.base,
      onComplete: () => this.time.delayedCall(3000, () => {
        this.tweens.add({ targets: root, alpha: 0, duration: dur.base, onComplete: () => root.destroy() });
      }),
    });
    ctx.tutorialSeen = true;
    ctx.save();
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

    // flash các ống đã seal + burst hạt neon từ giữa board (finish moment preserved)
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

    const level = this.board.level;
    const moves = this.board.moveCount;
    const prevBest = ctx.getBestMovesForLevel(level);      // trước khi onLevelClear cập nhật
    const newBest = prevBest === 0 || moves < prevBest;     // "★ NEW BEST" moment (§B5-4)

    ctx.onLevelClear(level, moves);
    void ctx.saveNow();   // P0-2: level clear → flush ngay (không chờ debounce)

    // AUDIT §B5-4: in-scene overlay ABOVE the board (no scene swap → board không biến mất);
    // panel re-render & reflow on resize (fix clipped title / NEXT below fold).
    this.time.delayedCall(300, () => {
      this.clearOverlay = new LevelClearOverlay(this, {
        level,
        moves,
        optimal: this.board.optimalMoves,
        best: newBest ? moves : prevBest,
        newBest,
        seals: this.sealedTubes.size,
        onNext: () => this.advanceToNext(level, moves),
        onReplay: () => this.replayLevel(level),
      });
    });
  }

  /** NEXT LEVEL — interstitial pacing (AUDIT §B2-2/B2-3, M2-07) rồi sang level kế. */
  private async advanceToNext(level: number, _moves: number) {
    const now = Date.now();
    // §B3: pre-generate level N+1 NGAY trong lúc overlay (CPU nhàn) → không freeze.
    prefetchBoard(MECHANICS, level + 1);
    const wantAd = MECHANICS.ad.interstitialAfterClear
      && ctx.canShowInterstitial(level, now)
      && sdk.isInterstitialAvailable();

    if (wantAd) {
      ctx.markInterstitialShown(now);
      const spinner = showAdLoading(this, L('ad_loading'));
      try {
        await raceTimeout(
          sdk.requestInterstitialAd(AD_FLOW_TIMEOUT_MS).then(() => true),
          AD_FLOW_TIMEOUT_MS,
          false,
        );
      } catch (e) {
        console.warn('[ads] interstitial failed, continuing', e);
      } finally {
        spinner.destroy();
      }
    }

    if (!this.scene.isActive()) return;
    ctx.currentLevel = level + 1;
    ctx.clearSession();          // P0-2: level mới → không resume board cũ
    void ctx.saveNow();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    setTimeout(() => this.scene.start('GameplayScene'), dur.scene + 2500);
  }

  /** REPLAY — chơi lại ĐÚNG level vừa hoàn thành (board mới từ seed cố định). */
  private replayLevel(level: number) {
    ctx.currentLevel = level;
    ctx.clearSession();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
  }

  private playSfx(key: string, volume = 0.35) {
    if (this.sound.mute || synthAudio.isMuted()) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private onResize(g: Phaser.Structs.Size) {
    // AUDIT P-1: guard khi scene đang teardown (không đụng object destroyed).
    if (!this.bgObjects || !this.boardZone) return;
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

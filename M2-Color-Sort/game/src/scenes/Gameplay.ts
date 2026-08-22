import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, glow, fontStyle, toColor, liquidPalette } from '../tokens';
import { drawGalaxyBg, drawTube, renderLiquid, drawButton, TubeViews } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';
import { createBoard, doMove, undoMove, restartBoard, addExtraTube, hintMove, legalMoves, BoardState, Move } from '../logic/color-sort';

interface TubeUI { views: TubeViews; index: number; }

// GameplayScene M2 (DESIGN-SPEC §4.2) — board ống + HUD + toolbar.
export class GameplayScene extends Phaser.Scene {
  private board!: BoardState;
  private tubeUIs: TubeUI[] = [];
  private selected: number | null = null;        // index ống nguồn đang chọn
  private levelLabel!: Phaser.GameObjects.Text;
  private moveLabel!: Phaser.GameObjects.Text;
  private bgStars!: ReturnType<typeof drawGalaxyBg>;
  private stuckTooltip: Phaser.GameObjects.Container | null = null;
  private hintUsedThisLevel = false;
  private isAnimating = false;

  constructor() { super({ key: 'GameplayScene' }); }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    const level = Math.max(1, ctx.currentLevel);
    this.board = createBoard(MECHANICS, level, level * 7919 + 13);
    this.selected = null;
    this.hintUsedThisLevel = false;
    this.isAnimating = false;

    this.bgStars = drawGalaxyBg(this);

    // HUD (DESIGN-SPEC §2.2): level-label (huy hiệu đĩa) + move-count
    this.drawHud(width, height);

    // Board (DESIGN-SPEC §2.2/§3.3)
    this.layoutBoard(width, height);

    // Toolbar (DESIGN-SPEC §2.2/§3.4): undo / restart / hint
    this.drawToolbar(width, height);

    // Tutorial banner level 1 (UX §8: ≤3 tap tới hành động chính)
    if (!ctx.tutorialSeen) this.showTutorial(width, height);

    this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
    this.scale.on('resize', (g: Phaser.Structs.Size) => this.onResize(g));

    // BGM loop
    if (this.cache.audio.exists('bgm_main')) this.sound.play('bgm_main', { loop: true, volume: 0.3 });
  }

  // ---------- HUD ----------
  private drawHud(width: number, height: number) {
    // level-label: huy hiệu đĩa tròn primary + text "Lv X" (DESIGN-SPEC §2.2)
    const badgeX = sp[4] + 36, badgeY = sp[4] + 24;
    const badge = this.add.graphics().setDepth(z.hud);
    badge.fillStyle(toColor(color.primary), 1);
    badge.fillCircle(badgeX, badgeY, 32);
    badge.lineStyle(3, toColor('#FFFFFF'), 0.85);
    badge.strokeCircle(badgeX, badgeY, 32);
    this.levelLabel = this.add.text(badgeX, badgeY, `Lv ${this.board.level}`, fontStyle(type.score, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.hud + 1);
    this.levelLabel.setData('testid', 'level-label');

    // move-count: icon ⤵ + số (DESIGN-SPEC §2.2)
    const mvX = badgeX + 64, mvY = badgeY;
    this.moveLabel = this.add.text(mvX, mvY, `⤵ ${this.board.moveCount}`, fontStyle(type.score, color.surface))
      .setOrigin(0).setDepth(z.hud + 1);
    this.moveLabel.setShadow(0, 2, color.shadow, 3, false, true);
    this.moveLabel.setData('testid', 'move-count');

    // nút audio-toggle (DESIGN-SPEC §2.2 — data-testid audio-toggle)
    const audioBtn = this.add.text(width - sp[4] - 20, badgeY, '🔊', fontStyle(type.h2, color.surface))
      .setOrigin(0.5).setDepth(z.hud);
    audioBtn.setInteractive({ useHandCursor: true });
    audioBtn.setData('testid', 'audio-toggle');
    audioBtn.on('pointerdown', () => { this.sound.mute = !this.sound.mute; });
  }

  // ---------- Board layout ----------
  private layoutBoard(width: number, height: number) {
    // xóa ống cũ nếu có
    for (const t of this.tubeUIs) t.views.container.destroy();
    this.tubeUIs = [];

    const tubeCount = this.board.tubes.length;
    const capacity = this.board.capacity;
    // tính kích thước ống + số cột theo width (DESIGN-SPEC §2.3)
    let cols: number;
    if (width >= 1500) cols = Math.min(7, Math.ceil(tubeCount / 2));
    else if (width >= 900) cols = Math.ceil(tubeCount / 2);
    else cols = Math.min(5, Math.ceil(tubeCount / 2));
    cols = Math.max(1, cols);
    const rows = Math.ceil(tubeCount / cols);

    // ống co tối thiểu 44x120, co theo viewport (DESIGN-SPEC §2.3/§3.1)
    const boardAreaH = height * 0.60;
    const maxTubeH = Math.min(240, (boardAreaH - sp[5] * (rows + 1)) / rows);
    const tubeH = Math.max(120, maxTubeH);
    const tubeW = Math.max(44, Math.min(96, tubeH * 0.42));
    const gapX = sp[3], gapY = sp[5];
    const boardW = cols * tubeW + (cols - 1) * gapX;
    const boardH = rows * tubeH + (rows - 1) * gapY;
    const startX = (width - boardW) / 2 + tubeW / 2;
    const startY = height * 0.50 - boardH / 2 + tubeH / 2;

    for (let i = 0; i < tubeCount; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = startX + c * (tubeW + gapX);
      const y = startY + r * (tubeH + gapY);
      const views = drawTube(this, tubeW, tubeH, capacity);
      views.container.setPosition(x, y);
      views.container.setData('testid', `tube-${i}`);
      views.container.setData('tubeIndex', i);
      renderLiquid(views, this.board.tubes[i]);
      // interactive — vùng chạm ≥ 44px (DESIGN-SPEC §2.4)
      views.container.setSize(Math.max(44, tubeW), Math.max(44, tubeH));
      views.container.setInteractive({ useHandCursor: true });
      views.container.on('pointerdown', () => this.onTubeTap(i));
      this.tubeUIs.push({ views, index: i });
    }

    // board data-testid (DESIGN-SPEC §5) — gán lên container board vùng trung tâm
    // (tạo 1 zone vô hình đè board để E2E query data-testid=board)
    if (!this.boardZone) {
      this.boardZone = this.add.zone(width / 2, height * 0.5, width, height).setDepth(z.bg).setInteractive();
      this.boardZone.setData('testid', 'board');
    }
  }
  private boardZone: Phaser.GameObjects.Zone | null = null;

  // ---------- Tube tap → chọn / đổ (M2-01) ----------
  private onTubeTap(i: number) {
    if (this.isAnimating || this.board.win) return;
    if (this.selected === null) {
      // chọn nguồn: ống phải có chất lỏng
      if (this.board.tubes[i].length === 0) { this.shakeTube(i); return; }
      this.selected = i;
      this.updateSelection();
      return;
    }
    // đã chọn nguồn → tap đích
    if (i === this.selected) { // bỏ chọn
      this.selected = null; this.updateSelection(); return;
    }
    const from = this.selected;
    this.selected = null;
    this.updateSelection();
    this.attemptPour(from, i);
  }

  private updateSelection() {
    for (const t of this.tubeUIs) {
      const sel = t.index === this.selected;
      this.tweens.add({ targets: t.views.container, scale: sel ? 1.04 : 1, duration: dur.fast, ease: 'quad.out' });
      if (sel) {
        t.views.glowRing.setAlpha(1);
        // glow pulse (DESIGN-SPEC §5 A2)
        this.tweens.add({
          targets: t.views.glowRing, alpha: { from: 0.30, to: 0.65 },
          duration: dur.slow, yoyo: true, repeat: -1, ease: 'sine.inout',
        });
      } else {
        this.tweens.killTweensOf(t.views.glowRing);
        t.views.glowRing.setAlpha(0);
      }
    }
  }

  // ---------- Đổ chất lỏng (M2-01) ----------
  private attemptPour(from: number, to: number) {
    const move = doMove(this.board, from, to);
    if (!move) {
      // đổ không hợp lệ → rung nguồn + sfx_error (M2-01, §6) — giữ chọn nguồn (UX §8)
      this.shakeTube(from);
      this.selected = from; this.updateSelection();
      this.playSfx('sfx_error', 0.4);
      return;
    }
    this.isAnimating = true;
    this.moveLabel.setText(`⤵ ${this.board.moveCount}`);
    this.tweens.add({ targets: this.moveLabel, scale: 1.25, duration: dur.pop, yoyo: true, ease: 'back.out' });
    this.playSfx('sfx_pour', 0.4);

    // animation đổ (DESIGN-SPEC §5 A1): nguồn co 0.94 + đổ + đích tăng + ripple
    const srcUI = this.tubeUIs[from], dstUI = this.tubeUIs[to];
    this.tweens.add({ targets: srcUI.views.container, scale: 0.94, duration: dur.fast, yoyo: true, ease: 'quad.out' });
    // đơn giản: cập nhật chất lỏng ngay (tween mượt qua alpha)
    this.tweens.add({
      targets: [srcUI.views.liquidG, dstUI.views.liquidG], alpha: { from: 0.4, to: 1 },
      duration: dur.base, ease: 'quad.out',
      onUpdate: () => {
        renderLiquid(srcUI.views, this.board.tubes[from]);
        renderLiquid(dstUI.views, this.board.tubes[to]);
      },
      onComplete: () => {
        renderLiquid(srcUI.views, this.board.tubes[from]);
        renderLiquid(dstUI.views, this.board.tubes[to]);
        // ripple ellipse trên mặt thoáng đích (DESIGN-SPEC §5 A1)
        const dst = this.tubeUIs[to].views;
        const rip = this.add.ellipse(dst.container.x, dst.container.y - dst.height / 2 + 8, dst.width - 6, 8, toColor(color.success), 0.6)
          .setDepth(z.actor + 3);
        this.tweens.add({ targets: rip, alpha: 0, scale: 1.6, duration: dur.pop, ease: 'quad.out', onComplete: () => rip.destroy() });
        // ống đích nhấp success 1 lần (DESIGN-SPEC §5 A3)
        this.tweens.add({ targets: dstUI.views.glass, alpha: { from: 0.7, to: 1 }, duration: dur.fast, yoyo: true });
        this.isAnimating = false;
        // check kẹt + win
        if (this.board.win) { this.onLevelClear(); return; }
        if (this.board.stuck) this.showStuckTooltip();
      },
    });
  }

  // Rung ống (DESIGN-SPEC §3.1 đổ không hợp lệ, §6) — shakeX ±4px ×3
  private shakeTube(i: number) {
    const ui = this.tubeUIs[i]; if (!ui) return;
    const ox = ui.views.container.x;
    this.tweens.add({
      targets: ui.views.container, x: ox + 4, duration: 60, yoyo: true, repeat: 5, ease: 'quad.inout',
      onComplete: () => ui.views.container.x = ox,
    });
    // viền nháy danger
    this.tweens.add({ targets: ui.views.glass, alpha: { from: 1, to: 0.5 }, duration: 60, yoyo: true, repeat: 5 });
  }

  // ---------- Toolbar (undo/restart/hint) ----------
  private drawToolbar(width: number, height: number) {
    const y = height - sp[5] - 36;
    const gap = sp[6];
    const positions = [width / 2 - gap, width / 2, width / 2 + gap];
    const defs = [
      { testid: 'undo-btn',    text: '↺',  action: () => this.onUndo() },
      { testid: 'restart-btn', text: '⟳',  action: () => this.onRestart() },
      { testid: 'hint-btn',    text: '💡', action: () => this.onHint() },
    ];
    defs.forEach((d, i) => {
      const btn = drawButton(this, positions[i], y, d.text, { variant: 'ghost', width: 88, textType: type.h2, testid: d.testid });
      btn.container.on('pointerdown', ( (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); }) as any);
      btn.container.on('pointerdown', () => { d.action(); });
    });
  }

  // ---------- Undo (M2-05) ----------
  private onUndo() {
    if (this.isAnimating) return;
    const undone = undoMove(this.board);
    if (!undone) { this.playSfx('sfx_error', 0.3); return; }
    this.moveLabel.setText(`⤵ ${this.board.moveCount}`);
    // render lại toàn bộ ống (đơn giản, đủ mượt)
    for (const t of this.tubeUIs) renderLiquid(t.views, this.board.tubes[t.index]);
    this.playSfx('sfx_pour', 0.3);
    this.selected = null; this.updateSelection();
  }

  // ---------- Restart (M2-05) ----------
  private onRestart() {
    if (this.isAnimating) return;
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene, () => {
      this.board = restartBoard(MECHANICS, this.board);
      this.selected = null; this.hintUsedThisLevel = false;
      this.moveLabel.setText(`⤵ 0`);
      for (const t of this.tubeUIs) renderLiquid(t.views, this.board.tubes[t.index]);
      this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
      this.playSfx('sfx_click', 0.3);
    });
  }

  // ---------- Hint (rewarded M2-06) ----------
  private async onHint() {
    if (this.isAnimating || this.hintUsedThisLevel) return;
    const earned = MECHANICS.reward.hint.costAd ? await sdk.requestRewardedAd('hint') : true;
    if (!earned) return;
    this.hintUsedThisLevel = true;
    const hint = hintMove(this.board);
    if (!hint) return;
    // highlight nguồn + đích 3 lần nhấp nháy (DESIGN-SPEC §5 A6)
    const srcUI = this.tubeUIs[hint.from], dstUI = this.tubeUIs[hint.to];
    let blink = 0;
    const doBlink = () => {
      srcUI.views.glowRing.setAlpha(1);
      dstUI.views.glowRing.setAlpha(0.5);
      this.tweens.add({
        targets: [srcUI.views.glowRing, dstUI.views.glowRing], alpha: 0,
        duration: 300, ease: 'quad.out',
        onComplete: () => {
          blink++;
          if (blink < 3) doBlink();
          else {
            // giữ glow ở nguồn
            this.selected = hint.from; this.updateSelection();
          }
        },
      });
    };
    doBlink();
    this.playSfx('sfx_click', 0.4);
  }

  // ---------- Extra tube (rewarded M2-06) — không gắn nút toolbar, dùng qua hint khi kẹt ----------
  public async requestExtraTube(): Promise<boolean> {
    if (this.board.extraTubeUsed >= MECHANICS.reward.extraTube.maxExtra) return false;
    const earned = await sdk.requestRewardedAd('extra_tube');
    if (!earned) return false;
    addExtraTube(this.board);
    this.layoutBoard(this.scale.width, this.scale.height);
    // ống mới drop-in (DESIGN-SPEC §5 A7)
    const last = this.tubeUIs[this.tubeUIs.length - 1];
    last.views.container.setScale(0);
    this.tweens.add({ targets: last.views.container, scale: 1, duration: dur.pop, ease: 'back.out' });
    return true;
  }

  // ---------- Stuck tooltip (M2-03) ----------
  private showStuckTooltip() {
    if (this.stuckTooltip) return;
    const { width, height } = this.scale;
    const y = height - sp[5] - 90;
    const t = this.add.text(0, 0, 'Dùng Undo / Restart / Hint nhé', fontStyle(type.small, color.warning))
      .setOrigin(0.5);
    t.setShadow(0, 2, color.shadow, 3, false, true);
    const w = t.width + sp[4] * 2, h = t.height + sp[3];
    const g = this.add.graphics().setDepth(z.tutorial);
    g.fillStyle(toColor(color.surfaceAlt), 0.9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);
    this.stuckTooltip = this.add.container(width / 2, y, [g, t]).setDepth(z.tutorial).setAlpha(0);
    this.tweens.add({
      targets: this.stuckTooltip, alpha: 1, duration: dur.base, ease: 'quad.out',
      onComplete: () => this.time.delayedCall(3000, () => {
        if (this.stuckTooltip) this.tweens.add({ targets: this.stuckTooltip, alpha: 0, duration: dur.base, onComplete: () => { this.stuckTooltip?.destroy(); this.stuckTooltip = null; } });
      }),
    });
    this.playSfx('sfx_error', 0.2);
  }

  // ---------- Tutorial banner (UX §8) ----------
  private showTutorial(width: number, height: number) {
    const t = this.add.text(width / 2, height * 0.38, 'Chọn ống rồi đổ màu', fontStyle(type.body, color.surface))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    t.setShadow(0, 2, color.shadow, 3, false, true);
    this.tweens.add({ targets: t, alpha: 1, duration: dur.base, onComplete: () => this.time.delayedCall(3000, () => this.tweens.add({ targets: t, alpha: 0, duration: dur.base, onComplete: () => t.destroy() })) });
    ctx.tutorialSeen = true; void ctx.save();
  }

  // ---------- Level Clear (M2-02) ----------
  private onLevelClear() {
    this.playSfx('sfx_clear', 0.5);
    ctx.onLevelClear(this.board.level, this.board.moveCount);
    void ctx.save();
    this.scene.start('LevelClearScene', { level: this.board.level, moves: this.board.moveCount, best: ctx.bestMoves });
  }

  // ---------- SFX helper ----------
  private playSfx(key: string, volume = 0.35) {
    if (this.sound.mute) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  // ---------- Resize ----------
  private onResize(g: Phaser.Structs.Size) {
    // vẽ lại nền + layout lại board + toolbar (DESIGN-SPEC §2.1 — giữ state)
    this.bgStars.g.destroy(); for (const s of this.bgStars.stars) s.destroy();
    this.bgStars = drawGalaxyBg(this);
    this.layoutBoard(g.width, g.height);
    // HUD re-position đơn giản
    this.children.list.filter(c => c instanceof Phaser.GameObjects.Text && c.getData('testid') === 'audio-toggle')
      .forEach(c => (c as Phaser.GameObjects.Text).setPosition(g.width - sp[4] - 20, sp[4] + 24));
  }
}

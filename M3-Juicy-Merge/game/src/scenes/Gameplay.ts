import Phaser from 'phaser';
import { CONFIG } from '../logic/config';
import { ctx } from '../context';
import { color, z, type, fontStyle, toColor, dur, radius } from '../tokens';
import { drawBackground, drawMuteButton } from '../ui';
import { computeBucketLayout, type BucketLayout } from '../gameplay/physics-layout';
import { resolveFruitTexture, fruitRadius, fruitDiameter } from '../gameplay/fruit-sprite';
import { type CollidingFruit, type MergePlan } from '../gameplay/merge-handler';
import { checkGameOver } from '../logic/game-over';
import { isWorldSettled } from '../logic/settle';
import { fruitsAboveLine } from '../logic/continue';
import { playJuiceSplash, playJackpotClimax, computeComboDetune } from '../gameplay/juice-effects';
import { computeShakeImpulse } from '../logic/powerups';
import { DAILY_TARGET_SCORE } from '../logic/daily-challenge';

interface DroppedFruit {
  id: number;
  obj: Phaser.Physics.Matter.Image;
  tier: number;
}

interface RestBody {
  isSleeping?: boolean;
  speed?: number;
}

interface MatterBodyHandle {
  gameObject?: unknown;
  parent?: { gameObject?: unknown };
}

interface CollisionPairHandle {
  bodyA: MatterBodyHandle;
  bodyB: MatterBodyHandle;
}

interface CollisionEventHandle {
  pairs: CollisionPairHandle[];
}

const MOVE_SPEED_EPS = 0.5;
const SETTLE_GRACE_MS = 500;
const DANGER_NEAR_BAND = 90;

export class GameplayScene extends Phaser.Scene {
  private layout!: BucketLayout;
  private ghost!: Phaser.GameObjects.Image;
  private ghostTier = 0;
  private ghostX = 0;
  private aimLine!: Phaser.GameObjects.Graphics;
  private fruits: DroppedFruit[] = [];
  private fruitsById = new Map<number, DroppedFruit>();
  private nextFruitId = 1;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private nextPreview1!: Phaser.GameObjects.Image;
  private nextPreview2!: Phaser.GameObjects.Image;
  private swapButtonContainer!: Phaser.GameObjects.Container;
  private swapCountText!: Phaser.GameObjects.Text;
  private swapButtonBaseX = 0;
  private shakeButtonContainer!: Phaser.GameObjects.Container;
  private shakeCountText!: Phaser.GameObjects.Text;
  private shakeButtonBaseX = 0;
  private isShakingBucket = false;
  private lastUiClickTime = 0;
  private comboPopup!: Phaser.GameObjects.Text;
  private dangerLine!: Phaser.GameObjects.Graphics;
  private lastMotionMs = 0;
  private gameOverTriggered = false;
  private wasNearDanger = false;
  private dangerStartTime: number | null = null;
  private dangerCountdownText!: Phaser.GameObjects.Text;
  private dailyBannerText?: Phaser.GameObjects.Text;
  private dailyVictoryCelebrated = false;

  /** Deferred merge queue processed outside the Matter solver loop. */
  private pendingMerges: MergePlan[] = [];
  private mergingFruitIds = new Set<number>();

  constructor() { super({ key: 'GameplayScene' }); }

  create(): void {
    const { width, height } = this.scale;
    this.layout = computeBucketLayout(width, height);
    drawBackground(this);

    this.fruits = [];
    this.fruitsById.clear();
    this.nextFruitId = 1;
    this.pendingMerges = [];
    this.mergingFruitIds.clear();
    this.gameOverTriggered = false;
    this.lastMotionMs = 0;
    this.wasNearDanger = false;
    this.dangerStartTime = null;

    this.setupPhysics();
    this.drawBucket();
    this.drawDangerLine();
    this.createAimLine();
    this.createHud();

    this.dangerCountdownText = this.add.text(width / 2, this.layout.dangerY - 32, '', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FF1E56',
    }).setOrigin(0.5).setStroke('#FFFFFF', 8).setDepth(z.overlay + 10).setAlpha(0);
    this.createComboPopup();
    this.createGhost();
    this.setupCollisions();

    drawMuteButton(this);

    ctx.engine.startNewGame();
    this.ghostTier = ctx.engine.nextFruit();
    this.ghostX = Phaser.Math.Clamp(width / 2, this.layout.bucketX0 + fruitRadius(this.ghostTier), this.layout.bucketX1 - fruitRadius(this.ghostTier));
    this.refreshGhost();
    this.updateNextFruitHud();

    this.bindInput();
  }

  // --- Physics world --------------------------------------------------------
  private setupPhysics(): void {
    this.matter.world.setGravity(0, CONFIG.physics.gravityY, 0.001);
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height, 100, true, true, false, true);
    this.buildBucketWalls();
    this.matter.world.resume();
  }

  private buildBucketWalls(): void {
    const L = this.layout;
    const wallThick = 60;
    const floorThick = 80;
    const topY = L.spawnY - 40;
    const H = L.bucketBottomY - topY;
    const midY = (topY + L.bucketBottomY) / 2;
    const opt = { isStatic: true, restitution: CONFIG.physics.restitution, friction: CONFIG.physics.friction };

    // Left wall
    this.matter.add.rectangle(L.bucketX0 - wallThick / 2, midY, wallThick, H, opt);
    // Right wall
    this.matter.add.rectangle(L.bucketX1 + wallThick / 2, midY, wallThick, H, opt);
    // Floor (thick 80px static block whose top surface sits exactly at bucketBottomY)
    this.matter.add.rectangle(
      (L.bucketX0 + L.bucketX1) / 2,
      L.bucketBottomY + floorThick / 2,
      L.bucketWidth + 2 * wallThick,
      floorThick,
      opt,
    );
  }

  // --- Bucket visual (Clean container with transparent interior) ------------
  private drawBucket(): void {
    const L = this.layout;
    const H = L.bucketBottomY - L.bucketTopY;
    const g = this.add.graphics().setDepth(z.bg + 1);

    // Subtle clear glass interior fill
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(L.bucketX0, L.bucketTopY, L.bucketWidth, H, { tl: 0, tr: 0, bl: radius.md, br: radius.md });

    // Inner subtle shadow & sheen
    g.fillStyle(0x000000, 0.04);
    g.fillRect(L.bucketX0, L.bucketTopY, 12, H);
    g.fillRect(L.bucketX1 - 12, L.bucketTopY, 12, H);

    // Left wooden pillar
    g.fillStyle(0x8B5A2B, 1);
    g.fillRoundedRect(L.bucketX0 - 14, L.bucketTopY - 10, 14, H + 10, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(0xA67039, 1);
    g.fillRect(L.bucketX0 - 12, L.bucketTopY - 6, 4, H + 4);

    // Right wooden pillar
    g.fillStyle(0x8B5A2B, 1);
    g.fillRoundedRect(L.bucketX1, L.bucketTopY - 10, 14, H + 10, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(0xA67039, 1);
    g.fillRect(L.bucketX1 + 2, L.bucketTopY - 6, 4, H + 4);

    // Bottom wooden base & floor beam
    g.fillStyle(0x4A2800, 0.3);
    g.fillRoundedRect(L.bucketX0 - 20, L.bucketBottomY + 4, L.bucketWidth + 40, 28, radius.sm);
    g.fillStyle(0x6D4018, 1);
    g.fillRoundedRect(L.bucketX0 - 20, L.bucketBottomY, L.bucketWidth + 40, 26, radius.sm);
    g.fillStyle(0x8B5A2B, 1);
    g.fillRect(L.bucketX0 - 18, L.bucketBottomY + 2, L.bucketWidth + 36, 6);
    g.fillStyle(0xA67039, 1);
    g.fillRect(L.bucketX0 - 18, L.bucketBottomY + 3, L.bucketWidth + 36, 2);

    // Container anchor for QA
    const bucket = this.add.container(L.bucketX0, L.bucketTopY).setDepth(z.actor);
    bucket.setSize(L.bucketWidth, H);
    bucket.setData('testid', 'bucket');
  }

  // --- Aim Line (Drop guide line) --------------------------------------------
  private createAimLine(): void {
    this.aimLine = this.add.graphics().setDepth(z.bg + 2);
    this.refreshAimLine();
  }

  private refreshAimLine(): void {
    if (!this.aimLine) return;
    this.aimLine.clear();
    if (this.gameOverTriggered) return;

    const r = fruitRadius(this.ghostTier);
    const startY = this.layout.spawnY + r + 4;
    const endY = this.layout.bucketBottomY - 10;

    this.aimLine.lineStyle(2, 0x8B5A2B, 0.35);
    const dash = 12, gap = 8;
    for (let y = startY; y < endY; y += dash + gap) {
      const y2 = Math.min(y + dash, endY);
      this.aimLine.beginPath();
      this.aimLine.moveTo(this.ghostX, y);
      this.aimLine.lineTo(this.ghostX, y2);
      this.aimLine.strokePath();
    }
  }

  // --- Danger line -----------------------------------------------------------
  private drawDangerLine(): void {
    const L = this.layout;
    const g = this.add.graphics().setDepth(z.hud);
    this.drawDangerLineStroke(g, 0.7);
    g.setData('testid', 'danger-line');
    this.dangerLine = g;
  }

  private drawDangerLineStroke(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const L = this.layout;
    g.clear();
    g.lineStyle(4, toColor(color.danger), alpha);
    const dash = 22, gap = 14;
    for (let x = L.bucketX0; x < L.bucketX1; x += dash + gap) {
      const x2 = Math.min(x + dash, L.bucketX1);
      g.beginPath();
      g.moveTo(x, L.dangerY);
      g.lineTo(x2, L.dangerY);
      g.strokePath();
    }
  }

  private refreshDangerLine(nearDanger: boolean): void {
    if (nearDanger) {
      if (!this.dangerLine.getData('pulsing')) {
        this.dangerLine.setData('pulsing', true);
        this.tweens.add({
          targets: this.dangerLine,
          alpha: { from: 1, to: 0.3 },
          duration: 350,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.tweens.killTweensOf(this.dangerLine);
      this.dangerLine.setData('pulsing', false);
      this.drawDangerLineStroke(this.dangerLine, 0.7);
      this.dangerLine.setAlpha(1);
    }
  }

  // --- Update loop & Settle detection ----------------------------------------
  update(time: number): void {
    if (this.pendingMerges.length > 0) {
      this.processPendingMerges();
    }

    if (this.gameOverTriggered) return;
    if (this.fruits.length === 0 || this.isShakingBucket) {
      this.lastMotionMs = time;
      this.dangerStartTime = null;
      this.dangerCountdownText?.setAlpha(0);
      this.refreshDangerLine(false);
      return;
    }

    const atRest = this.fruits.map((f) => this.isBodyAtRest(f.obj));
    const anyMoving = atRest.some((r) => !r);
    if (anyMoving) this.lastMotionMs = time;

    // Check which fruits are established (not fresh drops) and overflowing the danger line
    const isAboveDanger = (f: DroppedFruit): boolean => {
      const spawnTime = f.obj.getData('spawnTime') as number | undefined;
      if (typeof spawnTime === 'number' && time - spawnTime < 1000) {
        return false; // Still falling from drop
      }
      const r = fruitRadius(f.tier);
      // Overflowing if center is above line OR top edge is significantly above line
      return f.obj.y < this.layout.dangerY || (f.obj.y - r * 0.4) < this.layout.dangerY;
    };

    const hasDangerFruit = this.fruits.some(isAboveDanger);
    const nearDanger = hasDangerFruit || this.fruits.some((f) => f.obj.y < this.layout.dangerY + DANGER_NEAR_BAND);
    this.refreshDangerLine(nearDanger);

    if (hasDangerFruit) {
      if (this.dangerStartTime === null) {
        this.dangerStartTime = time;
        this.playSfx('sfx_danger');
      }

      const elapsed = time - this.dangerStartTime;
      const remainingSec = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
      this.dangerCountdownText.setText(`⚠️ DANGER: ${remainingSec}s`).setAlpha(1);

      if (elapsed >= 3000) {
        this.dangerCountdownText.setAlpha(0);
        this.dangerStartTime = null;
        this.wasNearDanger = false;
        this.triggerGameOver();
        return;
      }
    } else {
      if (this.dangerStartTime !== null) {
        this.dangerStartTime = null;
        this.wasNearDanger = false;
        this.dangerCountdownText.setAlpha(0);
      }
    }
  }

  private isBodyAtRest(obj: Phaser.Physics.Matter.Image): boolean {
    const spawnTime = obj.getData('spawnTime') as number | undefined;
    if (typeof spawnTime === 'number' && this.time.now - spawnTime < 1000) {
      return false;
    }
    const b = obj.body as unknown as RestBody | null;
    if (!b) return true;
    if (b.isSleeping) return true;
    return typeof b.speed === 'number' && b.speed < MOVE_SPEED_EPS;
  }

  isGameOver(): boolean { return this.gameOverTriggered; }

  private triggerGameOver(): void {
    this.gameOverTriggered = true;
    this.dangerStartTime = null;
    this.dangerCountdownText?.setAlpha(0);
    this.refreshDangerLine(false);
    this.input.enabled = false;
    this.aimLine.clear();
    this.matter.world.pause();
    this.playSfx('sfx_gameover');
    ctx.engine.setGameOver(true, true);
    this.scene.pause();
    this.scene.launch('GameOverScene');
  }

  clearFruitsAboveDanger(): void {
    // 1. Find all fruits whose top is overflowing or near the danger line
    const overflowing = this.fruits.filter((f) => {
      const r = fruitRadius(f.tier);
      return f.obj.y - r < this.layout.dangerY + 40 || f.obj.y < this.layout.dangerY;
    });

    // 2. Ensure at least top 3 fruits in the bucket are cleared for plenty of breathing room
    const sorted = [...this.fruits].sort((a, b) => a.obj.y - b.obj.y);
    const toRemoveSet = new Set<DroppedFruit>(overflowing);
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const topFruit = sorted[i];
      if (topFruit) toRemoveSet.add(topFruit);
    }

    // 3. Despawn selected fruits with satisfying juice burst
    for (const f of toRemoveSet) {
      playJuiceSplash(this, f.obj.x, f.obj.y, f.tier);
      this.removeFruit(f);
    }

    // 4. Give remaining fruits a downward settling impulse
    for (const f of this.fruits) {
      f.obj.setVelocity(0, 3);
    }

    this.gameOverTriggered = false;
    this.dangerStartTime = null;
    this.dangerCountdownText?.setAlpha(0);
    this.refreshDangerLine(false);
    this.input.enabled = true;
    this.lastMotionMs = this.time.now;
    this.refreshAimLine();
    this.matter.world.resume();
    this.updateHud();
  }

  // --- HUD & Strategic Power-ups --------------------------------------------
  private createHud(): void {
    const { width } = this.scale;

    // 1. Score & Best Score Card
    const scoreX = 24;
    const scoreBg = this.add.graphics().setDepth(z.hud);
    scoreBg.fillStyle(toColor(color.surface), 0.94);
    scoreBg.fillRoundedRect(scoreX, 16, 166, 56, radius.md);
    scoreBg.lineStyle(2, toColor(color.primary), 0.5);
    scoreBg.strokeRoundedRect(scoreX, 16, 166, 56, radius.md);

    this.scoreText = this.add.text(scoreX + 14, 33, 'SCORE 0', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#1F2937',
    }).setOrigin(0, 0.5).setDepth(z.hud + 1);
    this.scoreText.setData('testid', 'score-label');

    this.bestScoreText = this.add.text(scoreX + 14, 55, `BEST ${ctx.engine.state.bestScore}`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#D97706',
    }).setOrigin(0, 0.5).setDepth(z.hud + 1);

    // 2. Next Fruit & Swap Button
    this.swapButtonBaseX = 198;
    const swapContainer = this.add.container(this.swapButtonBaseX, 16).setDepth(z.hud);
    this.swapButtonContainer = swapContainer;
    swapContainer.setData('testid', 'next-fruit');

    const swapBg = this.add.graphics();
    swapBg.fillStyle(toColor(color.surface), 0.94);
    swapBg.fillRoundedRect(0, 0, 200, 56, radius.md);
    swapBg.lineStyle(2, 0x3B82F6, 0.6);
    swapBg.strokeRoundedRect(0, 0, 200, 56, radius.md);
    swapContainer.add(swapBg);

    const swapTitle = this.add.text(10, 16, 'NEXT 🔄', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#2563EB',
    }).setOrigin(0, 0.5);
    swapContainer.add(swapTitle);

    this.swapCountText = this.add.text(10, 38, `x${ctx.engine.powerups.swapCount} Swap`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#10B981',
    }).setOrigin(0, 0.5);
    swapContainer.add(this.swapCountText);

    const key0 = resolveFruitTexture(this, 0);
    this.nextPreview1 = this.add.image(110, 28, key0).setDisplaySize(34, 34);
    this.nextPreview2 = this.add.image(160, 28, key0).setDisplaySize(24, 24).setAlpha(0.75);
    swapContainer.add(this.nextPreview1);
    swapContainer.add(this.nextPreview2);

    swapContainer.setSize(200, 56);
    swapContainer.setInteractive({ useHandCursor: true });
    swapContainer.on('pointerdown', () => this.onSwapFruit());

    // 3. Bucket Shake Button
    this.shakeButtonBaseX = 406;
    const shakeContainer = this.add.container(this.shakeButtonBaseX, 16).setDepth(z.hud);
    this.shakeButtonContainer = shakeContainer;
    shakeContainer.setData('testid', 'shake-btn');

    const shakeBg = this.add.graphics();
    shakeBg.fillStyle(toColor(color.surface), 0.94);
    shakeBg.fillRoundedRect(0, 0, 110, 56, radius.md);
    shakeBg.lineStyle(2, 0x8B5CF6, 0.6);
    shakeBg.strokeRoundedRect(0, 0, 110, 56, radius.md);
    shakeContainer.add(shakeBg);

    const shakeTitle = this.add.text(55, 18, '📳 SHAKE', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#7C3AED',
    }).setOrigin(0.5);
    shakeContainer.add(shakeTitle);

    this.shakeCountText = this.add.text(55, 38, `x${ctx.engine.powerups.shakeCount}`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#8B5CF6',
    }).setOrigin(0.5);
    shakeContainer.add(this.shakeCountText);

    shakeContainer.setSize(110, 56);
    shakeContainer.setInteractive({ useHandCursor: true });
    shakeContainer.on('pointerdown', () => this.onShakeBucket());

    // 4. Fruit Album Button 📖
    const albumContainer = this.add.container(524, 16).setDepth(z.hud);
    const albumBg = this.add.graphics();
    albumBg.fillStyle(toColor(color.surface), 0.94);
    albumBg.fillRoundedRect(0, 0, 56, 56, radius.md);
    albumBg.lineStyle(2, 0x10B981, 0.6);
    albumBg.strokeRoundedRect(0, 0, 56, 56, radius.md);
    albumContainer.add(albumBg);

    const albumIcon = this.add.text(28, 28, '📖', { fontSize: '24px' }).setOrigin(0.5);
    albumContainer.add(albumIcon);
    albumContainer.setSize(56, 56);
    albumContainer.setInteractive({ useHandCursor: true });
    albumContainer.on('pointerdown', () => {
      this.lastUiClickTime = this.time.now;
      this.scene.pause();
      this.scene.launch('AlbumScene', { returnScene: 'GameplayScene' });
    });

    // 5. Daily Challenge Sub-Header Banner (if active)
    if (ctx.isDailyMode) {
      const bannerW = 500;
      const bannerH = 40;
      const bannerY = 88;
      const bannerBg = this.add.graphics().setDepth(z.hud);
      bannerBg.fillStyle(0xFFFFFF, 0.96);
      bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 20);
      bannerBg.lineStyle(2, 0xF59E0B, 0.9);
      bannerBg.strokeRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 20);

      this.dailyBannerText = this.add.text(width / 2, bannerY + bannerH / 2, `📅 Thử Thách: Còn 50 quả   •   Mục tiêu: ${DAILY_TARGET_SCORE}đ 🎯`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#B45309',
      }).setOrigin(0.5).setDepth(z.hud + 1);
    }

    this.updateHud();
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${ctx.engine.state.score}`);
    this.bestScoreText.setText(`BEST ${Math.max(ctx.engine.state.bestScore, ctx.engine.state.score)}`);
    if (this.swapCountText) {
      this.swapCountText.setText(`x${ctx.engine.powerups.swapCount} Swap`);
      this.swapCountText.setColor(ctx.engine.powerups.swapCount > 0 ? '#10B981' : '#9CA3AF');
    }
    if (this.shakeCountText) {
      this.shakeCountText.setText(`x${ctx.engine.powerups.shakeCount}`);
      this.shakeCountText.setColor(ctx.engine.powerups.shakeCount > 0 ? '#8B5CF6' : '#9CA3AF');
    }
    if (this.dailyBannerText && ctx.isDailyMode) {
      const remaining = ctx.engine.state.dailyDropsRemaining;
      const reached = ctx.engine.state.score >= DAILY_TARGET_SCORE;
      if (reached) {
        this.dailyBannerText.setText(`🎉 HOÀN THÀNH: ${ctx.engine.state.score}/${DAILY_TARGET_SCORE}đ (Còn ${remaining} quả) 🏆`);
        this.dailyBannerText.setColor('#059669');
      } else {
        this.dailyBannerText.setText(`📅 Thử Thách: Còn ${remaining}/50 quả   •   Mục tiêu: ${DAILY_TARGET_SCORE}đ 🎯`);
        this.dailyBannerText.setColor('#B45309');
      }
    }
    this.updateNextFruitHud();
  }

  private updateNextFruitHud(): void {
    if (!this.nextPreview1 || !this.nextPreview2) return;
    const nextTiers = ctx.engine.peekNext();
    const t1 = nextTiers[0] ?? 0;
    const t2 = nextTiers[1] ?? 0;

    const key1 = resolveFruitTexture(this, t1);
    const key2 = resolveFruitTexture(this, t2);

    this.nextPreview1.setTexture(key1);
    this.nextPreview2.setTexture(key2);
  }

  // --- Swap & Shake Handlers -------------------------------------------------
  private onSwapFruit(): void {
    this.lastUiClickTime = this.time.now;
    if (this.gameOverTriggered) return;
    if (!ctx.engine.canSwap()) {
      // Gentle reject wobble
      this.tweens.add({
        targets: this.swapButtonContainer,
        x: { from: this.swapButtonBaseX - 5, to: this.swapButtonBaseX + 5 },
        duration: 40,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.swapButtonContainer.setX(this.swapButtonBaseX),
      });
      return;
    }

    const { success, newGhostTier } = ctx.engine.swapGhost(this.ghostTier);
    if (!success) return;

    this.ghostTier = newGhostTier;
    this.refreshGhost();
    this.updateHud();

    // Visual & audio feedback
    this.playSfx('sfx_drop', 0.6, 500);
    this.tweens.add({
      targets: this.ghost,
      scaleX: { from: 0.2, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: dur.pop,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.swapButtonContainer,
      scaleX: { from: 0.95, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      duration: dur.fast,
      ease: 'Back.easeOut',
    });
  }

  private onShakeBucket(): void {
    this.lastUiClickTime = this.time.now;
    if (this.gameOverTriggered || this.isShakingBucket) return;
    if (!ctx.engine.canShake()) {
      // Gentle reject wobble
      this.tweens.add({
        targets: this.shakeButtonContainer,
        x: { from: this.shakeButtonBaseX - 5, to: this.shakeButtonBaseX + 5 },
        duration: 40,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.shakeButtonContainer.setX(this.shakeButtonBaseX),
      });
      return;
    }

    if (!ctx.engine.useShake()) return;
    this.isShakingBucket = true;
    this.updateHud();

    // Camera shake + audio
    this.cameras.main.shake(1200, 0.005);
    this.playSfx('sfx_pop', 0.8, -300);

    const startTime = this.time.now;
    const shakeDurationMs = 1200;

    const timer = this.time.addEvent({
      delay: 16,
      repeat: Math.floor(shakeDurationMs / 16),
      callback: () => {
        const elapsed = (this.time.now - startTime) / 1000;
        for (let i = 0; i < this.fruits.length; i++) {
          const f = this.fruits[i];
          const b = f.obj.body as MatterJS.BodyType | undefined;
          if (!b) continue;
          const { fx, fy } = computeShakeImpulse(b.mass ?? 1, elapsed, i);
          f.obj.applyForce(new Phaser.Math.Vector2(fx, fy));
        }
      },
    });

    this.time.delayedCall(shakeDurationMs + 50, () => {
      this.isShakingBucket = false;
      this.lastMotionMs = this.time.now;
    });

    this.tweens.add({
      targets: this.shakeButtonContainer,
      scaleX: { from: 0.95, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      duration: dur.fast,
      ease: 'Back.easeOut',
    });
  }

  private floatPowerupPopup(text: string, x: number, y: number, colorHex: string): void {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: colorHex,
    }).setOrigin(0.5).setDepth(z.overlay + 5).setStroke('#FFFFFF', 6).setScale(0.5);

    this.tweens.add({
      targets: txt,
      scale: 1.25,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          y: y - 50,
          duration: dur.base + 100,
          ease: 'Cubic.easeOut',
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  private celebrateNewRecord(): void {
    const { width } = this.scale;
    const cy = this.layout.dangerY - 50;

    // Golden sparks
    playJackpotClimax(this, width / 2, cy);
    this.playSfx('sfx_merge_big', 0.8, 200);

    const banner = this.add.text(width / 2, cy, '🎉 NEW RECORD! 🎉', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#F59E0B',
    }).setOrigin(0.5).setDepth(z.overlay + 10).setStroke('#FFFFFF', 8).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: banner,
      scale: 1.2,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: cy - 60,
          duration: dur.slow,
          delay: 800,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private celebrateNewFruitDiscovery(name: string): void {
    const { width } = this.scale;
    const cy = this.layout.dangerY - 50;

    playJackpotClimax(this, width / 2, cy);
    this.playSfx('sfx_merge_big', 0.9, 300);

    const banner = this.add.text(width / 2, cy, `🌟 MỞ KHÓA MỚI: ${name.toUpperCase()}! 🌟`, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#10B981',
    }).setOrigin(0.5).setDepth(z.overlay + 10).setStroke('#FFFFFF', 8).setScale(0.4).setAlpha(0);

    const subBanner = this.add.text(width / 2, cy + 32, '+1 Swap 🔄 & +1 Shake 📳', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#3B82F6',
    }).setOrigin(0.5).setDepth(z.overlay + 10).setStroke('#FFFFFF', 6).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: [banner, subBanner],
      scale: 1.15,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [banner, subBanner],
          alpha: 0,
          y: '-=50',
          duration: dur.slow,
          delay: 1400,
          onComplete: () => {
            banner.destroy();
            subBanner.destroy();
          },
        });
      },
    });
  }

  private celebrateDailyVictory(): void {
    const { width } = this.scale;
    const cy = this.layout.dangerY - 50;

    playJackpotClimax(this, width / 2, cy);
    this.playSfx('sfx_merge_big', 0.9, 200);

    const banner = this.add.text(width / 2, cy, `🏆 ĐẠT MỤC TIÊU NGÀY (${DAILY_TARGET_SCORE}đ)! 🏆`, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#F59E0B',
    }).setOrigin(0.5).setDepth(z.overlay + 10).setStroke('#FFFFFF', 8).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: banner,
      scale: 1.2,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: cy - 60,
          duration: dur.slow,
          delay: 1200,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  // --- Combo popup -----------------------------------------------------------
  private createComboPopup(): void {
    const cx = (this.layout.bucketX0 + this.layout.bucketX1) / 2;
    const cy = this.layout.bucketTopY + this.layout.bucketHeight * 0.12;
    this.comboPopup = this.add.text(cx, cy, '', fontStyle(type.h1, color.warning))
      .setOrigin(0.5).setDepth(z.hud).setAlpha(0).setStroke(color.textStroke, 6);
    this.comboPopup.setData('testid', 'combo-popup');
  }

  private flashCombo(): void {
    const n = ctx.engine.state.comboCount;
    if (n < 2) return;

    // Dynamic colors per combo intensity
    const comboColors = ['#FFC048', '#FF9F1A', '#FF5252', '#FF1493', '#9B59B6', '#00D2D3'];
    const colHex = comboColors[Math.min(n - 2, comboColors.length - 1)] ?? '#FFC048';

    this.comboPopup.setText(`Combo x${n}`);
    this.comboPopup.setColor(colHex);
    this.comboPopup.setAlpha(1);
    this.comboPopup.setScale(0.5);

    this.tweens.killTweensOf(this.comboPopup);
    this.tweens.add({
      targets: this.comboPopup,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: { from: 1, to: 0 },
      y: { from: this.comboPopup.y, to: this.comboPopup.y - 45 },
      duration: dur.slow + 100,
      ease: 'Back.easeOut',
    });
  }

  private floatScorePopup(gain: number, x: number, y: number): void {
    const txt = this.add.text(x, y, `+${gain}`, fontStyle(type.score, color.warning))
      .setOrigin(0.5).setDepth(z.hud).setStroke(color.textStroke, 6);
    txt.setScale(0.5);

    this.tweens.add({
      targets: txt,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          y: y - 55,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: dur.base + 100,
          ease: 'Cubic.easeOut',
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // --- Ghost (drop guide) ----------------------------------------------------
  private createGhost(): void {
    const key = resolveFruitTexture(this, this.ghostTier);
    const d = fruitDiameter(this.ghostTier);
    this.ghost = this.add.image(this.ghostX, this.layout.spawnY, key)
      .setDisplaySize(d, d).setAlpha(0.88).setDepth(z.hud);
    this.ghost.setData('testid', 'drop-ghost');
    this.refreshGhost();
  }

  private refreshGhost(): void {
    const key = resolveFruitTexture(this, this.ghostTier);
    const d = fruitDiameter(this.ghostTier);
    this.ghost.setTexture(key);
    this.ghost.setDisplaySize(d, d);
    this.ghostX = this.clampGhostX(this.ghostX);
    this.ghost.setPosition(this.ghostX, this.layout.spawnY);
    this.ghost.setAlpha(0.88);
    this.refreshAimLine();
  }

  private clampGhostX(x: number): number {
    const r = fruitRadius(this.ghostTier);
    const L = this.layout;
    return Phaser.Math.Clamp(x, L.bucketX0 + r, L.bucketX1 - r);
  }

  // --- Input -----------------------------------------------------------------
  private bindInput(): void {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.worldY < this.layout.spawnY - 30) return;
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY < this.layout.spawnY - 30) return;
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.worldY < this.layout.spawnY - 30) return;
      if (this.time.now - this.lastUiClickTime < 350) return;
      this.tryDrop();
    });
  }

  private tryDrop(): void {
    const now = this.time.now;
    if (!ctx.engine.canDrop(now)) return;
    const tier = this.ghostTier;
    ctx.engine.recordDrop(now);
    this.lastMotionMs = now;
    this.spawnFruit(tier, this.ghostX, this.layout.spawnY);
    this.playSfx('sfx_drop');

    this.ghostTier = ctx.engine.nextFruit();
    this.refreshGhost();
    this.updateHud();

    if (ctx.isDailyMode && ctx.engine.state.dailyDropsRemaining <= 0) {
      this.time.delayedCall(2000, () => {
        if (!this.gameOverTriggered) {
          this.triggerGameOver();
        }
      });
    }
  }

  private spawnFruit(tier: number, x: number, y: number): DroppedFruit {
    const key = resolveFruitTexture(this, tier);
    const r = fruitRadius(tier);
    const d = fruitDiameter(tier);
    const fruit = this.matter.add.image(x, y, key);
    fruit.setDisplaySize(d, d);
    fruit.setCircle(r, {
      restitution: CONFIG.physics.restitution,
      friction: CONFIG.physics.friction,
    });
    fruit.setOrigin(0.5, 0.5);
    fruit.setDepth(z.actor);
    const id = this.nextFruitId++;
    fruit.setData('id', id);
    fruit.setData('tier', tier);
    fruit.setData('spawnTime', this.time.now);
    const df: DroppedFruit = { id, obj: fruit, tier };
    this.fruits.push(df);
    this.fruitsById.set(id, df);
    return df;
  }

  private removeFruit(df: DroppedFruit): void {
    this.tweens.killTweensOf(df.obj);
    this.mergingFruitIds.delete(df.id);
    this.fruitsById.delete(df.id);
    const i = this.fruits.indexOf(df);
    if (i >= 0) this.fruits.splice(i, 1);
    df.obj.destroy();
  }

  // --- Collision -> Safe Deferred Merge -------------------------------------
  private setupCollisions(): void {
    this.matter.world.on('collisionstart', (event: CollisionEventHandle) => {
      this.collectCollisions(event);
    });
    this.matter.world.on('collisionactive', (event: CollisionEventHandle) => {
      this.collectCollisions(event);
    });
  }

  private collectCollisions(event: CollisionEventHandle): void {
    if (this.gameOverTriggered) return;
    for (const pair of event.pairs) {
      const a = fruitOf(pair.bodyA);
      const b = fruitOf(pair.bodyB);
      if (!a || !b) continue;
      if (a.id === b.id) continue;
      if (a.tier !== b.tier) continue;
      if (this.mergingFruitIds.has(a.id) || this.mergingFruitIds.has(b.id)) continue;

      const now = this.time.now;
      const result = ctx.engine.merge(a.tier, b.tier, now);
      if (!result) continue;

      this.mergingFruitIds.add(a.id);
      this.mergingFruitIds.add(b.id);
      this.pendingMerges.push({
        aId: a.id,
        bId: b.id,
        newTier: result.tier,
        scoreGain: result.scoreGain,
      });
    }
  }

  private processPendingMerges(): void {
    const plans = [...this.pendingMerges];
    this.pendingMerges = [];
    let bigMerge = false;

    for (const plan of plans) {
      const a = this.fruitsById.get(plan.aId);
      const b = this.fruitsById.get(plan.bId);
      if (!a || !b) continue;

      const midX = (a.obj.x + b.obj.x) / 2;
      const midY = (a.obj.y + b.obj.y) / 2;

      this.removeFruit(a);
      this.removeFruit(b);

      const merged = this.spawnFruit(plan.newTier, midX, midY);
      merged.obj.setVelocity(0, -1.5);

      // Visual juice: shockwave + colored radial juice droplets
      playJuiceSplash(this, midX, midY, plan.newTier);
      this.floatScorePopup(plan.scoreGain, midX, midY - 12);
      this.flashCombo();

      if (plan.newTier >= CONFIG.maxTier - 1) {
        bigMerge = true;
        playJackpotClimax(this, midX, midY);
      }
    }

    if (plans.length > 0) {
      this.lastMotionMs = this.time.now;
      
      // 1. Process Fruit Discovery in Album
      for (const plan of plans) {
        ctx.discoverFruit(plan.newTier).then(({ isNew, info }) => {
          if (isNew) {
            this.celebrateNewFruitDiscovery(info.name);
            ctx.engine.addSwap(1);
            ctx.engine.addShake(1);
            this.updateHud();
          }
        });
      }

      // 2. Process Milestone rewards and New Record
      const { reward, isNewRecordBroken } = ctx.engine.processMergeMilestones();
      const lastPlan = plans[plans.length - 1];
      const popX = lastPlan ? (this.fruitsById.get(lastPlan.aId)?.obj.x ?? this.scale.width / 2) : this.scale.width / 2;
      const popY = this.layout.bucketTopY + 80;

      if (reward === 'swap') {
        this.floatPowerupPopup('+1 SWAP 🔄', popX, popY, '#10B981');
      } else if (reward === 'shake') {
        this.floatPowerupPopup('+1 SHAKE 📳', popX, popY, '#8B5CF6');
      }

      if (isNewRecordBroken) {
        this.celebrateNewRecord();
      }

      // 3. Process Daily Challenge Victory
      if (ctx.isDailyMode && ctx.engine.state.score >= DAILY_TARGET_SCORE && !this.dailyVictoryCelebrated) {
        this.dailyVictoryCelebrated = true;
        ctx.recordDailyVictory(ctx.engine.state.score);
        this.celebrateDailyVictory();
      }

      this.updateHud();
      const combo = ctx.engine.state.comboCount;
      const detune = computeComboDetune(combo);
      this.playSfx(bigMerge ? 'sfx_merge_big' : 'sfx_merge', 0.5, detune);
    }
  }

  // --- Audio hook with pitch detune support ---------------------------------
  private playSfx(key: string, volume = 0.5, detune = 0): void {
    if (!this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume, detune });
  }
}

function fruitOf(body: MatterBodyHandle | null | undefined): CollidingFruit | null {
  if (!body) return null;
  const anyBody = body as { gameObject?: unknown; parent?: { gameObject?: unknown } };
  const go = (anyBody.gameObject ?? anyBody.parent?.gameObject) as Phaser.Physics.Matter.Image | null;
  if (!go || typeof go.getData !== 'function') return null;
  const id = go.getData('id');
  const tier = go.getData('tier');
  if (typeof id !== 'number' || typeof tier !== 'number') return null;
  return { id, tier };
}

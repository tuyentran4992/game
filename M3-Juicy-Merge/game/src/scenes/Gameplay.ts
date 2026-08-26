import Phaser from 'phaser';
import { CONFIG } from '../logic/config';
import { ctx } from '../context';
import { color, z, type, fontStyle, toColor, dur, radius } from '../tokens';
import { drawBackground, drawMuteButton, drawButton } from '../ui';
import { computeBucketLayout, type BucketLayout } from '../gameplay/physics-layout';
import { resolveFruitTexture, fruitRadius, fruitDiameter } from '../gameplay/fruit-sprite';
import { type CollidingFruit, type MergePlan } from '../gameplay/merge-handler';
import { checkGameOver } from '../logic/game-over';
import { isWorldSettled } from '../logic/settle';
import { fruitsAboveLine } from '../logic/continue';
import { playJuiceSplash, playJackpotClimax, playFireworksCelebration, computeComboDetune } from '../gameplay/juice-effects';
import { computeShakeImpulse } from '../logic/powerups';
import { DAILY_TARGET_SCORE } from '../logic/daily-challenge';
import { PauseModal } from '../ui/PauseModal';

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
  private cosmicVictoryCelebrated = false;
  private isPromptingRefill = false;
  private hasClaimedDailyExtraDrops = false;
  private isPaused = false;

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
    this.cosmicVictoryCelebrated = false;

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

  // --- Bucket visual (Playgama-grade 3D Acrylic Glass & Polished Cedar Wood) ------------
  private drawBucket(): void {
    const L = this.layout;
    const H = L.bucketBottomY - L.bucketTopY;
    const g = this.add.graphics().setDepth(z.bucketGlass);

    // 1. Soft Ambient Outer Drop Shadow (Triple-pass depth)
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(L.bucketX0 - 10, L.bucketTopY + 12, L.bucketWidth + 20, H + 16, { tl: 0, tr: 0, bl: radius.lg, br: radius.lg });

    // 2. Frosted Acrylic Glass Backplate (Glossy Translucent)
    g.fillStyle(0xFFFFFF, 0.42);
    g.fillRoundedRect(L.bucketX0, L.bucketTopY, L.bucketWidth, H, { tl: 0, tr: 0, bl: radius.md, br: radius.md });

    // Diagonal Specular Glossy Light Sheens on Glass
    g.fillStyle(0xFFFFFF, 0.18);
    g.beginPath();
    g.moveTo(L.bucketX0 + 30, L.bucketTopY);
    g.lineTo(L.bucketX0 + 90, L.bucketTopY);
    g.lineTo(L.bucketX0 + 20, L.bucketBottomY);
    g.lineTo(L.bucketX0 - 40, L.bucketBottomY);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xFFFFFF, 0.12);
    g.beginPath();
    g.moveTo(L.bucketX0 + 120, L.bucketTopY);
    g.lineTo(L.bucketX0 + 150, L.bucketTopY);
    g.lineTo(L.bucketX0 + 80, L.bucketBottomY);
    g.lineTo(L.bucketX0 + 50, L.bucketBottomY);
    g.closePath();
    g.fillPath();

    // Inner Glass Edge Highlights
    g.lineStyle(2.5, 0xFFFFFF, 0.9);
    g.strokeRoundedRect(L.bucketX0 + 1, L.bucketTopY + 1, L.bucketWidth - 2, H - 2, { tl: 0, tr: 0, bl: radius.md, br: radius.md });

    g.fillStyle(0x000000, 0.04);
    g.fillRect(L.bucketX0, L.bucketTopY, 16, H);
    g.fillRect(L.bucketX1 - 16, L.bucketTopY, 16, H);

    // 3. Left & Right 3D Cedar Wood Pillars with Gold Fittings
    const fg = this.add.graphics().setDepth(z.bucketFrame);

    // Left Pillar
    fg.fillStyle(0x000000, 0.22);
    fg.fillRoundedRect(L.bucketX0 - 20, L.bucketTopY - 14 + 6, 20, H + 16, 6);
    fg.fillStyle(0x5C3414, 1);
    fg.fillRoundedRect(L.bucketX0 - 20, L.bucketTopY - 14, 20, H + 16, 6);
    fg.fillStyle(0x9A6136, 1);
    fg.fillRect(L.bucketX0 - 18, L.bucketTopY - 12, 10, H + 12);
    fg.fillStyle(0xC7844E, 0.85);
    fg.fillRect(L.bucketX0 - 16, L.bucketTopY - 10, 4, H + 8);
    // Golden Dome Cap
    fg.fillStyle(0xF59E0B, 1);
    fg.fillCircle(L.bucketX0 - 10, L.bucketTopY - 16, 11);
    fg.fillStyle(0xFDE68A, 1);
    fg.fillCircle(L.bucketX0 - 12, L.bucketTopY - 18, 4);

    // Right Pillar
    fg.fillStyle(0x000000, 0.22);
    fg.fillRoundedRect(L.bucketX1, L.bucketTopY - 14 + 6, 20, H + 16, 6);
    fg.fillStyle(0x5C3414, 1);
    fg.fillRoundedRect(L.bucketX1, L.bucketTopY - 14, 20, H + 16, 6);
    fg.fillStyle(0x9A6136, 1);
    fg.fillRect(L.bucketX1 + 2, L.bucketTopY - 12, 10, H + 12);
    fg.fillStyle(0xC7844E, 0.85);
    fg.fillRect(L.bucketX1 + 4, L.bucketTopY - 10, 4, H + 8);
    // Golden Dome Cap
    fg.fillStyle(0xF59E0B, 1);
    fg.fillCircle(L.bucketX1 + 10, L.bucketTopY - 16, 11);
    fg.fillStyle(0xFDE68A, 1);
    fg.fillCircle(L.bucketX1 + 8, L.bucketTopY - 18, 4);

    // 4. Sturdy 3D Wooden Base Foundation & Floor Beam
    fg.fillStyle(0x000000, 0.28);
    fg.fillRoundedRect(L.bucketX0 - 26, L.bucketBottomY + 10, L.bucketWidth + 52, 34, radius.sm);
    // Dark bottom bevel
    fg.fillStyle(0x3B1A04, 1);
    fg.fillRoundedRect(L.bucketX0 - 26, L.bucketBottomY + 6, L.bucketWidth + 52, 30, radius.sm);
    // Main base body
    fg.fillStyle(0x6E3915, 1);
    fg.fillRoundedRect(L.bucketX0 - 26, L.bucketBottomY, L.bucketWidth + 52, 30, radius.sm);
    // Gold metallic top strip
    fg.fillStyle(0xF59E0B, 1);
    fg.fillRect(L.bucketX0 - 22, L.bucketBottomY + 2, L.bucketWidth + 44, 6);
    fg.fillStyle(0xFDE68A, 0.95);
    fg.fillRect(L.bucketX0 - 20, L.bucketBottomY + 3, L.bucketWidth + 40, 2);

    // Golden Corner Rivets
    fg.fillStyle(0xF59E0B, 1);
    fg.fillCircle(L.bucketX0 - 12, L.bucketBottomY + 17, 6);
    fg.fillCircle(L.bucketX1 + 12, L.bucketBottomY + 17, 6);
    fg.fillStyle(0xFDE68A, 1);
    fg.fillCircle(L.bucketX0 - 14, L.bucketBottomY + 15, 2.5);
    fg.fillCircle(L.bucketX1 + 10, L.bucketBottomY + 15, 2.5);

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

    this.aimLine.lineStyle(2, 0x9A6136, 0.4);
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
    this.drawDangerLineStroke(g, 0.8);
    g.setData('testid', 'danger-line');
    this.dangerLine = g;
  }

  private drawDangerLineStroke(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const L = this.layout;
    g.clear();
    // Ambient red glow behind danger line
    g.lineStyle(8, 0xEF4444, alpha * 0.35);
    g.lineBetween(L.bucketX0, L.dangerY, L.bucketX1, L.dangerY);

    // Crisp dashed hazard line
    g.lineStyle(3.5, 0xEF4444, alpha);
    const dash = 20, gap = 12;
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
          alpha: { from: 1, to: 0.25 },
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.tweens.killTweensOf(this.dangerLine);
      this.dangerLine.setData('pulsing', false);
      this.drawDangerLineStroke(this.dangerLine, 0.8);
      this.dangerLine.setAlpha(1);
    }
  }

  // --- Update loop & Settle detection ----------------------------------------
  update(time: number): void {
    if (this.isPaused) return;
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
      if (this.isPromptingRefill) {
        this.dangerStartTime = null;
        this.dangerCountdownText?.setAlpha(0);
        return;
      }

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

  // --- Reset/Continue Hook ---------------------------------------------------
  clearFruitsAboveDanger(): void {
    const time = this.time.now;
    const toRemoveSet = new Set<DroppedFruit>();

    // 1. Identify all fruits overflowing or touching danger line
    for (const f of this.fruits) {
      const r = fruitRadius(f.tier);
      if (f.obj.y < this.layout.dangerY || (f.obj.y - r * 0.5) < this.layout.dangerY) {
        toRemoveSet.add(f);
      }
    }

    // 2. Fallback: if no fruit was strictly above, clear the highest fruit
    if (toRemoveSet.size === 0 && this.fruits.length > 0) {
      let topFruit = this.fruits[0];
      for (const f of this.fruits) {
        if (f.obj.y < (topFruit?.obj.y ?? 9999)) topFruit = f;
      }
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

  // --- HUD & Strategic Power-ups (3D Candy Toy Badges) ------------
  private createHud(): void {
    const { width } = this.scale;

    // 1. Score & Best Score Plaque (Solar Gold 3D Toy Plaque)
    const scoreX = 10;
    const scoreW = 156;
    const scoreH = 72;
    const scoreBg = this.add.graphics().setDepth(z.hud);

    // Drop shadow
    scoreBg.fillStyle(0x000000, 0.22);
    scoreBg.fillRoundedRect(scoreX, 16 + 5, scoreW, scoreH, radius.md);
    // 3D Bevel Base (Amber dark)
    scoreBg.fillStyle(0xB45309, 1);
    scoreBg.fillRoundedRect(scoreX, 16 + 5, scoreW, scoreH, radius.md);
    // Main Solar Gold face
    scoreBg.fillStyle(0xF59E0B, 1);
    scoreBg.fillRoundedRect(scoreX, 16, scoreW, scoreH - 5, radius.md);
    // Specular shine
    scoreBg.fillStyle(0xFDE68A, 0.45);
    scoreBg.fillRoundedRect(scoreX + 6, 19, scoreW - 12, 26, radius.sm);
    scoreBg.lineStyle(2, 0x78350F, 0.9);
    scoreBg.strokeRoundedRect(scoreX, 16, scoreW, scoreH, radius.md);

    this.scoreText = this.add.text(scoreX + 10, 35, '💎 SCORE 0', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setStroke('#78350F', 5).setDepth(z.hud + 1);
    this.scoreText.setData('testid', 'score-label');

    this.bestScoreText = this.add.text(scoreX + 10, 60, `🏆 BEST ${ctx.engine.state.bestScore}`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FEF08A',
    }).setOrigin(0, 0.5).setStroke('#78350F', 4).setDepth(z.hud + 1);

    // 2. Next Fruit & Swap Powerup Capsule (Cyan Mint 3D Capsule)
    this.swapButtonBaseX = 174;
    const swapContainer = this.add.container(this.swapButtonBaseX, 16).setDepth(z.hud);
    this.swapButtonContainer = swapContainer;
    swapContainer.setData('testid', 'next-fruit');

    const swapW = 186;
    const swapH = 72;
    const swapBg = this.add.graphics();

    // Drop shadow
    swapBg.fillStyle(0x000000, 0.22);
    swapBg.fillRoundedRect(0, 5, swapW, swapH, radius.md);
    // 3D Bevel base (Dark Cyan)
    swapBg.fillStyle(0x047857, 1);
    swapBg.fillRoundedRect(0, 5, swapW, swapH, radius.md);
    // Main Mint Cyan face
    swapBg.fillStyle(0x06D6A0, 1);
    swapBg.fillRoundedRect(0, 0, swapW, swapH - 5, radius.md);
    // Specular gloss
    swapBg.fillStyle(0xA7F3D0, 0.45);
    swapBg.fillRoundedRect(6, 3, swapW - 12, 26, radius.sm);
    swapBg.lineStyle(2, 0x064E3B, 0.9);
    swapBg.strokeRoundedRect(0, 0, swapW, swapH, radius.md);

    // Circular glowing preview pedestals
    swapBg.fillStyle(0xFFFFFF, 0.92);
    swapBg.fillCircle(112, 33, 21);
    swapBg.lineStyle(2, 0x047857, 0.8);
    swapBg.strokeCircle(112, 33, 21);

    swapBg.fillStyle(0xFFFFFF, 0.88);
    swapBg.fillCircle(158, 33, 15);
    swapBg.lineStyle(1.5, 0x047857, 0.8);
    swapBg.strokeCircle(158, 33, 15);
    swapContainer.add(swapBg);

    const swapTitle = this.add.text(10, 23, 'NEXT 🔄', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setStroke('#064E3B', 5);
    swapContainer.add(swapTitle);

    this.swapCountText = this.add.text(10, 48, `x${ctx.engine.powerups.swapCount} Swap`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FEF08A',
    }).setOrigin(0, 0.5).setStroke('#064E3B', 4);
    swapContainer.add(this.swapCountText);

    const key0 = resolveFruitTexture(this, 0);
    this.nextPreview1 = this.add.image(112, 33, key0).setDisplaySize(36, 36);
    this.nextPreview2 = this.add.image(158, 33, key0).setDisplaySize(24, 24).setAlpha(0.85);
    swapContainer.add(this.nextPreview1);
    swapContainer.add(this.nextPreview2);

    // Exact geometric hit zone starting from 0, 0
    swapContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, swapW, swapH),
      Phaser.Geom.Rectangle.Contains
    );
    if (swapContainer.input) swapContainer.input.cursor = 'pointer';
    swapContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastUiClickTime = this.time.now;
      this.onSwapFruit();
    });

    // 3. Bucket Shake Button (Royal Purple 3D Candy Capsule)
    this.shakeButtonBaseX = 368;
    const shakeW = 104;
    const shakeH = 72;
    const shakeContainer = this.add.container(this.shakeButtonBaseX, 16).setDepth(z.hud);
    this.shakeButtonContainer = shakeContainer;
    shakeContainer.setData('testid', 'shake-btn');

    const shakeBg = this.add.graphics();
    // Drop shadow
    shakeBg.fillStyle(0x000000, 0.22);
    shakeBg.fillRoundedRect(0, 5, shakeW, shakeH, radius.md);
    // 3D Bevel base (Dark Purple)
    shakeBg.fillStyle(0x5B21B6, 1);
    shakeBg.fillRoundedRect(0, 5, shakeW, shakeH, radius.md);
    // Main Royal Purple face
    shakeBg.fillStyle(0x8B5CF6, 1);
    shakeBg.fillRoundedRect(0, 0, shakeW, shakeH - 5, radius.md);
    // Specular gloss
    shakeBg.fillStyle(0xDDD6FE, 0.45);
    shakeBg.fillRoundedRect(6, 3, shakeW - 12, 26, radius.sm);
    shakeBg.lineStyle(2, 0x4C1D95, 0.9);
    shakeBg.strokeRoundedRect(0, 0, shakeW, shakeH, radius.md);
    shakeContainer.add(shakeBg);

    const shakeTitle = this.add.text(52, 23, '📳 SHAKE', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5).setStroke('#4C1D95', 5);
    shakeContainer.add(shakeTitle);

    this.shakeCountText = this.add.text(52, 48, `x${ctx.engine.powerups.shakeCount}`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#FEF08A',
    }).setOrigin(0.5).setStroke('#4C1D95', 4);
    shakeContainer.add(this.shakeCountText);

    // Exact geometric hit zone starting from 0, 0
    shakeContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, shakeW, shakeH),
      Phaser.Geom.Rectangle.Contains
    );
    if (shakeContainer.input) shakeContainer.input.cursor = 'pointer';
    shakeContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastUiClickTime = this.time.now;
      this.onShakeBucket();
    });

    // 4. Fruit Album Button 📖 (Coral Emerald 3D Square)
    const albumContainer = this.add.container(480, 16).setDepth(z.hud);
    const albumW = 62;
    const albumH = 72;
    const albumBg = this.add.graphics();
    albumBg.fillStyle(0x000000, 0.22);
    albumBg.fillRoundedRect(0, 5, albumW, albumH, radius.md);
    albumBg.fillStyle(0x047857, 1);
    albumBg.fillRoundedRect(0, 5, albumW, albumH, radius.md);
    albumBg.fillStyle(0x10B981, 1);
    albumBg.fillRoundedRect(0, 0, albumW, albumH - 5, radius.md);
    albumBg.fillStyle(0xA7F3D0, 0.45);
    albumBg.fillRoundedRect(6, 3, albumW - 12, 26, radius.sm);
    albumBg.lineStyle(2, 0x064E3B, 0.9);
    albumBg.strokeRoundedRect(0, 0, albumW, albumH, radius.md);
    albumContainer.add(albumBg);

    const albumIcon = this.add.text(31, 33, '📖', { fontSize: '26px' }).setOrigin(0.5);
    albumContainer.add(albumIcon);

    // Exact geometric hit zone starting from 0, 0
    albumContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, albumW, albumH),
      Phaser.Geom.Rectangle.Contains
    );
    if (albumContainer.input) albumContainer.input.cursor = 'pointer';
    albumContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastUiClickTime = this.time.now;
      this.scene.pause();
      this.scene.launch('AlbumScene', { returnScene: 'GameplayScene' });
    });

    // 5. Pause Button ⏸️ (Slate Blue 3D Square)
    const pauseContainer = this.add.container(550, 16).setDepth(z.hud);
    const pauseW = 62;
    const pauseH = 72;
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.22);
    pauseBg.fillRoundedRect(0, 5, pauseW, pauseH, radius.md);
    pauseBg.fillStyle(0x1E293B, 1);
    pauseBg.fillRoundedRect(0, 5, pauseW, pauseH, radius.md);
    pauseBg.fillStyle(0x334155, 1);
    pauseBg.fillRoundedRect(0, 0, pauseW, pauseH - 5, radius.md);
    pauseBg.fillStyle(0x64748B, 0.45);
    pauseBg.fillRoundedRect(6, 3, pauseW - 12, 26, radius.sm);
    pauseBg.lineStyle(2, 0x0F172A, 0.9);
    pauseBg.strokeRoundedRect(0, 0, pauseW, pauseH, radius.md);
    pauseContainer.add(pauseBg);

    const pauseIcon = this.add.text(31, 33, '⏸️', { fontSize: '24px' }).setOrigin(0.5);
    pauseContainer.add(pauseIcon);

    pauseContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, pauseW, pauseH),
      Phaser.Geom.Rectangle.Contains
    );
    if (pauseContainer.input) pauseContainer.input.cursor = 'pointer';
    pauseContainer.on('pointerdown', () => {
      this.lastUiClickTime = this.time.now;
      this.onPauseGame();
    });

    // 5. Daily Challenge Sub-Header Banner (if active)
    if (ctx.isDailyMode) {
      const diff = ctx.getCurrentDailyDifficulty();
      const bannerW = Math.min(540, width - 40);
      const bannerH = 46;
      const bannerY = 100;
      const bannerBg = this.add.graphics().setDepth(z.hud);
      bannerBg.fillStyle(0x000000, 0.16);
      bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY + 4, bannerW, bannerH, 23);
      bannerBg.fillStyle(0xFFFFFF, 0.98);
      bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 23);
      bannerBg.lineStyle(2.5, 0xF59E0B, 1);
      bannerBg.strokeRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 23);

      this.dailyBannerText = this.add.text(width / 2, bannerY + bannerH / 2, `📅 Day ${diff.dayLevel}/12: ${diff.fruitLimit} fruits left   •   Goal: ${diff.targetScore} pts 🎯`, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#B45309',
      }).setOrigin(0.5).setDepth(z.hud + 1);
    }

    this.updateHud();
  }

  private updateHud(): void {
    this.scoreText.setText(`💎 SCORE ${ctx.engine.state.score}`);
    this.bestScoreText.setText(`🏆 BEST ${Math.max(ctx.engine.state.bestScore, ctx.engine.state.score)}`);
    if (this.swapCountText) {
      this.swapCountText.setText(`x${ctx.engine.powerups.swapCount} Swap`);
      this.swapCountText.setColor(ctx.engine.powerups.swapCount > 0 ? '#10B981' : '#9CA3AF');
    }
    if (this.shakeCountText) {
      this.shakeCountText.setText(`x${ctx.engine.powerups.shakeCount}`);
      this.shakeCountText.setColor(ctx.engine.powerups.shakeCount > 0 ? '#8B5CF6' : '#9CA3AF');
    }
    if (this.dailyBannerText && ctx.isDailyMode) {
      const diff = ctx.getCurrentDailyDifficulty();
      const remaining = ctx.engine.state.dailyDropsRemaining;
      const reached = ctx.engine.state.score >= diff.targetScore;
      if (reached) {
        this.dailyBannerText.setText(`🎉 DAY ${diff.dayLevel} COMPLETED: ${ctx.engine.state.score}/${diff.targetScore} pts (Left ${remaining}) 🏆`);
        this.dailyBannerText.setColor('#059669');
      } else {
        this.dailyBannerText.setText(`📅 Day ${diff.dayLevel}/12: ${remaining}/${diff.fruitLimit} fruits left   •   Goal: ${diff.targetScore} pts 🎯`);
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

    this.nextPreview1.setTexture(key1).setDisplaySize(34, 34);
    this.nextPreview2.setTexture(key2).setDisplaySize(24, 24);
  }

  // --- Swap & Shake Handlers -------------------------------------------------
  private onSwapFruit(): void {
    this.lastUiClickTime = this.time.now;
    if (this.gameOverTriggered) return;
    if (!ctx.engine.canSwap()) {
      this.promptRefillPowerups();
      return;
    }

    const { success, newGhostTier } = ctx.engine.swapGhost(this.ghostTier);
    if (!success) return;

    this.ghostTier = newGhostTier;
    this.refreshGhost();
    this.updateHud();

    // Visual & audio feedback
    this.playSfx('sfx_drop', 0.6, 500);
    const baseScaleX = this.ghost.scaleX;
    const baseScaleY = this.ghost.scaleY;
    this.tweens.add({
      targets: this.ghost,
      scaleX: { from: baseScaleX * 0.2, to: baseScaleX },
      scaleY: { from: baseScaleY * 1.3, to: baseScaleY },
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
      this.promptRefillPowerups();
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

  // --- Pause Modal & Menu Navigation -----------------------------------------
  private onPauseGame(): void {
    if (this.gameOverTriggered || this.isPromptingRefill || this.isPaused) return;
    this.isPaused = true;
    this.matter.world.pause();
    this.aimLine.clear();

    new PauseModal(this, {
      onResume: () => {
        this.isPaused = false;
        this.lastMotionMs = this.time.now;
        this.lastUiClickTime = this.time.now;
        this.matter.world.resume();
        this.refreshAimLine();
      },
      onRestart: () => {
        this.isPaused = false;
        this.lastMotionMs = this.time.now;
        this.lastUiClickTime = this.time.now;
        this.matter.world.resume();
        ctx.engine.startNewGame();
        for (const f of this.fruits) {
          this.removeFruit(f);
        }
        this.fruits = [];
        this.ghostTier = ctx.engine.nextFruit();
        this.refreshGhost();
        this.updateHud();
        this.refreshAimLine();
      },
      onHome: async () => {
        this.isPaused = false;
        await ctx.triggerSmartInterstitial();
        this.scene.stop('GameplayScene');
        this.scene.start('StartScene');
      },
    });
  }

  // --- Rewarded Ad Prompts & Rescue Power-ups ---------------------------------

  private promptRefillPowerups(): void {
    if (this.isPromptingRefill || this.gameOverTriggered) return;
    this.isPromptingRefill = true;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const backdrop = this.add.rectangle(cx, cy, width, height, 0x0F172A, 0.72)
      .setDepth(z.overlay + 20).setInteractive();

    const modal = this.add.container(cx, cy).setDepth(z.overlay + 21).setScale(0.85).setAlpha(0);
    const cardW = Math.min(520, width - 40);
    const cardH = 390;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.lg);
    bg.fillStyle(0xFFFFFF, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    bg.fillStyle(0x10B981, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 16, { tl: radius.lg, tr: radius.lg, bl: 0, br: 0 });
    bg.lineStyle(2.5, 0x10B981, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    const icon = this.add.text(0, -cardH / 2 + 50, '🎁', { fontSize: '40px' }).setOrigin(0.5);
    const title = this.add.text(0, -cardH / 2 + 95, 'REFILL POWER-UPS', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#065F46',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -cardH / 2 + 148, 'You are out of power-ups!\nWatch a short video to instantly receive\n+2 Swaps 🔄 & +2 Shakes 📳!', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      align: 'center',
      color: '#1E293B',
    }).setOrigin(0.5);
    modal.add([icon, title, desc]);

    const btnW = cardW - 64;
    const { container: watchBtn } = drawButton(this, 0, 50, '▶  WATCH AD (+2 🔄 & +2 📳)', {
      variant: 'emerald',
      width: btnW,
      height: 60,
      fontSize: 20,
    });
    modal.add(watchBtn);

    const { container: cancelBtn } = drawButton(this, 0, 122, '✕  CANCEL', {
      variant: 'ghost',
      width: btnW,
      height: 48,
      fontSize: 17,
    });
    modal.add(cancelBtn);

    const closeModal = (): void => {
      this.tweens.add({
        targets: modal,
        scale: 0.85,
        alpha: 0,
        duration: dur.fast,
        ease: 'Back.easeIn',
        onComplete: () => {
          backdrop.destroy();
          modal.destroy();
          this.isPromptingRefill = false;
        },
      });
    };

    cancelBtn.on('pointerdown', closeModal);
    backdrop.on('pointerdown', closeModal);

    watchBtn.on('pointerdown', async () => {
      watchBtn.disableInteractive();
      const success = await ctx.refillPowerupsViaAd();
      if (success) {
        closeModal();
        this.updateHud();
        this.floatPowerupPopup('+2 🔄 & +2 📳 ADDED!', cx, cy - 80, '#10B981');
        playFireworksCelebration(this, 4, z.overlay + 30);
      } else {
        watchBtn.setInteractive({ useHandCursor: true });
      }
    });

    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
    });
  }

  private showDailyExtraDropsModal(): void {
    if (this.gameOverTriggered) return;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const diff = ctx.getCurrentDailyDifficulty();
    const needed = diff.targetScore - ctx.engine.state.score;

    const backdrop = this.add.rectangle(cx, cy, width, height, 0x0F172A, 0.72)
      .setDepth(z.overlay + 20).setInteractive();

    const modal = this.add.container(cx, cy).setDepth(z.overlay + 21).setScale(0.85).setAlpha(0);
    const cardW = Math.min(520, width - 40);
    const cardH = 390;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.lg);
    bg.fillStyle(0xFFFFFF, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    bg.fillStyle(0xF59E0B, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 16, { tl: radius.lg, tr: radius.lg, bl: 0, br: 0 });
    bg.lineStyle(2.5, 0xF59E0B, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    const icon = this.add.text(0, -cardH / 2 + 50, '📅', { fontSize: '40px' }).setOrigin(0.5);
    const title = this.add.text(0, -cardH / 2 + 95, 'OUT OF DROPS!', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -cardH / 2 + 148, `You only need ${needed} pts to win Day ${diff.dayLevel}!\nWatch a short video to receive\n+15 EXTRA DROPS & save your streak?`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      align: 'center',
      color: '#1E293B',
    }).setOrigin(0.5);
    modal.add([icon, title, desc]);

    const btnW = cardW - 64;
    const { container: watchBtn } = drawButton(this, 0, 50, '▶  +15 DROPS (Watch Ad)', {
      variant: 'amber',
      width: btnW,
      height: 60,
      fontSize: 20,
    });
    modal.add(watchBtn);

    const { container: endBtn } = drawButton(this, 0, 122, '✕  END RUN', {
      variant: 'ghost',
      width: btnW,
      height: 48,
      fontSize: 17,
    });
    modal.add(endBtn);

    const closeModal = (): void => {
      this.tweens.add({
        targets: modal,
        scale: 0.85,
        alpha: 0,
        duration: dur.fast,
        ease: 'Back.easeIn',
        onComplete: () => {
          backdrop.destroy();
          modal.destroy();
        },
      });
    };

    endBtn.on('pointerdown', () => {
      closeModal();
      this.triggerGameOver();
    });

    watchBtn.on('pointerdown', async () => {
      watchBtn.disableInteractive();
      const success = await ctx.grantDailyExtraDropsViaAd();
      if (success) {
        this.hasClaimedDailyExtraDrops = true;
        closeModal();
        this.updateHud();
        this.floatPowerupPopup('+15 DROPS ADDED! 🎯', cx, cy - 80, '#F59E0B');
        playFireworksCelebration(this, 4, z.overlay + 30);
      } else {
        watchBtn.setInteractive({ useHandCursor: true });
      }
    });

    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
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

    // Golden sparks & fireworks
    playJackpotClimax(this, width / 2, cy, z.overlay + 30);
    playFireworksCelebration(this, 5, z.overlay + 30);
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

    playJackpotClimax(this, width / 2, cy, z.overlay + 30);
    playFireworksCelebration(this, 4, z.overlay + 30);
    this.playSfx('sfx_merge_big', 0.9, 300);

    const banner = this.add.text(width / 2, cy, `🌟 NEW DISCOVERY: ${name.toUpperCase()}! 🌟`, {
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

  private celebrateDailyVictory(rewardName?: string): void {
    const { width } = this.scale;
    const cy = this.layout.dangerY - 50;
    const diff = ctx.getCurrentDailyDifficulty();

    playJackpotClimax(this, width / 2, cy, z.overlay + 30);
    playFireworksCelebration(this, 6, z.overlay + 30);
    this.playSfx('sfx_merge_big', 0.9, 200);

    const bannerText = rewardName
      ? `🏆 DAY ${diff.dayLevel} WON! UNLOCKED ${rewardName}! 🌟`
      : `🏆 DAY ${diff.dayLevel} GOAL REACHED (${diff.targetScore} pts)! 🏆`;

    const banner = this.add.text(width / 2, cy, bannerText, {
      fontFamily: 'sans-serif',
      fontSize: rewardName ? '20px' : '22px',
      fontStyle: 'bold',
      color: '#F59E0B',
    }).setOrigin(0.5).setDepth(z.overlay + 10).setStroke('#FFFFFF', 8).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: banner,
      scale: 1.15,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: cy - 60,
          duration: dur.slow,
          delay: 1500,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private showCosmicVictoryModal(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // 1. Fireworks Show: Multiple grand bursts across screen above the modal!
    playJackpotClimax(this, cx, cy - 80, z.overlay + 60);
    playJackpotClimax(this, cx - 140, cy + 40, z.overlay + 60);
    playJackpotClimax(this, cx + 140, cy + 40, z.overlay + 60);
    playFireworksCelebration(this, 12, z.overlay + 60);
    this.playSfx('sfx_merge_big', 1.0, 100);

    // 2. Modal Container
    const modal = this.add.container(cx, cy).setDepth(z.overlay + 50);

    // Dark cosmic nebula backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x0B081E, 0.88);
    backdrop.setInteractive(); // Block input behind modal
    modal.add(backdrop);

    // Main Card
    const cardW = Math.min(520, width - 40);
    const cardH = 580;
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x18122B, 0.98);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    cardBg.lineStyle(3, 0xA855F7, 0.9);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(cardBg);

    // Crown Icon
    const crown = this.add.text(0, -cardH / 2 + 38, '👑', { fontSize: '42px' }).setOrigin(0.5);
    modal.add(crown);

    // Title
    const title = this.add.text(0, -cardH / 2 + 82, 'COSMIC VICTORY!', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FBBF24',
    }).setOrigin(0.5).setStroke('#FFFFFF', 3);
    modal.add(title);

    // Subtitle
    const subtitle = this.add.text(0, -cardH / 2 + 120, 'You created the Ultimate Tier 14\nGalaxy Watermelon! 🌌', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#E2E8F0',
      align: 'center',
    }).setOrigin(0.5);
    modal.add(subtitle);

    // Rotating Glowing Halo behind fruit
    const halo = this.add.graphics();
    halo.fillStyle(0x9333EA, 0.35);
    halo.fillCircle(0, -20, 80);
    modal.add(halo);

    // Galaxy Watermelon Sprite (Tier 14)
    const key14 = resolveFruitTexture(this, 14);
    const fruitSprite = this.add.image(0, -20, key14).setDisplaySize(130, 130);
    modal.add(fruitSprite);

    this.tweens.add({
      targets: fruitSprite,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Reward Badge
    const badgeW = cardW - 60;
    const badgeH = 50;
    const badgeY = 95;
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x3B0764, 0.9);
    badgeBg.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, radius.md);
    badgeBg.lineStyle(1.5, 0xF59E0B, 0.8);
    badgeBg.strokeRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, radius.md);
    modal.add(badgeBg);

    const badgeTxt = this.add.text(0, badgeY, '💎 +500 JACKPOT PTS • COSMIC MASTER 🌌', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FDE047',
    }).setOrigin(0.5);
    modal.add(badgeTxt);

    // Buttons
    const btnW = cardW - 70;
    const { container: keepPlayingBtn } = drawButton(this, 0, 175, '▶  KEEP PLAYING', {
      testid: 'cosmic-keep-playing-btn',
      variant: 'primary',
      width: btnW,
      height: 64,
      fontSize: 22,
    });
    modal.add(keepPlayingBtn);

    keepPlayingBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: modal,
        alpha: 0,
        scale: 0.9,
        duration: dur.base,
        ease: 'Cubic.easeIn',
        onComplete: () => modal.destroy(),
      });
    });

    const { container: menuBtn } = drawButton(this, 0, 245, '🏠  MAIN MENU', {
      testid: 'cosmic-menu-btn',
      variant: 'ghost',
      width: btnW,
      height: 56,
      fontSize: 20,
    });
    modal.add(menuBtn);

    menuBtn.on('pointerdown', () => {
      ctx.saveSession();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        this.scene.stop('GameplayScene');
        this.scene.start('StartScene');
      });
    });

    // Pop-in entrance animation
    modal.setScale(0.7);
    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
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
    const HUD_SAFE_Y = Math.min(130, this.layout.spawnY - 30);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
      if (this.time.now - this.lastUiClickTime < 450) return;
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
          const diff = ctx.getCurrentDailyDifficulty();
          if (ctx.engine.state.score < diff.targetScore && !this.hasClaimedDailyExtraDrops) {
            this.showDailyExtraDropsModal();
          } else {
            this.triggerGameOver();
          }
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
      
      // 1. Process Fruit Discovery in Album & Cosmic Victory
      for (const plan of plans) {
        if (plan.newTier === 14 && !this.cosmicVictoryCelebrated) {
          this.cosmicVictoryCelebrated = true;
          this.showCosmicVictoryModal();
        }
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
      const diff = ctx.getCurrentDailyDifficulty();
      if (ctx.isDailyMode && ctx.engine.state.score >= diff.targetScore && !this.dailyVictoryCelebrated) {
        this.dailyVictoryCelebrated = true;
        ctx.recordDailyVictory(ctx.engine.state.score).then(({ milestoneReward }) => {
          this.celebrateDailyVictory(milestoneReward ? `${milestoneReward.name} ${milestoneReward.emoji}` : undefined);
          this.updateHud();
        });
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

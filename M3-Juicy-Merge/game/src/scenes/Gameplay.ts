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
  private nextPreview1!: Phaser.GameObjects.Image;
  private nextPreview2!: Phaser.GameObjects.Image;
  private comboPopup!: Phaser.GameObjects.Text;
  private dangerLine!: Phaser.GameObjects.Graphics;
  private lastMotionMs = 0;
  private gameOverTriggered = false;
  private wasNearDanger = false;

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

    this.setupPhysics();
    this.drawBucket();
    this.drawDangerLine();
    this.createAimLine();
    this.createHud();
    this.createComboPopup();
    this.createGhost();
    this.setupCollisions();

    drawMuteButton(this);

    ctx.engine.startNewGame();
    this.ghostTier = ctx.engine.peekNext()[0] ?? 0;
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
    if (this.fruits.length === 0) {
      this.lastMotionMs = time;
      this.refreshDangerLine(false);
      return;
    }

    const atRest = this.fruits.map((f) => this.isBodyAtRest(f.obj));
    const anyMoving = atRest.some((r) => !r);
    if (anyMoving) this.lastMotionMs = time;

    const nearDanger = this.fruits.some((f) => f.obj.y < this.layout.dangerY + DANGER_NEAR_BAND);
    this.refreshDangerLine(nearDanger);
    if (nearDanger && !this.wasNearDanger) this.playSfx('sfx_danger');
    this.wasNearDanger = nearDanger;

    const settled = isWorldSettled(atRest, time, this.lastMotionMs, SETTLE_GRACE_MS);
    if (!settled) return;

    const positions = this.fruits.map((f) => ({ y: f.obj.y }));
    if (!checkGameOver(positions, this.layout.dangerY, true)) return;

    this.triggerGameOver();
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
    this.input.enabled = false;
    this.aimLine.clear();
    this.matter.world.pause();
    this.playSfx('sfx_gameover');
    ctx.engine.setGameOver(true, true);
    this.scene.pause();
    this.scene.launch('GameOverScene');
  }

  clearFruitsAboveDanger(): void {
    const above = fruitsAboveLine(
      this.fruits.map((f) => ({ y: f.obj.y, df: f })),
      this.layout.dangerY,
    );
    for (const item of above) this.removeFruit(item.df);
    for (const f of this.fruits) {
      f.obj.setVelocity(f.obj.body?.velocity.x ?? 0, 2);
    }
    this.gameOverTriggered = false;
    this.input.enabled = true;
    this.lastMotionMs = this.time.now;
    this.refreshAimLine();
    this.matter.world.resume();
    this.updateHud();
  }

  // --- HUD -------------------------------------------------------------------
  private createHud(): void {
    // Score Badge
    const scoreBg = this.add.graphics().setDepth(z.hud);
    scoreBg.fillStyle(toColor(color.surface), 0.9);
    scoreBg.fillRoundedRect(this.layout.bucketX0, 20, 180, 56, radius.md);
    scoreBg.lineStyle(2, toColor(color.primary), 0.5);
    scoreBg.strokeRoundedRect(this.layout.bucketX0, 20, 180, 56, radius.md);

    this.scoreText = this.add.text(this.layout.bucketX0 + 16, 48, 'SCORE 0', fontStyle(type.score, color.textPrimary))
      .setOrigin(0, 0.5).setDepth(z.hud + 1);
    this.scoreText.setData('testid', 'score-label');

    // Next Fruit Badge
    const nextX = this.layout.bucketX1 - 240;
    const nextBg = this.add.graphics().setDepth(z.hud);
    nextBg.fillStyle(toColor(color.surface), 0.9);
    nextBg.fillRoundedRect(nextX, 20, 160, 56, radius.md);
    nextBg.lineStyle(2, toColor(color.primary), 0.5);
    nextBg.strokeRoundedRect(nextX, 20, 160, 56, radius.md);

    this.add.text(nextX + 12, 48, 'NEXT', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: color.textSecondary,
    }).setOrigin(0, 0.5).setDepth(z.hud + 1);

    const nextContainer = this.add.container(nextX, 20).setDepth(z.hud);
    nextContainer.setData('testid', 'next-fruit');

    const key0 = resolveFruitTexture(this, 0);
    this.nextPreview1 = this.add.image(nextX + 85, 48, key0).setDisplaySize(32, 32).setDepth(z.hud + 1);
    this.nextPreview2 = this.add.image(nextX + 125, 48, key0).setDisplaySize(24, 24).setDepth(z.hud + 1).setAlpha(0.8);

    this.updateHud();
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${ctx.engine.state.score}`);
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
    this.comboPopup.setText(`Combo x${n}`);
    this.comboPopup.setAlpha(1);
    this.tweens.killTweensOf(this.comboPopup);
    this.tweens.add({
      targets: this.comboPopup,
      alpha: { from: 1, to: 0 },
      y: { from: this.comboPopup.y, to: this.comboPopup.y - 40 },
      duration: dur.slow,
      ease: 'Cubic.easeOut',
    });
  }

  private floatScorePopup(gain: number, x: number, y: number): void {
    const txt = this.add.text(x, y, `+${gain}`, fontStyle(type.score, color.success))
      .setOrigin(0.5).setDepth(z.hud).setStroke(color.textStroke, 6);
    this.tweens.add({
      targets: txt,
      alpha: { from: 1, to: 0 },
      y: { from: y, to: y - 60 },
      duration: dur.slow,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
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
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
      this.refreshAimLine();
    });

    this.input.on('pointerup', () => this.tryDrop());
  }

  private tryDrop(): void {
    const now = this.time.now;
    if (!ctx.engine.canDrop(now)) return;
    const tier = ctx.engine.nextFruit();
    ctx.engine.recordDrop(now);
    this.lastMotionMs = now;
    this.spawnFruit(tier, this.ghostX, this.layout.spawnY);
    this.playSfx('sfx_drop');

    this.ghostTier = ctx.engine.peekNext()[0] ?? 0;
    this.refreshGhost();
    this.updateHud();
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

      this.playPopJuice(midX, midY, plan.newTier);
      this.floatScorePopup(plan.scoreGain, midX, midY - 12);
      this.flashCombo();

      if (plan.newTier >= CONFIG.maxTier - 1) bigMerge = true;
    }

    if (plans.length > 0) {
      this.lastMotionMs = this.time.now;
      this.updateHud();
      this.playSfx(bigMerge ? 'sfx_merge_big' : 'sfx_merge');
    }
  }

  private playPopJuice(x: number, y: number, tier: number): void {
    const r = fruitRadius(tier);
    const burst = this.add.graphics().setDepth(z.actor + 5);
    burst.lineStyle(4, 0xFFFFFF, 0.9);
    burst.strokeCircle(x, y, r * 0.6);
    burst.fillStyle(0xFFD700, 0.4);
    burst.fillCircle(x, y, r * 0.4);

    this.tweens.add({
      targets: burst,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  // --- Audio hook ----------------------------------------------------------
  private playSfx(key: string, volume = 0.5): void {
    if (!this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume });
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

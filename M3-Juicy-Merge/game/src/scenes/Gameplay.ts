import Phaser from 'phaser';
import { CONFIG } from '../logic/config';
import { ctx } from '../context';
import { color, z, type, fontStyle, toColor } from '../tokens';
import { drawGradientBg } from '../ui';
import { computeBucketLayout, type BucketLayout } from '../gameplay/physics-layout';
import { resolveFruitTexture, fruitRadius, fruitDiameter } from '../gameplay/fruit-sprite';

interface DroppedFruit {
  obj: Phaser.Physics.Matter.Image;
  tier: number;
}

// Gameplay scene — physics core (step 9): a Matter bucket with two static walls
// + a floor, a translucent "ghost" fruit that follows the pointer along the mouth
// (clamped inside the bucket), and a tap/drag-to-drop that spawns a Matter body
// gated by the engine cooldown (Bước 4 canDrop/recordDrop). Fruits render with a
// generated geometric fallback texture until the real sprites land (Phase C).
//
// Mobile-first: pointer (touch) is the primary input — pointermove drives the
// ghost, pointerup drops. No hover dependency. The world is a fixed 720×1280
// portrait; Scale.FIT pillarboxes it on desktop so the layout is constant.
export class GameplayScene extends Phaser.Scene {
  private layout!: BucketLayout;
  private ghost!: Phaser.GameObjects.Image;
  private ghostTier = 0;
  private ghostX = 0;
  private fruits: DroppedFruit[] = [];
  private scoreText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GameplayScene' }); }

  create(): void {
    const { width, height } = this.scale;
    this.layout = computeBucketLayout(width, height);
    drawGradientBg(this, color.bgTop, color.bgBottom, color.grass);

    this.setupPhysics();
    this.drawBucket();
    this.createHud();
    this.createGhost();

    // Fresh run: zero score, reseeded fruit queue (Retry semantics handled in 12).
    ctx.engine.startNewGame();
    this.ghostTier = ctx.engine.peekNext()[0] ?? 0;
    this.ghostX = Phaser.Math.Clamp(width / 2, this.layout.bucketX0, this.layout.bucketX1);
    this.refreshGhost();

    this.bindInput();
  }

  // --- Physics world --------------------------------------------------------
  private setupPhysics(): void {
    // Gravity from CONFIG (px/s^2). Matter applies force = mass * y * scale;
    // scale 0.001 (Matter's default) on a gravityY of 1400 ≈ 1.4× default fall.
    this.matter.world.setGravity(0, CONFIG.physics.gravityY, 0.001);
    // The bucket provides its own container; disable Phaser world-bound walls so
    // fruits can only be contained by the bucket (open top = where danger lives).
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height, 64, false, false, false, false);
    this.buildBucketWalls();
  }

  /** Static Matter walls + floor for the bucket, also rendered as colored rects. */
  private buildBucketWalls(): void {
    const L = this.layout;
    const t = L.wallThickness;
    const H = L.bucketBottomY - L.bucketTopY;
    const midY = (L.bucketTopY + L.bucketBottomY) / 2;
    const opt = { isStatic: true, restitution: CONFIG.physics.restitution, friction: CONFIG.physics.friction };
    const wallColor = toColor(color.primaryDark);

    const left = this.add.rectangle(L.bucketX0 - t / 2, midY, t, H, wallColor).setDepth(z.actor);
    const right = this.add.rectangle(L.bucketX1 + t / 2, midY, t, H, wallColor).setDepth(z.actor);
    const floor = this.add.rectangle((L.bucketX0 + L.bucketX1) / 2, L.bucketBottomY + t / 2, L.bucketWidth + 2 * t, t, wallColor).setDepth(z.actor);
    this.matter.add.gameObject(left, opt);
    this.matter.add.gameObject(right, opt);
    this.matter.add.gameObject(floor, opt);
  }

  // --- Bucket visual ---------------------------------------------------------
  private drawBucket(): void {
    const L = this.layout;
    const H = L.bucketBottomY - L.bucketTopY;
    const g = this.add.graphics().setDepth(z.actor - 1);
    g.fillStyle(toColor(color.surface), 0.12);
    g.fillRect(L.bucketX0, L.bucketTopY, L.bucketWidth, H);

    // Bucket anchor for QA/test: a container sized to the playfield.
    const bucket = this.add.container(L.bucketX0, L.bucketTopY).setDepth(z.actor);
    bucket.setSize(L.bucketWidth, H);
    bucket.setData('testid', 'bucket');
  }

  // --- HUD -------------------------------------------------------------------
  private createHud(): void {
    this.scoreText = this.add.text(this.layout.bucketX0, 36, 'SCORE 0', fontStyle(type.score, color.textPrimary))
      .setOrigin(0, 0.5).setDepth(z.hud);
    this.scoreText.setData('testid', 'score');
    this.updateHud();
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${ctx.engine.state.score}`);
  }

  // --- Ghost (drop guide) ----------------------------------------------------
  private createGhost(): void {
    const key = resolveFruitTexture(this, this.ghostTier);
    const d = fruitDiameter(this.ghostTier);
    this.ghost = this.add.image(this.ghostX, this.layout.spawnY, key)
      .setDisplaySize(d, d).setAlpha(0.45).setDepth(z.hud);
    this.ghost.setData('testid', 'drop-ghost');
    this.refreshGhost();
  }

  /** Refresh the ghost's texture/size to the current queued tier and clamp its X. */
  private refreshGhost(): void {
    const key = resolveFruitTexture(this, this.ghostTier);
    const d = fruitDiameter(this.ghostTier);
    this.ghost.setTexture(key);
    this.ghost.setDisplaySize(d, d);
    this.ghostX = this.clampGhostX(this.ghostX);
    this.ghost.setPosition(this.ghostX, this.layout.spawnY);
    this.ghost.setAlpha(0.45);
  }

  /** Clamp a pointer X so the ghost (radius of current tier) stays inside the bucket. */
  private clampGhostX(x: number): number {
    const r = fruitRadius(this.ghostTier);
    const L = this.layout;
    return Phaser.Math.Clamp(x, L.bucketX0 + r, L.bucketX1 - r);
  }

  // --- Input (touch-first) ---------------------------------------------------
  private bindInput(): void {
    // pointermove drives the ghost on both touch (while pressed) and desktop (hover).
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
    });
    // Tap/drag start: snap ghost under the finger.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.ghostX = this.clampGhostX(p.worldX);
      this.ghost.x = this.ghostX;
    });
    // Release: drop the fruit at the ghost position (cooldown-gated).
    this.input.on('pointerup', () => this.tryDrop());
  }

  private tryDrop(): void {
    const now = this.time.now;
    if (!ctx.engine.canDrop(now)) return; // M3-01 cooldown gate
    const tier = ctx.engine.nextFruit();
    ctx.engine.recordDrop(now);
    this.spawnFruit(tier, this.ghostX, this.layout.spawnY);

    // Advance the ghost to the next queued fruit and keep it clamped.
    this.ghostTier = ctx.engine.peekNext()[0] ?? 0;
    this.refreshGhost();
    this.updateHud();
  }

  /** Spawn a circular Matter body for a dropped fruit at (x, y). */
  private spawnFruit(tier: number, x: number, y: number): void {
    const key = resolveFruitTexture(this, tier);
    const r = fruitRadius(tier);
    const d = fruitDiameter(tier);
    const fruit = this.matter.add.image(x, y, key);
    fruit.setDisplaySize(d, d);
    // Circular body sized to the tier (physics independent of texture size).
    fruit.setCircle(r, {
      restitution: CONFIG.physics.restitution,
      friction: CONFIG.physics.friction,
    });
    fruit.setDepth(z.actor);
    fruit.setData('tier', tier);
    this.fruits.push({ obj: fruit, tier });
  }
}

import Phaser from 'phaser';
import { CONFIG } from '../logic/config';
import { ctx } from '../context';
import { color, z, type, fontStyle, toColor, dur } from '../tokens';
import { drawGradientBg } from '../ui';
import { computeBucketLayout, type BucketLayout } from '../gameplay/physics-layout';
import { resolveFruitTexture, fruitRadius, fruitDiameter } from '../gameplay/fruit-sprite';
import { resolveMergeBatch, type CollidingFruit, type MergePlan } from '../gameplay/merge-handler';
import { checkGameOver } from '../logic/game-over';
import { isWorldSettled } from '../logic/settle';
import { fruitsAboveLine } from '../logic/continue';

interface DroppedFruit {
  id: number;
  obj: Phaser.Physics.Matter.Image;
  tier: number;
}

// Structural read-shape of a Matter body for settle detection. `obj.body` is
// typed as a broad union (Arcade/Matter), but only the Matter `BodyType` carries
// `isSleeping` + `speed`; we cast through `unknown` to read those safely without
// changing runtime behavior (only dropped fruits — non-static Matter bodies —
// ever reach `isBodyAtRest`).
interface RestBody {
  isSleeping?: boolean;
  speed?: number;
}

// Minimal Matter body shape used to read the collision event's pairs. The real
// Matter body carries `gameObject` (the Phaser image it wraps); we only need
// that link + nothing else, so a structural type keeps the scene decoupled from
// `phaser-matterjs` internals (and survived the MatterImage API pitfalls).
interface MatterBodyHandle {
  gameObject: unknown;
}
interface CollisionPairHandle {
  bodyA: MatterBodyHandle;
  bodyB: MatterBodyHandle;
}
interface CollisionEventHandle {
  pairs: CollisionPairHandle[];
}

// --- Settle / game-over tuning (M3-03, the Suika trap) ---------------------
// A fruit is "at rest" when Matter has put it to sleep OR its speed is below a
// small epsilon. The world is "settled" only after every fruit is at rest AND a
// 500ms grace period has passed since the last motion — the grace rejects a
// fruit momentarily at a bounce apex right above the line, and covers the lag
// between Matter's sleep flag flipping and the pile being truly stable.
const MOVE_SPEED_EPS = 0.5; // px/step below which a body counts as motionless
const SETTLE_GRACE_MS = 500; // calm time required after last motion
// How far below the line a fruit can sit while still pulsing the warning band.
const DANGER_NEAR_BAND = 90;

// Gameplay scene — physics core (step 9) + merge on collision (step 10).
// A Matter bucket with two static walls + a floor, a translucent "ghost" fruit
// that follows the pointer along the mouth (clamped inside the bucket), and a
// tap/drag-to-drop that spawns a Matter body gated by the engine cooldown
// (Bước 4 canDrop/recordDrop). On `collisionstart`, same-tier fruits merge via
// the engine (GC-02): the two bodies are destroyed, a tier+1 fruit spawns at
// the contact midpoint with a gentle nudge, a back-pop tween + "+N" float +
// "Combo xN" popup play, and an sfx hook fires (silent until audio lands).
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
  private fruitsById = new Map<number, DroppedFruit>();
  private nextFruitId = 1;
  private scoreText!: Phaser.GameObjects.Text;
  private comboPopup!: Phaser.GameObjects.Text;
  private dangerLine!: Phaser.GameObjects.Graphics;
  /** Scene time (ms) of the last frame in which any fruit was observed moving. */
  private lastMotionMs = 0;
  /** Latch: once game-over fires, stop re-checking until the scene restarts/resumes. */
  private gameOverTriggered = false;

  constructor() { super({ key: 'GameplayScene' }); }

  create(): void {
    const { width, height } = this.scale;
    this.layout = computeBucketLayout(width, height);
    drawGradientBg(this, color.bgTop, color.bgBottom, color.grass);

    // Reset scene-local fruit bookkeeping on every (re)start so a Retry
    // (scene.restart, Bước 12) does not carry references to destroyed bodies.
    this.fruits = [];
    this.fruitsById.clear();
    this.nextFruitId = 1;
    this.gameOverTriggered = false;
    this.lastMotionMs = 0;

    this.setupPhysics();
    this.drawBucket();
    this.drawDangerLine();
    this.createHud();
    this.createComboPopup();
    this.createGhost();
    this.setupCollisions();

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
    // Defensive: a prior game-over paused the Matter step. On (re)start the
    // world must step again — resume() is idempotent on a fresh scene.
    this.matter.world.resume();
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

  // --- Danger line (M3-03, UI-05) -------------------------------------------
  /** Dashed danger line at ~20% into the bucket from the mouth. Pulses (alpha
   *  yoyo) when a fruit is near/above it so the player reads the threat. */
  private drawDangerLine(): void {
    const L = this.layout;
    const g = this.add.graphics().setDepth(z.hud);
    this.drawDangerLineStroke(g, 0.7);
    g.setData('testid', 'danger-line');
    this.dangerLine = g;
  }

  /** (Re)draw the dashed stroke at a given alpha. Dashed because Phaser graphics
   *  has no native dash — we lay short segments along the bucket width. */
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

  /** Pulse the danger line while a fruit sits in the near/above band; steady otherwise. */
  private refreshDangerLine(nearDanger: boolean): void {
    if (nearDanger) {
      // (Re)start a yoyo pulse only when entering the danger band.
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

  // --- Settle -> game over (M3-03, the Suika trap) --------------------------
  /** Per-frame: track motion, pulse the danger line, and when the world settles
   *  run the pure game-over check. Game over ⟺ settled AND ≥1 fruit center
   *  above the line (y < dangerY). A fruit still FALLING across the line is not
   *  settled → no false game over. */
  update(time: number): void {
    if (this.gameOverTriggered) return;
    if (this.fruits.length === 0) {
      this.lastMotionMs = time;
      this.refreshDangerLine(false);
      return;
    }

    // A body is at rest when Matter has slept it or its speed is negligible.
    const atRest = this.fruits.map((f) => this.isBodyAtRest(f.obj));
    const anyMoving = atRest.some((r) => !r);
    if (anyMoving) this.lastMotionMs = time;

    // Pulse the line while any fruit is in/near the danger band (y < line + band).
    const nearDanger = this.fruits.some((f) => f.obj.y < this.layout.dangerY + DANGER_NEAR_BAND);
    this.refreshDangerLine(nearDanger);

    const settled = isWorldSettled(atRest, time, this.lastMotionMs, SETTLE_GRACE_MS);
    if (!settled) return;

    // checkGameOver is the pure gate (Bước 5): settled AND a fruit above the line.
    const positions = this.fruits.map((f) => ({ y: f.obj.y }));
    if (!checkGameOver(positions, this.layout.dangerY, true)) return;

    this.triggerGameOver();
  }

  /** A fruit body is at rest when Matter has put it to sleep OR its speed is
   *  below a small epsilon (covers bodies Matter hasn't slept yet). */
  private isBodyAtRest(obj: Phaser.Physics.Matter.Image): boolean {
    const b = obj.body as unknown as RestBody | null;
    if (!b) return true;
    if (b.isSleeping) return true;
    return typeof b.speed === 'number' && b.speed < MOVE_SPEED_EPS;
  }

  /** Lock input, freeze physics, mutate engine state, and launch the GameOver
   *  overlay on top. First game-over this turn → no interstitial (M3-07). */
  private triggerGameOver(): void {
    this.gameOverTriggered = true;
    this.input.enabled = false;
    this.matter.world.pause();
    // setGameOver mutates: gameOver=true, playCount++, bestScore mirror.
    ctx.engine.setGameOver(true, true);
    // Pause this scene's update loop; GameOver runs on top with the pile frozen
    // visible behind its panel. Resume happens on Continue (step 12) / Retry.
    this.scene.pause();
    this.scene.launch('GameOverScene');
  }

  /** Rewarded "Continue" earned (M3-05): remove every fruit above the danger line
   *  (Bước 6 helper), clear the game-over latch, and resume physics. Step 12
   *  wraps this in `requestRewardedAd` + handles the not-earned branch; the
   *  mechanical clear-the-line resume lives here so the Gameplay scene owns its
   *  bodies. Called by GameOverScene on a granted continue. */
  clearFruitsAboveDanger(): void {
    const above = fruitsAboveLine(
      this.fruits.map((f) => ({ y: f.obj.y, df: f })),
      this.layout.dangerY,
    );
    for (const item of above) this.removeFruit(item.df);
    // Nudge the survivors down so they drop away from the line.
    for (const f of this.fruits) {
      f.obj.setVelocity(f.obj.body?.velocity.x ?? 0, 2);
    }
    this.gameOverTriggered = false;
    this.input.enabled = true;
    this.lastMotionMs = this.time.now;
    this.matter.world.resume();
    this.updateHud();
  }

  // --- HUD -------------------------------------------------------------------
  private createHud(): void {
    this.scoreText = this.add.text(this.layout.bucketX0, 36, 'SCORE 0', fontStyle(type.score, color.textPrimary))
      .setOrigin(0, 0.5).setDepth(z.hud);
    this.scoreText.setData('testid', 'score-label');
    this.updateHud();
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${ctx.engine.state.score}`);
  }

  // --- Combo popup (Combo xN) -----------------------------------------------
  private createComboPopup(): void {
    const cx = (this.layout.bucketX0 + this.layout.bucketX1) / 2;
    const cy = this.layout.bucketTopY + this.layout.bucketHeight * 0.12;
    this.comboPopup = this.add.text(cx, cy, '', fontStyle(type.h1, color.warning))
      .setOrigin(0.5).setDepth(z.hud).setAlpha(0).setStroke(color.textStroke, 6);
    this.comboPopup.setData('testid', 'combo-popup');
  }

  /** Show "Combo xN" (N = engine comboCount) when a chain builds; fade after a beat. */
  private flashCombo(): void {
    const n = ctx.engine.state.comboCount;
    if (n < 2) return; // a single merge is not a combo yet
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

  /** Float "+N" above the merge point, rising + fading, then auto-destroy. */
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
    this.playSfx('sfx_drop');

    // Advance the ghost to the next queued fruit and keep it clamped.
    this.ghostTier = ctx.engine.peekNext()[0] ?? 0;
    this.refreshGhost();
    this.updateHud();
  }

  /** Spawn a circular Matter body for a fruit at (x, y) and register it for
   *  collision-merge lookup. Returns the dropped-fruit handle. */
  private spawnFruit(tier: number, x: number, y: number): DroppedFruit {
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
    const id = this.nextFruitId++;
    fruit.setData('id', id);
    fruit.setData('tier', tier);
    const df: DroppedFruit = { id, obj: fruit, tier };
    this.fruits.push(df);
    this.fruitsById.set(id, df);
    return df;
  }

  /** Destroy a fruit's body + remove it from the scene's bookkeeping. */
  private removeFruit(df: DroppedFruit): void {
    this.fruitsById.delete(df.id);
    const i = this.fruits.indexOf(df);
    if (i >= 0) this.fruits.splice(i, 1);
    df.obj.destroy(); // also removes the Matter body from the world
  }

  // --- Collision -> merge (step 10) -----------------------------------------
  private setupCollisions(): void {
    // `collisionstart` fires once per contacting pair at the moment of contact.
    // event.pairs holds ALL pairs that began contact this step; iterating it
    // (instead of relying on bodyA/bodyB = first pair only) covers multi-fruit
    // pile-ups. Same-tier fruits merge on first contact (Suika-style).
    this.matter.world.on('collisionstart', (event: CollisionEventHandle) => {
      this.handleCollisions(event);
    });
  }

  private handleCollisions(event: CollisionEventHandle): void {
    // Snapshot every pair into a pure {id, tier} tuple BEFORE resolving, so the
    // resolve step never touches a body we are about to destroy this same tick.
    const pairs: [CollidingFruit, CollidingFruit][] = [];
    for (const pair of event.pairs) {
      const a = fruitOf(pair.bodyA);
      const b = fruitOf(pair.bodyB);
      if (a && b) pairs.push([a, b]);
    }
    if (pairs.length === 0) return;
    const now = this.time.now;
    const plans = resolveMergeBatch(pairs, now, ctx.engine);
    for (const plan of plans) this.executeMerge(plan);
    if (plans.length > 0) {
      this.updateHud();
      this.playSfx('sfx_merge');
    }
  }

  /** Consume the two planned fruits, spawn the tier+1 fruit at the contact
   *  midpoint, and play the pop + score + combo juice. */
  private executeMerge(plan: MergePlan): void {
    const a = this.fruitsById.get(plan.aId);
    const b = this.fruitsById.get(plan.bId);
    if (!a || !b) return; // already consumed (shouldn't happen — batch dedups)
    const midX = (a.obj.x + b.obj.x) / 2;
    const midY = (a.obj.y + b.obj.y) / 2;
    this.removeFruit(a);
    this.removeFruit(b);

    const merged = this.spawnFruit(plan.newTier, midX, midY);
    // Gentle upward nudge so the fresh fruit separates from the pile and does
    // not instantly re-collide into another merge / stack explosion.
    merged.obj.setVelocity(0, -2);
    this.playPop(merged.obj);

    // "+N" = the points this merge actually granted (engine.merge already ran
    // inside resolveMergeBatch, so plan carries the captured gain — never derive
    // it from a before/after score delta, which would be 0 here).
    this.floatScorePopup(plan.scoreGain, midX, midY - 8);
    this.flashCombo();
  }

  /** Back-ease-out scale pop on the freshly merged fruit (250ms, DESIGN-SPEC §1.6). */
  private playPop(obj: Phaser.Physics.Matter.Image): void {
    const finalScale = obj.scaleX; // setDisplaySize already fixed the resting scale
    obj.setScale(finalScale * 0.3);
    this.tweens.add({
      targets: obj,
      scale: finalScale,
      duration: dur.pop,
      ease: 'Back.easeOut',
    });
  }

  // --- Audio hook (silent placeholder until assets land in step 14) -----------
  /** Play an sfx by key if its audio is loaded; no-op (silent) otherwise so the
   *  scene never errors on a missing asset during logic development. */
  private playSfx(key: string): void {
    if (!this.cache.audio.exists(key)) return;
    this.sound.play(key);
  }
}

/** Read a fruit's collision tuple (id + tier) from a Matter body, or null if the
 *  body is not a dropped fruit (bucket walls have no `tier` data). */
function fruitOf(body: MatterBodyHandle): CollidingFruit | null {
  const go = body.gameObject as Phaser.Physics.Matter.Image | null;
  if (!go || !go.getData) return null;
  const id = go.getData('id');
  const tier = go.getData('tier');
  if (typeof id !== 'number' || typeof tier !== 'number') return null;
  return { id, tier };
}

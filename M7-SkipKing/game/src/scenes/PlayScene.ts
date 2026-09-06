/**
 * M7 Skip King — PlayScene (T3 Tầng B — CONTRACT mục 1): orchestrate mỏng.
 * - Engine tầng A bước theo FIXED_DT (accumulator) — 0 luật chơi trong scene.
 * - Input pull-back (PullBackInput) → FlickInput (schema K4×V1) → HumanFlickProvider → engine.
 * - Render state qua projection; feedback <100ms cùng frame (ripple + vibrate không await).
 * T4 sẽ thêm onboarding/combo/slow-mo; T5 thêm end-card — scene giữ mỏng, không preempt.
 */
import * as Phaser from 'phaser';
import { MECHANICS } from '../config/mechanics';
import type { MechanicsConfig } from '../config/mechanics';
import type { EngineEvent } from '../logic/types';
import { HumanFlickProvider } from '../logic/flickProvider';
import { PhysicsEngine } from '../logic/physicsEngine';
import { RunLifecycle, memoryStorage } from '../logic/runLifecycle';
import { judgePerfect } from '../logic/mechanics';
import { assistFlick } from '../logic/firstThrowAssist';
import { mulberry32 } from '../logic/rng';
import { makeProjection, AIM } from '../render/layout';
import { StoneRenderer } from '../render/StoneRenderer';
import { WaterRenderer } from '../render/WaterRenderer';
import { RippleFx } from '../render/RippleFx';
import { CameraFx } from '../render/CameraFx';
import { AimGuide } from '../render/AimGuide';
import { PullBackInput } from '../input/PullBackInput';
import { Hud } from '../ui/Hud';

/** Trần step/update — chặn spiral khi tab nền quay lại (delta khổng lồ). */
const MAX_STEPS_PER_UPDATE = 4000; // 4000 × (1/120)s ≈ 33s > trần sim TIME_LIMIT

export class PlayScene extends Phaser.Scene {
  private cfg: MechanicsConfig = MECHANICS;
  private engine!: PhysicsEngine;
  private lifecycle!: RunLifecycle;
  private proj = makeProjection(
    MECHANICS.canvas.width,
    MECHANICS.canvas.height,
    MECHANICS.fieldZMax,
  );
  private stoneRenderer!: StoneRenderer;
  private water!: WaterRenderer;
  private ripple!: RippleFx;
  private camFx!: CameraFx;
  private aim!: AimGuide;
  private hud!: Hud;
  private pull!: PullBackInput;
  private acc = 0;
  private pendingFlicks: { dirX: number; dirZ: number; power: number }[] = [];
  private runClosed = false;
  private firstHumanFlick = true;
  private labelFadeStarted = false;
  private labelAlpha = { a: 0 }; // proxy tween cho nhãn DRAG & RELEASE (U2)
  private booted = false;

  constructor() {
    super('PlayScene');
  }

  public create(): void {
    const w = this.scale.width;
    this.cameras.main.setBackgroundColor(0x0d1b2a);
    this.engine = new PhysicsEngine(this.cfg, mulberry32(Date.now() >>> 0));
    this.lifecycle = new RunLifecycle(memoryStorage(), { stage: 'local' });
    this.water = new WaterRenderer(this, this.proj, w);
    this.ripple = new RippleFx(this);
    this.stoneRenderer = new StoneRenderer(this, this.proj);
    this.camFx = new CameraFx(this.cameras.main);
    this.aim = new AimGuide(this, w);
    this.hud = new Hud(this);
    this.aim.setLabelY(this.proj.waterlineY - 90);
    this.aim.setLabelAlpha(1);
    this.labelAlpha.a = 1;

    // Toàn màn chơi là vùng chạm (≥44px target — config.touchTargetPx, CONTRACT 3.2).
    this.pull = new PullBackInput({
      onAim: (f) => this.renderAim(f),
      onRelease: (f) => this.onPlayerRelease(f),
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pull.onDown(p.x, p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.pull.onMove(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.pull.onUp(p.x, p.y));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.pull.onUp(p.x, p.y));
    this.input.on('pointerdown', () => undefined); // no-op giữ symmetric listeners
    this.events.once('shutdown', () => {
      this.input.removeAllListeners();
    });

    this.hud.render(this.lifecycle);
    this.stoneRenderer.renderIdle();
    this.booted = true;
  }

  /** Fixed-step accumulator — engine bước đúng fixedDt bất kể fps (CONTRACT §2). */
  public update(_time: number, delta: number): void {
    this.acc += Math.min(delta, 100) / 1000; // clamp delta frames vẽ lớn (tab nền)
    const dt = this.cfg.fixedDt;
    let steps = 0;
    while (this.acc >= dt && steps < MAX_STEPS_PER_UPDATE) {
      this.engine.step(dt);
      this.acc -= dt;
      steps++;
    }
    if (this.acc > dt) this.acc = 0;

    this.applyEvents(this.engine.drainEvents());

    if (this.engine.finished && !this.runClosed) {
      this.runClosed = true;
      this.lifecycle.applyRun(this.engine.toResult()); // tầng A chốt — scene chỉ chuyển tay
      this.hud.render(this.lifecycle);
    }
    this.consumePending();
    this.renderFrame(delta);
  }

  /** Events engine → juice (ripple CÙNG FRAME + squash + camera + haptic <100ms). */
  private applyEvents(events: EngineEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'bounce') {
        const x = this.proj.xToScreenX(ev.stoneX, ev.stoneZ);
        const y = this.proj.zToY(ev.stoneZ);
        this.ripple.spawn(x, y, 0.5 + ev.impact);
        this.stoneRenderer.squashFx(); // squash 80ms (CONTRACT §6)
        if (ev.impact > 0.85) this.camFx.punch(0.02);
        this.haptic(10); // fire-and-forget — không await (CONTRACT §6 b)
      } else if (ev.type === 'splash') {
        const x = this.proj.xToScreenX(ev.stoneX, ev.stoneZ);
        const y = this.proj.zToY(ev.stoneZ);
        this.ripple.spawn(x, y, 1.3);
        this.camFx.shake(120);
        this.haptic(10);
      }
      // 'perfect'/'perfectRunEnd' → combo banner + slow-mo thuộc T4 (không preempt).
    }
  }

  private renderFrame(deltaMs: number): void {
    this.water.update(deltaMs);
    this.ripple.update(deltaMs);
    const s = this.engine.stone;
    if (s && !this.engine.finished) {
      this.stoneRenderer.renderStone(s, this.time.now);
    } else {
      this.stoneRenderer.renderIdle();
    }
  }

  private renderAim(input: { dirX: number; dirZ: number; power: number } | null): void {
    const ox = this.proj.xToScreenX(0, 0);
    const oy = this.proj.waterlineY - 10;
    this.aim.render(ox, oy, input, input ? judgePerfect(input, this.cfg) : false);
  }

  /** Thả tay → assist Đ2 (chỉ cú đầu run đầu) → hàng đợi → engine khi rảnh. */
  private onPlayerRelease(input: { dirX: number; dirZ: number; power: number }): void {
    const assisted = this.firstHumanFlick ? assistFlick(input, this.cfg) : input;
    this.firstHumanFlick = false;
    this.pendingFlicks.push(assisted);
    this.fadeHintLabel();
    this.consumePending();
  }

  /** Tiêu thụ hàng đợi qua HumanFlickProvider (tầng A) — 1 đường sim duy nhất. */
  private consumePending(): void {
    if (this.pendingFlicks.length === 0) return;
    if (!this.engine.finished && this.engine.stone) return; // đang bay — chờ run xong
    const provider = new HumanFlickProvider(this.pendingFlicks);
    const flick = provider.nextFlick();
    this.pendingFlicks = [];
    this.engine.throwFlick(flick);
    if (judgePerfect(flick, this.cfg)) this.engine.markPerfect();
    this.runClosed = false;
    this.renderAim(null); // tắt guide ngay khi bắn
  }

  /** U2 — nhãn "DRAG & RELEASE" mờ dần sau cú đầu (T4 demo giữ nhãn riêng). */
  private fadeHintLabel(): void {
    if (this.labelFadeStarted) return;
    this.labelFadeStarted = true;
    this.time.delayedCall(AIM.labelHoldMs, () => {
      this.tweens.add({
        targets: this.labelAlpha,
        a: 0,
        duration: AIM.labelFadeMs,
        onUpdate: () => this.aim.setLabelAlpha(this.labelAlpha.a),
      });
    });
  }

  /** Haptic fire-and-forget — feedback <100ms cùng frame, không await (CONTRACT §6 b). */
  private haptic(ms: number): void {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    nav.vibrate?.(ms);
  }

  // ---- mirror test (TDD-B wiring test — không lộ logic mới) ----
  bootedForTest(): boolean {
    return this.booted;
  }
  getEngineForTest(): PhysicsEngine {
    return this.engine;
  }
  getLifecycleForTest(): RunLifecycle {
    return this.lifecycle;
  }
  getStageForTest(): 'local' | 'demo' {
    return 'local';
  }
  updateForTest(time: number, delta: number): void {
    this.update(time, delta);
  }
  dispatchFlickForTest(input: { dirX: number; dirZ: number; power: number }): void {
    this.onPlayerRelease(input);
  }
}

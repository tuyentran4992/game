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
import type { KvStorage } from '../logic/runLifecycle';
import { judgePerfect } from '../logic/mechanics';
import { assistFlick } from '../logic/firstThrowAssist';
import { mulberry32 } from '../logic/rng';
import { makeProjection, AIM, SKIM } from '../render/layout';
import { StoneRenderer } from '../render/StoneRenderer';
import { WaterRenderer } from '../render/WaterRenderer';
import { RippleFx } from '../render/RippleFx';
import { WakeTrail } from '../render/WakeTrail';
import { FoamFx } from '../render/FoamFx';
import { CameraFx } from '../render/CameraFx';
import { AimGuide } from '../render/AimGuide';
import { PullBackInput } from '../input/PullBackInput';
import { Hud } from '../ui/Hud';
import { EndCard } from '../ui/EndCard';
import { hitstopMsFor } from '../logic/mechanics';

/** Trần step/update — chặn spiral khi tab nền quay lại (delta khổng lồ). */
const MAX_STEPS_PER_UPDATE = 4000; // 4000 × (1/120)s ≈ 33s > trần sim TIME_LIMIT

export class PlayScene extends Phaser.Scene {
  private cfg: MechanicsConfig = MECHANICS;
  // T4 kế thừa OnboardingPlayScene — các thành viên dưới đây mở protected (hook thiết kế T3),
  // 0 đổi hành vi: engine/proj/ripple/camFx/aim/stage + applyEvents/consumePending.
  protected engine!: PhysicsEngine;
  protected lifecycle!: RunLifecycle; // protected T4: finishDemo trao lifecycle local (0 đổi hành vi)
  protected proj = makeProjection(
    MECHANICS.canvas.width,
    MECHANICS.canvas.height,
    MECHANICS.fieldZMax,
  );
  private stoneRenderer!: StoneRenderer;
  protected water!: WaterRenderer;
  protected ripple!: RippleFx;
  protected camFx!: CameraFx;
  protected aim!: AimGuide;
  protected hud!: Hud; // protected T4: finishDemo render lại HUD sau trao tay (0 đổi hành vi)
  /** End-card (T5 — CONTRACT 3.5): overlay cuối run — CHỈ stage local (demo = không gian an toàn, Đ3). */
  protected endCard!: EndCard;
  private pull!: PullBackInput;
  private acc = 0;
  protected pendingFlicks: { dirX: number; dirZ: number; power: number }[] = [];
  private runClosed = false;
  private firstHumanFlick = true;
  private labelFadeStarted = false;
  private labelAlpha = { a: 0 }; // proxy tween cho nhãn DRAG & RELEASE (U2)
  private booted = false;
  /** 'local' = người chơi thật · 'demo' = script onboarding (T4 flip demo→local khi xong). */
  protected stage: 'local' | 'demo' = 'local';
  /** Slow-mo juice gate (T4 — 0.4× cuối PERFECT run): scale hiển thị, KHÔNG bẻ engine tầng A. */
  protected slowmoScale = 1;
  /**
   * FUN2-C2 — hitstop pathway RIÊNG (tách khỏi slowmoScale): cửa sổ freeze hiển thị
   * 33–66ms tại bounce mạnh (impact ≥ ~0.6 — hitstopMsFor tầng A). slow-mo GIỮ ĐỘC QUYỀN
   * PERFECT (invariant tie-A/tie-B) — hitstop KHÔNG ghi vào slowmoScale, chỉ nhân thêm
   * ở tích lũy thời gian; KHÔNG đụng fixed-step accumulator / MAX_STEPS_PER_UPDATE / fixedDt
   * (vùng từng chết BUG-GOM-01).
   */
  private hitstopMs = 0;
  private hitstopScale = 1;
  /** Thời gian sim tích lũy (ms) — nhịp render dùng chung (spin tích lũy theo sim-time). */
  private simMs = 0;
  private wake!: WakeTrail; // FUN2-C2 — vệt lướt liên tục theo đá bay
  private foam!: FoamFx; // FUN2-C2 — foam trắng nổ tại điểm chạm (lớp thêm, không thay ripple)
  private lastWakeSpawnMs = -1e9;

  constructor(sceneKey = 'PlayScene') {
    super(sceneKey);
  }

  public create(): void {
    const w = this.scale.width;
    this.cameras.main.setBackgroundColor(0x0d1b2a);
    this.engine = new PhysicsEngine(this.cfg, mulberry32(Date.now() >>> 0));
    // Storage inject: localStorage thật là đường chính (best persist qua reload) —
    // memoryStorage CHỈ là fallback (test/SSR). REVIEW round 1 điểm 2.
    const storage: KvStorage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : memoryStorage();
    // Lifecycle dựng theo stage của scene (mặc định 'local' — hành vi cũ giữ nguyên):
    // stage 'demo' → tầng A (runLifecycle) KHÔNG ghi best (demo không bẩn best người chơi).
    this.lifecycle = new RunLifecycle(storage, { stage: this.stage });
    this.water = new WaterRenderer(this, this.proj, w);
    this.ripple = new RippleFx(this);
    this.wake = new WakeTrail(this, 4); // FUN2-C2 — dưới ripple/foam, trên dải nước (depth 3)
    this.foam = new FoamFx(this, 5); // FUN2-C2 — ngang ripple (đè lớp), dưới đá (depth 30)
    this.stoneRenderer = new StoneRenderer(this, this.proj);
    this.camFx = new CameraFx(this.cameras.main);
    this.aim = new AimGuide(this, w);
    this.hud = new Hud(this);
    this.endCard = new EndCard(this);
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

  /** Fixed-step accumulator — engine bước đúng fixedDt bất kể fps (CONTRACT §2).
   * T4: ×slowmoScale (juice slow-mo 0.4× cuối PERFECT run — pacing scene, KHÔNG bẻ engine tầng A; 1× = hành vi cũ).
   * FUN2-C2: ×hitstopScale (pathway RIÊNG — freeze hiển thị 33–66ms tại bounce mạnh; cửa sổ
   * hết → về 1×). Cả 2 scale chỉ NHÂN vào tích lũy thời gian — fixedDt/MAX_STEPS/accumulator
   * giữ nguyên (vùng từng chết BUG-GOM-01 không đụng). */
  public update(_time: number, delta: number): void {
    const rawMs = Math.min(delta, 100);
    // Hitstop đếm ngược bằng delta THÔ (ms thật theo hitstopMsFor — không bị scale chậm).
    if (this.hitstopMs > 0) {
      this.hitstopMs -= rawMs;
      if (this.hitstopMs <= 0) {
        this.hitstopMs = 0;
        this.hitstopScale = 1;
      }
    }
    this.simMs += rawMs * this.hitstopScale * this.slowmoScale;
    this.acc += rawMs / 1000 * this.hitstopScale * this.slowmoScale;
    const dt = this.cfg.fixedDt;
    let steps = 0;
    // BUG-GOM-01 (P0, QA t_570777d1/FIX-ROUND-1.md): PhysicsEngine.step() TỰ drainEvents()
    // nội bộ ở mọi nhánh push event → return của step là NƠI DUY NHẤT có event.
    // Vứt return = nuốt sạch (banner/plop/ripple/squash/haptic chết + slow-mo kẹt).
    // Gom events qua các step rồi apply MỘT lần sau loop (MAX_STEPS_PER_UPDATE + cap acc giữ nguyên).
    const evs: EngineEvent[] = [];
    while (this.acc >= dt && steps < MAX_STEPS_PER_UPDATE) {
      evs.push(...this.engine.step(dt));
      this.acc -= dt;
      steps++;
    }
    if (this.acc > dt) this.acc = 0;

    this.applyEvents(evs);

    if (this.engine.finished && !this.runClosed) {
      this.runClosed = true;
      // End-card CHỈ stage local (demo = không gian an toàn — CONTRACT 3.1 Đ3).
      // Gap-gap đọc best-TRƯỚC-run từ lifecycle (tầng A) rồi applyRun mới chốt best mới.
      if (this.stage !== 'local') {
        this.lifecycle.applyRun(this.engine.toResult()); // tầng A chốt — scene chỉ chuyển tay
      } else {
        this.endCard.hide(); // run kế chưa bắt đầu — tắt card cũ (an toàn idle→run)
        const bestBefore = this.lifecycle.best;
        this.lifecycle.applyRun(this.engine.toResult());
        this.endCard.show({ bestBeforeRun: bestBefore, run: this.engine.toResult() });
      }
      this.hud.render(this.lifecycle);
    }
    this.consumePending();
    this.renderFrame(delta);
  }

  /** Events engine → juice (ripple CÙNG FRAME + squash + camera + haptic <100ms).
   * FUN2-C2: foam THÊM LỚP tại điểm chạm (đường gọi ripple GIỮ NGUYÊN — foam không thay)
   * + hitstop diễn qua hitstopMsFor tầng A (bounce mạnh ≥ ngưỡng ~0.6 → cửa sổ 33–66ms). */
  protected applyEvents(events: EngineEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'bounce') {
        const x = this.proj.xToScreenX(ev.stoneX, ev.stoneZ);
        const y = this.proj.zToY(ev.stoneZ);
        this.ripple.spawn(x, y, 0.5 + ev.impact);
        this.foam.spawn(x, y, SKIM.foamRadiusPx, 0.7 + ev.impact * 0.6, this.proj.zScale(ev.stoneZ)); // FUN2-C2 — lớp thêm
        this.stoneRenderer.squashFx(); // squash 80ms (CONTRACT §6)
        if (ev.impact > 0.85) this.camFx.punch(0.02);
        // FUN2-C2 hitstop: hàm tầng A C1 xuất — impact < ngưỡng → 0ms (không cửa sổ).
        const hs = hitstopMsFor(ev.impact);
        if (hs > 0) {
          this.hitstopMs = hs;
          this.hitstopScale = 0;
        }
        this.haptic(10); // fire-and-forget — không await (CONTRACT §6 b)
      } else if (ev.type === 'splash') {
        const x = this.proj.xToScreenX(ev.stoneX, ev.stoneZ);
        const y = this.proj.zToY(ev.stoneZ);
        this.ripple.spawn(x, y, 1.3);
        this.foam.spawn(x, y, SKIM.splashFoamRadiusPx, 1, this.proj.zScale(ev.stoneZ)); // FUN2-C2
        this.camFx.shake(120);
        this.haptic(10);
      }
      // 'perfect'/'perfectRunEnd' → combo banner + slow-mo thuộc T4 (không preempt).
    }
  }

  /** FUN2-C2 renderFrame: wake spawn liên tục khi đá bay (vệt lướt trên MẶT NƯỚC —
   * vị trí đá chiếu xuống mặt, không theo cao độ y) + mọi FX tiến theo simMs thực đã trừ
   * hitstop (delta render 0 trong cửa sổ → bề mặt nước/foam/wake/ripple đứng hình —
   * "đá dừng 1 nhịp trên nước"). Ripple vẫn update(deltaMs) như cũ — đường gọi giữ nguyên. */
  private renderFrame(deltaMs: number): void {
    // simMs đã cộng frame này trong update() — delta render cho FX = phần simMs vừa trôi.
    const fxDelta = this.hitstopScale === 0 ? 0 : deltaMs * this.slowmoScale;
    this.water.update(fxDelta);
    this.ripple.update(fxDelta);
    this.wake.update(fxDelta);
    this.foam.update(fxDelta);
    const s = this.engine.stone;
    if (s && !this.engine.finished) {
      if (this.simMs - this.lastWakeSpawnMs >= SKIM.wakeSpawnEveryMs) {
        this.lastWakeSpawnMs = this.simMs;
        this.wake.spawn(this.proj.xToScreenX(s.x, s.z), this.proj.zToY(s.z), this.proj.zScale(s.z));
      }
      this.stoneRenderer.renderStone(s, this.simMs, this.hitstopScale === 0 ? 0 : deltaMs * this.slowmoScale);
    } else {
      this.stoneRenderer.renderIdle();
    }
  }

  /** Vẽ/tắt aim guide (hook protected cho T4 demo sweet-zone). */
  protected renderAim(input: { dirX: number; dirZ: number; power: number } | null): void {
    const ox = this.proj.xToScreenX(0, 0);
    const oy = this.proj.waterlineY - 10;
    // U2: highlight window PERFECT CHỈ trong demo — stage local truyền false CỨNG,
    // không judgePerfect khi người chơi thật kéo (REVIEW round 1 điểm 3).
    this.aim.render(ox, oy, input, false);
  }

  /** Thả tay → assist Đ2 (chỉ cú đầu run đầu) → hàng đợi → engine khi rảnh. */
  private onPlayerRelease(input: { dirX: number; dirZ: number; power: number }): void {
    const assisted = this.firstHumanFlick ? assistFlick(input, this.cfg) : input;
    this.firstHumanFlick = false;
    this.pendingFlicks.push(assisted);
    this.fadeHintLabel();
    this.consumePending();
  }

  /** Tiêu thụ hàng đợi qua HumanFlickProvider (tầng A) — 1 đường sim duy nhất.
   * Mỗi lần chỉ tiêu thụ ĐÚNG 1 cú (shift) — cú sau chờ run hiện tại xong,
   * không mất cú khi người chơi spam (REVIEW round 1 điểm 1).
   * FUN2-C1: whoosh ném đá hook — onWhoosh(flick.power) TRƯỚC throwFlick
   * (base không-op; OnboardingPlayScene override nối synth audio — phủ demo + người chơi). */
  protected consumePending(): void {
    if (this.pendingFlicks.length === 0) return;
    if (!this.engine.finished && this.engine.stone) return; // đang bay — chờ run xong
    const provider = new HumanFlickProvider([this.pendingFlicks[0]]);
    const flick = provider.nextFlick();
    this.pendingFlicks.shift();
    this.onWhoosh(flick.power); // FUN2-C1 — trước throwFlick (tiếng vút bắt đầu NGAY lúc thả)
    this.engine.throwFlick(flick);
    if (judgePerfect(flick, this.cfg)) this.engine.markPerfect();
    this.runClosed = false;
    this.endCard.hide(); // thả cú mới → end-card tắt ngay (CONTRACT 3.5 THROW AGAIN)
    this.renderAim(null); // tắt guide ngay khi bắn
  }

  /** FUN2-C1 whoosh hook — base no-op (PlayScene thuần không audio), override ở OnboardingPlayScene. */
  protected onWhoosh(_power: number): void {}

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
    return this.stage; // T4: stage demo có thật — mirror đọc field, không cứng 'local'
  }
  updateForTest(time: number, delta: number): void {
    this.update(time, delta);
  }
  dispatchFlickForTest(input: { dirX: number; dirZ: number; power: number }): void {
    this.onPlayerRelease(input);
  }
  pendingCountForTest(): number {
    return this.pendingFlicks.length;
  }
  /** Mirror T5 — EndCard wiring (không lộ logic mới). */
  getEndCardForTest(): EndCard {
    return this.endCard;
  }
  // ---- mirror test FUN2-C2 (skim feel — không lộ logic mới) ----
  /** Diễn event trực tiếp không qua engine (test wiring — OnboardingPlayScene đã có mirror này). */
  applyEventsForTest(events: EngineEvent[]): void {
    this.applyEvents(events);
  }
  wakeTrailForTest(): WakeTrail {
    return this.wake;
  }
  foamForTest(): FoamFx {
    return this.foam;
  }
  stoneForTest(): Phaser.GameObjects.Image {
    return this.stoneRenderer.spriteForTest;
  }
  /** Cửa sổ hitstop còn lại (ms) — 0 = ngoài cửa sổ (nhịp 1×). */
  hitstopRemainingForTest(): number {
    return this.hitstopMs;
  }
  /** Pathway hitstop riêng (0 trong cửa sổ / 1 thường) — slowmoScale KHÔNG bị đụng. */
  hitstopScaleForTest(): number {
    return this.hitstopScale;
  }
  /** Trôi thời gian render (ms) mà không qua update thật — tiến tuổi thọ FX/cửa sổ hitstop
   * + render 1 frame đá theo đúng renderFrame (spin tích lũy) trong test deterministic. */
  advanceSkimTimeScaleForTest(ms: number): void {
    if (this.hitstopMs > 0) {
      this.hitstopMs = Math.max(0, this.hitstopMs - ms);
      if (this.hitstopMs === 0) this.hitstopScale = 1;
    }
    this.simMs += ms;
    this.wake.update(ms);
    this.foam.update(ms);
    const s = this.engine.stone;
    if (s && !this.engine.finished) {
      this.stoneRenderer.renderStone(s, this.simMs, ms); // cùng đường renderFrame — spin theo delta
    } else {
      this.stoneRenderer.renderIdle();
    }
  }
}

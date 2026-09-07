/**
 * M7 Skip King — OnboardingPlayScene (T4 TẦNG B — CONTRACT 3.1 + mục 5 + §6):
 * onboarding B0–B4 diễn theo OnboardingDirector (tầng A) + ScriptedFlickProvider (cùng schema sim),
 * juice 6 (ripple/plop pitch/squash/camera/slow-mo/spray pool) + plopSynth + resume pointerdown ĐẦU
 * + combo-banner PERFECT + demo banner + sweet-zone CHỈ demo (U2) + demo-once (sk_done).
 * Kế thừa PlayScene T3 (mở protected hook) — scene vẫn mỏng: mọi luật ở tầng A.
 */
import * as Phaser from 'phaser';
import { PlayScene } from './PlayScene';
import { MECHANICS } from '../config/mechanics';
import type { EngineEvent, FlickInput } from '../logic/types';
import { ScriptedFlickProvider } from '../logic/flickProvider';
import { OnboardingDirector, isDemoDone, DEMO_DONE_KEY } from '../logic/onboarding';
import { plopParams } from '../logic/audioMapper';
import { PlopSynth, installResumeHook } from '../audio/plopSynth';
import { MuteButton } from '../ui/MuteButton';
import { ComboBanner } from '../ui/ComboBanner';
import { DemoBanner } from '../ui/DemoBanner';
import { memoryStorage, RunLifecycle } from '../logic/runLifecycle';
import type { KvStorage } from '../logic/runLifecycle';
import { judgePerfect } from '../logic/mechanics';
import { GAUGE_COLOR_PERFECT } from '../render/AimGuide';
import type { RippleFx } from '../render/RippleFx';
import { AIM } from '../render/layout';

/** Độ dày vùng ngọt vẽ trong demo (U2) — nhắm trùng band lực window (0.7–0.9). */
const SWEET_MIN_PX = Math.round(AIM.aimMinPx + (AIM.aimMaxPx - AIM.aimMinPx) * MECHANICS.perfectWindow.powerMin);
const SWEET_MAX_PX = Math.round(AIM.aimMinPx + (AIM.aimMaxPx - AIM.aimMinPx) * MECHANICS.perfectWindow.powerMax);
/** Alpha vùng ngọt + rip xung quanh (U2 — mờ, chỉ demo). */
const SWEET_ALPHA = 0.28;
const SWEET_RIP_PX = 14;

/** Khi nào bắt đầu spray quanh điểm nảy (nảy mạnh mới bắn — pool tiết kiệm). */
const SPRAY_IMPACT_MIN = 0.72;

interface SprayParticle {
  img: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number; // 0..1
  active: boolean;
}

/** Pool spray nước — object pool tái dùng, không new/destroy mỗi frame (ROLE-RULES perf). */
class SprayFx {
  private pool: SprayParticle[] = [];

  constructor(scene: Phaser.Scene, size = 16) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.circle(-100, -100, 3, 0xbfe4ff, 0.9).setDepth(7).setVisible(false).setActive(false);
      this.pool.push({ img, vx: 0, vy: 0, life: 1, active: false });
    }
  }

  burst(screenX: number, screenY: number, strength: number): void {
    let n = 0;
    const count = 4 + Math.round(strength * 4); // 4..8 hạt/burst
    for (const p of this.pool) {
      if (n >= count) break;
      if (p.active) continue;
      p.active = true;
      p.life = 1;
      const ang = Math.PI * (0.6 + Math.random() * 0.8); // vòm nước — juice, không phải luật
      const spd = 60 + strength * 90;
      p.vx = Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1);
      p.vy = -Math.sin(ang) * spd;
      p.img.setPosition(screenX, screenY).setVisible(true).setActive(true).setAlpha(0.9);
      n++;
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt / 0.5; // hạt sống ~0.5s — [PLACEHOLDER] feel-tune
      if (p.life <= 0) {
        p.active = false;
        p.img.setVisible(false).setActive(false);
        continue;
      }
      p.vy += 420 * dt; // trọng lực rơi hạt — juice
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.setAlpha(0.9 * p.life);
    }
  }
}

export class OnboardingPlayScene extends PlayScene {
  private demoProvider!: ScriptedFlickProvider;
  private director!: OnboardingDirector;
  private combo!: ComboBanner;
  private demoText!: DemoBanner;
  private plop!: PlopSynth;
  /** Mute button FUN2-C1 — persist sk_muted, setMuted áp NGAY vào plopSynth. */
  private muteBtn!: MuteButton;
  private spray!: SprayFx;
  private sweetZone = false;
  private soundOffShown = false;
  /** Sound-off ripple boost chờ bounce kế (đặt khi latch — review r2 điểm 2). */
  private soundOffBoostNext = false;
  private usedDemoFlick = false;
  private comboShownThisRun = false;
  private storage!: KvStorage;
  /** Trao tay HOÃN (BUG-GOM-02): run demo còn bay lúc flip — chốt ở stage demo rồi trao local. */
  private handoffPending = false;

  constructor(sceneKey = 'OnboardingPlayScene') {
    super(sceneKey);
  }
  public create(): void {
    // Demo-once: sk_done có sẵn → KHÔNG demo, thẳng stage local (lần 2+ vào game).
    // Chốt stage TRƯỚC super.create() — base dựng lifecycle theo stage
    // (runLifecycle tầng A: stage 'demo' KHÔNG ghi best — demo không bẩn best người chơi).
    this.storage =
      typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage();
    const demoDone = isDemoDone(this.storage);
    this.stage = demoDone ? 'local' : 'demo';

    super.create();

    this.demoProvider = new ScriptedFlickProvider(MECHANICS);
    this.director = new OnboardingDirector(this.demoProvider, this.storage);
    this.combo = new ComboBanner(this, this.scale.width / 2, this.scale.height * 0.38);
    this.demoText = new DemoBanner(this, this.scale.width / 2, this.scale.height * 0.22);
    this.spray = new SprayFx(this);
    this.plop = new PlopSynth();
    // Mute button FUN2-C1 — khôi phục mute từ phiên trước (sk_muted) + nút SOUND ON/OFF
    // góc phải-dưới ≥44px. Storage chung localStorage scene (đường chính, fallback memory).
    this.muteBtn = new MuteButton(this, this.plop, this.storage);

    // AudioContext.resume() chạy ngay pointerdown ĐẦU — bắt buộc (CONTRACT mục 5).
    installResumeHook(this.plop);

    // Skip-on-touch: chạm bất kỳ → cắt demo NGAY (CONTRACT 3.1).
    if (this.stage === 'demo') {
      this.input.once('pointerdown', () => this.finishDemo());
      this.demoText.showTitle('SKIP KING', 'FLICK TO SKIP');
    }
  }

  /** Director mỗi frame — diễn banner/flick/sweet-zone theo beat (scene chỉ DIỄN).
   * BUG-GOM-02: trao tay hoãn chạy TRƯỚC director — demo chốt xong hết mới trao local,
   * zero frame trống với cú người chơi. Guard stage (review round 1) đứng TRƯỚC
   * director.update(): sau flip, director ĐÓNG BĂNG ở local — đường skip-sớm (engine rảnh,
   * trước B1@2.0s) không thể bắn cú demo ở local → sk_best không bị demo ghi (mục 6). */
  public override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.stage !== 'demo') return; // local: director đóng băng vĩnh viễn (main @8af3c40)
    if (this.handoffPending && this.engine.finished) {
      // Run mượn stage demo đã chốt ở cuối super.update() (applyRun trên lifecycle demo
      // — không đụng best); local chưa tồn tại → trao tay NGAY (zero frame trống).
      this.finishHandoff();
      if (this.stage !== 'demo') return; // vừa trao tay — frame này hết việc demo
    }
    // Merge t_30a36bb9 (semantic conflict BUG-01×BUG-02): khi hoãn trao tay, ĐÓNG BĂNG
    // director — nếu không, beat B2/B3 re-fill pendingFlicks + B3 bật slow-mo 0.4× →
    // run chain kéo dài, trao tay không bao giờ bắn (player chờ skip 15s+; test Đ1 đỏ).
    if (this.handoffPending) return;
    // storage demo-once nằm trong director (constructor) — ĐÚNG 1 nguồn.
    const u = this.director.update(time / 1000);
    if (u.flick) {
      this.usedDemoFlick = true;
      this.pendingFlicks.push(u.flick); // NGUYÊN BẢN — không assist (consumePending Pending cũng không assist)
      this.consumePending();
    }
    if (u.banner === 'YOUR TURN') {
      this.demoText.showYourTurn();
    }
    // Sweet-zone CHỈ demo (U2) — highlight vùng ngọt theo window config (không phải lúc tự kéo).
    if (u.sweetZone !== this.sweetZone) {
      this.sweetZone = u.sweetZone;
      if (!this.sweetZone) this.aim.clearSweetZone();
    }
    if (u.slowmo) this.applySlowmoForTest(MECHANICS.slowmoTimescale); // B3: slow-mo 0.4×
    if (u.done) this.finishDemo();
  }

  /** Juice bổ sung T4: plop pitch (audioMapper) + spray pool + combo banner + slow-mo.
   * PERFECT bám ĐÚNG đường judge tầng A (engine.judgedPerfect — consumePending markPerfect):
   * bounce ĐẦU của run PERFECT → banner 2 dòng + slow-mo 0.4×; splash (run kết thúc) → trả nhịp.
   * Plop pitch truyền SỐ NẢY THẬT của run (engine.bounces — review r2 điểm 1): tại thời điểm
   * bounce event, getter ĐÃ gồm cú hiện tại; tại splash = tổng nảy của run. 0 đụng audioMapper. */
  protected override applyEvents(events: EngineEvent[]): void {
    super.applyEvents(events);
    // Sound-off UX (CONTRACT mục 5 — review r2 điểm 2): resume fail → banner "SOUND OFF"
    // + ripple boost ở bounce kế. Latch ĐÚNG 1 LẦN — không spam banner/boost.
    if (!this.soundOffShown && this.plop.isSoundOff()) {
      this.soundOffShown = true;
      this.soundOffBoostNext = true;
      this.demoText.showNote('SOUND OFF');
    }
    for (const ev of events) {
      if (ev.type === 'bounce') {
        this.plop.play(
          plopParams({
            bounces: this.engine.bounces,
            impact: ev.impact,
            hit: true,
            perfect: this.engine.judgedPerfect,
          }),
        );
        const x = this.proj.xToScreenX(ev.stoneX, ev.stoneZ);
        const y = this.proj.zToY(ev.stoneZ);
        // Ripple boost 1 lần cho sound-off (ripple TO HƠN đè lên ripple thường của base — CONTRACT mục 5).
        if (this.soundOffBoostNext) {
          this.ripple.spawn(x, y, (0.5 + ev.impact) * 1.35);
          this.soundOffBoostNext = false;
        }
        if (ev.impact >= SPRAY_IMPACT_MIN) {
          this.spray.burst(x, y, ev.impact);
        }
        if (this.engine.judgedPerfect && !this.comboShownThisRun) {
          this.comboShownThisRun = true;
          this.showCombo(); // banner "PERFECT FLICK! / ×2" + camera punch (×2 điểm cú thả — tầng A)
          this.applySlowmoForTest(MECHANICS.slowmoTimescale); // slow-mo 0.4× (CONTRACT §2)
        }
      } else if (ev.type === 'splash') {
        this.plop.play(
          plopParams({ bounces: this.engine.bounces, impact: ev.stoneZ > 0 ? 0.5 : 0.2, hit: false }),
        );
        this.spray.burst(this.proj.xToScreenX(ev.stoneX, ev.stoneZ), this.proj.zToY(ev.stoneZ), 1);
        this.comboShownThisRun = false;
        this.clearSlowmoForTest(); // run kết thúc — nhịp thường cho cú tiếp theo
      }
    }
  }

  /** PERFECT → combo banner 2 dòng + camera punch (juice — số ×2 sống ở tầng A). */
  private showCombo(): void {
    this.combo.show(this);
    this.camFx.punch(0.03);
  }

  /** FUN2-C1 whoosh lúc ném — consumePending gọi TRƯỚC throwFlick (phủ demo + người chơi).
   * 0 đổi signature applyEvents/consumePending (vùng từng chét BUG-GOM-01/02). */
  protected override onWhoosh(power: number): void {
    this.plop.playWhoosh(power);
  }

  /** Hết demo (hết 12s / skip-on-touch) — flip demo→local + banner sạch + slow-mo thả + trao tay.
   * BUG-GOM-02 (sk_best không bị demo ghi — TEST-FIELDS mục 6): trao tay CHỈ khi run demo
   * KHÔNG còn đang bay. Run còn bay lúc flip → hoãn trao tay (handoffPending): run được
   * "mượn" chốt ở stage demo 1 thời gian ngắn (applyRun trên lifecycle demo — stage demo
   * KHÔNG ghi best theo tầng A), trao tay local chạy đầu frame kế (update). Cú demo còn
   * chờ trong hàng đợi bị XẢ SẠCH — không bao giờ được thả ở stage local. */
  private finishDemo(): void {
    if (this.stage === 'local') return;
    // XẢ SẠCH hàng đợi cú demo (skip giữa demo — chúng không được thả ở local):
    this.pendingFlicks.length = 0;
    if (this.engine.stone && !this.engine.finished) {
      // Run demo đang bay — flip chờ run chốt (hoãn trao tay, không trao giữa run).
      // (stone null + finished=false = engine chưa từng ném — flip NGAY, không chờ.)
      this.handoffPending = true;
      return;
    }
    this.stage = 'local';
    this.sweetZone = false;
    this.aim.clearSweetZone();
    this.clearSlowmoForTest();
    this.demoText.clear();
    // Trao tay B4: lifecycle local MỚI — lượt người chơi chấm best thật qua tầng A
    // (scene không tự ghi best; runLifecycle là chủ sở hữu storage điểm).
    this.lifecycle = new RunLifecycle(this.storage, { stage: 'local' });
    this.hud.render(this.lifecycle);
    // Demo-once ĐÚNG 1 LẦN (T5 guard double-write): natural end director ĐÃ markDone qua
    // update() (public interface tầng A) — scene chỉ ghi khi chưa có marker (đường skip-on-touch).
    if (!isDemoDone(this.storage)) this.storage.setItem(DEMO_DONE_KEY, '1');
  }

  /** Trao tay hoãn (BUG-GOM-02): run demo đã chốt ở stage demo → flip local NGAY (path gốc). */
  private finishHandoff(): void {
    if (!this.handoffPending) return;
    this.handoffPending = false;
    this.finishDemo(); // demoQueued=0 + demoRunFlying=false → path trao tay chính
  }

  /** Vẽ vùng ngọt (U2) — gọi trong renderAim khi stage demo VÀ highlight đang bật. */
  protected override renderAim(input: { dirX: number; dirZ: number; power: number } | null): void {
    const ox = this.proj.xToScreenX(0, 0);
    const oy = this.proj.waterlineY - 10;
    const demo = this.stage === 'demo';
    this.aim.render(ox, oy, input, demo && this.sweetZone);
    if (demo && this.sweetZone) {
      // Vùng ngọt = band lực window (0.7–0.9) — mép vẽ nhắm đúng độ dài aim line.
      this.aim.renderSweetZone(ox, oy, SWEET_MIN_PX, SWEET_MAX_PX, GAUGE_COLOR_PERFECT, SWEET_ALPHA, SWEET_RIP_PX);
    }
  }

  // ---- mirror test (TDD-B wiring — không lộ logic mới) ----
  demoDoneForTest(): boolean {
    return isDemoDone(
      typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage(),
    );
  }
  comboBannerForTest(): Phaser.GameObjects.Container | null {
    return (this.combo as unknown as { line1?: unknown }).line1 ? { list: [(this.combo as unknown as { line1: unknown }).line1, (this.combo as unknown as { line2: unknown }).line2] } as unknown as Phaser.GameObjects.Container : null;
  }
  demoBannerForTest(): Phaser.GameObjects.Container | null {
    return (this.demoText as unknown as { main?: unknown }).main ? { list: [(this.demoText as unknown as { main: unknown }).main, (this.demoText as unknown as { sub: unknown }).sub] } as unknown as Phaser.GameObjects.Container : null;
  }
  slowmoScaleForTest(): number {
    return this.slowmoScale;
  }
  applySlowmoForTest(scale: number): void {
    this.slowmoScale = scale;
  }
  clearSlowmoForTest(): void {
    this.slowmoScale = 1;
  }
  /** Skip-on-touch mirror (CONTRACT 3.1) — dùng bởi wiring test (finishDemo private). */
  skipDemoForTest(): void {
    this.finishDemo();
  }
  /** Mirror BUG-GOM-02 — QA/test soi trạng thái trao tay demo (không lộ logic mới). */
  demoHandoffForTest(): { pendingFlicks: number; handoffPending: boolean; demoRunFlying: boolean } {
    return {
      pendingFlicks: this.pendingFlicks.length,
      handoffPending: this.handoffPending,
      demoRunFlying: !!this.engine.stone && !this.engine.finished,
    };
  }
  // ---- mirror test round-2 (review điểm 1+2 — không lộ logic mới) ----
  plopSynthForTest(): PlopSynth {
    return this.plop;
  }
  /** FUN2-C1 mirror mute button (test toggle + persist — không lộ logic mới). */
  toggleMuteForTest(): void {
    this.muteBtn.toggle();
  }
  muteButtonForTest(): MuteButton {
    return this.muteBtn;
  }
  rippleForTest(): RippleFx {
    return this.ripple;
  }
  applyEventsForTest(events: EngineEvent[]): void {
    this.applyEvents(events);
  }
  triggerComboForTest(input: FlickInput): void {
    // Cùng đường judge tầng A: throw + markPerfect — banner/slow-mo do applyEvents diễn khi bounce.
    this.engine.throwFlick(input);
    if (judgePerfect(input, MECHANICS)) this.engine.markPerfect();
  }
}

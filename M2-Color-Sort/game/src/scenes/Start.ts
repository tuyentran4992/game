import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle, toColor } from '../tokens';
import {
  drawButton,
  drawGalaxyBg,
  drawTube,
  drawBolt,
  renderLiquid,
  renderPourTransition,
  drawPourStream,
  sealTube,
  unsealTube,
  synthAudio,
  TubeViews,
  GalaxyBgObjects,
} from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { inputGate } from '../input-gate';
import { hideBootOverlay } from '../boot-ui';
import { startBgmOnce } from '../bgm';

// Demo minh họa cơ chế: đổ 3 lát cyan sang ống bên phải → ống ĐẦY 1 MÀU → SEAL.
const DEMO_SRC = ['#FF1493', '#00F0FF', '#00F0FF', '#00F0FF'];
const DEMO_DST = ['#00F0FF'];
const DEMO_POUR = 3;

/** Layout metrics cho 1 viewport — fractions + min-height guard (AUDIT §B5-1). */
interface StartMetric {
  landscape: boolean; tablet: boolean; short: boolean; tubeFactor: number;
  tubeW: number; tubeH: number; hintSize: number;
  titleX: number; demoX: number; rightX: number;
  titleY: number; demoY: number; hintY: number; btnY: number; capY: number;
}

export class StartScene extends Phaser.Scene {
  private bgObjects!: GalaxyBgObjects;
  private titleContainer!: Phaser.GameObjects.Container;
  private demoContainer!: Phaser.GameObjects.Container;
  private startBtn!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private hintLine!: Phaser.GameObjects.Text;
  private demoTubes: TubeViews[] = [];
  private demoStreamG!: Phaser.GameObjects.Graphics;
  private demoTimer: Phaser.Time.TimerEvent | null = null;
  private readySignalled = false;
  /** AUDIT P-1: reference để gỡ resize handler khi shutdown. */
  private onResizeBound!: (g: Phaser.Structs.Size) => void;

  constructor() {
    super({ key: 'StartScene' });
  }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    this.bgObjects = drawGalaxyBg(this);

    const m = this.metric(width, height);

    // 1. Logo / Title container (Crisp & Static, zero text scaling jitter)
    this.buildTitle(m, true);

    // 2. Demo ống nghiệm — vòng lặp ĐỔ + SEAL (dạy cơ chế trước khi bấm Play)
    this.buildDemo(m, true);

    // 3. Neon Play Button (data-testid: start-btn)
    const { container } = drawButton(this, m.rightX, m.btnY, 'PLAY', {
      testid: 'start-btn',
      width: Math.min(270, width - 72),
      height: 72,
      variant: 'primary',
      glowColor: color.primary,
    });
    this.startBtn = container;
    this.startBtn.setAlpha(0).setScale(0.9);

    // Smooth button entrance
    this.tweens.add({
      targets: this.startBtn,
      alpha: 1,
      scale: 1,
      duration: 450,
      delay: 180,
      ease: 'back.out',
      onComplete: () => {
        // nhịp "thở" nhẹ mời chạm (không che chữ, không đổi layout)
        this.tweens.add({
          targets: this.startBtn,
          scale: 1.04,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inout',
        });
      },
    });

    this.startBtn.on('pointerdown', () => {
      // B2 PRE-ROLL GATE: chưa sẵn sàng / đang pre-roll → không nhận tap.
      if (!inputGate.enabled) return;
      synthAudio.playClick();
      startBgmOnce(this.game);   // AUDIT P-3: BGM start đúng 1 lần ở user gesture
      this.tweens.killTweensOf(this.startBtn);
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // 4. Caption Level
    const startLevel = Math.max(1, ctx.currentLevel);
    this.caption = this.add.text(
      m.rightX,
      m.capY,
      `Start Level ${startLevel}`,
      fontStyle(type.small, color.accent),
    ).setOrigin(0.5).setDepth(z.hud).setAlpha(0);
    this.caption.setShadow(0, 2, color.shadow, 4, false, true);

    this.tweens.add({
      targets: this.caption,
      alpha: 0.9,
      duration: 400,
      delay: 250,
      ease: 'quad.out',
    });

    // 5. Dòng gợi ý cơ chế (copy MỚI — English only)
    // AUDIT §B5-1: wordWrap + responsive font size (>=14, min(18, w/22)).
    this.hintLine = this.add.text(
      m.rightX,
      m.hintY,
      'Pour a tube into one solid color to seal it',
      this.hintStyle(width, m.hintSize),
    ).setOrigin(0.5).setDepth(z.hud).setAlpha(0);
    this.tweens.add({
      targets: this.hintLine,
      alpha: 0.75,
      duration: 400,
      delay: 320,
      ease: 'quad.out',
    });

    this.onResizeBound = (g: Phaser.Structs.Size) => this.onResize(g);
    this.scale.on('resize', this.onResizeBound);
    // AUDIT P-1: Phaser không tự gọi shutdown() → tự gỡ listener khi scene bị dừng.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResizeBound);
    });

    // P0-5: mọi asset đã tải (BootScene) và nút PLAY đã nhận input → báo platform.
    this.signalReady();
  }

  /**
   * P0-5 — THỨ TỰ BẮT BUỘC:
   *   khung hình đầu tiên đã render → ytgame.game.firstFrameReady()
   *   → gỡ loading overlay → ytgame.game.gameReady() (Start đã tương tác được).
   * Không bao giờ gọi gameReady() trước khi BootScene.preload() xong.
   */
  private signalReady() {
    if (this.readySignalled) return;
    this.readySignalled = true;
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      sdk.firstFrameReady();
      hideBootOverlay();
      // 1 frame nữa để chắc chắn input của nút PLAY đã hoạt động.
      this.time.delayedCall(0, () => {
        sdk.gameReady();
        // B2 PRE-ROLL GATE: chỉ TỪ ĐÂY input mới được nhận (và chỉ khi platform
        // không đang pause vì pre-roll — xem inputGate.setPaused trong main.ts).
        inputGate.markReady();
      });
    });
  }

  /** Styling chung cho hint line: wordWrap + responsive size (AUDIT §B5-1). */
  private hintStyle(w: number, fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      ...fontStyle(type.small, color.surface),
      fontStyle: type.small.weight,
      fontSize: `${fontSize}px`,
      wordWrap: { width: Math.min(w - 48, 460) },
    };
  }

  // ==========================================================================
  // RESPONSIVE START LAYOUT — fractions + min-height guard + landscape 2-col
  // (AUDIT §B5-1: short viewport / rotation NEVER collides title/demo/btn/caption)
  // ==========================================================================
  private metric(w: number, h: number) {
    const landscape = w > h;
    const tablet = w >= 700;
    const short = h < 560;
    const tubeFactor = tablet
      ? (landscape ? 1.2 : 1.55)
      : (short ? (landscape ? 0.7 : 0.85) : 1.0);
    const tubeW = Math.round(76 * tubeFactor);
    const tubeH = Math.round(180 * tubeFactor);
    const demoHalf = Math.round(tubeH * 0.5);
    const hintSize = Math.max(14, Math.min(18, w / 22));
    const cx = w / 2;

    let titleX = cx, demoX = cx, rightX = cx;
    let titleY: number, demoY: number, hintY: number, btnY: number, capY: number;

    if (landscape) {
      // 2 cột: title trên giữa · demo trái · (hint / PLAY / caption) phải
      demoX = w * 0.3;
      rightX = w * 0.68;
      titleY = Math.max(h * 0.14, 34);
      demoY = Math.max(h * 0.5, demoHalf + 40);
      hintY = Math.max(h * 0.36, 84);
      btnY = Math.min(h * 0.55, h - 60);
      capY = Math.min(h - 26, btnY + 92);
    } else {
      titleY = Math.max(h * 0.16, 78);
      demoY = titleY + demoHalf + (tablet ? 96 : 64);
      hintY = demoY + demoHalf + 20;
      btnY = Math.max(hintY + 70, h * 0.74);
      capY = Math.min(h - 34, btnY + 82);
    }

    return {
      landscape, tablet, short, tubeFactor, tubeW, tubeH, hintSize,
      titleX, demoX, rightX, titleY, demoY, hintY, btnY, capY,
    };
  }

  /** Title + glow + 2-tone (AUDIT §B5-1/§B5-3). `animate` = entrance tween lần đầu. */
  private buildTitle(m: StartMetric, animate: boolean) {
    if (this.titleContainer) this.titleContainer.destroy();
    this.titleContainer = this.add.container(m.titleX, m.titleY).setDepth(z.hud);

    // vầng sáng neon phía sau tiêu đề — RESPONSIVE (min(w-40, 460)), không còn band 380px cố định
    const gw = Math.min(m.titleX * 2 - 40, 460);
    const gh = Math.min(gw * 0.3, 116);
    const titleGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    titleGlow.fillStyle(toColor(color.primary), 0.16);
    titleGlow.fillRoundedRect(-gw / 2, -gh / 2, gw, gh, 34);
    titleGlow.fillStyle(toColor(color.accent), 0.1);
    titleGlow.fillRoundedRect(-gw * 0.42, -gh * 0.34, gw * 0.84, gh * 0.68, 26);
    this.titleContainer.add(titleGlow);

    // Title chính — real weight 900 + stroke đậm (legibility) + 2-tone top-lit copy
    const title1 = this.add.text(0, -20, 'NEON SORT', fontStyle(type.display, color.surface))
      .setOrigin(0.5);
    title1.setShadow(0, 3, 'rgba(0,0,0,0.7)', 6, false, true);
    const title1Hi = this.add.text(0, -22, 'NEON SORT', fontStyle(type.display, color.primaryGrad))
      .setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.34);
    this.titleContainer.add([title1, title1Hi]);

    // Subtitle — no ⚡ emoji; vector bolt flanking (AUDIT §B5-6)
    const title2 = this.add.text(0, 34, 'GALAXY POUR', fontStyle(type.h1, color.accent))
      .setOrigin(0.5);
    title2.setShadow(0, 2, color.accent, 10, false, true);
    const boltL = drawBolt(this, toColor(color.accent), 26).setPosition(-title2.width / 2 - 20, 34);
    const boltR = drawBolt(this, toColor(color.accent), 26).setPosition(title2.width / 2 + 20, 34);
    this.titleContainer.add([title2, boltL, boltR]);

    if (animate) this.titleContainer.setAlpha(0);
    this.tweens.add({
      targets: this.titleContainer,
      alpha: 1,
      duration: dur.slow,
      ease: 'cubic.out',
    });
    // trôi nhẹ (neon "đang sống")
    this.tweens.add({
      targets: this.titleContainer,
      y: m.titleY - 8,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.55,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
  }

  /** Demo tubes — sized by metric (larger on tablets, AUDIT §B5-1). */
  private buildDemo(m: StartMetric, animate: boolean) {
    if (this.demoContainer) {
      for (const t of this.demoTubes) this.tweens.killTweensOf(t.container);
      this.demoContainer.destroy();
    }
    this.demoTubes = [];
    this.demoContainer = this.add.container(m.demoX, m.demoY).setDepth(z.actor);

    const offsetX = Math.round(56 * m.tubeFactor);

    const tubeA = drawTube(this, m.tubeW, m.tubeH, 4);
    tubeA.container.setPosition(-offsetX, 0);
    renderLiquid(tubeA, DEMO_SRC);
    this.demoContainer.add(tubeA.container);
    this.demoTubes.push(tubeA);

    const tubeB = drawTube(this, m.tubeW, m.tubeH, 4);
    tubeB.container.setPosition(offsetX, 0);
    renderLiquid(tubeB, DEMO_DST);
    this.demoContainer.add(tubeB.container);
    this.demoTubes.push(tubeB);

    this.demoStreamG = this.add.graphics().setDepth(z.actor + 3);
    this.demoContainer.add(this.demoStreamG);

    if (animate) {
      this.demoContainer.setScale(0.85).setAlpha(0);
      this.tweens.add({
        targets: this.demoContainer,
        scale: 1,
        alpha: 1,
        duration: 450,
        delay: 100,
        ease: 'back.out',
        onComplete: () => this.runDemoCycle(),
      });
    } else {
      this.demoContainer.setScale(1).setAlpha(1);
      this.runDemoCycle();
    }
  }

  private onResize(g: Phaser.Structs.Size) {
    // AUDIT P-1: guard khi đang teardown (không đụng vào object đã destroy).
    if (!this.bgObjects || !this.titleContainer) return;
    this.bgObjects.g.destroy();
    if (this.bgObjects.bgImage) this.bgObjects.bgImage.destroy();
    this.bgObjects = drawGalaxyBg(this);

    const m = this.metric(g.width, g.height);
    // §B5-1: re-flow toàn bộ (title glow responsive, demo size, hint font/wrap).
    this.buildTitle(m, false);
    this.buildDemo(m, false);
    this.startBtn.setPosition(m.rightX, m.btnY);
    this.caption.setPosition(m.rightX, m.capY);
    this.hintLine.setPosition(m.rightX, m.hintY)
      .setFontSize(m.hintSize)
      .setWordWrapWidth(Math.min(g.width - 48, 460));
  }

  // ==========================================================================
  // DEMO LOOP: nghiêng → rót 3 lát → ống đích ĐẦY 1 MÀU → SEAL → reset
  // (dùng đúng các helper của gameplay → demo giống thật, 0 KB asset thêm)
  // ==========================================================================
  private runDemoCycle() {
    const [src, dst] = this.demoTubes;
    if (!src || !dst) return;

    unsealTube(this, dst);
    renderLiquid(src, DEMO_SRC);
    renderLiquid(dst, DEMO_DST);
    const off = Math.abs(src.container.x);
    src.container.setPosition(-off, 0).setAngle(0);
    this.demoStreamG.clear();

    const srcBase = DEMO_SRC.slice(0, DEMO_SRC.length - DEMO_POUR);
    const dstBase = DEMO_DST.slice();
    const pourHex = DEMO_SRC[DEMO_SRC.length - 1];

    // 1. Nghiêng về phía ống đích
    this.tweens.add({
      targets: src.container,
      x: off - src.width * 0.66,
      y: -dst.height * 0.52,
      angle: 52,
      duration: 420,
      delay: 500,
      ease: 'cubic.out',
      onComplete: () => {
        // 2. Rót (nguồn rút / đích dâng đồng bộ)
        const data = { t: 0 };
        this.tweens.add({
          targets: data,
          t: 1,
          duration: 560,
          ease: 'sine.inout',
          onUpdate: () => {
            drawPourStream(
              this.demoStreamG,
              src.container.x + src.width * 0.32,
              src.container.y + src.height * 0.1,
              dst.container.x,
              dst.container.y - dst.height * 0.42,
              pourHex,
              6,
            );
            renderPourTransition(src, srcBase, pourHex, 1 - data.t, DEMO_POUR);
            renderPourTransition(dst, dstBase, pourHex, data.t, DEMO_POUR);
          },
          onComplete: () => {
            this.demoStreamG.clear();
            renderLiquid(src, srcBase);
            renderLiquid(dst, [...dstBase, pourHex, pourHex, pourHex]);

            // 3. Ống đích về chỗ + SEAL (frost + ring khép + shimmer)
            this.tweens.add({
              targets: src.container,
              x: -off,
              y: 0,
              angle: 0,
              duration: 320,
              ease: 'cubic.out',
            });
            sealTube(this, dst, pourHex);

            // 4. Lặp lại sau khi người xem kịp thấy khoảnh khắc seal
            this.demoTimer = this.time.delayedCall(1900, () => this.runDemoCycle());
          },
        });
      },
    });
  }

  shutdown() {
    if (this.demoTimer) {
      this.demoTimer.remove();
      this.demoTimer = null;
    }
    this.scale.off('resize', this.onResizeBound);
  }
}

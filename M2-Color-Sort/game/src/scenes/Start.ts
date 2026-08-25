import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle, toColor } from '../tokens';
import {
  drawButton,
  drawGalaxyBg,
  drawTube,
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

// Demo minh họa cơ chế: đổ 3 lát cyan sang ống bên phải → ống ĐẦY 1 MÀU → SEAL.
const DEMO_SRC = ['#FF1493', '#00F0FF', '#00F0FF', '#00F0FF'];
const DEMO_DST = ['#00F0FF'];
const DEMO_POUR = 3;

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

  constructor() {
    super({ key: 'StartScene' });
  }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    this.bgObjects = drawGalaxyBg(this);

    // 1. Logo / Title container (Crisp & Static, zero text scaling jitter)
    this.titleContainer = this.add.container(width / 2, height * 0.2).setDepth(z.hud).setAlpha(0);

    // vầng sáng neon phía sau tiêu đề (rẻ: 2 rounded rect ADD blend)
    const titleGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    titleGlow.fillStyle(toColor(color.primary), 0.16);
    titleGlow.fillRoundedRect(-190, -52, 380, 108, 34);
    titleGlow.fillStyle(toColor(color.accent), 0.1);
    titleGlow.fillRoundedRect(-160, -34, 320, 72, 26);
    this.titleContainer.add(titleGlow);

    const title1 = this.add.text(0, -18, 'NEON SORT', fontStyle(type.display, color.surface))
      .setOrigin(0.5);
    title1.setShadow(0, 3, 'rgba(0,0,0,0.7)', 6, false, true);

    const title2 = this.add.text(0, 30, '⚡ GALAXY POUR ⚡', fontStyle(type.h1, color.accent))
      .setOrigin(0.5);
    title2.setShadow(0, 2, color.accent, 10, false, true);

    this.titleContainer.add([title1, title2]);

    // Smooth single entrance transition
    this.tweens.add({
      targets: this.titleContainer,
      alpha: 1,
      duration: dur.slow,
      ease: 'cubic.out',
    });
    // trôi nhẹ (neon "đang sống")
    this.tweens.add({
      targets: this.titleContainer,
      y: height * 0.2 - 8,
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

    // 2. Demo ống nghiệm — vòng lặp ĐỔ + SEAL (dạy cơ chế trước khi bấm Play)
    this.demoContainer = this.add.container(width / 2, height * 0.46).setDepth(z.actor).setScale(0.85).setAlpha(0);
    this.demoTubes = [];

    const tubeA = drawTube(this, 76, 180, 4);
    tubeA.container.setPosition(-56, 0);
    renderLiquid(tubeA, DEMO_SRC);
    this.demoContainer.add(tubeA.container);
    this.demoTubes.push(tubeA);

    const tubeB = drawTube(this, 76, 180, 4);
    tubeB.container.setPosition(56, 0);
    renderLiquid(tubeB, DEMO_DST);
    this.demoContainer.add(tubeB.container);
    this.demoTubes.push(tubeB);

    this.demoStreamG = this.add.graphics().setDepth(z.actor + 3);
    this.demoContainer.add(this.demoStreamG);

    // Smooth entrance
    this.tweens.add({
      targets: this.demoContainer,
      scale: 1,
      alpha: 1,
      duration: 450,
      delay: 100,
      ease: 'back.out',
      onComplete: () => this.runDemoCycle(),
    });

    // 3. Neon Play Button (data-testid: start-btn)
    const { container } = drawButton(this, width / 2, height * 0.72, '▶ PLAY', {
      testid: 'start-btn',
      width: 270,
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
      this.tweens.killTweensOf(this.startBtn);
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // 4. Caption Level
    const startLevel = Math.max(1, ctx.currentLevel);
    this.caption = this.add.text(
      width / 2,
      height * 0.81,
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
    this.hintLine = this.add.text(
      width / 2,
      height * 0.61,
      'Pour a tube into one solid color to seal it',
      fontStyle(type.small, color.surface),
    ).setOrigin(0.5).setDepth(z.hud).setAlpha(0);
    this.hintLine.setShadow(0, 2, color.shadow, 4, false, true);
    this.tweens.add({
      targets: this.hintLine,
      alpha: 0.75,
      duration: 400,
      delay: 320,
      ease: 'quad.out',
    });

    this.scale.on('resize', (g: Phaser.Structs.Size) => this.onResize(g));

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

  private onResize(g: Phaser.Structs.Size) {
    this.bgObjects.g.destroy();
    if (this.bgObjects.bgImage) this.bgObjects.bgImage.destroy();
    this.bgObjects = drawGalaxyBg(this);

    this.tweens.killTweensOf(this.titleContainer);
    this.titleContainer.setPosition(g.width / 2, g.height * 0.2);
    this.tweens.add({
      targets: this.titleContainer,
      y: g.height * 0.2 - 8,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    this.demoContainer.setPosition(g.width / 2, g.height * 0.46);
    this.startBtn.setPosition(g.width / 2, g.height * 0.72);
    this.caption.setPosition(g.width / 2, g.height * 0.81);
    this.hintLine.setPosition(g.width / 2, g.height * 0.61);
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
    src.container.setPosition(-56, 0).setAngle(0);
    this.demoStreamG.clear();

    const srcBase = DEMO_SRC.slice(0, DEMO_SRC.length - DEMO_POUR);
    const dstBase = DEMO_DST.slice();
    const pourHex = DEMO_SRC[DEMO_SRC.length - 1];

    // 1. Nghiêng về phía ống đích
    this.tweens.add({
      targets: src.container,
      x: 56 - src.width * 0.66,
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
              x: -56,
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
  }
}

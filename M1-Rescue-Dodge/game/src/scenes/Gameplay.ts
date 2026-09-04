import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, paletteForLevel, toColor } from '../tokens';
import { ctx } from '../context';
import { sdk } from '@game/sdk';
import { MECHANICS, BeeType } from '../logic/mechanics';
import { PauseModal } from '../ui/PauseModal';

interface Bee {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  type: BeeType;
  lane: number;
  secondaryLane?: number;
  speedMult: number;
  dodged: boolean;
  swerved?: boolean;
  isSwarm?: boolean;
}

type ItemType = 'fish' | 'shield' | 'magnet';

interface Item {
  container: Phaser.GameObjects.Container;
  type: ItemType;
  lane: number;
  collected: boolean;
}

export class GameplayScene extends Phaser.Scene {
  private pauseBtnContainer!: Phaser.GameObjects.Container;
  private pauseBtnText!: Phaser.GameObjects.Text;
  private audioBtnContainer!: Phaser.GameObjects.Container;
  private audioBtnText!: Phaser.GameObjects.Text;
  private pauseModal?: PauseModal;
  private isPaused = false;

  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private fishLabel!: Phaser.GameObjects.Text;
  private feverBarG!: Phaser.GameObjects.Graphics;
  private feverFlameG!: Phaser.GameObjects.Graphics;
  private feverStatusLabel!: Phaser.GameObjects.Text;
  private levelProgressG!: Phaser.GameObjects.Graphics;
  private levelProgressLabel!: Phaser.GameObjects.Text;

  private levelPopup!: Phaser.GameObjects.Text;
  private levelSubPopup!: Phaser.GameObjects.Text;
  private comboPopup!: Phaser.GameObjects.Text;
  private recordPopup!: Phaser.GameObjects.Container;
  private nearMissPopup!: Phaser.GameObjects.Text;
  private powerupPopup!: Phaser.GameObjects.Text;
  private swarmWarningPopup!: Phaser.GameObjects.Container;
  private swarmSurvivePopup!: Phaser.GameObjects.Text;

  private catShadow!: Phaser.GameObjects.Graphics;
  private cat!: Phaser.GameObjects.Image;
  private shieldBubble!: Phaser.GameObjects.Graphics;
  private magnetIndicator!: Phaser.GameObjects.Text;
  private feverAura!: Phaser.GameObjects.Graphics;
  private bgG!: Phaser.GameObjects.Graphics;
  private speedLinesG!: Phaser.GameObjects.Graphics;
  private natureParticlesG!: Phaser.GameObjects.Graphics;
  private roadsidePropsG!: Phaser.GameObjects.Graphics;

  private bgImage?: Phaser.GameObjects.Image;
  private lanes: number[] = [];
  private currentLane = 1;
  private moveSeq = 0;
  private isMovingLane = false;
  private runningPuffTimer = 0;

  private bees: Bee[] = [];
  private items: Item[] = [];
  private natureParticles: Array<{
    xRatio: number;
    y: number;
    speedMult: number;
    swayOffset: number;
    swaySpeed: number;
    size: number;
    color: number;
    alpha: number;
  }> = [];
  private roadsideProps: Array<{
    side: -1 | 1;
    t: number;
    speedMult: number;
    lateralOffsetRatio: number;
    propType: 'daisy' | 'grass' | 'flower_purple' | 'pebble';
  }> = [];
  private fatBeeActive = false;

  private elapsed = 0;
  private lastTick = 0;
  private lastSpawn = 0;
  private lastItemSpawn = 0;
  private lastSwarmTime = 0;
  private swarmActive = false;
  private swarmBeesRemaining = 0;
  private beeTrailTimer = 0;

  private running = false;
  private muted = false;

  constructor() { super({ key: 'GameplayScene' }); }

  private getCatY(height: number): number {
    return height * 0.78;
  }

  private drawCatShadow(x: number, y: number, w: number, h: number, scaleX = 1, scaleY = 1) {
    if (!this.catShadow || !this.catShadow.active) return;
    this.catShadow.clear();
    // Radial-gradient ellipse: width ~1.4x cat body, height ~0.35x, peak alpha 0.22, feathered edges (no hard rim)
    const shadowW = (w * 1.40) * scaleX;
    const shadowH = (h * 0.35) * scaleY;
    const shadowY = y + h * 0.44;
    const steps = 10;
    const alphaStep = 0.22 / steps;
    for (let i = steps; i >= 1; i--) {
      const ratio = i / steps;
      this.catShadow.fillStyle(0x1B1008, alphaStep);
      this.catShadow.fillEllipse(x, shadowY, shadowW * ratio, shadowH * ratio);
    }
  }

  private getPlayfieldTop(_height: number): number {
    return 0;
  }

  private getHudBottom(): number {
    const hudY = Math.max(38, this.scale.height * 0.05);
    const feverBottom = hudY + 24 + 28; // fever pill bottom
    const levelProgBottom = hudY + 62 + 12 + 14; // level-progress pill + label
    const fishBottom = hudY + 20 + 12;
    const scoreBottom = hudY - 4 + 18;
    const btnBottom = hudY + 17;
    return Math.max(feverBottom, levelProgBottom, fishBottom, scoreBottom, btnBottom);
  }

  private getHudSafeAreaBottom(): number {
    return this.getHudBottom() + 16;
  }

  private getPlayfieldBounds(width: number, height: number): { left: number; right: number; width: number; center: number } {
    const isPortrait = height >= width;
    const pfWidth = isPortrait ? width : Math.min(width, Math.min(460, Math.round(height * 0.58)));
    const left = (width - pfWidth) / 2;
    const right = left + pfWidth;
    return { left, right, width: pfWidth, center: width / 2 };
  }

  private getRoadWidthForBg(bgKey: string): number {
    switch (bgKey) {
      case 'bg_sunset': return 220;
      case 'bg_night': return 278;
      case 'bg_day':
      default: return 329;
    }
  }

  private getStraightRoadMetrics(width: number, _height: number, bgKey = 'bg_day') {
    // Mobile-first wide and spacious road (72% of width = 518px on 720px, each lane = 173px)
    const roadW = width * 0.72;
    const halfW = roadW / 2;
    const leftEdge = width / 2 - halfW;
    const laneWidth = roadW / 3;
    const imgRoadW = this.getRoadWidthForBg(bgKey);
    const bgScale = roadW / imgRoadW;
    return { roadW, halfW, leftEdge, laneWidth, bgScale };
  }

  private computeLanes(width: number, height: number): number[] {
    const { leftEdge, laneWidth } = this.getStraightRoadMetrics(width, height);
    return [
      leftEdge + 0.5 * laneWidth,
      leftEdge + 1.5 * laneWidth,
      leftEdge + 2.5 * laneWidth,
    ];
  }

  private getCatSize(width: number, height: number): { w: number; h: number } {
    const { laneWidth } = this.getStraightRoadMetrics(width, height);
    const size = Math.round(Math.min(120, laneWidth * 0.70));
    return { w: size, h: size };
  }

  private getBeeSize(width: number, height: number): number {
    const { laneWidth } = this.getStraightRoadMetrics(width, height);
    const size = Math.round(Math.min(84, laneWidth * 0.50));
    return size;
  }

  private isResumeMode = false;

  init(data?: { resume?: boolean }) {
    this.isResumeMode = data?.resume === true;
    this.bgImage = undefined;
    this.bgG = undefined as any;
    this.bees = [];
    this.items = [];
    this.natureParticles = [];
    this.roadsideProps = [];
    this.fatBeeActive = false;
    this.isMovingLane = false;
    this.runningPuffTimer = 0;
  }

  async create(data?: { resume?: boolean }) {
    const { width, height } = this.scale;
    this.fatBeeActive = false;
    const isResume = data?.resume === true || this.isResumeMode === true;
    this.isResumeMode = false;
    this.bgImage = undefined;
    this.bgG = undefined as any;

    if (isResume) {
      ctx.engine.resumeGame();
    } else {
      ctx.engine.startNewGame();
    }

    this.elapsed = isResume ? ctx.engine.elapsed : 0;
    this.lastTick = 0;
    this.lastSpawn = 0;
    this.lastItemSpawn = 0;
    this.lastSwarmTime = this.elapsed + 8;
    this.swarmActive = false;
    this.swarmBeesRemaining = 0;
    this.bees = [];
    this.items = [];
    this.currentLane = 1;
    this.moveSeq = 0;
    this.running = false;
    this.isPaused = false;
    this.muted = !sdk.isAudioEnabled();

    this.drawLevelBg(ctx.engine.getLevel());
    this.lanes = this.computeLanes(width, height);

    const pf = this.getPlayfieldBounds(width, height);
    // HUD Safe-Zone
    const hudY = Math.max(38, height * 0.05);
    const btnSize = 34;

    // 1. Pause Button (Top-Left inside playfield column)
    this.pauseBtnContainer = this.add.container(pf.left + 26, hudY).setDepth(z.hud);
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x0F172A, 0.45);
    pauseBg.fillCircle(0, 0, btnSize / 2);
    pauseBg.lineStyle(1.5, 0xFFFFFF, 0.7);
    pauseBg.strokeCircle(0, 0, btnSize / 2);
    this.pauseBtnText = this.add.text(0, 0, '⏸️', { fontSize: '15px' }).setOrigin(0.5);
    this.pauseBtnContainer.add([pauseBg, this.pauseBtnText]);
    this.pauseBtnContainer.setSize(btnSize, btnSize).setInteractive({ useHandCursor: true });
    this.pauseBtnContainer.on('pointerdown', () => {
      this.playSfx('sfx_click', 0.35);
      this.openPauseModal();
    });

    // 2. Audio Button (Top-Left 2 inside playfield column)
    const isAudioOn = !this.sound.mute && sdk.isAudioEnabled();
    this.audioBtnContainer = this.add.container(pf.left + 66, hudY).setDepth(z.hud);
    const audioBg = this.add.graphics();
    audioBg.fillStyle(0x0F172A, 0.45);
    audioBg.fillCircle(0, 0, btnSize / 2);
    audioBg.lineStyle(1.5, 0xFFFFFF, 0.7);
    audioBg.strokeCircle(0, 0, btnSize / 2);
    this.audioBtnText = this.add.text(0, 0, isAudioOn ? '🔊' : '🔇', { fontSize: '15px' }).setOrigin(0.5);
    this.audioBtnContainer.add([audioBg, this.audioBtnText]);
    this.audioBtnContainer.setSize(btnSize, btnSize).setInteractive({ useHandCursor: true });
    this.audioBtnContainer.on('pointerdown', () => {
      this.toggleAudio();
    });

    // 3. Score Label (Center Top - Arcade Casual Stroke)
    this.scoreLabel = this.add.text(pf.center, hudY - 4, String(ctx.engine.score), fontStyle(type.score, '#FFFFFF'))
      .setOrigin(0.5, 0.5).setDepth(z.hud)
      .setStroke('#1E0E02', 6)
      .setShadow(0, 3, 'rgba(0,0,0,0.45)', 4, false, true);
    this.scoreLabel.setData('testid', 'score-label');

    // 4. Level & Fish Labels (Top-Right inside playfield column - Single clear unit with tight spacing)
    this.levelLabel = this.add.text(pf.right - 44, hudY - 2, 'Level ' + ctx.engine.getLevel(), fontStyle(type.small, '#FFFFFF'))
      .setOrigin(0.5, 0.7).setDepth(z.hud)
      .setStroke('#1E0E02', 4);
    this.levelLabel.setData('testid', 'level-label');

    this.fishLabel = this.add.text(pf.right - 44, hudY + 20, `🐟 ×${ctx.engine.fish}`, fontStyle(type.small, '#FFD700'))
      .setOrigin(0.5, 0.7).setDepth(z.hud)
      .setStroke('#1E0E02', 4);

    // Fever Bar Graphics & Label (Pill 28px height, Graphics vector flame icon)
    this.feverBarG = this.add.graphics().setDepth(z.hud);
    this.feverFlameG = this.add.graphics().setDepth(z.hud + 1);
    this.feverStatusLabel = this.add.text(pf.center + 8, hudY + 38, 'FEVER 0%', fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);

    // Level Progress Pill (D-A2: cảm giác tiến bộ nhìn thấy được — testid level-progress)
    this.levelProgressG = this.add.graphics().setDepth(z.hud);
    this.levelProgressLabel = this.add.text(pf.center, hudY + 81, 'NEXT LEVEL: 0/10', fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);
    this.levelProgressLabel.setData('testid', 'level-progress');

    // Speed Lines, Nature Flow & Roadside Props Graphics
    this.speedLinesG = this.add.graphics().setDepth(z.bg + 1);
    this.natureParticlesG = this.add.graphics().setDepth(z.bg + 2);
    this.roadsidePropsG = this.add.graphics().setDepth(z.bg + 2);

    this.natureParticles = [];
    for (let i = 0; i < 16; i++) {
      this.natureParticles.push({
        xRatio: Math.random(),
        y: Phaser.Math.Between(0, height),
        speedMult: 0.65 + Math.random() * 0.70,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 1.8 + Math.random() * 2.2,
        size: Phaser.Math.Between(3, 6),
        color: Math.random() < 0.4 ? 0xFFFFFF : (Math.random() < 0.7 ? 0x88D49E : 0xFFD166),
        alpha: 0.25 + Math.random() * 0.35,
      });
    }

    this.roadsideProps = [];
    const propTypes: Array<'daisy' | 'grass' | 'flower_purple' | 'pebble'> = ['daisy', 'grass', 'flower_purple', 'pebble'];
    for (let i = 0; i < 14; i++) {
      this.roadsideProps.push({
        side: (i % 2 === 0 ? -1 : 1),
        t: (i / 14) + Math.random() * 0.05,
        speedMult: 0.85 + Math.random() * 0.30,
        lateralOffsetRatio: Math.random(),
        propType: propTypes[i % propTypes.length],
      });
    }

    // Popups
    this.levelPopup = this.add.text(width / 2, height * 0.36, '', fontStyle(type.h1, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.levelPopup.setData('testid', 'level-popup');

    // D-A2: phụ đề tên cảnh dưới level-popup + chapter card tại ranh giới palette (level 10/20)
    this.levelSubPopup = this.add.text(width / 2, height * 0.36 + 46, '', fontStyle({ size: '22px', weight: '800', lh: 1.2 }, '#FFF275'))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.levelSubPopup.setData('testid', 'level-popup-sub');

    this.comboPopup = this.add.text(width / 2, height * 0.48, '', fontStyle(type.display, color.success))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.comboPopup.setData('testid', 'combo-popup');

    this.nearMissPopup = this.add.text(width / 2, height * 0.55, '', fontStyle(type.h2, color.warning))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);

    this.powerupPopup = this.add.text(width / 2, height * 0.42, '', fontStyle(type.h2, color.primary))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);

    this.recordPopup = this.add.container(width / 2, height * 0.26).setDepth(z.tutorial).setAlpha(0);
    this.recordPopup.setData('testid', 'record-popup');

    // Swarm Warning Container (Băng cảnh báo bão ong)
    this.swarmWarningPopup = this.add.container(width / 2, height * 0.40).setDepth(z.tutorial).setAlpha(0);
    const swBg = this.add.graphics();
    swBg.fillStyle(0xFF3838, 0.92); swBg.fillRoundedRect(-160, -30, 320, 60, 16);
    swBg.lineStyle(3, 0xFFFFFF, 1); swBg.strokeRoundedRect(-160, -30, 320, 60, 16);
    const swTxt = this.add.text(0, 0, '⚠️ SWARM INCOMING! ⚠️', fontStyle(type.h2, '#FFFFFF')).setOrigin(0.5);
    this.swarmWarningPopup.add([swBg, swTxt]);

    this.swarmSurvivePopup = this.add.text(width / 2, height * 0.45, '🎉 SWARM SURVIVED! +10', fontStyle(type.h1, color.warning))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);

    // Mèo & Hiệu ứng quanh mèo
    const catY = this.getCatY(height);
    const catSize = this.getCatSize(width, height);

    this.feverAura = this.add.graphics().setDepth(z.actor - 1).setAlpha(0);

    // Cat Ground Contact Shadow (Bóng đổ đất ấm neo chân mèo xuống sàn)
    this.catShadow = this.add.graphics().setDepth(z.actor - 1);
    this.drawCatShadow(this.lanes[this.currentLane], catY, catSize.w, catSize.h);

    this.cat = this.add.image(this.lanes[this.currentLane], catY, ctx.engine.getSelectedSkinTexture())
      .setDisplaySize(catSize.w, catSize.h).setDepth(z.actor);
    this.cat.setData('testid', 'cat');

    this.shieldBubble = this.add.graphics().setDepth(z.actor + 1).setAlpha(0);

    this.magnetIndicator = this.add.text(this.cat.x, this.cat.y - catSize.h * 0.65, '🧲', { fontSize: '24px' })
      .setOrigin(0.5).setDepth(z.actor + 2).setAlpha(0);

    // Controls: Mỗi thao tác chỉ chuyển đúng 1 làn (-1 hoặc +1), phản hồi tức thì 0ms
    let pointerDownX = 0;
    let pointerDownY = 0;
    let swipedInGesture = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.running || this.isPaused) return;
      // Tránh chạm nút trên top HUD kích hoạt nhảy làn mèo
      if (p.y < hudY + 30 && (p.x < 110 || p.x > width - 90)) return;
      pointerDownX = p.x;
      pointerDownY = p.y;
      swipedInGesture = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.running || this.isPaused || !p.isDown || swipedInGesture) return;
      const dx = p.x - pointerDownX;
      const dy = p.y - pointerDownY;

      // Nhận diện vuốt ngang tức thì (Threshold 20px)
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
        swipedInGesture = true;
        if (dx < 0) {
          this.moveLane(-1); // Vuốt trái -> sang trái đúng 1 làn
        } else {
          this.moveLane(1);  // Vuốt phải -> sang phải đúng 1 làn
        }
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.running || this.isPaused) return;
      if (p.y < hudY + 30 && (p.x < 110 || p.x > width - 90)) return;

      // Nếu người chơi chỉ Tap/Click nhanh mà không vuốt
      if (!swipedInGesture) {
        const catCurrentX = this.cat ? this.cat.x : width / 2;
        if (p.x < catCurrentX - 15) {
          this.moveLane(-1); // Chạm bên trái con mèo -> sang trái 1 làn
        } else if (p.x > catCurrentX + 15) {
          this.moveLane(1);  // Chạm bên phải con mèo -> sang phải 1 làn
        } else {
          // Chạm ngay giữa con mèo: chuyển sang làn thoáng hơn
          if (this.currentLane === 0) this.moveLane(1);
          else if (this.currentLane === 2) this.moveLane(-1);
          else this.moveLane(p.x < width / 2 ? -1 : 1);
        }
      }
      swipedInGesture = false;
    });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (!this.running || this.isPaused) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.moveLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.moveLane(1);
      }
    });

    sdk.onAudioEnabledChange((enabled: boolean) => {
      this.muted = !enabled;
      if (this.audioBtnText && this.audioBtnText.active && this.audioBtnText.scene) {
        try {
          this.audioBtnText.setText(enabled ? '🔊' : '🔇');
        } catch { /* scene shutdown */ }
      }
    });

    this.cameras.main.fadeIn(dur.scene, 0, 0, 0);
    this.cameras.main.once('camerafadeincomplete', () => {
      this.running = true;
      if (isResume) {
        this.showPowerupPopup('REVIVED! 🛡️ READY!', color.primary);
        this.spawnShockwave(this.cat.x, this.cat.y, 0x00F0FF);
      }
    });

    this.startBgm();
    const resizeListener = (g: Phaser.Structs.Size) => this.onResize(g);
    this.scale.on('resize', resizeListener);
    this.events.once('shutdown', () => {
      this.scale.off('resize', resizeListener);
      if (this.bgImage && this.bgImage.active) this.bgImage.destroy();
      if (this.bgG && this.bgG.active) this.bgG.destroy();
      if (this.speedLinesG && this.speedLinesG.active) this.speedLinesG.destroy();
      if (this.natureParticlesG && this.natureParticlesG.active) this.natureParticlesG.destroy();
      if (this.roadsidePropsG && this.roadsidePropsG.active) this.roadsidePropsG.destroy();
      this.bgImage = undefined;
      this.bgG = undefined as any;
    });
  }

  private startBgm() {
    if (this.sound.mute || this.muted) return;
    const bgm = this.sound.get('bgm_main');
    if (!bgm || !bgm.isPlaying) {
      this.sound.play('bgm_main', { loop: true, volume: 0.3 });
    }
  }

  private togglePause() {
    if (this.isPaused) {
      this.pauseModal?.destroy();
      this.closePauseModal();
    } else {
      this.openPauseModal();
    }
  }

  private openPauseModal() {
    if (this.isPaused || !this.running) return;
    this.isPaused = true;
    this.running = false;

    // Tạm dừng BGM nếu đang phát
    const bgm = this.sound.get('bgm_main');
    if (bgm && bgm.isPlaying) {
      bgm.pause();
    }

    this.pauseModal = new PauseModal(this, {
      onResume: () => this.closePauseModal(),
      onRestart: () => {
        this.pauseModal = undefined;
        this.sound.stopByKey('bgm_main');
        this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
        this.time.delayedCall(dur.scene, () => {
          this.scene.restart({ resume: false });
        });
      },
      onHome: async () => {
        this.pauseModal = undefined;
        this.sound.stopByKey('bgm_main');
        const end = ctx.engine.endGame();
        sdk.sendScore(end.score);
        await ctx.saveBest();
        this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
        this.time.delayedCall(dur.scene, () => {
          this.scene.start('StartScene');
        });
      },
      onToggleAudio: (muted: boolean) => {
        this.muted = muted;
        if (this.audioBtnText) this.audioBtnText.setText(muted ? '🔇' : '🔊');
      },
    });
  }

  private closePauseModal() {
    this.pauseModal = undefined;
    this.isPaused = false;
    this.running = true;

    // Tiếp tục BGM nếu không bị tắt tiếng
    if (!this.sound.mute && !this.muted) {
      const bgm = this.sound.get('bgm_main');
      if (bgm && bgm.isPaused) {
        bgm.resume();
      } else {
        this.startBgm();
      }
    }
  }

  private toggleAudio() {
    const nowMuted = !this.sound.mute;
    this.sound.mute = nowMuted;
    this.muted = nowMuted;
    if (this.audioBtnText) this.audioBtnText.setText(nowMuted ? '🔇' : '🔊');
    this.playSfx('sfx_click', 0.35);
    if (nowMuted) {
      this.sound.stopByKey('bgm_main');
    } else {
      this.startBgm();
    }
  }

  private playSfx(key: string, volume = 0.35, rate = 1.0) {
    if (this.sound.mute || this.muted) return;
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume, rate });
  }

  private spawnDust(x: number, y: number) {
    for (let foot = -1; foot <= 1; foot += 2) {
      const fx = x + foot * 16;
      const fy = y + 16;
      for (let i = 0; i < 3; i++) {
        const d = this.add.circle(fx + Phaser.Math.Between(-5, 5), fy + Phaser.Math.Between(-4, 6), Phaser.Math.Between(4, 7), 0xFFFFFF, 0.55).setDepth(z.actor - 1);
        this.tweens.add({
          targets: d,
          x: fx + foot * Phaser.Math.Between(6, 18),
          y: fy + Phaser.Math.Between(4, 14),
          alpha: 0,
          scale: 0.2,
          duration: 320,
          ease: 'cubic.out',
          onComplete: () => d.destroy(),
        });
      }
    }
  }

  private spawnSparkles(x: number, y: number, starColor = 0xFFD700) {
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
      const dist = Phaser.Math.Between(22, 45);
      const s = this.add.circle(x, y, Phaser.Math.Between(3, 6), starColor, 0.95).setDepth(z.hud);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'quad.out',
        onComplete: () => s.destroy(),
      });
    }
  }

  private spawnShockwave(x: number, y: number, shockColor = 0x00F0FF) {
    const sw = this.add.graphics().setDepth(z.actor + 2);
    let r = 12;
    this.tweens.addCounter({
      from: 12,
      to: 75,
      duration: 320,
      ease: 'quad.out',
      onUpdate: (tw) => {
        r = tw.getValue() ?? 12;
        sw.clear();
        sw.lineStyle(3.5, shockColor, 1 - (r - 12) / 63);
        sw.strokeCircle(x, y, r);
      },
      onComplete: () => sw.destroy(),
    });
  }

  private spawnBeeExplosion(x: number, y: number) {
    // Honey-gold + white particles per ART-PASS §4.3
    const colors = [0xFFA502, 0xFFD700, 0xFFEAA7, 0xFFFFFF];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 70);
      const col = colors[i % colors.length];
      const p = this.add.circle(x, y, Phaser.Math.Between(4, 8), col, 0.95).setDepth(z.actor + 1);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 420,
        ease: 'cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private drawLevelBg(level: number) {
    const { width, height } = this.scale;
    const bgKeys = ['bg_day', 'bg_sunset', 'bg_night'];
    const bgIndex = Math.floor(Math.max(0, level - 1) / 10) % bgKeys.length;
    const bgKey = bgKeys[bgIndex];
    const pal = paletteForLevel(level);

    const { bgScale, leftEdge, laneWidth } = this.getStraightRoadMetrics(width, height, bgKey);

    if (!this.bgImage || !this.bgImage.active) {
      this.bgImage = this.add.image(width / 2, height / 2, bgKey).setDepth(z.bg);
    } else {
      if (this.bgImage.texture.key !== bgKey) {
        // Crossfade mềm mại khi chuyển giao giữa các buổi trong ngày (Day -> Sunset -> Night)
        this.tweens.add({
          targets: this.bgImage,
          alpha: 0.35,
          duration: 250,
          yoyo: true,
          onYoyo: () => {
            if (this.bgImage && this.bgImage.active) {
              this.bgImage.setTexture(bgKey);
              this.bgImage.setScale(bgScale);
            }
          },
        });
      } else {
        this.bgImage.setTexture(bgKey);
      }
    }
    this.bgImage.setPosition(width / 2, height / 2).setScale(bgScale);

    if (this.bgG && this.bgG.active) {
      this.bgG.destroy();
    }
    const g = this.add.graphics();
    this.bgG = g;

    // 1. Playfield 4 Straight Vertical Road Lines (Line 0 to Line 3)
    const pf = this.getPlayfieldBounds(width, height);

    for (let i = 0; i <= 3; i++) {
      const isDivider = (i === 1 || i === 2);
      const alpha = isDivider ? 0.08 : 0.14;
      const lineThickness = isDivider ? 1.8 : 2.4;
      const lineX = leftEdge + i * laneWidth;
      g.lineStyle(lineThickness, 0x0F172A, alpha);
      g.strokeLineShape(new Phaser.Geom.Line(lineX, 0, lineX, height));
    }

    // Outer playfield boundaries / vignettes
    if (width > pf.width + 10) {
      // Side vignettes on outer desktop margins
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.22, 0.0, 0.22, 0.0);
      g.fillRect(0, 0, pf.left, height);
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.22, 0.0, 0.22);
      g.fillRect(pf.right, 0, width - pf.right, height);
    } else {
      // Soft mobile side vignette
      const vigW = Math.min(36, width * 0.08);
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.12, 0.0, 0.12, 0.0);
      g.fillRect(0, 0, vigW, height);
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.12, 0.0, 0.12);
      g.fillRect(width - vigW, 0, vigW, height);
    }

    // 3. Smooth top-edge gradient fade from rgba(0,0,0,0.35) at y=0 to transparent at y=120px (No hard seam)
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0.0, 0.0);
    g.fillRect(0, 0, width, 120);

    g.setDepth(z.bg + 1);
  }

  private moveLane(dir: number) {
    const target = Phaser.Math.Clamp(this.currentLane + dir, 0, MECHANICS.laneCount - 1);
    if (target === this.currentLane) return;
    const prev = this.currentLane;
    this.currentLane = target;
    this.moveSeq++;
    this.tweens.killTweensOf(this.cat);

    const catSize = this.getCatSize(this.scale.width, this.scale.height);
    const baseScaleX = catSize.w / this.cat.width;
    const baseScaleY = catSize.h / this.cat.height;

    // Hiệu ứng 2 vệt bụi khói dưới chân khi nhảy chuyển làn (chống trượt băng)
    this.spawnDust(this.cat.x, this.cat.y);

    // Check Near-Miss (Né sát sạt): Có con ong nào ở làn cũ đang sát mèo không?
    const catY = this.cat.y;
    const nearMissBee = this.bees.find(b => (b.lane === prev || b.secondaryLane === prev) && !b.dodged && Math.abs(b.container.y - catY) < 70 && b.container.y < catY + 30);
    if (nearMissBee) {
      const nm = ctx.engine.registerNearMiss();
      this.playSfx('sfx_dodge', 0.55, 1.15);
      this.showNearMissPopup();
      this.spawnSparkles(this.cat.x, catY - 15, 0xFFEE55);
      this.cameras.main.flash(70, 255, 255, 200, true);
      this.updateHud();
      if (nm.feverTriggered) this.onFeverStart();
    }

    // Tween bóng đổ tiếp đất cùng nhịp nhảy (slightly delayed for depth feel)
    const prevX = this.lanes[prev];
    const targetX = this.lanes[target];
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: dur.tn,
      delay: 35,
      ease: 'cubic.out',
      onUpdate: (tw) => {
        const p = tw.getValue() ?? 0;
        const curX = prevX + (targetX - prevX) * p;
        const sq = 1 - Math.sin(p * Math.PI) * 0.22;
        this.drawCatShadow(curX, this.cat.y, catSize.w, catSize.h, sq, sq);
      },
      onComplete: () => {
        this.drawCatShadow(targetX, this.cat.y, catSize.w, catSize.h, 1, 1);
      },
    });

    this.isMovingLane = true;

    // Tween chuyển làn ngang + nghiêng người 8-10 độ + squash & stretch
    const targetAngle = (target - prev) * 10;
    this.tweens.add({
      targets: this.cat,
      x: this.lanes[target],
      scaleX: baseScaleX * 0.90,
      scaleY: baseScaleY * 1.10,
      angle: targetAngle,
      duration: dur.tn,
      ease: 'cubic.out',
      onComplete: () => {
        this.tweens.add({
          targets: this.cat,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          angle: 0,
          duration: 80,
          ease: 'quad.out',
          onComplete: () => {
            this.isMovingLane = false;
          },
        });
      },
    });
  }

  update(_time: number, deltaMs: number) {
    if (!this.running || this.isPaused) return;
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    // Cập nhật timers Power-ups & Fever
    const { feverEnded } = ctx.engine.updateTimers(dt);
    if (feverEnded) this.onFeverEnd();

    // score +1/s
    this.lastTick += dt;
    if (this.lastTick >= 1) {
      this.lastTick -= 1;
      const res = ctx.engine.tickSecond();
      if (res.levelUp && res.newLevel) {
        this.onLevelUp(res.newLevel);
      }
      this.updateHud();
    }

    const currentLevel = ctx.engine.getLevel();

    // Kiểm tra kích hoạt Sự kiện "Ong Béo Thư Giãn" theo mốc lũy tiến (Level 20 -> 45 -> 80...)
    if (!this.fatBeeActive && !this.swarmActive && ctx.engine.shouldTriggerFatBeeBreather(currentLevel)) {
      ctx.engine.consumeFatBeeBreather();
      this.triggerFatBeeBreather();
    }

    // Kiểm tra kích hoạt Sự kiện Bão Ong (Swarm Wave)
    if (!this.swarmActive && !this.fatBeeActive && this.elapsed - this.lastSwarmTime >= MECHANICS.swarmIntervalSec) {
      this.lastSwarmTime = this.elapsed;
      this.triggerSwarmWave();
    }

    // spawn ong theo độ khó tăng dần theo level & thời gian
    const diff = ctx.engine.difficulty(this.elapsed, currentLevel);
    const spawnInterval = Math.max(0.38, 1.35 - (diff.speed - MECHANICS.startSpeed) * 0.0035 - (currentLevel - 1) * 0.10);
    this.lastSpawn += dt;
    if (!this.swarmActive && !this.fatBeeActive && this.lastSpawn >= spawnInterval && this.bees.length < diff.spawnCount + 2) {
      const spawned = this.spawnBee(diff.speed);
      if (spawned) {
        this.lastSpawn = 0;
      }
    }

    // spawn vật phẩm (Cá vàng, Khiên, Nam châm)
    this.lastItemSpawn += dt;
    if (this.lastItemSpawn >= 3.0 && this.items.length < 3) {
      this.lastItemSpawn = 0;
      this.spawnItem(diff.speed);
    }

    const catY = this.cat.y;
    const catX = this.cat.x;
    const catSize = this.getCatSize(this.scale.width, this.scale.height);
    const laneSpan = this.scale.width / 3;
    const isFever = ctx.engine.isFeverActive();
    const isMagnet = ctx.engine.isMagnetActive() || isFever;

    // Cập nhật vị trí Mèo effects (Khiên, Nam châm, Fever aura)
    this.updateCatEffects(catX, catY, catSize);

    // Di chuyển vật phẩm & Hút nam châm
    const playfieldTop = this.getPlayfieldTop(this.scale.height);
    const groundH = this.scale.height - playfieldTop;

    for (const it of this.items) {
      if (it.collected) continue;

      if (isMagnet) {
        const dx = catX - it.container.x;
        const dy = catY - it.container.y;
        it.container.x += dx * 6.5 * dt;
        it.container.y += Math.max(diff.speed * 0.8, dy * 6.5) * dt;
      } else {
        it.container.y += diff.speed * 0.85 * dt;
        it.container.x = this.lanes[it.lane];
      }

      // Ăn vật phẩm (Collision)
      if (Math.abs(it.container.y - catY) < 52 && Math.abs(it.container.x - catX) < 52) {
        it.collected = true;
        this.collectItem(it);
        it.container.destroy();
      } else if (it.container.y > this.scale.height + 60) {
        it.container.destroy();
      }
    }
    this.items = this.items.filter(it => !it.collected && it.container.active);

    // Di chuyển và xử lý các loại ong
    for (const b of this.bees) {
      if (!b.container || !b.container.active) continue;
      b.container.y += diff.speed * b.speedMult * dt;
      const isFat = b.type === 'fat';

      if (!b.swerved) {
        if (isFat) {
          const l1X = this.lanes[b.lane];
          const l2X = this.lanes[b.secondaryLane ?? b.lane];
          b.container.x = (l1X + l2X) / 2;
        } else {
          b.container.x = this.lanes[b.lane];
        }
      }

      // Xử lý cơ chế rẽ làn của Ong Zigzag (chỉ rẽ vào làn an toàn, không kẹp dính)
      if (b.type === 'zigzag' && !b.swerved && b.container.y > this.scale.height * 0.38) {
        b.swerved = true;
        const candidates = b.lane === 0 ? [1] : (b.lane === 2 ? [1] : [0, 2]);
        const safeCandidates = candidates.filter(target => {
          const hasNearbyBee = this.bees.some(other =>
            other !== b &&
            other.container &&
            other.container.active &&
            (other.lane === target || other.secondaryLane === target) &&
            Math.abs(other.container.y - b.container.y) < 140
          );
          return !hasNearbyBee;
        });

        const targetLane = safeCandidates.length > 0
          ? safeCandidates[Math.floor(Math.random() * safeCandidates.length)]
          : b.lane;

        if (targetLane !== b.lane) {
          b.lane = targetLane;
          this.tweens.add({
            targets: b.container,
            x: this.lanes[targetLane],
            duration: 240,
            ease: 'sine.inout',
          });
        }
      }

      // Né thành công
      if (!b.dodged && b.container.y > catY + catSize.h * 0.4) {
        b.dodged = true;
        let isCatInBeeLane = false;
        if (isFat) {
          const safeLane = (b.lane === 0 && b.secondaryLane === 1) ? 2 : 0;
          isCatInBeeLane = (this.currentLane !== safeLane);
        } else {
          isCatInBeeLane = (b.lane === this.currentLane);
        }
        if (!isCatInBeeLane) {
          this.onDodge(b);
        }
        this.handleSwarmBeeDone(b);
      }

      // Va chạm ong — Chuẩn xác cho Ong Béo (chắn 2 làn) và Ong Thường
      const hitY = Math.abs(b.container.y - catY) < (catSize.h * 0.52);
      let hitX = false;
      if (isFat) {
        // Ong Béo chiếm 2 làn (lane1 và lane2). Làn còn lại là safeLane.
        const safeLane = (b.lane === 0 && b.secondaryLane === 1) ? 2 : 0;
        const { leftEdge, laneWidth } = this.getStraightRoadMetrics(this.scale.width, this.scale.height);
        if (safeLane === 2) {
          // Làn an toàn là làn Phải (2). Vùng nguy hiểm là làn Trái (0) và Giữa (1)
          const rightBoundary = leftEdge + 2 * laneWidth;
          hitX = catX < (rightBoundary - catSize.w * 0.18);
        } else {
          // Làn an toàn là làn Trái (0). Vùng nguy hiểm là làn Giữa (1) và Phải (2)
          const leftBoundary = leftEdge + laneWidth;
          hitX = catX > (leftBoundary + catSize.w * 0.18);
        }
      } else {
        hitX = (b.lane === this.currentLane || Math.abs(b.container.x - catX) < (catSize.w * 0.45)) && Math.abs(b.container.x - catX) < (catSize.w * 0.45);
      }

      if (hitY && hitX) {
        if (isFever) {
          ctx.engine.destroyBeeInFever();
          this.playSfx('sfx_hit', 0.35, 1.2);
          this.cameras.main.shake(90, 0.008);
          this.spawnBeeExplosion(b.container.x, b.container.y);
          this.showFloatingText(b.container.x, b.container.y, '+5 💥', color.warning);
          this.handleSwarmBeeDone(b);
          b.container.destroy();
          this.updateHud();
          continue;
        } else if (ctx.engine.tryUseShield()) {
          this.playSfx('sfx_dodge', 0.55);
          this.spawnShockwave(catX, catY, 0x00F0FF);
          this.showPowerupPopup('SHIELD SAVED! 🛡️', color.primary);
          this.cameras.main.shake(130, 0.012);
          this.handleSwarmBeeDone(b);
          b.container.destroy();
          this.updateHud();
          continue;
        } else {
          return this.onHit();
        }
      }

      if (b.container.y > this.scale.height + 80) {
        this.handleSwarmBeeDone(b);
        b.container.destroy();
      }
    }
    this.bees = this.bees.filter(b => b.container && b.container.active);
    if (this.fatBeeActive && !this.bees.some(b => b.type === 'fat')) {
      this.fatBeeActive = false;
    }

    // Faint motion trail for bees when speed level >= 2 (or diff.speed >= 140)
    if (currentLevel >= 2 || diff.speed >= 140) {
      this.beeTrailTimer += dt;
      if (this.beeTrailTimer >= 0.09) {
        this.beeTrailTimer = 0;
        for (const b of this.bees) {
          if (b.container && b.container.active && b.container.y > 0 && b.container.y < this.scale.height) {
            const trailG = this.add.circle(b.container.x, b.container.y - 10, 14, 0xFFA502, 0.22).setDepth(z.actor - 1);
            this.tweens.add({
              targets: trailG,
              alpha: 0,
              scale: 0.3,
              duration: 180,
              ease: 'quad.out',
              onComplete: () => trailG.destroy(),
            });
          }
        }
      }
    }

    // 1. Subtle Sky Drift
    if (this.bgImage && this.bgImage.active) {
      this.bgImage.x = (this.scale.width / 2) + Math.sin(this.elapsed * 0.12) * 6;
    }

    // 2. Draw ground flow, moving track dashes & nature particles
    this.drawGroundFlow(diff.speed, dt, isFever);
    this.drawRoadsideProps(diff.speed, dt);

    // 3. Cat running trot / bobbing & footstep puffs
    if (this.running && !this.isPaused && !this.isMovingLane && this.cat && this.cat.active) {
      const runFreq = Math.min(22, 14 + (diff.speed - 120) * 0.04);
      const runBob = Math.sin(this.elapsed * runFreq) * 2.8;
      const baseCatY = this.getCatY(this.scale.height);
      this.cat.y = baseCatY + runBob;

      const baseScaleX = catSize.w / this.cat.width;
      const baseScaleY = catSize.h / this.cat.height;
      const squash = Math.sin(this.elapsed * runFreq) * 0.035;
      this.cat.setScale(baseScaleX * (1 + squash), baseScaleY * (1 - squash));

      // Draw shadow synced with running bob
      const shadowSq = 1 - Math.abs(squash) * 0.8;
      this.drawCatShadow(this.cat.x, baseCatY, catSize.w, catSize.h, shadowSq, shadowSq);

      // Running footstep dust puff every ~0.26s
      this.runningPuffTimer += dt;
      if (this.runningPuffTimer >= 0.26) {
        this.runningPuffTimer = 0;
        this.spawnRunningPuff(this.cat.x, baseCatY + catSize.h * 0.38);
      }
    }

    this.drawFeverBar();
    this.drawLevelProgress();

    if (ctx.engine.checkRecord()) this.showRecordPopup();
  }

  private spawnRunningPuff(x: number, y: number) {
    const footX = x + (Math.random() < 0.5 ? -14 : 14);
    const puff = this.add.circle(footX + Phaser.Math.Between(-3, 3), y, Phaser.Math.Between(4, 7), 0xFFFFFF, 0.35).setDepth(z.actor - 1);
    this.tweens.add({
      targets: puff,
      y: y + Phaser.Math.Between(8, 16),
      alpha: 0,
      scale: 0.3,
      duration: 250,
      ease: 'quad.out',
      onComplete: () => puff.destroy(),
    });
  }

  private drawGroundFlow(speed: number, dt: number, isFever: boolean) {
    const g = this.speedLinesG;
    g.clear();

    const { width, height } = this.scale;
    const { leftEdge, laneWidth, roadW } = this.getStraightRoadMetrics(width, height);

    // 1. Moving dashed lane separators (downward straight vertical rolling motion)
    const dashLength = 36;
    const gapLength = 24;
    const totalCycle = dashLength + gapLength;
    const flowOffset = (this.elapsed * speed * 0.85) % totalCycle;

    g.lineStyle(2, 0x0F172A, 0.18);
    for (const divIdx of [1, 2]) {
      const lineX = leftEdge + divIdx * laneWidth;
      let curY = flowOffset - totalCycle;
      while (curY < height) {
        const segStartY = Math.max(0, curY);
        const segEndY = Math.min(height, curY + dashLength);
        if (segEndY > segStartY) {
          g.strokeLineShape(new Phaser.Geom.Line(lineX, segStartY, lineX, segEndY));
        }
        curY += totalCycle;
      }
    }

    // 2. Straight vertical ground breeze / grass streaks
    const streakCount = isFever ? 12 : 8;
    const streakCol = isFever ? 0xFFA502 : 0xFFFFFF;
    for (let i = 0; i < streakCount; i++) {
      const cycleT = ((this.elapsed * (speed * 0.0016) + (i / streakCount)) % 1);
      const sy = cycleT * height;
      const laneIndex = (i % 3);
      const laneCenterX = leftEdge + (laneIndex + 0.5) * laneWidth;
      const laneOffset = Math.sin(i * 3.7 + this.elapsed * 0.5) * (laneWidth * 0.3);
      const sx = laneCenterX + laneOffset;

      const len = 28;
      const endY = Math.min(height, sy + len);

      const alpha = Math.sin(cycleT * Math.PI) * (isFever ? 0.38 : 0.16);
      const thickness = 1.6;

      g.lineStyle(thickness, streakCol, alpha);
      g.strokeLineShape(new Phaser.Geom.Line(sx, sy, sx, endY));
    }

    // 3. Update & render floating dandelion / leaf nature particles
    const pG = this.natureParticlesG;
    if (pG && pG.active) {
      pG.clear();
      for (const p of this.natureParticles) {
        p.y += speed * 0.75 * p.speedMult * dt;
        if (p.y > height + 20) {
          p.y = Phaser.Math.Between(-20, 0);
          p.xRatio = Math.random();
        }

        const sway = Math.sin(this.elapsed * p.swaySpeed + p.swayOffset) * 12;
        const px = leftEdge + p.xRatio * roadW + sway;
        const pProgress = Math.max(0, Math.min(1, p.y / height));
        const pAlpha = Math.sin(pProgress * Math.PI) * p.alpha;

        pG.fillStyle(p.color, pAlpha);
        pG.fillCircle(px, p.y, p.size);
      }
    }
  }

  private drawRoadsideProps(speed: number, dt: number) {
    const g = this.roadsidePropsG;
    if (!g || !g.active) return;
    g.clear();

    const { width, height } = this.scale;
    const { leftEdge, roadW } = this.getStraightRoadMetrics(width, height);

    const propTypes: Array<'daisy' | 'grass' | 'flower_purple' | 'pebble'> = ['daisy', 'grass', 'flower_purple', 'pebble'];

    for (const p of this.roadsideProps) {
      // Advance progress t downwards
      p.t += (speed * 0.00085 * p.speedMult) * dt;
      if (p.t >= 1.0) {
        p.t = p.t % 1.0;
        p.side = Math.random() < 0.5 ? -1 : 1;
        p.speedMult = 0.85 + Math.random() * 0.30;
        p.lateralOffsetRatio = Math.random();
        p.propType = propTypes[Math.floor(Math.random() * propTypes.length)];
      }

      const py = p.t * height;
      const edgeX = p.side === -1 ? leftEdge : (leftEdge + roadW);
      // Lateral outward offset into roadside grass
      const px = edgeX + p.side * (12 + p.lateralOffsetRatio * 28);
      const scale = 0.85;
      const alpha = Math.min(1.0, Math.sin(p.t * Math.PI) * 1.5);

      if (alpha <= 0.01) continue;

      if (p.propType === 'daisy') {
        // Daisy: Green leaves + 5 white petals + gold center
        g.fillStyle(0x388E3C, alpha * 0.8);
        g.fillCircle(px - 3 * scale, py + 2 * scale, 2.5 * scale);
        g.fillCircle(px + 3 * scale, py + 2 * scale, 2.5 * scale);

        // White petals
        g.fillStyle(0xFFFFFF, alpha * 0.95);
        const petalDist = 3.5 * scale;
        const petalR = 3.2 * scale;
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2;
          g.fillCircle(px + Math.cos(ang) * petalDist, py + Math.sin(ang) * petalDist, petalR);
        }
        // Gold Center
        g.fillStyle(0xFFD700, alpha);
        g.fillCircle(px, py, 3.0 * scale);
      } else if (p.propType === 'flower_purple') {
        // Purple / Lavender blossom
        g.fillStyle(0x2E7D32, alpha * 0.8);
        g.fillCircle(px, py + 3 * scale, 2.8 * scale);

        g.fillStyle(0xBA68C8, alpha * 0.92);
        const petalDist = 3.2 * scale;
        const petalR = 3.0 * scale;
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2;
          g.fillCircle(px + Math.cos(ang) * petalDist, py + Math.sin(ang) * petalDist, petalR);
        }
        g.fillStyle(0xFFEB3B, alpha);
        g.fillCircle(px, py, 2.6 * scale);
      } else if (p.propType === 'grass') {
        // 3 Tuft blades of grass
        g.lineStyle(2.4 * scale, 0x4CAF50, alpha * 0.9);
        g.strokeLineShape(new Phaser.Geom.Line(px, py, px - 5 * scale, py - 9 * scale));
        g.strokeLineShape(new Phaser.Geom.Line(px, py, px, py - 11 * scale));
        g.strokeLineShape(new Phaser.Geom.Line(px, py, px + 5 * scale, py - 9 * scale));
      } else if (p.propType === 'pebble') {
        // Pebble with shadow & highlight
        g.fillStyle(0x1B1008, alpha * 0.25);
        g.fillEllipse(px, py + 2 * scale, 7 * scale, 3.5 * scale);

        g.fillStyle(0x94A3B8, alpha * 0.85);
        g.fillCircle(px, py, 4.5 * scale);

        g.fillStyle(0xE2E8F0, alpha * 0.7);
        g.fillCircle(px - 1.5 * scale, py - 1.5 * scale, 2.0 * scale);
      }
    }
  }

  private updateCatEffects(catX: number, catY: number, catSize: { w: number; h: number }) {
    if (ctx.engine.shieldActive) {
      this.shieldBubble.clear();
      this.shieldBubble.lineStyle(3, 0x00F0FF, 0.9);
      this.shieldBubble.fillStyle(0x00F0FF, 0.20);
      this.shieldBubble.strokeCircle(catX, catY, catSize.w * 0.65);
      this.shieldBubble.fillCircle(catX, catY, catSize.w * 0.65);
      this.shieldBubble.setAlpha(0.85);
    } else {
      this.shieldBubble.clear().setAlpha(0);
    }

    if (ctx.engine.isMagnetActive()) {
      this.magnetIndicator.setPosition(catX, catY - catSize.h * 0.65).setAlpha(1);
    } else {
      this.magnetIndicator.setAlpha(0);
    }

    if (ctx.engine.isFeverActive()) {
      this.feverAura.clear();
      this.feverAura.lineStyle(4, 0xFF9F1C, 0.8);
      this.feverAura.fillStyle(0xFF9F1C, 0.25);
      this.feverAura.strokeCircle(catX, catY, catSize.w * 0.75);
      this.feverAura.fillCircle(catX, catY, catSize.w * 0.75);
      this.feverAura.setAlpha(1);
    } else {
      this.feverAura.clear().setAlpha(0);
    }
  }

  private handleSwarmBeeDone(b: Bee) {
    if (b.isSwarm) {
      b.isSwarm = false;
      this.swarmBeesRemaining--;
      if (this.swarmBeesRemaining <= 0) {
        this.swarmActive = false;
        this.onSwarmSurvive();
      }
    }
  }

  private getOccupiedLanesAtTop(topYThreshold = 200): Set<number> {
    const occupied = new Set<number>();
    for (const b of this.bees) {
      if (b.container && b.container.active && b.container.y < topYThreshold) {
        occupied.add(b.lane);
        if (b.secondaryLane !== undefined) {
          occupied.add(b.secondaryLane);
        }
      }
    }
    return occupied;
  }

  // Thuật toán quét quỹ đạo thời gian tới (Trajectory Arrival Time Solver)
  private willBlockAllLanes(newLane: number, newSecondaryLane: number | undefined, newSpeedMult: number, spawnY: number, baseSpeed: number): boolean {
    const catY = this.cat ? this.cat.y : this.scale.height * 0.78;
    const tNew = (catY - spawnY) / (baseSpeed * newSpeedMult);
    const blockedLanes = new Set<number>();
    blockedLanes.add(newLane);
    if (newSecondaryLane !== undefined) blockedLanes.add(newSecondaryLane);

    // safeTimeDelta 0.38s: đảm bảo luôn có đủ thời gian phản xạ (khoảng cách an toàn)
    const safeTimeDelta = 0.38;

    for (const b of this.bees) {
      if (!b.container || !b.container.active) continue;
      const tB = (catY - b.container.y) / (baseSpeed * b.speedMult);
      if (tB > 0 && Math.abs(tNew - tB) < safeTimeDelta) {
        blockedLanes.add(b.lane);
        if (b.secondaryLane !== undefined) blockedLanes.add(b.secondaryLane);
      }
    }

    // Nếu chặn cả 3 làn (hoặc không còn làn nào an toàn) -> CHẶN
    return blockedLanes.size >= 3;
  }

  private spawnBee(speed: number): boolean {
    this.bees = this.bees.filter(b => b.container && b.container.active);

    // Không spawn bất kỳ con ong nào khác khi đang trong đợt Ong Béo Thư Giãn
    if (this.fatBeeActive || this.bees.some(b => b.type === 'fat')) {
      return false;
    }

    const occupied = this.getOccupiedLanesAtTop(200);
    if (occupied.size >= 2) {
      return false;
    }

    const type = ctx.engine.rollBeeType(this.elapsed, ctx.engine.getLevel());
    const beeSize = this.getBeeSize(this.scale.width, this.scale.height);

    const freeLanes = [0, 1, 2].filter(l => !occupied.has(l));
    if (freeLanes.length === 0) return false;

    const speedMult = type === 'speedy' ? 1.18 : 1.0;
    const validLanes = freeLanes.filter(l => !this.willBlockAllLanes(l, undefined, speedMult, -beeSize, speed));
    
    // NGUYÊN TẮC VÀNG: Nếu không còn làn nào an toàn, HỦY SPAWN để giữ đường sống cho người chơi!
    if (validLanes.length === 0) {
      return false;
    }

    const lane = validLanes[Math.floor(Math.random() * validLanes.length)];

    if (type === 'speedy') {
      this.createBeeEntity('speedy', lane, beeSize * 0.90, speedMult, 0xFF4757);
    } else if (type === 'zigzag') {
      this.createBeeEntity('zigzag', lane, beeSize, 1.0, 0xBA68C8, '🌀');
    } else {
      this.createBeeEntity('normal', lane, beeSize, 1.0);
    }

    const currentLevel = ctx.engine.getLevel();
    if (currentLevel >= 5 && occupied.size === 0 && Math.random() < 0.25) {
      const remainingLanes = validLanes.filter(l => l !== lane);
      if (remainingLanes.length >= 2) {
        const secondLane = remainingLanes[0];
        this.time.delayedCall(280, () => {
          if (this.running && !this.swarmActive && !this.bees.some(b => b.type === 'fat')) {
            // Kiểm tra an toàn trước khi spawn con thứ 2
            if (!this.willBlockAllLanes(secondLane, undefined, 1.0, -beeSize, speed)) {
              const secondType = ctx.engine.rollBeeType(this.elapsed, currentLevel);
              if (secondType !== 'fat') {
                this.createBeeEntity(secondType === 'speedy' ? 'speedy' : 'normal', secondLane, beeSize, 1.0);
              }
            }
          }
        });
      }
    }

    return true;
  }

  private createBeeEntity(type: BeeType, lane: number, size: number, speedMult: number, tintColor?: number, iconExtra?: string) {
    const container = this.add.container(this.lanes[lane], -size).setDepth(z.actor);
    const sprite = this.add.image(0, 0, 'bee_wasp').setDisplaySize(size, size);
    sprite.setFlipX(Math.random() < 0.5); // Random flipX on spawn so 3 on-screen bees never look identical
    if (tintColor) sprite.setTint(tintColor);
    container.add(sprite);

    if (iconExtra) {
      const tag = this.add.text(size * 0.3, -size * 0.3, iconExtra, { fontSize: '14px' }).setOrigin(0.5);
      container.add(tag);
    }

    // 2 wing flapping poses (varying wing angle oscillation, alpha 0.85)
    this.tweens.add({
      targets: sprite,
      angle: { from: -8, to: 8 },
      duration: 90,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // 1-beat anticipation scale (0.88 -> 1.08 -> 1.0) before swooping down
    container.setScale(0.88);
    this.tweens.add({
      targets: container,
      scale: 1.08,
      duration: 120,
      ease: 'back.out',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          scale: 1.0,
          duration: 80,
          ease: 'quad.out',
        });
      },
    });

    const bee: Bee = { container, sprite, type, lane, speedMult, dodged: false };
    this.bees.push(bee);

    this.tweens.add({
      targets: sprite,
      x: 7,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
  }

  private createFatBeeEntity(midX: number, lane1: number, lane2: number, size: number) {
    const container = this.add.container(midX, -size).setDepth(z.actor);
    const sprite = this.add.image(0, 0, 'bee_wasp').setDisplaySize(size, size);
    sprite.setFlipX(Math.random() < 0.5);
    sprite.setTint(0xF1C40F);
    const crown = this.add.text(0, -size * 0.38, '👑', { fontSize: '18px' }).setOrigin(0.5);
    container.add([sprite, crown]);

    const bee: Bee = {
      container,
      sprite,
      type: 'fat',
      lane: lane1,
      secondaryLane: lane2,
      speedMult: 0.72,
      dodged: false,
    };
    this.bees.push(bee);

    this.tweens.add({
      targets: container,
      scale: 1.06,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
  }

  private triggerSwarmWave() {
    this.swarmActive = true;
    this.playSfx('sfx_combo', 0.5, 1.4);
    this.cameras.main.shake(300, 0.008);

    // Timeout phòng hộ: sau tối đa 4.5s luôn tự tắt swarmActive
    this.time.delayedCall(4500, () => {
      this.swarmActive = false;
    });

    // Hiển thị cảnh báo Bão Ong
    this.swarmWarningPopup.setAlpha(0).setScale(0.7);
    this.tweens.add({
      targets: this.swarmWarningPopup,
      alpha: 1,
      scale: 1.1,
      duration: 250,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.swarmWarningPopup.setAlpha(0);
        if (!this.running) {
          this.swarmActive = false;
          return;
        }
        this.spawnSwarmFormation();
      },
    });
  }

  private spawnSwarmFormation() {
    const beeSize = this.getBeeSize(this.scale.width, this.scale.height);
    const safeLane = Phaser.Math.Between(0, MECHANICS.laneCount - 1);
    this.swarmBeesRemaining = 2;

    // 2 Làn nguy hiểm có 2 con ong rơi song song
    for (let l = 0; l < 3; l++) {
      if (l === safeLane) {
        // Làn an toàn có Cá Vàng dẫn lối
        this.spawnSpecificItem('fish', l, -30);
      } else {
        const container = this.add.container(this.lanes[l], -beeSize).setDepth(z.actor);
        const sprite = this.add.image(0, 0, 'bee_wasp').setDisplaySize(beeSize, beeSize);
        sprite.setFlipX(Math.random() < 0.5);
        sprite.setTint(0xFF4757);
        container.add(sprite);
        const bee: Bee = { container, sprite, type: 'speedy', lane: l, speedMult: 1.15, dodged: false, isSwarm: true };
        this.bees.push(bee);
      }
    }
  }

  private onSwarmSurvive() {
    this.swarmActive = false;
    const res = ctx.engine.registerSwarmSurvive();
    this.playSfx('sfx_levelup', 0.5, 1.2);
    this.spawnSparkles(this.scale.width / 2, this.scale.height * 0.45, 0xFFA502);

    this.swarmSurvivePopup.setAlpha(0).setScale(0.7);
    this.tweens.add({
      targets: this.swarmSurvivePopup,
      alpha: 1,
      scale: 1.15,
      duration: 300,
      ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.swarmSurvivePopup, alpha: 0, duration: 400, delay: 900, ease: 'quad.in' }),
    });

    this.updateHud();
    if (res.feverTriggered) this.onFeverStart();
    if (res.levelUp) this.onLevelUp(res.newLevel);
  }

  private spawnItem(_speed: number) {
    const lane = Phaser.Math.Between(0, MECHANICS.laneCount - 1);
    const roll = Math.random();
    let type: ItemType = 'fish';

    if (roll > 0.88 && !ctx.engine.shieldActive) {
      type = 'shield';
    } else if (roll > 0.76 && !ctx.engine.isMagnetActive()) {
      type = 'magnet';
    }

    this.spawnSpecificItem(type, lane, -40);
  }

  private spawnSpecificItem(type: ItemType, lane: number, yPos: number) {
    const container = this.add.container(this.lanes[lane], yPos).setDepth(z.actor - 1);
    const bg = this.add.graphics();

    if (type === 'fish') {
      // 1. Soft radial gold glow (alpha ~0.35, feathered multi-layer)
      const glowSteps = 4;
      const maxGlowR = 36;
      for (let gStep = 0; gStep < glowSteps; gStep++) {
        const rG = maxGlowR * (1 - gStep / glowSteps * 0.55);
        bg.fillStyle(0xFFB300, 0.35 / glowSteps);
        bg.fillCircle(0, 0, rG);
      }

      // 2. Two small rotating sparkles around fish
      const sparkleCont = this.add.container(0, 0);
      const s1 = this.add.text(26, -10, '✦', { fontSize: '13px', color: '#FFF3A8' }).setOrigin(0.5);
      const s2 = this.add.text(-26, 10, '✦', { fontSize: '13px', color: '#FFF3A8' }).setOrigin(0.5);
      sparkleCont.add([s1, s2]);
      this.tweens.add({
        targets: sparkleCont,
        angle: 360,
        duration: 2400,
        repeat: -1,
        ease: 'linear',
      });

      // 3. Fish sprite with warm cartoon gold tint & gentle vertical bob
      const sprite = this.add.image(0, 0, 'fish_item').setDisplaySize(66, 66);
      sprite.setTint(0xFFF3C4);

      this.tweens.add({
        targets: sprite,
        y: -5,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout',
      });

      container.add([bg, sparkleCont, sprite]);

      // 4. Slow pulse scale 1.0 -> 1.06
      this.tweens.add({
        targets: container,
        scale: 1.06,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout',
      });
    } else {
      let iconStr = '🛡️';
      let haloColor = 0x00E5FF;
      if (type === 'magnet') {
        iconStr = '🧲';
        haloColor = 0xFF4757;
      }
      bg.fillStyle(haloColor, 0.22);
      bg.fillCircle(0, 0, 30);
      bg.lineStyle(3, haloColor, 0.95);
      bg.strokeCircle(0, 0, 30);

      const txt = this.add.text(0, 0, iconStr, { fontSize: '28px' }).setOrigin(0.5);
      container.add([bg, txt]);

      this.tweens.add({
        targets: container,
        scale: 1.12,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout',
      });
    }

    this.items.push({ container, type, lane, collected: false });
  }

  private collectItem(it: Item) {
    if (it.type === 'fish') {
      const res = ctx.engine.collectFish();
      this.playSfx('sfx_score', 0.45, 1.1);
      this.spawnSparkles(it.container.x, it.container.y, 0xFFD700);
      this.showFloatingText(it.container.x, it.container.y, '+2 🐟', color.warning);
      this.updateHud();
      if (res.feverTriggered) this.onFeverStart();
      if (res.levelUp) this.onLevelUp(res.newLevel);
    } else if (it.type === 'shield') {
      ctx.engine.activateShield();
      this.playSfx('sfx_levelup', 0.4);
      this.spawnShockwave(it.container.x, it.container.y, 0x00E5FF);
      this.showPowerupPopup('SHIELD READY! 🛡️', '#00E5FF');
      this.updateHud();
    } else if (it.type === 'magnet') {
      ctx.engine.activateMagnet();
      this.playSfx('sfx_combo', 0.4);
      this.spawnSparkles(it.container.x, it.container.y, 0xFF4757);
      this.showPowerupPopup('MAGNET ON! 🧲', '#FF4757');
      this.updateHud();
    }
  }

  private onFeverStart() {
    this.playSfx('sfx_levelup', 0.5, 1.1);
    this.cameras.main.flash(200, 255, 180, 50, true);
    this.cameras.main.shake(150, 0.01);
    this.showPowerupPopup('🔥 FEVER MODE! x2 SCORE 🔥', color.warning);
  }

  private onFeverEnd() {
    this.feverAura.clear().setAlpha(0);
    this.drawFeverBar();
  }

  private onDodge(bee: Bee) {
    const r = ctx.engine.registerDodge();
    this.updateHud();
    this.playSfx('sfx_dodge', 0.4);
    this.playSfx('sfx_score', 0.3);

    // Floating "+1" score text with dark stroke (ART-PASS §4.3)
    const floatX = this.lanes[bee.lane];
    const floatY = this.scale.height * 0.70;
    this.showFloatingText(floatX, floatY, '+1', '#FFD700');

    if (r.comboTriggered) this.showComboPopup();
    if (r.feverTriggered) this.onFeverStart();
    if (r.levelUp) this.onLevelUp(r.newLevel);
  }

  private spawnLevelConfetti(level: number) {
    const { width, height } = this.scale;
    const pal = paletteForLevel(level);
    const colors = pal.confetti;
    for (let i = 0; i < 28; i++) {
      const x = Phaser.Math.Between(width * 0.15, width * 0.85);
      const y = Phaser.Math.Between(height * 0.25, height * 0.50);
      const col = colors[i % colors.length];
      const p = (i % 2 === 0)
        ? this.add.circle(x, y, Phaser.Math.Between(3, 7), col, 0.95)
        : this.add.rectangle(x, y, Phaser.Math.Between(6, 12), Phaser.Math.Between(4, 8), col, 0.95);
      p.setDepth(z.tutorial + 2);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 110);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 35,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: 0.3,
        duration: 650,
        ease: 'quad.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  // D-A2: popup 2s (thay 1.2s) + phụ đề tên cảnh theo palette; tại lv 10/20 đổi thành
  // chapter card reuse chính popup này (0 asset mới — không làm chapter system riêng). Text EN (PB-5).
  private onLevelUp(level: number) {
    this.drawLevelBg(level);
    this.levelLabel.setText('Level ' + level);
    this.tweens.add({ targets: this.levelLabel, scale: 1.3, duration: dur.tn, yoyo: true, ease: 'back.out' });

    const sceneName = level < 10 ? 'MORNING GARDEN' : level < 20 ? 'SUNSET SPRINT' : 'NIGHT GARDEN';
    const chapterNo = level === 10 ? 2 : level === 20 ? 3 : 0;
    if (chapterNo > 0) {
      this.levelPopup.setText(`CHAPTER ${chapterNo} \u00b7 ${sceneName}`);
      this.levelSubPopup.setText('LEVEL ' + level);
    } else {
      this.levelPopup.setText('LEVEL ' + level + '!');
      this.levelSubPopup.setText(sceneName);
    }
    // Tổng hiển thị ~2s: 220ms in + 1500ms hold + 300ms out
    this.tweens.add({
      targets: this.levelPopup, alpha: 1, scale: { from: 0.6, to: 1.15 }, duration: 220, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: [this.levelPopup, this.levelSubPopup], alpha: 0, scale: 1.0, duration: 300, delay: 1500, ease: 'cubic.in' }),
    });
    this.tweens.add({ targets: this.levelSubPopup, alpha: 1, duration: 260, delay: 120, ease: 'quad.out' });
    this.spawnLevelConfetti(level);
    this.playSfx('sfx_levelup', 0.45);
  }

  private triggerFatBeeBreather() {
    this.fatBeeActive = true;
    this.lastSpawn = 0;

    // Dọn dẹp sạch toàn bộ ong thường đang có trên màn hình để làn an toàn đảm bảo 100% không có ong
    for (const b of this.bees) {
      if (b.container && b.container.active && b.type !== 'fat') {
        this.spawnBeeExplosion(b.container.x, b.container.y);
        b.container.destroy();
      }
    }
    this.bees = this.bees.filter(b => b.container && b.container.active);

    this.playSfx('sfx_combo', 0.6, 1.2);
    this.showPowerupPopup('👑 FAT BEE BREAK! 🐟', '#FFD700');

    const side = Math.random() < 0.5 ? 0 : 1;
    const lane1 = side;
    const lane2 = side + 1;
    const safeLane = side === 0 ? 2 : 0;
    const midX = (this.lanes[lane1] + this.lanes[lane2]) / 2;
    const beeSize = this.getBeeSize(this.scale.width, this.scale.height);

    // Thả chú Ong Béo bay chậm rãi ở 2 làn
    this.time.delayedCall(300, () => {
      if (!this.running) return;
      this.createFatBeeEntity(midX, lane1, lane2, beeSize * 1.6);
    });

    // Thả chuỗi 3 con cá vàng ở làn an toàn còn lại
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(350 + i * 260, () => {
        if (!this.running) return;
        this.spawnSpecificItem('fish', safeLane, -40);
      });
    }
  }

  private showComboPopup() {
    this.comboPopup.setText('+5 COMBO!');
    this.comboPopup.setPosition(this.cat.x, this.cat.y - 60).setAlpha(1).setScale(0.7);
    this.tweens.add({
      targets: this.comboPopup, y: this.cat.y - 130, alpha: 0, scale: 1.25, duration: 700, ease: 'quad.out',
    });
    const pitch = Math.min(1.5, 1.0 + Math.floor((ctx.engine.streak - 1) / 5) * 0.12);
    this.playSfx('sfx_combo', 0.45, pitch);
    this.spawnSparkles(this.cat.x, this.cat.y - 40, 0x2ECC71);
  }

  private showNearMissPopup() {
    this.nearMissPopup.setText('⚡ CLOSE CALL! +2');
    this.nearMissPopup.setPosition(this.cat.x, this.cat.y - 50).setAlpha(1).setScale(0.8);
    this.tweens.add({
      targets: this.nearMissPopup, y: this.cat.y - 110, alpha: 0, scale: 1.2, duration: 600, ease: 'back.out',
    });
  }

  private showPowerupPopup(text: string, txtColor: string) {
    this.powerupPopup.setText(text).setColor(txtColor);
    this.powerupPopup.setPosition(this.scale.width / 2, this.scale.height * 0.42).setAlpha(1).setScale(0.8);
    this.tweens.add({
      targets: this.powerupPopup, scale: 1.15, alpha: 1, duration: 250, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.powerupPopup, alpha: 0, duration: 300, delay: 700, ease: 'quad.in' }),
    });
  }

  private showFloatingText(x: number, y: number, text: string, txtColor: string) {
    const t = this.add.text(x, y, text, fontStyle(type.h2, txtColor))
      .setOrigin(0.5)
      .setDepth(z.hud)
      .setStroke('#3A2E39', 3.5);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, scale: 1.1, duration: 550, ease: 'quad.out',
      onComplete: () => t.destroy(),
    });
  }
  private showRecordPopup() {
    const { width } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(toColor(color.surface), 0.95); bg.fillRoundedRect(-140, -26, 280, 52, radius.lg);
    bg.lineStyle(3, toColor(color.warning), 1); bg.strokeRoundedRect(-140, -26, 280, 52, radius.lg);
    const t = this.add.text(0, 0, 'NEW RECORD!', fontStyle(type.h2, color.warning)).setOrigin(0.5);
    this.recordPopup.removeAll(true);
    this.recordPopup.add([bg, t]);
    this.recordPopup.setPosition(width / 2, this.scale.height * 0.25).setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: this.recordPopup, alpha: 1, scale: 1, duration: 250, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.recordPopup, alpha: 0, duration: 350, delay: 1000, ease: 'linear' }),
    });
    this.spawnSparkles(width / 2, this.scale.height * 0.25, 0xFFA502);
  }

  private drawFlameIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, isFever: boolean) {
    g.clear();
    // Outer flame petal (smooth polygon)
    const outerColor = isFever ? 0xFF3838 : 0xFF6B35;
    g.fillStyle(outerColor, 1.0);
    const outerPoints = [
      new Phaser.Math.Vector2(cx, cy - 9),
      new Phaser.Math.Vector2(cx + 3.5, cy - 5.5),
      new Phaser.Math.Vector2(cx + 6.5, cy - 1),
      new Phaser.Math.Vector2(cx + 6, cy + 4),
      new Phaser.Math.Vector2(cx + 3.5, cy + 8),
      new Phaser.Math.Vector2(cx, cy + 9.5),
      new Phaser.Math.Vector2(cx - 3.5, cy + 8),
      new Phaser.Math.Vector2(cx - 6, cy + 4),
      new Phaser.Math.Vector2(cx - 6.5, cy - 1),
      new Phaser.Math.Vector2(cx - 3.5, cy - 5.5),
    ];
    g.fillPoints(outerPoints, true);

    // Inner flame core (bright gold)
    const innerColor = 0xFFD700;
    g.fillStyle(innerColor, 1.0);
    const innerPoints = [
      new Phaser.Math.Vector2(cx, cy - 3.5),
      new Phaser.Math.Vector2(cx + 2.5, cy - 0.5),
      new Phaser.Math.Vector2(cx + 2.5, cy + 3.5),
      new Phaser.Math.Vector2(cx, cy + 6),
      new Phaser.Math.Vector2(cx - 2.5, cy + 3.5),
      new Phaser.Math.Vector2(cx - 2.5, cy - 0.5),
    ];
    g.fillPoints(innerPoints, true);
  }

  // D-A2: pill tiến độ lên level tiếp theo — cùng pattern fever bar (track + gradient fill + label).
  private drawLevelProgress() {
    const { width, height } = this.scale;
    const pf = this.getPlayfieldBounds(width, height);
    const hudY = Math.max(38, height * 0.05);
    const barW = Math.min(180, Math.max(140, pf.width * 0.38));
    const barH = 12;
    const barX = pf.center - barW / 2;
    const barY = hudY + 62; // ngay dưới fever pill (fever bottom = hudY+52)

    const interval = MECHANICS.milestoneInterval;
    const score = ctx.engine.score;
    const into = score % interval;
    const ratio = Phaser.Math.Clamp(into / interval, 0, 1);

    const g = this.levelProgressG;
    g.clear();

    // Track
    g.fillStyle(0xFFFFFF, 0.12);
    g.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    g.lineStyle(1.5, 0xFFFFFF, 0.22);
    g.strokeRoundedRect(barX, barY, barW, barH, barH / 2);

    // Fill — xanh success (khác nhiệt gradient cam đỏ của Fever để đọc nhanh)
    if (ratio > 0) {
      g.fillGradientStyle(0x5ED07A, 0x2ECC71, 0x5ED07A, 0x2ECC71, 1, 1, 1, 1);
      g.fillRoundedRect(barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
    }

    // Pulsing glow khi sắp lên level (>=80%)
    if (ratio >= 0.8) {
      const glowAlpha = 0.35 + 0.3 * Math.sin(this.elapsed * 8);
      g.lineStyle(2.5, 0x2ECC71, glowAlpha);
      g.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, (barH + 4) / 2);
    }

    this.levelProgressLabel.setPosition(pf.center, barY + barH / 2 + 14);
    this.levelProgressLabel.setText(`NEXT LEVEL: ${into}/${interval}`);
  }

  private drawFeverBar() {
    const { width, height } = this.scale;
    const pf = this.getPlayfieldBounds(width, height);
    const hudY = Math.max(38, height * 0.05);
    const barW = Math.min(180, Math.max(140, pf.width * 0.38));
    const barH = 28;
    const barX = pf.center - barW / 2;
    const barY = hudY + 24; // >= 10px gap from score text (score at hudY - 4, bottom at hudY + 11)

    const g = this.feverBarG;
    g.clear();

    const isFever = ctx.engine.isFeverActive();
    let ratio = ctx.engine.fever / 100;
    if (isFever) {
      ratio = ctx.engine.feverTimeRemaining / MECHANICS.feverDurationSec;
    }
    ratio = Phaser.Math.Clamp(ratio, 0, 1);

    // 1. Pill Track: rgba(255,255,255,0.12), fully rounded (14px)
    g.fillStyle(0xFFFFFF, 0.12);
    g.fillRoundedRect(barX, barY, barW, barH, 14);
    g.lineStyle(1.5, 0xFFFFFF, 0.22);
    g.strokeRoundedRect(barX, barY, barW, barH, 14);

    // 2. Horizontal gradient fill (#FF9F1C -> #E71D36) when > 0
    const fillW = Math.max(0, barW * ratio);
    if (fillW > 0) {
      g.fillGradientStyle(0xFF9F1C, 0xE71D36, 0xFF9F1C, 0xE71D36, 1, 1, 1, 1);
      g.fillRoundedRect(barX, barY, Math.max(28, fillW), barH, 14);
    }

    // 3. Pulsing outer glow when full or fever mode
    if (isFever || ratio >= 1.0) {
      const glowAlpha = 0.45 + 0.35 * Math.sin(this.elapsed * 10);
      g.lineStyle(3.5, 0xFF9F1C, glowAlpha);
      g.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 16);
    }

    // 4. Vector Flame Icon drawn with Graphics (NO font glyphs)
    const flameCX = barX + 16;
    const flameCY = barY + barH / 2;
    this.drawFlameIcon(this.feverFlameG, flameCX, flameCY, isFever);

    // 5. Bold >= 12px readable label at small scale
    const labelX = barX + barW / 2 + 8;
    const labelY = barY + barH / 2;
    this.feverStatusLabel.setPosition(labelX, labelY);
    if (isFever) {
      this.feverStatusLabel.setText('FEVER 2X!').setColor('#FFF275');
    } else {
      this.feverStatusLabel.setText(`FEVER ${Math.round(ctx.engine.fever)}%`).setColor('#FFFFFF');
    }
  }

  private updateHud() {
    this.scoreLabel.setText(String(ctx.engine.score));
    this.fishLabel.setText(`🐟 ×${ctx.engine.fish}`);
    this.tweens.add({ targets: this.scoreLabel, scale: 1.35, duration: 150, yoyo: true, ease: 'back.out' });
  }

  private async onHit() {
    this.running = false;
    this.moveSeq++;
    ctx.engine.registerHit();
    this.playSfx('sfx_hit', 0.45);
    this.sound.stopByKey('bgm_main');

    // Camera micro-shake <= 4px (ART-PASS §4.3)
    this.cameras.main.shake(180, 0.005);

    // Honey-gold & white particle explosion
    this.spawnBeeExplosion(this.cat.x, this.cat.y);

    // Squash & stretch cat (scaleY 0.85 -> 1.15 -> 1.0, dur.pop)
    const catSize = this.getCatSize(this.scale.width, this.scale.height);
    const baseScaleX = catSize.w / this.cat.width;
    const baseScaleY = catSize.h / this.cat.height;

    this.tweens.add({
      targets: this.cat,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 0.85,
      angle: 12,
      duration: 100,
      ease: 'quad.out',
      onComplete: () => {
        this.tweens.add({
          targets: this.cat,
          scaleX: baseScaleX * 0.92,
          scaleY: baseScaleY * 1.12,
          angle: 25,
          y: this.cat.y + 20,
          alpha: 0.8,
          duration: 150,
          ease: 'quad.in',
        });
      },
    });

    const end = ctx.engine.endGame();
    sdk.sendScore(end.score);
    await ctx.saveBest();
    this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    this.time.delayedCall(dur.scene + 100, () => {
      this.scene.start('GameOverScene', {
        score: end.score,
        bestScore: end.bestScore,
        fish: end.fish,
        totalFish: end.totalFish,
        isNewRecord: end.isNewRecord,
      });
    });
  }

  private onResize(g: Phaser.Structs.Size) {
    this.lanes = this.computeLanes(g.width, g.height);
    this.moveSeq++;
    this.tweens.killTweensOf(this.cat);
    const catY = this.getCatY(g.height);
    const catSize = this.getCatSize(g.width, g.height);
    if (this.cat) {
      this.cat.setDisplaySize(catSize.w, catSize.h);
      this.cat.x = this.lanes[this.currentLane];
      this.cat.y = catY;
      this.drawCatShadow(this.lanes[this.currentLane], catY, catSize.w, catSize.h);
    }
    const pf = this.getPlayfieldBounds(g.width, g.height);
    const hudY = Math.max(38, g.height * 0.05);
    if (this.pauseBtnContainer) this.pauseBtnContainer.setPosition(pf.left + 26, hudY);
    if (this.audioBtnContainer) this.audioBtnContainer.setPosition(pf.left + 66, hudY);
    if (this.scoreLabel) this.scoreLabel.setPosition(pf.center, hudY - 4);
    if (this.levelLabel) this.levelLabel.setPosition(pf.right - 44, hudY - 2);
    if (this.fishLabel) this.fishLabel.setPosition(pf.right - 44, hudY + 20);
    this.drawFeverBar();
    if (this.levelPopup) this.levelPopup.setPosition(pf.center, g.height * 0.36);
    this.drawLevelBg(ctx.engine.getLevel());
  }
}




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
  private feverStatusLabel!: Phaser.GameObjects.Text;

  private levelPopup!: Phaser.GameObjects.Text;
  private comboPopup!: Phaser.GameObjects.Text;
  private recordPopup!: Phaser.GameObjects.Container;
  private nearMissPopup!: Phaser.GameObjects.Text;
  private powerupPopup!: Phaser.GameObjects.Text;
  private swarmWarningPopup!: Phaser.GameObjects.Container;
  private swarmSurvivePopup!: Phaser.GameObjects.Text;

  private cat!: Phaser.GameObjects.Image;
  private shieldBubble!: Phaser.GameObjects.Graphics;
  private magnetIndicator!: Phaser.GameObjects.Text;
  private feverAura!: Phaser.GameObjects.Graphics;
  private bgG!: Phaser.GameObjects.Graphics;
  private speedLinesG!: Phaser.GameObjects.Graphics;

  private bgImage?: Phaser.GameObjects.Image;
  private lanes: number[] = [];
  private currentLane = 1;
  private moveSeq = 0;

  private bees: Bee[] = [];
  private items: Item[] = [];
  private pendingSpeedyLanes: Set<number> = new Set();
  private fatBeeActive = false;

  private elapsed = 0;
  private lastTick = 0;
  private lastSpawn = 0;
  private lastItemSpawn = 0;
  private lastSwarmTime = 0;
  private swarmActive = false;
  private swarmBeesRemaining = 0;

  private running = false;
  private muted = false;

  constructor() { super({ key: 'GameplayScene' }); }

  private getCatY(height: number): number {
    return height * 0.78;
  }

  private getLaneSpan(width: number, height: number): number {
    const isPortrait = height >= width;
    return isPortrait
      ? Math.min(145, Math.max(90, width * 0.30))
      : Math.min(160, Math.max(100, height * 0.28));
  }

  private computeLanes(width: number, height: number): number[] {
    const laneSpan = this.getLaneSpan(width, height);
    const centerX = width / 2;
    return [centerX - laneSpan, centerX, centerX + laneSpan];
  }

  private getCatSize(width: number, height: number): { w: number; h: number } {
    const laneSpan = this.getLaneSpan(width, height);
    const h = Math.round(laneSpan * 0.56);
    const w = h;
    return { w, h };
  }

  private getBeeSize(width: number, height: number): number {
    const laneSpan = this.getLaneSpan(width, height);
    return Math.round(laneSpan * 0.46);
  }

  private isResumeMode = false;

  init(data?: { resume?: boolean }) {
    this.isResumeMode = data?.resume === true;
    this.bgImage = undefined;
    this.bgG = undefined as any;
    this.bees = [];
    this.items = [];
    this.pendingSpeedyLanes.clear();
    this.fatBeeActive = false;
  }

  async create(data?: { resume?: boolean }) {
    const { width, height } = this.scale;
    this.pendingSpeedyLanes.clear();
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

    this.lanes = this.computeLanes(width, height);
    this.drawLevelBg(ctx.engine.getLevel());

    // HUD Safe-Zone
    const hudY = Math.max(38, height * 0.05);
    const btnSize = 34;

    // 1. Pause Button (Top-Left 1)
    this.pauseBtnContainer = this.add.container(28, hudY).setDepth(z.hud);
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

    // 2. Audio Button (Top-Left 2)
    const isAudioOn = !this.sound.mute && sdk.isAudioEnabled();
    this.audioBtnContainer = this.add.container(68, hudY).setDepth(z.hud);
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

    // 3. Score Label (Center Top)
    this.scoreLabel = this.add.text(width / 2, hudY - 4, String(ctx.engine.score), fontStyle(type.score, color.textOnAccent))
      .setOrigin(0.5, 0.5).setDepth(z.hud);
    this.scoreLabel.setData('testid', 'score-label');

    // 4. Level & Fish Labels (Top-Right)
    this.levelLabel = this.add.text(width - 44, hudY - 2, 'Level ' + ctx.engine.getLevel(), fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5, 0.7).setDepth(z.hud);
    this.levelLabel.setData('testid', 'level-label');

    this.fishLabel = this.add.text(width - 44, hudY + 20, `🐟 ${ctx.engine.fish}`, fontStyle(type.small, color.warning))
      .setOrigin(0.5, 0.7).setDepth(z.hud);

    // Fever Bar Graphics & Label
    this.feverBarG = this.add.graphics().setDepth(z.hud);
    this.feverStatusLabel = this.add.text(width / 2, hudY + 24, 'FEVER', fontStyle({ size: '13px', weight: '800', lh: 1 }, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.hud + 1).setAlpha(0.85);

    // Speed Lines Graphics
    this.speedLinesG = this.add.graphics().setDepth(z.bg + 1);

    // Popups
    this.levelPopup = this.add.text(width / 2, height * 0.36, '', fontStyle(type.h1, color.textOnAccent))
      .setOrigin(0.5).setDepth(z.tutorial).setAlpha(0);
    this.levelPopup.setData('testid', 'level-popup');

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
      if (this.audioBtnText) this.audioBtnText.setText(enabled ? '🔊' : '🔇');
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
    for (let i = 0; i < 4; i++) {
      const d = this.add.circle(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(12, 22), Phaser.Math.Between(4, 7), 0xFFFFFF, 0.45).setDepth(z.actor - 1);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-16, 16),
        y: d.y + Phaser.Math.Between(8, 20),
        alpha: 0,
        scale: 0.2,
        duration: 320,
        ease: 'cubic.out',
        onComplete: () => d.destroy(),
      });
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
    const colors = [0xFF9F1C, 0xFF3838, 0xFFD700, 0xFFFFFF];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(35, 75);
      const col = colors[i % colors.length];
      const p = this.add.circle(x, y, Phaser.Math.Between(4, 7), col, 1).setDepth(z.actor + 1);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 450,
        ease: 'cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private drawLevelBg(level: number) {
    const { width, height } = this.scale;
    const bgKey = level < 10 ? 'bg_day' : (level < 20 ? 'bg_sunset' : 'bg_night');

    if (!this.bgImage || !this.bgImage.active) {
      this.bgImage = this.add.image(width / 2, height / 2, bgKey).setDepth(z.bg);
    } else {
      this.bgImage.setTexture(bgKey);
    }
    const bgScale = Math.max(width / this.bgImage.width, height / this.bgImage.height);
    this.bgImage.setPosition(width / 2, height / 2).setScale(bgScale);

    if (this.bgG && this.bgG.active) {
      this.bgG.destroy();
    }
    const g = this.add.graphics();
    this.bgG = g;

    const laneSpan = (this.lanes[1] - this.lanes[0]);
    const div1X = (this.lanes[0] + this.lanes[1]) / 2;
    const div2X = (this.lanes[1] + this.lanes[2]) / 2;
    const leftEdge = this.lanes[0] - laneSpan / 2;
    const rightEdge = this.lanes[2] + laneSpan / 2;

    // Road asphalt backing
    g.fillStyle(0x0F172A, 0.40);
    g.fillRect(leftEdge, 0, rightEdge - leftEdge, height);

    // Dashed center lane lines
    g.lineStyle(4, 0xFFFFFF, 0.60);
    for (let y = 0; y < height; y += 32) {
      g.strokeLineShape(new Phaser.Geom.Line(div1X, y, div1X, y + 18));
      g.strokeLineShape(new Phaser.Geom.Line(div2X, y, div2X, y + 18));
    }

    // Outer lane boundaries
    g.lineStyle(3, 0xFFFFFF, 0.80);
    g.strokeLineShape(new Phaser.Geom.Line(leftEdge, 0, leftEdge, height));
    g.strokeLineShape(new Phaser.Geom.Line(rightEdge, 0, rightEdge, height));

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

    // Hiệu ứng bụi khói khi nhảy chuyển làn
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

    // Tween chuyển làn ngang + nghiêng người nhẹ + squash & stretch
    const targetAngle = (target - prev) * 12;
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
    const laneSpan = this.getLaneSpan(this.scale.width, this.scale.height);
    const isFever = ctx.engine.isFeverActive();
    const isMagnet = ctx.engine.isMagnetActive() || isFever;

    // Cập nhật vị trí Mèo effects (Khiên, Nam châm, Fever aura)
    this.updateCatEffects(catX, catY, catSize);

    // Di chuyển vật phẩm & Hút nam châm
    for (const it of this.items) {
      if (it.collected) continue;

      if (isMagnet) {
        const dx = catX - it.container.x;
        const dy = catY - it.container.y;
        it.container.x += dx * 6.5 * dt;
        it.container.y += Math.max(diff.speed * 0.8, dy * 6.5) * dt;
      } else {
        it.container.y += diff.speed * 0.85 * dt;
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
            duration: 260,
            ease: 'sine.inout',
          });
        }
      }

      // Né thành công
      if (!b.dodged && b.container.y > catY + catSize.h * 0.4) {
        b.dodged = true;
        const isCatInBeeLane = isFat
          ? (b.lane === this.currentLane || b.secondaryLane === this.currentLane)
          : (b.lane === this.currentLane);
        if (!isCatInBeeLane) {
          this.onDodge(b);
        }
        this.handleSwarmBeeDone(b);
      }

      // Va chạm ong — Sửa chính xác cho Ong Béo (chắn cả 2 làn) và Ong Thường
      const hitY = Math.abs(b.container.y - catY) < (catSize.h * 0.58);
      const hitX = isFat
        ? (Math.abs(b.container.x - catX) < laneSpan * 0.90 || b.lane === this.currentLane || b.secondaryLane === this.currentLane)
        : (b.lane === this.currentLane && Math.abs(b.container.x - catX) < (catSize.w * 0.50));

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

    this.drawFeverBar();
    this.drawSpeedLines(diff.speed, isFever);

    if (ctx.engine.checkRecord()) this.showRecordPopup();
  }

  private drawSpeedLines(speed: number, isFever: boolean) {
    const g = this.speedLinesG;
    g.clear();

    if (!isFever && speed < 180) return;

    const { width, height } = this.scale;
    const alpha = isFever ? 0.45 : Math.min(0.3, (speed - 180) * 0.002);
    const lineCol = isFever ? 0xFFA502 : 0xFFFFFF;

    g.lineStyle(2, lineCol, alpha);
    const laneSpan = this.getLaneSpan(width, height);
    const leftEdge = this.lanes[0] - laneSpan / 2;
    const rightEdge = this.lanes[2] + laneSpan / 2;

    const lineCount = isFever ? 6 : 4;
    for (let i = 0; i < lineCount; i++) {
      const ly = (this.elapsed * 550 + i * (height / lineCount)) % height;
      const len = Phaser.Math.Between(40, 80);
      g.strokeLineShape(new Phaser.Geom.Line(leftEdge - 15, ly, leftEdge - 15, ly + len));
      g.strokeLineShape(new Phaser.Geom.Line(rightEdge + 15, ly, rightEdge + 15, ly + len));
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
    // Khóa luôn các làn đang có biển cảnh báo ⚠️ chờ rơi
    this.pendingSpeedyLanes.forEach(l => occupied.add(l));

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

    // Tính luôn các làn đang có biển cảnh báo ⚠️
    this.pendingSpeedyLanes.forEach(l => blockedLanes.add(l));

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
      this.pendingSpeedyLanes.add(lane);
      const beacon = this.add.text(this.lanes[lane], 30, '⚠️', { fontSize: '20px' }).setOrigin(0.5).setDepth(z.hud);
      this.tweens.add({
        targets: beacon,
        scale: 1.3,
        alpha: 0.3,
        duration: 130,
        yoyo: true,
        repeat: 1, // Tổng thời gian cảnh báo ~0.5s dứt khoát
        onComplete: () => {
          this.pendingSpeedyLanes.delete(lane);
          beacon.destroy();
          if (!this.running) return;
          // Kiểm tra an toàn lần 2 trước khi thả
          const canSpawnSpeedy = !this.willBlockAllLanes(lane, undefined, 1.18, -beeSize * 0.90, speed);
          const finalSpeedMult = canSpawnSpeedy ? 1.18 : 1.0;
          this.createBeeEntity('speedy', lane, beeSize * 0.90, finalSpeedMult, 0xFF4757);
        },
      });
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
    if (tintColor) sprite.setTint(tintColor);
    container.add(sprite);

    if (iconExtra) {
      const tag = this.add.text(size * 0.3, -size * 0.3, iconExtra, { fontSize: '14px' }).setOrigin(0.5);
      container.add(tag);
    }

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
      bg.fillStyle(0xFFFFFF, 0.18);
      bg.fillCircle(0, 0, 24);
      bg.lineStyle(2.5, 0xFFD700, 0.95);
      bg.strokeCircle(0, 0, 24);

      const sprite = this.add.image(0, 0, 'fish_item').setDisplaySize(48, 48);
      container.add([bg, sprite]);
    } else {
      let iconStr = '🛡️';
      let haloColor = 0x00E5FF;
      if (type === 'magnet') {
        iconStr = '🧲';
        haloColor = 0xFF4757;
      }
      bg.fillStyle(haloColor, 0.20);
      bg.fillCircle(0, 0, 24);
      bg.lineStyle(2.5, haloColor, 0.95);
      bg.strokeCircle(0, 0, 24);

      const txt = this.add.text(0, 0, iconStr, { fontSize: '24px' }).setOrigin(0.5);
      container.add([bg, txt]);
    }

    this.tweens.add({
      targets: container,
      scale: 1.12,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

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

  private onDodge(_bee: Bee) {
    const r = ctx.engine.registerDodge();
    this.updateHud();
    this.playSfx('sfx_dodge', 0.4);
    this.playSfx('sfx_score', 0.3);
    if (r.comboTriggered) this.showComboPopup();
    if (r.feverTriggered) this.onFeverStart();
    if (r.levelUp) this.onLevelUp(r.newLevel);
  }

  private onLevelUp(level: number) {
    this.drawLevelBg(level);
    this.levelLabel.setText('Level ' + level);
    this.tweens.add({ targets: this.levelLabel, scale: 1.3, duration: dur.tn, yoyo: true, ease: 'back.out' });
    this.levelPopup.setText('Level ' + level);
    this.tweens.add({
      targets: this.levelPopup, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 200, ease: 'back.out',
      onComplete: () => this.tweens.add({ targets: this.levelPopup, alpha: 0, duration: 300, delay: 1000, ease: 'cubic.in' }),
    });
    this.playSfx('sfx_levelup', 0.45);
  }

  private triggerFatBeeBreather() {
    this.fatBeeActive = true;
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
    const t = this.add.text(x, y, text, fontStyle(type.h2, txtColor)).setOrigin(0.5).setDepth(z.hud);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 600, ease: 'quad.out',
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

  private drawFeverBar() {
    const { width, height } = this.scale;
    const hudY = Math.max(38, height * 0.05);
    const barW = Math.min(140, width * 0.32);
    const barH = 10;
    const barX = width / 2 - barW / 2;
    const barY = hudY + 18;

    const g = this.feverBarG;
    g.clear();

    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(barX, barY, barW, barH, 5);

    const isFever = ctx.engine.isFeverActive();
    let ratio = ctx.engine.fever / 100;
    if (isFever) {
      ratio = ctx.engine.feverTimeRemaining / MECHANICS.feverDurationSec;
    }

    const fillW = Math.max(0, barW * Math.min(1, ratio));
    if (fillW > 0) {
      const barColor = isFever ? 0xFF3838 : 0xFFA502;
      g.fillStyle(barColor, 0.95);
      g.fillRoundedRect(barX, barY, fillW, barH, 5);
    }

    g.lineStyle(1.5, toColor(color.textOnAccent), 0.6);
    g.strokeRoundedRect(barX, barY, barW, barH, 5);

    if (isFever) {
      this.feverStatusLabel.setText('🔥 FEVER x2 🔥').setColor(color.warning);
    } else {
      this.feverStatusLabel.setText(`FEVER ${Math.round(ctx.engine.fever)}%`).setColor(color.textOnAccent);
    }
  }

  private updateHud() {
    this.scoreLabel.setText(String(ctx.engine.score));
    this.fishLabel.setText(`🐟 ${ctx.engine.fish}`);
    this.tweens.add({ targets: this.scoreLabel, scale: 1.35, duration: 150, yoyo: true, ease: 'back.out' });
  }

  private async onHit() {
    this.running = false;
    this.moveSeq++;
    ctx.engine.registerHit();
    this.playSfx('sfx_hit', 0.45);
    this.sound.stopByKey('bgm_main');

    this.cameras.main.shake(200, 0.02);
    this.tweens.add({ targets: this.cat, angle: 45, y: this.cat.y + 40, alpha: 0.7, duration: 350, ease: 'cubic.out' });
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
    }
    const hudY = Math.max(38, g.height * 0.05);
    if (this.pauseBtnContainer) this.pauseBtnContainer.setPosition(28, hudY);
    if (this.audioBtnContainer) this.audioBtnContainer.setPosition(68, hudY);
    if (this.scoreLabel) this.scoreLabel.setPosition(g.width / 2, hudY - 4);
    if (this.levelLabel) this.levelLabel.setPosition(g.width - 44, hudY - 2);
    if (this.fishLabel) this.fishLabel.setPosition(g.width - 44, hudY + 20);
    if (this.feverStatusLabel) this.feverStatusLabel.setPosition(g.width / 2, hudY + 24);
    if (this.levelPopup) this.levelPopup.setPosition(g.width / 2, g.height * 0.36);
    this.drawLevelBg(ctx.engine.getLevel());
  }
}



import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, paletteForLevel, toColor } from '../tokens';
import { ctx } from '../context';
import { sdk } from '@game/sdk';
import { MECHANICS, BeeType } from '../logic/mechanics';
import { SpawnDirector, type SpawnDirectorResult } from '../logic/SpawnDirector';
import { WIRING } from '../logic/wiring';
import type { GameEngine } from '../logic/GameEngine';
import type { MechanicsConfig } from '../logic/types';
import { PauseModal } from '../ui/PauseModal';
import { FxPool, RingPool, Pool, type DotFx } from '../systems/FxPool';

interface BeeSlot {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
  // PERF-FIX B: tween flap/cánh + lắc lư tạo 1 lần cho slot, pause/restart khi recycle
  flap: Phaser.Tweens.Tween;
  sway: Phaser.Tweens.Tween;
  // anticipation scale 0.88→1.08→1.0 (restart khi acquire — không tạo tween mới mỗi con)
  bow: Phaser.Tweens.Tween;
  settle: Phaser.Tweens.Tween;
}

interface Bee {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  slot?: BeeSlot;
  type: BeeType;
  lane: number;
  secondaryLane?: number;
  speedMult: number;
  dodged: boolean;
  swerved?: boolean;
  isSwarm?: boolean;
}

type ItemType = 'fish' | 'shield' | 'magnet';

// PERF-FIX A: key texture pre-render 1 lần ở create() — không vẽ vector lại mỗi frame
const FLOW_TEX = {
  dotWhite: 'fx_dot_white',
  shadow: 'fx_cat_shadow',
  dash: 'fx_lane_dash',
  streak: (fever: boolean) => (fever ? 'fx_streak_fever' : 'fx_streak'),
  flame: (fever: boolean) => (fever ? 'fx_flame_fever' : 'fx_flame'),
  prop: (t: string) => `fx_prop_${t}`,
  ring: 'fx_ring',           // vòng stroke r40 — shockwave pool (PERF-FIX B)
} as const;

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

  private catShadowImg!: Phaser.GameObjects.Image;
  private cat!: Phaser.GameObjects.Image;
  private shieldBubble!: Phaser.GameObjects.Graphics;
  private magnetIndicator!: Phaser.GameObjects.Text;
  private feverAura!: Phaser.GameObjects.Graphics;
  private bgG!: Phaser.GameObjects.Graphics;
  // PERF-FIX A: vector vẽ mỗi frame được pre-render 1 lần ở create(), mỗi frame chỉ
  // cập nhật vị trí/alpha của Image — không còn tessellate + upload GPU buffer từng frame.
  private laneDashTiles: Phaser.GameObjects.TileSprite[] = [];
  private streakImgs: Phaser.GameObjects.Image[] = [];
  private natureImgs: Phaser.GameObjects.Image[] = [];
  private roadsideImgs: Phaser.GameObjects.Image[] = [];
  private feverFlameImg!: Phaser.GameObjects.Image;
  private lastFeverUiKey = '';
  private shieldWasActive = false;
  private magnetWasActive = false;
  private feverAuraWasActive = false;

  // PERF-FIX B: pool particle + container ong (không sinh-hủy GameObject/tween mỗi burst)
  private fxDots!: FxPool;      // sparkles + bee-explosion (depth per-burst qua DotFx.depth)
  private fxDust!: FxPool;      // running puff + lane-switch dust
  private fxTrail!: FxPool;     // vệt mờ sau ong (depth actor-1)
  private fxRing!: RingPool;    // shockwave (depth actor+2)
  private beePool!: Pool<BeeSlot>; // container ong tái sinh

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
  // T1c: quyết định spawn dời về tầng A (logic/SpawnDirector) — scene chỉ orchestrate + vẽ
  private spawnDirector: SpawnDirector | null = null;

  private elapsed = 0;
  private lastTick = 0;
  private lastItemSpawn = 0;
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
    // PERF-FIX A: bóng đổ là 1 Image của texture pre-render (10 ellipse alpha-blend bake 1 lần).
    // Mỗi frame chỉ đổi vị trí/scale — đồng nhất toán học vì ellipse bake scale tuyến tính quanh tâm.
    if (!this.catShadowImg || !this.catShadowImg.active) return;
    const shadowY = y + h * 0.44;
    this.catShadowImg.setPosition(x, shadowY).setScale(scaleX, scaleY);
  }

  // ---------- PERF-FIX A: pre-render doodad cuộn 1 lần ở create(), không vẽ vector mỗi frame ----------

  private bakeTexture(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, Math.ceil(w), Math.ceil(h));
    g.destroy();
  }

  private bakeCatShadow(catSize: { w: number; h: number }) {
    const shadowW = catSize.w * 1.40;
    const shadowH = catSize.h * 0.35;
    this.bakeTexture(FLOW_TEX.shadow, shadowW, shadowH, (g) => {
      const steps = 10;
      const alphaStep = 0.22 / steps;
      for (let i = steps; i >= 1; i--) {
        const ratio = i / steps;
        g.fillStyle(0x1B1008, alphaStep);
        g.fillEllipse(shadowW / 2, shadowH / 2, shadowW * ratio, shadowH * ratio);
      }
    });
  }

  private buildFlowTextures() {
    const { width, height } = this.scale;
    const catSize = this.getCatSize(width, height);

    // Bóng mèo: giống hệt drawCatShadow cũ (steps=10, peak alpha 0.22), bake centered
    this.bakeCatShadow(catSize);

    // Dot trắng đơn vị (hạt nature / vòng tròn FX) — tint + scale mỗi ảnh
    this.bakeTexture(FLOW_TEX.dotWhite, 16, 16, (g) => {
      g.fillStyle(0xFFFFFF, 1);
      g.fillCircle(8, 8, 8);
    });

    // PERF-FIX B: vòng shockwave bake sẵn r40 nét 3.5px — pool Image tint, scale động
    // (thay strokeCircle+clear 60 lần/giây của addCounter cũ)
    this.bakeTexture(FLOW_TEX.ring, 88, 88, (g) => {
      g.lineStyle(3.5, 0xFFFFFF, 1);
      g.strokeCircle(44, 44, 40);
    });

    // Vạch làn: 1 chu kỳ dash(36)+gap(24) bake đứng, cuộn bằng TileSprite
    const dashLength = 36;
    const gapLength = 24;
    const totalCycle = dashLength + gapLength;
    this.bakeTexture(FLOW_TEX.dash, 4, totalCycle, (g) => {
      g.lineStyle(2, 0x0F172A, 0.18);
      g.strokeLineShape(new Phaser.Geom.Line(2, 0, 2, dashLength));
    });

    // Vệt gió thẳng đứng 1.6px x 28px (trắng — tint theo fever)
    this.bakeTexture(FLOW_TEX.streak(false), 4, 28, (g) => {
      g.lineStyle(1.6, 0xFFFFFF, 1);
      g.strokeLineShape(new Phaser.Geom.Line(2, 0, 2, 28));
    });

    // Flame icon fever bar: 2 biến thể bake sẵn, đổi texture khi trạng thái đổi
    for (const fever of [false, true]) {
      this.bakeTexture(FLOW_TEX.flame(fever), 13, 19, (g) => {
        const cx = 6.5;
        const cy = 9.5;
        g.fillStyle(fever ? 0xFF3838 : 0xFF6B35, 1.0);
        g.fillPoints([
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
        ], true);
        g.fillStyle(0xFFD700, 1.0);
        g.fillPoints([
          new Phaser.Math.Vector2(cx, cy - 3.5),
          new Phaser.Math.Vector2(cx + 2.5, cy - 0.5),
          new Phaser.Math.Vector2(cx + 2.5, cy + 3.5),
          new Phaser.Math.Vector2(cx, cy + 6),
          new Phaser.Math.Vector2(cx - 2.5, cy + 3.5),
          new Phaser.Math.Vector2(cx - 2.5, cy - 0.5),
        ], true);
      });
    }

    // Roadside props (daisy / grass / flower_purple / pebble) — geometry y như code cũ, scale 0.85
    const S = 0.85;
    const PS = 26; // canvas 26x26, prop centered at 13,13
    const pcx = PS / 2;
    const pcy = PS / 2;
    this.bakeTexture(FLOW_TEX.prop('daisy'), PS, PS, (g) => {
      g.fillStyle(0x388E3C, 0.8);
      g.fillCircle(pcx - 3 * S, pcy + 2 * S, 2.5 * S);
      g.fillCircle(pcx + 3 * S, pcy + 2 * S, 2.5 * S);
      g.fillStyle(0xFFFFFF, 0.95);
      const petalDist = 3.5 * S;
      const petalR = 3.2 * S;
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2;
        g.fillCircle(pcx + Math.cos(ang) * petalDist, pcy + Math.sin(ang) * petalDist, petalR);
      }
      g.fillStyle(0xFFD700, 1);
      g.fillCircle(pcx, pcy, 3.0 * S);
    });
    this.bakeTexture(FLOW_TEX.prop('flower_purple'), PS, PS, (g) => {
      g.fillStyle(0x2E7D32, 0.8);
      g.fillCircle(pcx, pcy + 3 * S, 2.8 * S);
      g.fillStyle(0xBA68C8, 0.92);
      const petalDist = 3.2 * S;
      const petalR = 3.0 * S;
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2;
        g.fillCircle(pcx + Math.cos(ang) * petalDist, pcy + Math.sin(ang) * petalDist, petalR);
      }
      g.fillStyle(0xFFEB3B, 1);
      g.fillCircle(pcx, pcy, 2.6 * S);
    });
    this.bakeTexture(FLOW_TEX.prop('grass'), PS, PS, (g) => {
      g.lineStyle(2.4 * S, 0x4CAF50, 0.9);
      g.strokeLineShape(new Phaser.Geom.Line(pcx, pcy, pcx - 5 * S, pcy - 9 * S));
      g.strokeLineShape(new Phaser.Geom.Line(pcx, pcy, pcx, pcy - 11 * S));
      g.strokeLineShape(new Phaser.Geom.Line(pcx, pcy, pcx + 5 * S, pcy - 9 * S));
    });
    this.bakeTexture(FLOW_TEX.prop('pebble'), PS, PS, (g) => {
      g.fillStyle(0x1B1008, 0.25);
      g.fillEllipse(pcx, pcy + 2 * S, 7 * S, 3.5 * S);
      g.fillStyle(0x94A3B8, 0.85);
      g.fillCircle(pcx, pcy, 4.5 * S);
      g.fillStyle(0xE2E8F0, 0.7);
      g.fillCircle(pcx - 1.5 * S, pcy - 1.5 * S, 2.0 * S);
    });
  }

  private destroyFlowObjects() {
    for (const t of this.laneDashTiles) t.destroy();
    for (const im of this.streakImgs) im.destroy();
    for (const im of this.natureImgs) im.destroy();
    for (const im of this.roadsideImgs) im.destroy();
    this.laneDashTiles = [];
    this.streakImgs = [];
    this.natureImgs = [];
    this.roadsideImgs = [];
  }

  private buildFlowObjects() {
    this.destroyFlowObjects();
    const { width, height } = this.scale;
    const { leftEdge, laneWidth } = this.getStraightRoadMetrics(width, height);

    // 2 TileSprite vạch làn cuộn modulo (kết luận thread §5.1: dirty-flag vô dụng vì offset đổi mọi frame)
    const totalCycle = 60;
    for (const divIdx of [1, 2]) {
      const lineX = leftEdge + divIdx * laneWidth;
      const tile = this.add.tileSprite(lineX, height / 2, 4, height + totalCycle * 2, FLOW_TEX.dash)
        .setDepth(z.bg + 1);
      this.laneDashTiles.push(tile);
    }

    // 12 vệt gió (8 thường / 12 fever — như streakCount cũ; ẩn bớt bằng visible)
    for (let i = 0; i < 12; i++) {
      const im = this.add.image(0, 0, FLOW_TEX.streak(false)).setDepth(z.bg + 1).setVisible(false);
      this.streakImgs.push(im);
    }

    // Hạt nature: dot trắng tint theo màu sẵn có
    for (const p of this.natureParticles) {
      const im = this.add.image(0, 0, FLOW_TEX.dotWhite).setDepth(z.bg + 2).setTint(p.color);
      im.setDisplaySize(p.size * 2, p.size * 2);
      this.natureImgs.push(im);
    }

    // Roadside props: 1 Image mỗi prop, đổi texture khi prop đổi loại ở cuối chu kỳ
    for (const p of this.roadsideProps) {
      const im = this.add.image(0, 0, FLOW_TEX.prop(p.propType))
        .setDisplaySize(26, 26).setDepth(z.bg + 2).setVisible(false);
      this.roadsideImgs.push(im);
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
    this.lastItemSpawn = 0;
    // T1c: cadence spawn + swarm dời về SpawnDirector (mirror create cũ:
    // startSession(elapsed) bung cadence về 0 + swarm đầu tại elapsed+8+interval)
    const spawnCfg: MechanicsConfig = MECHANICS;
    this.spawnDirector = new SpawnDirector(spawnCfg);
    this.spawnDirector.startSession(this.elapsed);
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
    this.feverStatusLabel = this.add.text(pf.center + 8, hudY + 38, 'FEVER 0%', fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);

    // Level Progress Pill (D-A2: cảm giác tiến bộ nhìn thấy được — testid level-progress)
    this.levelProgressG = this.add.graphics().setDepth(z.hud);
    this.levelProgressLabel = this.add.text(pf.center, hudY + 81, `NEXT LEVEL: 0/${MECHANICS.milestoneInterval}`, fontStyle({ size: '13px', weight: '900', lh: 1 }, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.hud + 1)
      .setStroke('#1E0E02', 3.5)
      .setAlpha(0.95);
    this.levelProgressLabel.setData('testid', 'level-progress');

    // PERF-FIX A: doodad cuộn (vạch làn, vệt gió, hạt nature, roadside, bóng mèo) được
    // pre-render texture 1 lần rồi cuộn bằng Image/TileSprite — xem buildFlowTextures().

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

    // PERF-FIX A: bake texture 1 lần rồi tạo sprite cuộn (sau khi có mảng natureParticles/roadsideProps)
    this.buildFlowTextures();
    this.buildFlowObjects();

    // PERF-FIX B: khởi tạo pool particle sau khi bake fx_dot_white/fx_ring
    this.fxDots = new FxPool(this, FLOW_TEX.dotWhite, 96, z.hud);
    this.fxDust = new FxPool(this, FLOW_TEX.dotWhite, 32, z.actor - 1);
    this.fxTrail = new FxPool(this, FLOW_TEX.dotWhite, 40, z.actor - 1);
    this.fxRing = new RingPool(this, FLOW_TEX.ring, 6, z.actor + 2);
    this.beePool = new Pool<BeeSlot>(() => this.buildBeeSlot());

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
    this.catShadowImg = this.add.image(this.lanes[this.currentLane], catY + catSize.h * 0.44, FLOW_TEX.shadow)
      .setDepth(z.actor - 1);
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
      this.destroyFlowObjects();
      // PERF-FIX B: giải phóng pool khi scene shutdown (scene chạy lại → create mới)
      this.fxDots?.destroy();
      this.fxDust?.destroy();
      this.fxTrail?.destroy();
      this.fxRing?.destroy();
      this.beePool?.drain((s) => s.container.destroy());
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

  // PERF-FIX B: 5 hàm spawn dưới KHÔNG còn add.circle+add.tweens sinh-hủy.
  // Dot lấy từ pool cố định (FxPool.step nội suy trong update), cùng toán chuyển động/ease
  // cũ; shockwave dùng Image fx_ring bake sẵn scale r12->r75 (quad.out như addCounter cũ).
  private spawnDust(x: number, y: number) {
    for (let foot = -1; foot <= 1; foot += 2) {
      const fx = x + foot * 16;
      const fy = y + 16;
      for (let i = 0; i < 3; i++) {
        this.fxDust.spawn({
          x0: fx + Phaser.Math.Between(-5, 5), y0: fy + Phaser.Math.Between(-4, 6),
          x1: fx + foot * Phaser.Math.Between(6, 18), y1: fy + Phaser.Math.Between(4, 14),
          life: 320, age: 0,
          r0: Phaser.Math.Between(4, 7), r1: 0.8,
          a0: 0.55, a1: 0,
          color: 0xFFFFFF, ease: 2,
        });
      }
    }
  }

  private spawnSparkles(x: number, y: number, starColor = 0xFFD700) {
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
      const dist = Phaser.Math.Between(22, 45);
      this.fxDots.spawn({
        x0: x, y0: y,
        x1: x + Math.cos(angle) * dist, y1: y + Math.sin(angle) * dist,
        life: 400, age: 0,
        r0: Phaser.Math.Between(3, 6), r1: 0.6,
        a0: 0.95, a1: 0,
        color: starColor, ease: 1, depth: z.hud,
      });
    }
  }

  private spawnShockwave(x: number, y: number, shockColor = 0x00F0FF) {
    // Code cũ: strokeCircle r12→75 (320ms quad.out), alpha 1→0, nét 3.5px.
    // fx_ring bake nét 3.5px ở r40; scale theo r giữ bề dày nét tương đối như cũ.
    this.fxRing.spawn({
      x0: x, y0: y, x1: x, y1: y,
      life: 320, age: 0,
      r0: 12, r1: 75,
      a0: 1, a1: 0,
      color: shockColor, ease: 1,
    });
  }

  private spawnBeeExplosion(x: number, y: number) {
    // Honey-gold + white particles per ART-PASS §4.3
    const colors = [0xFFA502, 0xFFD700, 0xFFEAA7, 0xFFFFFF];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 70);
      this.fxDots.spawn({
        x0: x, y0: y,
        x1: x + Math.cos(angle) * dist, y1: y + Math.sin(angle) * dist,
        life: 420, age: 0,
        r0: Phaser.Math.Between(4, 8), r1: 0.8,
        a0: 0.95, a1: 0,
        color: colors[i % colors.length], ease: 2, depth: z.actor + 1,
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

  private stepFx(deltaMs: number) {
    this.fxDots.step(deltaMs);
    this.fxDust.step(deltaMs);
    this.fxTrail.step(deltaMs);
    this.fxRing.step(deltaMs);
  }

  update(_time: number, deltaMs: number) {
    // PERF-FIX B: particle pool bước theo dt game. Pause = đóng băng (như đóng băng
    // gameplay); hết running (game over) vẫn fade hết burst như tween cũ.
    if (this.isPaused) return;
    if (!this.running) { this.stepFx(deltaMs); return; }
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    this.stepFx(deltaMs);

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

    // Kiểm tra kích hoạt Sự kiện Bão Ong (Swarm Wave) + spawn ong — T1c: quyết định
    // (swarm gate/cadence/refusal/lane) thuộc SpawnDirector, scene chỉ orchestrate + vẽ.
    const diff = ctx.engine.difficulty(this.elapsed, currentLevel);
    this.stepSpawn(dt, this.elapsed, ctx.engine, diff);

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
          this.retireBee(b);
          this.updateHud();
          continue;
        } else if (ctx.engine.tryUseShield()) {
          this.playSfx('sfx_dodge', 0.55);
          this.spawnShockwave(catX, catY, 0x00F0FF);
          this.showPowerupPopup('SHIELD SAVED! 🛡️', color.primary);
          this.cameras.main.shake(130, 0.012);
          this.handleSwarmBeeDone(b);
          this.retireBee(b);
          this.updateHud();
          continue;
        } else {
          return this.onHit();
        }
      }

      if (b.container.y > this.scale.height + 80) {
        this.handleSwarmBeeDone(b);
        this.retireBee(b);
      }
    }
    this.pruneBees();
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
            // PERF-FIX B: dot pool thay add.circle+destroy (alpha 0.22→0, scale→0.3*14px như cũ)
            this.fxTrail.spawn({
              x0: b.container.x, y0: b.container.y - 10,
              x1: b.container.x, y1: b.container.y - 10,
              life: 180, age: 0,
              r0: 14, r1: 4.2,
              a0: 0.22, a1: 0,
              color: 0xFFA502, ease: 1,
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
    const footX = x + (Math.random() < 0.5 ? -14 : 14) + Phaser.Math.Between(-3, 3);
    this.fxDust.spawn({
      x0: footX, y0: y,
      x1: footX, y1: y + Phaser.Math.Between(8, 16),
      life: 250, age: 0,
      r0: Phaser.Math.Between(4, 7), r1: 1.2,
      a0: 0.35, a1: 0,
      color: 0xFFFFFF, ease: 1,
    });
  }

  private drawGroundFlow(speed: number, dt: number, isFever: boolean) {
    // PERF-FIX A: không còn clear()+vẽ vector mỗi frame. Vạch làn = 2 TileSprite cuộn
    // modulo; vệt gió + hạt nature = Image đã bake texture, mỗi frame chỉ đổi
    // position/alpha/tint (không tessellate, không upload GPU buffer mới).
    if (this.laneDashTiles.length === 0) this.buildFlowObjects();

    const { width, height } = this.scale;
    const { leftEdge, laneWidth, roadW } = this.getStraightRoadMetrics(width, height);

    // 1. Vạch làn: TileSprite cuộn xuống bằng tilePositionY modulo chu kỳ 60px
    // (giảm tilePositionY = nội dung dịch xuống; always-positive để WebGL wrap chuẩn)
    const totalCycle = 60;
    const flowOffset = (this.elapsed * speed * 0.85) % totalCycle;
    for (let d = 0; d < this.laneDashTiles.length; d++) {
      const tile = this.laneDashTiles[d];
      tile.setX(leftEdge + (d === 0 ? 1 : 2) * laneWidth).setY(height / 2)
        .setSize(4, height + totalCycle * 2);
      tile.tilePositionY = totalCycle - flowOffset;
    }

    // 2. Vệt gió: 12 Image bake sẵn, ẩn/hiện theo streakCount như code cũ
    const streakCount = isFever ? 12 : 8;
    const streakTint = isFever ? 0xFFA502 : 0xFFFFFF;
    for (let i = 0; i < this.streakImgs.length; i++) {
      const im = this.streakImgs[i];
      if (i >= streakCount) {
        if (im.visible) im.setVisible(false);
        continue;
      }
      const cycleT = ((this.elapsed * (speed * 0.0016) + (i / streakCount)) % 1);
      const sy = cycleT * height;
      const laneIndex = i % 3;
      const laneCenterX = leftEdge + (laneIndex + 0.5) * laneWidth;
      const laneOffset = Math.sin(i * 3.7 + this.elapsed * 0.5) * (laneWidth * 0.3);
      const alpha = Math.sin(cycleT * Math.PI) * (isFever ? 0.38 : 0.16);
      im.setVisible(true).setTint(streakTint).setPosition(laneCenterX + laneOffset, sy + 14).setAlpha(alpha);
    }

    // 3. Hạt nature: cùng toán chuyển động cũ, render bằng Image tint
    for (let i = 0; i < this.natureParticles.length; i++) {
      const p = this.natureParticles[i];
      p.y += speed * 0.75 * p.speedMult * dt;
      if (p.y > height + 20) {
        p.y = Phaser.Math.Between(-20, 0);
        p.xRatio = Math.random();
      }
      const sway = Math.sin(this.elapsed * p.swaySpeed + p.swayOffset) * 12;
      const px = leftEdge + p.xRatio * roadW + sway;
      const pProgress = Math.max(0, Math.min(1, p.y / height));
      const pAlpha = Math.sin(pProgress * Math.PI) * p.alpha;
      const im = this.natureImgs[i];
      if (im) im.setPosition(px, p.y).setAlpha(pAlpha);
    }
  }

  private drawRoadsideProps(speed: number, dt: number) {
    // PERF-FIX A: mỗi prop là 1 Image của texture bake sẵn (daisy/grass/flower/pebble),
    // mỗi frame chỉ đổi position/alpha/texture — không clear()+~20 lệnh vector/frame.
    if (this.roadsideImgs.length === 0) this.buildFlowObjects();

    const { width, height } = this.scale;
    const { leftEdge, roadW } = this.getStraightRoadMetrics(width, height);

    const propTypes: Array<'daisy' | 'grass' | 'flower_purple' | 'pebble'> = ['daisy', 'grass', 'flower_purple', 'pebble'];

    for (let i = 0; i < this.roadsideProps.length; i++) {
      const p = this.roadsideProps[i];
      const im = this.roadsideImgs[i];
      if (!im) continue;
      // Advance progress t downwards
      p.t += (speed * 0.00085 * p.speedMult) * dt;
      if (p.t >= 1.0) {
        p.t = p.t % 1.0;
        p.side = Math.random() < 0.5 ? -1 : 1;
        p.speedMult = 0.85 + Math.random() * 0.30;
        p.lateralOffsetRatio = Math.random();
        p.propType = propTypes[Math.floor(Math.random() * propTypes.length)];
        im.setTexture(FLOW_TEX.prop(p.propType));
      }

      const py = p.t * height;
      const edgeX = p.side === -1 ? leftEdge : (leftEdge + roadW);
      // Lateral outward offset into roadside grass
      const px = edgeX + p.side * (12 + p.lateralOffsetRatio * 28);
      const alpha = Math.min(1.0, Math.sin(p.t * Math.PI) * 1.5);

      if (alpha <= 0.01) {
        if (im.visible) im.setVisible(false);
        continue;
      }
      im.setVisible(true).setPosition(px, py).setAlpha(alpha);
    }
  }

  // PERF-FIX D: lọc in-place, không cấp phát array mới mỗi lần gọi (code cũ: bees.filter(...)/spawn)
  private pruneBees() {
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const b = this.bees[i];
      if (!b.container || !b.container.active) {
        // PERF-FIX B: retireBee đã pause tween + release slot; prune chỉ xóa reference khỏi mảng
        this.bees.splice(i, 1);
      }
    }
  }

  private updateCatEffects(catX: number, catY: number, catSize: { w: number; h: number }) {
    // PERF-FIX C: dirty-flag — shield/aura chỉ clear 1 lần khi chuyển on->off,
    // không chạy clear()+setAlpha(0) mỗi frame khi hiệu ứng đang tắt.
    const shieldActive = ctx.engine.shieldActive;
    if (shieldActive) {
      this.shieldBubble.clear();
      this.shieldBubble.lineStyle(3, 0x00F0FF, 0.9);
      this.shieldBubble.fillStyle(0x00F0FF, 0.20);
      this.shieldBubble.strokeCircle(catX, catY, catSize.w * 0.65);
      this.shieldBubble.fillCircle(catX, catY, catSize.w * 0.65);
      this.shieldBubble.setAlpha(0.85);
    } else if (this.shieldWasActive) {
      this.shieldBubble.clear().setAlpha(0);
    }
    this.shieldWasActive = shieldActive;

    if (ctx.engine.isMagnetActive()) {
      this.magnetIndicator.setPosition(catX, catY - catSize.h * 0.65).setAlpha(1);
    } else {
      this.magnetIndicator.setAlpha(0);
    }

    const feverActive = ctx.engine.isFeverActive();
    if (feverActive) {
      this.feverAura.clear();
      this.feverAura.lineStyle(4, 0xFF9F1C, 0.8);
      this.feverAura.fillStyle(0xFF9F1C, 0.25);
      this.feverAura.strokeCircle(catX, catY, catSize.w * 0.75);
      this.feverAura.fillCircle(catX, catY, catSize.w * 0.75);
      this.feverAura.setAlpha(1);
    } else if (this.feverAuraWasActive) {
      this.feverAura.clear().setAlpha(0);
    }
    this.feverAuraWasActive = feverActive;
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

  // ---------- T1c: orchestration spawn (quyết định thuộc SpawnDirector — tầng A) ----------

  /** Góc nhìn thuần cho director: làn tự do qua geography thật (willBlockAllLanes). */
  private getSafeLanes(baseSpeed: number): number[] {
    const occupied = this.getOccupiedLanesAtTop(200);
    if (occupied.size >= 2) return [];
    const beeSize = this.getBeeSize(this.scale.width, this.scale.height);
    return [0, 1, 2].filter((l) => !occupied.has(l) && !this.willBlockAllLanes(l, undefined, 1.0, -beeSize, baseSpeed));
  }

  /** Snapshot thế giới pure-data — input duy nhất của director (0 tham chiếu Phaser). */
  private buildSpawnWorld(baseSpeed: number) {
    return {
      swarmActive: this.swarmActive,
      fatBeeActive: this.fatBeeActive,
      fatOnScreen: this.bees.some((b) => b.type === 'fat'),
      occupiedLanes: Array.from(this.getOccupiedLanesAtTop(200)),
      safeLanes: this.getSafeLanes(baseSpeed),
      beeCount: this.bees.length,
    };
  }

  /** Spawn render 1 con ong theo quyết định của director (giữ nguyên createBeeEntity cũ). */
  private spawnBeeEntity(type: BeeType, lane: number, speedMult: number): void {
    const beeSize = this.getBeeSize(this.scale.width, this.scale.height);
    if (type === 'speedy') {
      this.createBeeEntity('speedy', lane, beeSize * 0.90, speedMult, 0xFF4757);
    } else if (type === 'zigzag') {
      this.createBeeEntity('zigzag', lane, beeSize, speedMult, 0xBA68C8, '🌀');
    } else {
      this.createBeeEntity('normal', lane, beeSize, speedMult);
    }
  }

  /** Gọi director mỗi frame; scene chỉ VẼ quyết định (T1c — logic cadence/refusal/swarm ở tầng A). */
  private stepSpawn(dt: number, elapsed: number, engine: GameEngine, diff: { speed: number }): void {
    if (!this.spawnDirector) return;
    const result: SpawnDirectorResult = this.spawnDirector.update({
      dt,
      elapsed,
      engine,
      world: this.buildSpawnWorld(diff.speed),
    });

    if (result.swarmTriggered) this.triggerSwarmWave();

    for (const decision of result.spawned) {
      this.spawnBeeEntity(decision.type, decision.lane, decision.speedMult);
    }

    if (result.doubleSpawn) {
      const secondLane = result.doubleSpawn.lane;
      const level = engine.getLevel();
      const beeSize = this.getBeeSize(this.scale.width, this.scale.height);
      const dirAtCall = this.spawnDirector;
      this.time.delayedCall(WIRING.doubleSpawnDelayMs, () => {
        if (this.running && !this.swarmActive && !this.bees.some((b) => b.type === 'fat')) {
          if (!this.willBlockAllLanes(secondLane, undefined, 1.0, -beeSize, diff.speed)) {
            const secondType = dirAtCall
              ? dirAtCall.rollSecondBeeType(this.elapsed, engine, level)
              : null;
            if (secondType !== null) {
              this.createBeeEntity(secondType, secondLane, beeSize, 1.0);
            }
          }
        }
      });
    }
  }

  // ---------- TEST WIRING (bề mặt đọc/trình state cho UT+QA — không đổi hành vi runtime) ----------
  /** Director đang gắn với scene (contract wiring UT/QA). */
  getDirector(): SpawnDirector | null { return this.spawnDirector; }
  /** Config đã truyền vào director (MechanicsConfig dùng chung — không config rời). */
  getDirectorConfig(): MechanicsConfig { return MECHANICS; }
  /** Engine phiên hiện tại (UT dựng kịch bản deterministic). */
  getEngineForTest(): GameEngine { return ctx.engine; }
  get beeCount(): number { return this.bees.length; }
  get beeLanesView(): number[] { return this.bees.map((b) => b.lane); }
  get swarmActiveView(): boolean { return this.swarmActive; }
  get runningView(): boolean { return this.running; }
  /** Reset phiên về trạng thái đầu (UT): dọn ong/item + engine mới + director mới. */
  beginSessionForTest(elapsed = 0): void {
    for (const b of this.bees) { if (b.container?.active) b.container.destroy(); }
    this.bees = [];
    for (const it of this.items) { if (it.container?.active) it.container.destroy(); }
    this.items = [];
    this.fatBeeActive = false;
    this.swarmActive = false;
    this.swarmBeesRemaining = 0;
    ctx.engine.startNewGame();
    this.spawnDirector = new SpawnDirector(MECHANICS);
    this.spawnDirector.startSession(elapsed);
  }
  /** Step spawn thủ công (dt/elapsed kiểm soát được — không qua game loop). */
  stepSpawnForTest(dt: number, elapsed: number): void {
    const engine = ctx.engine;
    this.stepSpawn(dt, elapsed, engine, engine.difficulty(elapsed, engine.getLevel()));
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

  private createBeeEntity(type: BeeType, lane: number, size: number, speedMult: number, tintColor?: number, iconExtra?: string): Bee {
    // PERF-FIX B: slot ong tái sinh — container/sprite/tag + tween tạo 1 lần/lần acquire
    const slot = this.beePool.acquire();
    const { container, sprite, tag } = slot;
    container.setPosition(this.lanes[lane], -size).setDepth(z.actor);
    container.setActive(true).setVisible(true).setScale(1).setAlpha(1);
    sprite.setDisplaySize(size, size);
    sprite.setFlipX(Math.random() < 0.5); // Random flipX on spawn so 3 on-screen bees never look identical
    sprite.clearTint();
    if (tintColor) sprite.setTint(tintColor);
    if (iconExtra) {
      tag.setPosition(size * 0.3, -size * 0.3).setText(iconExtra);
      tag.setVisible(true);
    } else {
      tag.setVisible(false);
    }

    // 2 wing flapping poses + sway 7px — restart tween persist của slot (không tạo mới)
    slot.flap.restart();
    slot.sway.restart();

    // 1-beat anticipation scale (0.88 -> 1.08 -> 1.0) trước khi lao xuống
    container.setScale(0.88);
    slot.settle.pause();
    slot.bow.restart();

    const bee: Bee = { container, sprite, slot, type, lane, speedMult, dodged: false };
    this.bees.push(bee);
    return bee;
  }

  private buildBeeSlot(): BeeSlot {
    const container = this.add.container(0, 0).setDepth(z.actor);
    const sprite = this.add.image(0, 0, 'bee_wasp').setDisplaySize(48, 48);
    container.add(sprite);
    const tag = this.add.text(0, 0, '', { fontSize: '14px' }).setOrigin(0.5);
    container.add(tag);
    container.setVisible(false).setActive(false);

    const mk = (cfg: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween =>
      this.tweens.add({ paused: true, persist: true, ...cfg });
    const flap = mk({ targets: sprite, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: -1, ease: 'sine.inout' });
    const sway = mk({ targets: sprite, x: { from: 0, to: 7 }, duration: 600, yoyo: true, repeat: -1, ease: 'sine.inout' });
    const settle = mk({ targets: container, scale: 1.0, duration: 80, ease: 'quad.out' });
    const bow = mk({ targets: container, scale: 1.08, duration: 120, ease: 'back.out', onComplete: () => settle.restart() });
    return { container, sprite, tag, flap, sway, bow, settle };
  }

  // PERF-FIX B: deactivate trả về pool thay vì destroy (spec §1.B.3) — ẩn + pause tween.
  // Slot lạ (ong Béo không dùng pool) → destroy như code cũ.
  private retireBee(b: Bee) {
    const c = b.container;
    if (!c || !c.active) return;
    c.setVisible(false).setActive(false);
    if (b.slot) {
      b.slot.flap.pause();
      b.slot.sway.pause();
      b.slot.bow.pause();
      b.slot.settle.pause();
      this.beePool.release(b.slot);
      b.slot = undefined;
    } else {
      c.destroy();
    }
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
        // PERF-FIX B: ong bão lấy từ pool slot (code cũ: không flap/bow — giữ tween pause)
        const slot = this.beePool.acquire();
        const { container, sprite, tag } = slot;
        container.setPosition(this.lanes[l], -beeSize).setDepth(z.actor);
        container.setActive(true).setVisible(true).setScale(1).setAlpha(1);
        sprite.setDisplaySize(beeSize, beeSize);
        sprite.setFlipX(Math.random() < 0.5);
        sprite.clearTint();
        sprite.setTint(0xFF4757);
        sprite.setAngle(0).setX(0);
        tag.setVisible(false);
        slot.flap.pause();
        slot.sway.pause();
        slot.bow.pause();
        slot.settle.pause();
        const bee: Bee = { container, sprite, slot, type: 'speedy', lane: l, speedMult: 1.15, dodged: false, isSwarm: true };
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
    // T1c: mirror L1941 — bung cadence spawn về 0 (state cadence sống trong director)
    this.spawnDirector?.resetSpawnTimer();

    // Dọn dẹp sạch toàn bộ ong thường đang có trên màn hình để làn an toàn đảm bảo 100% không có ong
    for (const b of this.bees) {
      if (b.container && b.container.active && b.type !== 'fat') {
        this.spawnBeeExplosion(b.container.x, b.container.y);
        this.retireBee(b);
      }
    }
    this.pruneBees();

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

    const isFever = ctx.engine.isFeverActive();
    let ratio = ctx.engine.fever / 100;
    if (isFever) {
      ratio = ctx.engine.feverTimeRemaining / MECHANICS.feverDurationSec;
    }
    ratio = Phaser.Math.Clamp(ratio, 0, 1);

    // PERF-FIX A/C: dirty-flag — chỉ clear()+redraw khi trạng thái nhìn thấy được đổi
    // (fillW quantize 0.5px, glow alpha quantize 0.1 step). Bản cũ tessellate lại mỗi frame.
    const fillW = Math.max(0, barW * ratio);
    const pulsing = isFever || ratio >= 1.0;
    const glowAlpha = pulsing ? 0.45 + 0.35 * Math.sin(this.elapsed * 10) : 0;
    const key = `${barX.toFixed(1)}|${barY}|${barW}|${Math.round(fillW * 2)}|${isFever ? 1 : 0}|${Math.round(glowAlpha * 10)}|${Math.round(ctx.engine.fever)}`;
    const layoutChanged = key !== this.lastFeverUiKey;
    this.lastFeverUiKey = key;

    if (layoutChanged) {
      const g = this.feverBarG;
      g.clear();

      // 1. Pill Track: rgba(255,255,255,0.12), fully rounded (14px)
      g.fillStyle(0xFFFFFF, 0.12);
      g.fillRoundedRect(barX, barY, barW, barH, 14);
      g.lineStyle(1.5, 0xFFFFFF, 0.22);
      g.strokeRoundedRect(barX, barY, barW, barH, 14);

      // 2. Horizontal gradient fill (#FF9F1C -> #E71D36) when > 0
      if (fillW > 0) {
        g.fillGradientStyle(0xFF9F1C, 0xE71D36, 0xFF9F1C, 0xE71D36, 1, 1, 1, 1);
        g.fillRoundedRect(barX, barY, Math.max(28, fillW), barH, 14);
      }

      // 3. Pulsing outer glow when full or fever mode
      if (pulsing) {
        g.lineStyle(3.5, 0xFF9F1C, glowAlpha);
        g.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 16);
      }
    }

    // 4. Flame icon: Image của texture bake sẵn (2 biến thể), chỉ đổi texture khi fever đổi
    const flameCX = barX + 16;
    const flameCY = barY + barH / 2;
    if (!this.feverFlameImg || !this.feverFlameImg.active) {
      this.feverFlameImg = this.add.image(flameCX, flameCY, FLOW_TEX.flame(isFever)).setDepth(z.hud + 1);
    } else {
      const wantTex = FLOW_TEX.flame(isFever);
      if (this.feverFlameImg.texture.key !== wantTex && this.textures.exists(wantTex)) this.feverFlameImg.setTexture(wantTex);
      this.feverFlameImg.setPosition(flameCX, flameCY);
    }

    // 5. Bold >= 12px readable label at small scale
    const labelX = barX + barW / 2 + 8;
    const labelY = barY + barH / 2;
    this.feverStatusLabel.setPosition(labelX, labelY);
    if (isFever) {
      if (this.feverStatusLabel.text !== 'FEVER 2X!') this.feverStatusLabel.setText('FEVER 2X!').setColor('#FFF275');
    } else {
      const txt = `FEVER ${Math.round(ctx.engine.fever)}%`;
      if (this.feverStatusLabel.text !== txt) this.feverStatusLabel.setText(txt).setColor('#FFFFFF');
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
    // PERF-FIX A: bóng mèo bake theo catSize — bake lại khi màn hình đổi kích thước
    const catSizeNow = this.getCatSize(g.width, g.height);
    this.bakeCatShadow(catSizeNow);
    if (this.catShadowImg && this.catShadowImg.active) this.catShadowImg.setTexture(FLOW_TEX.shadow);
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




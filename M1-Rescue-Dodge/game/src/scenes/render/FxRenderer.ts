// FxRenderer — T1f (card t_b574542f) — CONTRACT K0 §6: "hạt/fx dùng FxPool (reuse PERF3)".
// Tầng B: CHỈ render juice — dời nguyên khối spawn hạt + vệt gió/vạch làn khỏi Gameplay.ts.
// MỌI hạt đi qua FxPool/RingPool có sẵn của PERF3 (systems/FxPool.ts): pool cố định Image
// dot/ring, trạng thái trong struct, bước tiến bằng dt scene — KHÔNG new/destroy GameObject
// mỗi frame, KHÔNG tween per-particle (bệnh cũ FIX-ROUND-3-PERF §1.B). Tham số spawn giữ
// NGUYÊN từ code cũ (life/radius/alpha/ease/màu/cap 96-32-40-6) — mật độ + cảm giác hạt không đổi.
// Ranh giới CONTRACT §2: renderer KHÔNG đọc engine, không spawn/collision/HUD (T1c/d/e) —
// scene orchestrate (gọi this.fx.*), renderer gọi pool.
import Phaser from 'phaser';
import { FxPool, RingPool } from '../../systems/FxPool';
import { z } from '../../tokens';

export interface FxRendererOpts {
  dotTexture: string;    // fx_dot_white (bake sẵn ở GameplayScene)
  ringTexture: string;   // fx_ring
  dashTexture: string;   // fx_lane_dash (vạch làn TileSprite)
  streakTexture: string; // fx_streak (vệt gió — fever chỉ đổi tint như cũ)
  flowMetrics: { leftEdge: number; laneWidth: number }; // mốc build ban đầu (scene getStraightRoadMetrics)
}

export class FxRenderer {
  private scene: Phaser.Scene;
  private fxDots: FxPool;   // sparkles + bee-explosion (depth per-burst qua DotFx.depth)
  private fxDust: FxPool;   // running puff + lane-switch dust
  private fxTrail: FxPool;  // vệt mờ sau ong (depth actor-1)
  private fxRing: RingPool; // shockwave (depth actor+2)

  // Hạ tầng flow cuộn (PERF-FIX A): pre-alloc 1 lần, mỗi frame chỉ đổi vị trí/alpha —
  // KHÔNG tessellate, KHÔNG sinh-hủy (mirror buildFlowObjects + drawGroundFlow cũ).
  private laneDashTiles: Phaser.GameObjects.TileSprite[] = [];
  private streakImgs: Phaser.GameObjects.Image[] = [];
  private dashTexture: string;
  private streakTexture: string;

  constructor(scene: Phaser.Scene, opts: FxRendererOpts) {
    this.scene = scene;
    this.dashTexture = opts.dashTexture;
    this.streakTexture = opts.streakTexture;
    // Cap + depth giữ nguyên PERF3 (Gameplay.ts create cũ)
    this.fxDots = new FxPool(scene, opts.dotTexture, 96, z.hud);
    this.fxDust = new FxPool(scene, opts.dotTexture, 32, z.actor - 1);
    this.fxTrail = new FxPool(scene, opts.dotTexture, 40, z.actor - 1);
    this.fxRing = new RingPool(scene, opts.ringTexture, 6, z.actor + 2);
    this.lastMetrics = opts.flowMetrics;
    this.buildFlowObjects();
  }

  // ---------- Probe rò rỉ (đọc-only cho test/QA — gate J2 pool sau này dùng) ----------

  get dotsCap(): number { return this.fxDots.capacity; }
  get dustCap(): number { return this.fxDust.capacity; }
  get trailCap(): number { return this.fxTrail.capacity; }
  get ringCap(): number { return this.fxRing.capacity; }
  /** Số slot pool đang sống (mọi burst tắt phải về 0 — không rò GameObject). */
  get activeCount(): number {
    return this.fxDots.activeCount + this.fxDust.activeCount + this.fxTrail.activeCount + this.fxRing.activeCount;
  }

  // ---------- Spawn hạt (mirror 5 hàm cũ — tham số giữ nguyên từng số) ----------

  /** Bụi 2 chân khi nhảy chuyển làn (mirror spawnDust cũ). */
  spawnDust(x: number, y: number) {
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

  /** Vòng sao vàng khi near-miss/pickup/popup (mirror spawnSparkles cũ). */
  spawnSparkles(x: number, y: number, starColor = 0xFFD700) {
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

  /** Shockwave r12→75 quad.out 320ms (mirror spawnShockwave cũ). */
  spawnShockwave(x: number, y: number, shockColor = 0x00F0FF) {
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

  /** Nổ ong honey-gold + white 14 hạt (mirror spawnBeeExplosion cũ — ART-PASS §4.3). */
  spawnBeeExplosion(x: number, y: number) {
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

  /** Puff chân mèo khi chạy (mirror spawnRunningPuff cũ — scene bấm timer 0.26s). */
  spawnRunningPuff(x: number, y: number) {
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

  /** 1 dot trail sau ong (mirror khối bee-trail trong update cũ — scene giữ timer/điều kiện). */
  spawnBeeTrail(x: number, y: number) {
    this.fxTrail.spawn({
      x0: x, y0: y,
      x1: x, y1: y,
      life: 180, age: 0,
      r0: 14, r1: 4.2,
      a0: 0.22, a1: 0,
      color: 0xFFA502, ease: 1,
    });
  }

  // ---------- Bước tiến pool mỗi frame (gọi từ scene.update, pause-safe như cũ) ----------

  step(deltaMs: number) {
    this.fxDots.step(deltaMs);
    this.fxDust.step(deltaMs);
    this.fxTrail.step(deltaMs);
    this.fxRing.step(deltaMs);
  }

  // ---------- Flow cuộn: vạch làn + vệt gió (mirror buildFlowObjects + drawGroundFlow cũ) ----------

  private buildFlowObjects() {
    this.destroyFlowObjects();
    const { width, height } = this.scene.scale;

    // 2 TileSprite vạch làn cuộn modulo (kết luận thread §5.1: dirty-flag vô dụng vì offset đổi mọi frame)
    const totalCycle = 60;
    const { leftEdge, laneWidth } = this.metrics();
    for (const divIdx of [1, 2]) {
      const lineX = leftEdge + divIdx * laneWidth;
      const tile = this.scene.add.tileSprite(lineX, height / 2, 4, height + totalCycle * 2, this.dashTexture)
        .setDepth(z.bg + 1);
      this.laneDashTiles.push(tile);
    }

    // 12 vệt gió (8 thường / 12 fever — như streakCount cũ; ẩn bớt bằng visible)
    for (let i = 0; i < 12; i++) {
      const im = this.scene.add.image(0, 0, this.streakTexture).setDepth(z.bg + 1).setVisible(false);
      this.streakImgs.push(im);
    }
  }

  private destroyFlowObjects() {
    for (const t of this.laneDashTiles) t.destroy();
    for (const im of this.streakImgs) im.destroy();
    this.laneDashTiles = [];
    this.streakImgs = [];
  }

  /** Layout từ scene (single source getStraightRoadMetrics — renderer không tự đo). */
  private metrics(): { leftEdge: number; laneWidth: number } {
    if (!this.lastMetrics) {
      this.lastMetrics = { leftEdge: 0, laneWidth: this.scene.scale.width / 3 };
    }
    return this.lastMetrics;
  }
  private lastMetrics: { leftEdge: number; laneWidth: number } | null = null;

  /**
   * Cuộn vạch làn + vệt gió (mirror drawGroundFlow cũ — toán giữ nguyên từng hệ số:
   * 0.85 cycle, 0.0016 streak, alpha 0.38/0.16, offset sin 3.7).
   */
  updateFlow(speed: number, _dt: number, elapsed: number, isFever: boolean, metrics: { leftEdge: number; laneWidth: number }) {
    this.lastMetrics = metrics;
    if (this.laneDashTiles.length === 0) this.buildFlowObjects();

    const { height } = this.scene.scale;
    const { leftEdge, laneWidth } = metrics;

    // 1. Vạch làn: TileSprite cuộn xuống bằng tilePositionY modulo chu kỳ 60px
    // (giảm tilePositionY = nội dung dịch xuống; always-positive để WebGL wrap chuẩn)
    const totalCycle = 60;
    const flowOffset = (elapsed * speed * 0.85) % totalCycle;
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
      const cycleT = ((elapsed * (speed * 0.0016) + (i / streakCount)) % 1);
      const sy = cycleT * height;
      const laneIndex = i % 3;
      const laneCenterX = leftEdge + (laneIndex + 0.5) * laneWidth;
      const laneOffset = Math.sin(i * 3.7 + elapsed * 0.5) * (laneWidth * 0.3);
      const alpha = Math.sin(cycleT * Math.PI) * (isFever ? 0.38 : 0.16);
      im.setVisible(true).setTint(streakTint).setPosition(laneCenterX + laneOffset, sy + 14).setAlpha(alpha);
    }
  }

  /** Dọn game object khi scene shutdown (destroy theo chủ sở hữu — pools + flow objects). */
  destroy() {
    this.fxDots.destroy();
    this.fxDust.destroy();
    this.fxTrail.destroy();
    this.fxRing.destroy();
    this.destroyFlowObjects();
  }
}

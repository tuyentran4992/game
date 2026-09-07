/**
 * M7 Skip King — FoamFx (FUN2-C2, Tầng B): foam TRẮNG nổ tại mỗi điểm chạm nước
 * (bounce + splash) — THÊM LỚP đè lên ripple hiện có; đường gọi RippleFx GIỮ NGUYÊN
 * (test neo ripple wiring không được vỡ — foam thêm lớp chứ không thay).
 * FUN2-C3: splash crown — vòm cung foam TRẮNG tại điểm chìm, TÁI DỤNG pool foam
 * (không pool mới, không màu mới — kỷ luật palette ux-ui) + SprayFx (pool spray
 * theo impact — MỌI bounce bung, số hạt theo công thức SKIM; tiến tuổi qua hook
 * updateExtraFx — trước đây update không được gọi, hạt đứng hình đến khi pool recycled).
 * Pool tái dùng (không new/destroy mỗi frame — ROLE-RULES perf); alpha 0.25–0.5.
 * Renderer chỉ đọc metadata event đã có.
 */
import * as Phaser from 'phaser';
import { FX, SKIM } from './layout';
import { SKIM_ALPHA_MIN, SKIM_ALPHA_MAX } from './WakeTrail';

const FOAM_TEX = 'skim_foam';
const FOAM_PX = 80;
const TESTID_FOAM = 'skim-foam';
/** TEST-FIELDS FUN2-C3 — hạt spray soi qua testid này (QA cùng đường foam/wake). */
export const TESTID_SPRAY = 'skim-spray';

interface FoamItem {
  img: Phaser.GameObjects.Image;
  baseScale: number;
  t: number; // 0..1 tuổi thọ
  active: boolean;
}

export class FoamFx {
  private pool: FoamItem[] = [];

  constructor(scene: Phaser.Scene, private depth = 5) {
    // Fallback texture: vòng trắng dày (foam) — đậm hơn wake, đọc rõ trên nước.
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(FOAM_PX / 2, FOAM_PX / 2, FOAM_PX / 2 - 6);
    g.fillStyle(0x14506e, 1); // lỗ giữa màu nước — foam vành đai, không đục kín mặt
    g.fillCircle(FOAM_PX / 2, FOAM_PX / 2, FOAM_PX / 2 - 20);
    g.generateTexture(FOAM_TEX, FOAM_PX, FOAM_PX);
    g.destroy();
    for (let i = 0; i < FX.foamPool; i++) {
      const img = scene.add
        .image(-100, -100, FOAM_TEX)
        .setDepth(this.depth)
        .setVisible(false)
        .setActive(false)
        .setAlpha(0)
        .setData('testid', TESTID_FOAM); // pattern TEST-FIELDS — QA soi qua testid
      this.pool.push({ img, baseScale: 1, t: 1, active: false });
    }
  }

  /** Spawn 1 cụm foam tại điểm màn hình; impactScale = hệ số điểm chạm (0.7–1.3). */
  spawn(screenX: number, screenY: number, baseRadiusPx: number, impactScale: number, scaleZ: number): void {
    const item = this.pool.find((f) => !f.active) ?? this.pool[0];
    item.active = true;
    item.t = 0;
    item.baseScale =
      (baseRadiusPx * 2 / FOAM_PX) * Math.max(0.7, Math.min(1.3, impactScale)) *
      Math.max(0.4, Math.min(1, scaleZ));
    item.img.setPosition(screenX, screenY).setVisible(true).setActive(true).setAlpha(SKIM_ALPHA_MAX);
  }

  /**
   * FUN2-C3 — splash crown: vòm cung foam TRẮNG tại điểm chìm (run kết thúc).
   * crownPuffs cụm trải trên cung bán kính crownRadiusPx (cos/sin quanh điểm chìm,
   * nửa trên — mặt nước), puff nhỏ hơn foam chìm trung tâm (crownPuffScaleRatio).
   * TÁI DỤNG pool foam — không object mới, không màu mới; alpha trong dải 0.25–0.5.
   */
  spawnCrown(screenX: number, screenY: number, scaleZ: number): void {
    const s = Math.max(0.4, Math.min(1, scaleZ));
    for (let i = 0; i < SKIM.crownPuffs; i++) {
      const ang = Math.PI * (i / (SKIM.crownPuffs - 1)); // 0..PI — cung nửa trên
      const px = screenX + Math.cos(ang) * SKIM.crownRadiusPx * s;
      const py = screenY - Math.sin(ang) * SKIM.crownRadiusPx * 0.5 * s;
      this.spawn(px, py, SKIM.splashFoamRadiusPx * SKIM.crownPuffScaleRatio, 1, scaleZ);
    }
  }

  /** Tiến foam — gọi mỗi frame với delta render (ms). Trong hitstop delta=0 → giữ hình. */
  update(deltaMs: number): void {
    const step = deltaMs / SKIM.foamLifeMs;
    for (const f of this.pool) {
      if (!f.active) continue;
      f.t = Math.min(1, f.t + step);
      if (f.t >= 1) {
        f.active = false;
        f.img.setVisible(false).setActive(false).setAlpha(0);
        continue;
      }
      // Nở ra + mờ dần trong dải trắng mờ (0.25–0.5 — không lóe sáng gắt).
      f.img.setScale(f.baseScale * (1 + f.t * 0.6));
      f.img.setAlpha(SKIM_ALPHA_MAX - (SKIM_ALPHA_MAX - SKIM_ALPHA_MIN) * f.t);
    }
  }

  // ---- mirror test (wiring Fun2Skim — không lộ logic mới) ----
  poolSizeForTest(): number {
    return this.pool.length;
  }
  visibleCountForTest(): number {
    return this.pool.filter((f) => f.active).length;
  }
}

/** FUN2-C3 — hạt spray (di chuyển từ OnboardingPlayScene: cùng họ FX render Tầng B,
 * số hạt theo công thức SKIM thay gate cứng SPRAY_IMPACT_MIN — MỌI bounce bung). */
interface SprayParticle {
  img: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number; // 0..1
  active: boolean;
}

/** Tuổi thọ 1 hạt spray (ms) — [PLACEHOLDER] feel-tune tới boss playtest FUN2 vòng sau. */
const SPRAY_LIFE_MS = 500;
/** Gia tốc trọng trường hạt (px/s²) — juice render, không phải luật. */
const SPRAY_GRAVITY_PX_S2 = 420;

export class SprayFx {
  private pool: SprayParticle[] = [];

  constructor(scene: Phaser.Scene, size = FX.sprayPool) {
    for (let i = 0; i < size; i++) {
      const img = scene.add
        .circle(-100, -100, 3, 0xbfe4ff, 0.9)
        .setDepth(7)
        .setVisible(false)
        .setActive(false)
        .setData('testid', TESTID_SPRAY); // pattern TEST-FIELDS — QA soi qua testid
      this.pool.push({ img, vx: 0, vy: 0, life: 1, active: false });
    }
  }

  /** burst theo impact 0..1 — count = min + round(impact × (max−min)) (công thức SKIM khóa test). */
  burst(screenX: number, screenY: number, impact: number): void {
    const c = Math.max(0, Math.min(1, impact));
    const count = SKIM.sprayCountMin + Math.round(c * (SKIM.sprayCountMax - SKIM.sprayCountMin));
    let n = 0;
    for (const p of this.pool) {
      if (n >= count) break;
      if (p.active) continue;
      p.active = true;
      p.life = 1;
      const ang = Math.PI * (0.6 + Math.random() * 0.8); // vòm nước — juice, không phải luật
      const spd = 60 + c * 90;
      p.vx = Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1);
      p.vy = -Math.sin(ang) * spd;
      p.img.setPosition(screenX, screenY).setVisible(true).setActive(true).setAlpha(0.9);
      n++;
    }
  }

  /** Tiến tuổi hạt — gọi qua hook updateExtraFx mỗi frame (C3: trước đây bỏ gọi → hạt đứng hình). */
  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt * 1000 / SPRAY_LIFE_MS;
      if (p.life <= 0) {
        p.active = false;
        p.img.setVisible(false).setActive(false);
        continue;
      }
      p.vy += SPRAY_GRAVITY_PX_S2 * dt; // trọng lực rơi hạt — juice
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.setAlpha(0.9 * p.life);
    }
  }

  // ---- mirror test (wiring Fun2Juice — không lộ logic mới) ----
  poolSizeForTest(): number {
    return this.pool.length;
  }
  visibleCountForTest(): number {
    return this.pool.filter((p) => p.active).length;
  }
}

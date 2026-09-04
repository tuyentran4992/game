// FxPool — PERF-FIX B: pool GameObject cho particle + container ong.
// Chỉ `import type` để module chạy được trong môi trường node (vitest) — không DOM.
import type Phaser from 'phaser';
const BLEND_NORMAL = 0; // Phaser.BlendModes.NORMAL
const BLEND_ADD = 1;    // Phaser.BlendModes.ADD

// Bệnh cũ (FIX-ROUND-3-PERF.md §1.B): mỗi burst sparkles = 7 circle + 7 tween sinh-hủy,
// explosion = 14+14, puff/trail 1+1 liên tục, ong spawn container mới không pool
// → hàng trăm object/phút → GC spike, giật cục theo đợt (đúng triệu chứng boss).
// Cách làm:
//  - Particle KHÔNG sinh-hủy GameObject và KHÔNG tạo tween: pool cố định Image dot
//    (texture tròn đơn vị bake sẵn, tint được), trạng thái lưu trong array struct,
//    bước tiến bằng dt scene (không đọc tường) gọi từ step() trong update().
//    Pause → update đứng → particle đứng yên; resume không nhảy bước.
//  - Shockwave: pool Image texture vòng tròn bake sẵn (fx_ring) tint + scale động
//    (không còn strokeCircle+clear tessellate 60 lần/giây của addCounter cũ).
//  - Pool<T> generic cho container ong: acquire/release thay add.container/destroy;
//    tween flap/drift/anticipation tạo đúng 1 lần per-slot, restart khi mượn lại.
// Chỉ đụng render/allocation — không đổi gameplay, nhịp spawn, hitbox, số liệu.

export interface DotFx {
  x0: number; y0: number;   // điểm spawn
  x1: number; y1: number;   // đích (nội suy theo ev)
  life: number;             // ms vòng đời
  age: number;              // ms đã sống (step cộng dồn)
  r0: number; r1: number;   // bán kính từ -> tới (px; dot unit radius = 8px)
  a0: number; a1: number;   // alpha từ -> tới
  color: number;
  ease: number;             // 0=linear 1=quad.out 2=cubic.out (khớp ease tween cũ)
  add?: boolean;            // blend ADD (shockwave glow)
  depth?: number;           // override depth slot khi spawn (mỗi burst cùng depth)
}

const DOT_R = 8;  // texture fx_dot_white 16x16 → radius 8px ở scale 1
const RING_R = 40; // texture fx_ring 88x88 → bán kính vòng 40px ở scale 1

function easeVal(code: number, t: number): number {
  switch (code) {
    case 1: return 1 - (1 - t) * (1 - t);   // quad.out
    case 2: return 1 - Math.pow(1 - t, 3);  // cubic.out
    default: return t;
  }
}

export class FxPool {
  private readonly cap: number;
  private dots: Phaser.GameObjects.Image[] = [];
  private parts: (DotFx | null)[] = [];
  private cursor = 0;

  constructor(scene: Phaser.Scene, texKey: string, cap: number, depth: number) {
    this.cap = cap;
    for (let i = 0; i < cap; i++) {
      const d = scene.add.image(0, 0, texKey).setOrigin(0.5, 0.5);
      d.setDepth(depth).setVisible(false).setActive(false);
      this.dots.push(d);
      this.parts.push(null);
    }
  }

  spawn(p: DotFx) {
    let i = -1;
    for (let n = 0; n < this.cap; n++) {
      const c = (this.cursor + n) % this.cap;
      if (!this.parts[c]) { i = c; break; }
    }
    if (i < 0) i = this.cursor; // mọi slot đang sống: ghi đè slot cũ nhất, không sinh object
    const d = this.dots[i];
    this.parts[i] = p;
    this.cursor = (i + 1) % this.cap;
    d.setActive(true).setVisible(true).setTint(p.color)
      .setBlendMode(p.add ? BLEND_ADD : BLEND_NORMAL);
    if (p.depth !== undefined) d.setDepth(p.depth);
    this.apply(i, 0);
  }

  /** Gọi mỗi frame từ update() (dt ms — cùng nhịp game, pause-safe). */
  step(dtMs: number) {
    for (let i = 0; i < this.cap; i++) {
      const p = this.parts[i];
      if (!p) continue;
      p.age += dtMs;
      const t = p.age / p.life;
      if (t >= 1) {
        this.parts[i] = null;
        const d = this.dots[i];
        d.setVisible(false).setActive(false).clearTint();
        continue;
      }
      this.apply(i, t);
    }
  }

  private apply(i: number, t: number) {
    const p = this.parts[i] as DotFx;
    const d = this.dots[i];
    const ev = easeVal(p.ease, t);
    d.x = p.x0 + (p.x1 - p.x0) * ev;
    d.y = p.y0 + (p.y1 - p.y0) * ev;
    const r = p.r0 + (p.r1 - p.r0) * ev;
    d.setAlpha(p.a0 + (p.a1 - p.a0) * ev).setScale(Math.max(r, 0.01) / DOT_R);
  }

  destroy() {
    for (let i = 0; i < this.cap; i++) {
      this.parts[i] = null;
      const d = this.dots[i];
      if (d) d.destroy();
    }
    this.dots = [];
  }
}

/** Vòng shockwave: pool Image fx_ring tint + scale/alpha theo DotFx (ease 1 = quad.out như cũ). */
export class RingPool {
  private readonly cap: number;
  private rings: Phaser.GameObjects.Image[] = [];
  private parts: (DotFx | null)[] = [];
  private cursor = 0;

  constructor(scene: Phaser.Scene, texKey: string, cap: number, depth: number) {
    this.cap = cap;
    for (let i = 0; i < cap; i++) {
      const r = scene.add.image(0, 0, texKey).setOrigin(0.5, 0.5);
      r.setDepth(depth).setVisible(false).setActive(false);
      this.rings.push(r);
      this.parts.push(null);
    }
  }

  spawn(p: DotFx) {
    let i = -1;
    for (let n = 0; n < this.cap; n++) {
      const c = (this.cursor + n) % this.cap;
      if (!this.parts[c]) { i = c; break; }
    }
    if (i < 0) i = this.cursor;
    this.parts[i] = p;
    this.cursor = (i + 1) % this.cap;
    const r = this.rings[i];
    r.setActive(true).setVisible(true).setTint(p.color).setBlendMode(BLEND_ADD);
    this.apply(i, 0);
  }

  step(dtMs: number) {
    for (let i = 0; i < this.cap; i++) {
      const p = this.parts[i];
      if (!p) continue;
      p.age += dtMs;
      const t = p.age / p.life;
      if (t >= 1) {
        this.parts[i] = null;
        this.rings[i].setVisible(false).setActive(false).clearTint();
        continue;
      }
      this.apply(i, t);
    }
  }

  private apply(i: number, t: number) {
    const p = this.parts[i] as DotFx;
    const r = this.rings[i];
    const ev = easeVal(p.ease, t);
    const rad = p.r0 + (p.r1 - p.r0) * ev;
    r.x = p.x0;
    r.y = p.y0;
    r.setAlpha(p.a0 + (p.a1 - p.a0) * ev).setScale(Math.max(rad, 0.5) / RING_R);
  }

  destroy() {
    for (let i = 0; i < this.cap; i++) {
      this.parts[i] = null;
      this.rings[i].destroy();
    }
    this.rings = [];
  }
}

/** Pool object tái sinh generic. Caller tự reset trạng thái object khi acquire. */
export class Pool<T> {
  private free: T[] = [];
  constructor(private readonly create: () => T) {}
  acquire(): T {
    return this.free.pop() ?? this.create();
  }
  release(obj: T) {
    this.free.push(obj);
  }
  get idleCount(): number { return this.free.length; }
  drain(destroy: (obj: T) => void) {
    for (const o of this.free) destroy(o);
    this.free = [];
  }
}

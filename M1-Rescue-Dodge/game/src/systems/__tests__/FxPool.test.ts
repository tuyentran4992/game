// UT FxPool (PERF-FIX B) — fake scene, khong can canvas.
// Bat cot loi: burst N lan KHONG sinh them GameObject sau init pool.
import { describe, it, expect } from 'vitest';
import { FxPool, RingPool, Pool, type DotFx } from '../FxPool';

type Chain = Record<string, () => Chain>;

function fakeObj(): Chain {
  const o: Record<string, unknown> = {};
  for (const m of ['setOrigin', 'setDepth', 'setVisible', 'setActive', 'setTint', 'clearTint', 'setBlendMode', 'setAlpha', 'setScale', 'destroy']) {
    o[m] = () => o;
  }
  o.x = 0;
  o.y = 0;
  return o as Chain;
}

function fakeScene() {
  const created: Chain[] = [];
  return {
    created,
    add: { image: () => { const o = fakeObj(); created.push(o); return o; } },
  };
}

function dot(over: Partial<DotFx> = {}): DotFx {
  return { x0: 10, y0: 20, x1: 30, y1: 40, life: 100, age: 0, r0: 8, r1: 2, a0: 1, a1: 0, color: 0xff0000, ease: 0, ...over };
}

describe('FxPool', () => {
  it('cap dinh — burst 1000 lan van chi co dung cap Image duoc tao', () => {
    const scene = fakeScene();
    const pool = new FxPool(scene as never, 'fx_dot_white', 8, 5);
    expect(scene.created.length).toBe(8);
    for (let i = 0; i < 1000; i++) {
      pool.spawn(dot());
      pool.step(16);
    }
    // Khong sinh them object nao — day la muc tieu chong GC spike cua FIX B
    expect(scene.created.length).toBe(8);
    pool.destroy();
  });

  it('partical chet duoc thu hoi va tai su dung (parts = null)', () => {
    const scene = fakeScene();
    const pool = new FxPool(scene as never, 'fx_dot_white', 2, 5);
    pool.spawn(dot({ life: 50 }));
    pool.spawn(dot({ life: 50 }));
    pool.step(60); // ca hai chet
    const before = scene.created.length;
    pool.spawn(dot({ life: 50 })); // tai dung slot, khong sinh moi
    expect(scene.created.length).toBe(before);
    pool.destroy();
  });

  it('full pool: spawn moi ghi de slot cu nhat, khong sinh object', () => {
    const scene = fakeScene();
    const pool = new FxPool(scene as never, 'fx_dot_white', 3, 5);
    for (let i = 0; i < 10; i++) pool.spawn(dot({ life: 1000 }));
    expect(scene.created.length).toBe(3);
    pool.destroy();
  });

  it('depth override cua burst duoc ap khi spawn', () => {
    const scene = fakeScene();
    const pool = new FxPool(scene as never, 'fx_dot_white', 2, 5);
    const seen: number[] = [];
    (scene.created[0] as unknown as { setDepth: (d: number) => Chain }).setDepth = (d: number) => { seen.push(d); return scene.created[0]; };
    pool.spawn(dot({ depth: 99 }));
    expect(seen).toContain(99);
    pool.destroy();
  });
});

describe('RingPool', () => {
  it('cap dinh — 100 ring burst chi co cap Image', () => {
    const scene = fakeScene();
    const pool = new RingPool(scene as never, 'fx_ring', 4, 7);
    expect(scene.created.length).toBe(4);
    for (let i = 0; i < 100; i++) { pool.spawn(dot()); pool.step(16); }
    expect(scene.created.length).toBe(4);
    pool.destroy();
  });
});

describe('Pool (ong slots)', () => {
  it('release roi acquire lai tra dung object — khong goi factory nua', () => {
    let made = 0;
    const pool = new Pool<object>(() => { made++; return { id: made }; });
    const a = pool.acquire();
    expect(made).toBe(1);
    pool.release(a);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(made).toBe(1);
    expect(pool.idleCount).toBe(0);
  });

  it('drain destroy het slot ranh', () => {
    let destroyed = 0;
    const pool = new Pool<{ id: number }>(() => ({ id: 1 }));
    pool.release({ id: 1 });
    pool.release({ id: 2 });
    pool.drain(() => destroyed++);
    expect(destroyed).toBe(2);
    expect(pool.idleCount).toBe(0);
  });
});

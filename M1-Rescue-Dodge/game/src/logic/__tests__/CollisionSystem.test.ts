// CollisionSystem — Tầng A pure-TS test (TDD-A red-first).
// Hệ quy chiếu cố định: màn 720px, 3 làn — khớp getStraightRoadMetrics của scene
// (road = 72% width => leftEdge 100.8, laneWidth 172.8).
// Mọi threshold khớp NGUYÊN giá trị hằng số cũ trong Gameplay.ts (DEFAULT_TUNING).

import { describe, it, expect } from 'vitest';
import { CollisionSystem, roadMetrics, DEFAULT_TUNING } from '../CollisionSystem';
import { MECHANICS } from '../mechanics';
import type { CollisionEntity, CatBox } from '../CollisionSystem';

const W = 720;
const rm = roadMetrics(W, MECHANICS.laneCount);
const LANE_X = [
  rm.leftEdge + rm.laneWidth / 2,
  rm.leftEdge + rm.laneWidth * 1.5,
  rm.leftEdge + rm.laneWidth * 2.5,
];

const cat = (over: Partial<CatBox> = {}): CatBox => ({
  x: LANE_X[1], y: 800, w: 100, h: 100, lane: 1, ...over,
});
const bee = (over: Partial<CollisionEntity> = {}): CollisionEntity => ({
  id: 1, type: 'normal', lane: 1, x: LANE_X[1], y: 700, ...over,
});

describe('CollisionSystem — geometry đường (roadMetrics)', () => {
  it('màn 720px, 3 làn: leftEdge 100.8, laneWidth 172.8', () => {
    expect(rm.leftEdge).toBeCloseTo(100.8, 6);
    expect(rm.laneWidth).toBeCloseTo(172.8, 6);
  });
});

describe('CollisionSystem — near-miss (chuyển làn né sát sạt)', () => {
  const sys = new CollisionSystem(MECHANICS);

  it('ong ở làn cũ, cách 60px phía trên mèo -> có near-miss', () => {
    // |dy| = 60 < 70 (cửa sổ) và y = 740 < catY + 30 = 830
    expect(sys.checkNearMiss([bee({ lane: 1, y: 740 })], cat(), 1)).toBe(true);
  });

  it('cách 80px -> ngoài cửa sổ near-miss', () => {
    expect(sys.checkNearMiss([bee({ lane: 1, y: 720 })], cat(), 1)).toBe(false);
  });

  it('ong đã rơi xuống dưới mèo hơn 30px -> không tính near-miss', () => {
    expect(sys.checkNearMiss([bee({ lane: 1, y: 831 })], cat(), 1)).toBe(false);
  });

  it('biên dưới: y = catY + 29 -> vẫn là near-miss', () => {
    expect(sys.checkNearMiss([bee({ lane: 1, y: 829 })], cat(), 1)).toBe(true);
  });

  it('ong ở làn khác làn cũ -> không near-miss', () => {
    expect(sys.checkNearMiss([bee({ lane: 0, x: LANE_X[0], y: 740 })], cat(), 1)).toBe(false);
  });

  it('ong đã dodged -> không near-miss', () => {
    expect(sys.checkNearMiss([bee({ lane: 1, y: 740, dodged: true })], cat(), 1)).toBe(false);
  });

  it('ong béo chiếm làn cũ qua secondaryLane -> có near-miss', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 740 });
    expect(sys.checkNearMiss([fat], cat(), 1)).toBe(true);
  });
});

describe('CollisionSystem — ăn vật phẩm (pickup 52px)', () => {
  const sys = new CollisionSystem(MECHANICS);

  it('item lệch 51px trên cả 2 trục -> ăn', () => {
    expect(sys.checkItemPickup({ x: cat().x + 51, y: cat().y + 51 }, cat())).toBe(true);
  });

  it('đúng 52px -> không ăn (strict <)', () => {
    expect(sys.checkItemPickup({ x: cat().x + 52, y: cat().y }, cat())).toBe(false);
    expect(sys.checkItemPickup({ x: cat().x, y: cat().y + 52 }, cat())).toBe(false);
  });

  it('dx 53px -> không ăn', () => {
    expect(sys.checkItemPickup({ x: cat().x + 53, y: cat().y + 10 }, cat())).toBe(false);
  });

  it('dy 53px -> không ăn', () => {
    expect(sys.checkItemPickup({ x: cat().x + 10, y: cat().y + 53 }, cat())).toBe(false);
  });
});

describe('CollisionSystem — va chạm ong thường', () => {
  const sys = new CollisionSystem(MECHANICS);

  it('cùng làn, |dy| 51 (< 0.52*h) -> game_over khi không shield/fever', () => {
    const target = bee({ lane: 1, y: 849 }); // catY 800 -> |dy| 51 < 52
    expect(sys.resolveBeeHit(target, cat(), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
  });

  it('|dy| đúng 52 -> pass (strict <)', () => {
    const target = bee({ lane: 1, y: 852 });
    expect(sys.resolveBeeHit(target, cat(), { feverActive: false, shieldActive: false }, W)).toBe('pass');
  });

  it('|dx| 45 -> pass; 44.9 -> game_over (0.45*w)', () => {
    const edge = bee({ lane: 1, x: cat().x + 45, y: 849 });
    expect(sys.resolveBeeHit(edge, cat(), { feverActive: false, shieldActive: false }, W)).toBe('pass');
    const justInside = bee({ lane: 1, x: cat().x + 44.9, y: 849 });
    expect(sys.resolveBeeHit(justInside, cat(), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
  });

  it('ong làn khác -> pass', () => {
    const other = bee({ lane: 2, x: LANE_X[2], y: 849 });
    expect(sys.resolveBeeHit(other, cat(), { feverActive: false, shieldActive: false }, W)).toBe('pass');
  });

  it('fever đang bật -> fever_kill (ong bị phá, không chết)', () => {
    const target = bee({ lane: 1, y: 849 });
    expect(sys.resolveBeeHit(target, cat(), { feverActive: true, shieldActive: false }, W)).toBe('fever_kill');
  });

  it('có shield -> shield_consume (shield đỡ 1 phát)', () => {
    const target = bee({ lane: 1, y: 849 });
    expect(sys.resolveBeeHit(target, cat(), { feverActive: false, shieldActive: true }, W)).toBe('shield_consume');
  });

  it('ong swarm chạm mèo -> xử lý như ong thường (game_over)', () => {
    const swarmBee = bee({ id: 9, y: 849, isSwarm: true });
    expect(sys.resolveBeeHit(swarmBee, cat(), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
  });
});

describe('CollisionSystem — ong béo (fat, chắn 2 làn)', () => {
  const sys = new CollisionSystem(MECHANICS);

  it('fat 0+1 (an toàn làn 2), mèo làn giữa -> game_over', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 849 });
    expect(sys.resolveBeeHit(fat, cat({ lane: 1 }), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
  });

  it('fat 0+1, mèo làn phải (an toàn) -> pass', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 849 });
    expect(sys.resolveBeeHit(fat, cat({ lane: 2, x: LANE_X[2] }), { feverActive: false, shieldActive: false }, W)).toBe('pass');
  });

  it('fat 1+2 (an toàn làn 0), mèo làn giữa -> game_over; mèo làn trái -> pass', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 1, secondaryLane: 2, x: (LANE_X[1] + LANE_X[2]) / 2, y: 849 });
    expect(sys.resolveBeeHit(fat, cat({ lane: 1 }), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
    expect(sys.resolveBeeHit(fat, cat({ lane: 0, x: LANE_X[0] }), { feverActive: false, shieldActive: false }, W)).toBe('pass');
  });

  it('inset 0.18*w: mèo đúng mép 428.4 -> pass; lệch 0.1px vào trong -> game_over', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 849 });
    // rightBoundary = 100.8 + 2*172.8 = 446.4; ranh giới = 446.4 - 18 = 428.4
    expect(sys.resolveBeeHit(fat, cat({ x: 428.4 }), { feverActive: false, shieldActive: false }, W)).toBe('pass');
    expect(sys.resolveBeeHit(fat, cat({ x: 428.3 }), { feverActive: false, shieldActive: false }, W)).toBe('game_over');
  });

  it('fat ngoài cửa sổ Y -> pass dù đứng trong vùng nguy hiểm', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 853 });
    expect(sys.resolveBeeHit(fat, cat({ lane: 1 }), { feverActive: false, shieldActive: false }, W)).toBe('pass');
  });

  it('getFatSafeLane: 0+1 -> 2; 1+2 -> 0; cấu hình lạ -> 0 (như scene cũ)', () => {
    expect(sys.getFatSafeLane({ id: 1, type: 'fat', lane: 0, secondaryLane: 1, x: 0, y: 0 })).toBe(2);
    expect(sys.getFatSafeLane({ id: 2, type: 'fat', lane: 1, secondaryLane: 2, x: 0, y: 0 })).toBe(0);
    expect(sys.getFatSafeLane({ id: 3, type: 'fat', lane: 2, secondaryLane: 1, x: 0, y: 0 })).toBe(0);
  });
});

describe('CollisionSystem — dodge (né thành công)', () => {
  const sys = new CollisionSystem(MECHANICS);

  it('ong y = catY + 40.1 (> 0.4*h) -> đủ điều kiện dodge; đúng 40 -> chưa', () => {
    expect(sys.hasPassedCat(bee({ y: 840.1 }), cat())).toBe(true);
    expect(sys.hasPassedCat(bee({ y: 840 }), cat())).toBe(false);
  });

  it('canRegisterDodge: ong cùng làn mèo -> false; khác làn -> true', () => {
    expect(sys.canRegisterDodge(bee({ lane: 1, y: 840.1 }), cat({ lane: 1 }))).toBe(false);
    expect(sys.canRegisterDodge(bee({ lane: 0, x: LANE_X[0], y: 840.1 }), cat({ lane: 1 }))).toBe(true);
  });

  it('fat: mèo ở làn an toàn -> dodge được; ở vùng nguy hiểm -> không', () => {
    const fat = bee({ id: 2, type: 'fat', lane: 0, secondaryLane: 1, x: (LANE_X[0] + LANE_X[1]) / 2, y: 840.1 });
    expect(sys.canRegisterDodge(fat, cat({ lane: 2, x: LANE_X[2] }))).toBe(true);
    expect(sys.canRegisterDodge(fat, cat({ lane: 1 }))).toBe(false);
  });
});

describe('CollisionSystem — tuning injectable', () => {
  it('DEFAULT_TUNING giữ nguyên giá trị scene cũ (không đổi cảm giác)', () => {
    expect(DEFAULT_TUNING).toEqual({
      nearMissWindowY: 70,
      nearMissAheadY: 30,
      pickupWindow: 52,
      hitYFactor: 0.52,
      hitXFactor: 0.45,
      fatInsetFactor: 0.18,
      dodgeYFactor: 0.4,
      roadWidthFactor: 0.72,
    });
  });

  it('override threshold qua param không đụng default (điều chỉnh cảm giác sau playtest)', () => {
    const loose = new CollisionSystem(MECHANICS, { nearMissWindowY: 100 });
    expect(loose.checkNearMiss([bee({ lane: 1, y: 740 })], cat(), 1)).toBe(true);
    expect(loose.checkNearMiss([bee({ lane: 1, y: 710 })], cat(), 1)).toBe(true); // |dy| 90: lọt cửa sổ 100
    const stock = new CollisionSystem(MECHANICS);
    expect(stock.checkNearMiss([bee({ lane: 1, y: 710 })], cat(), 1)).toBe(false); // ngoài 70 mặc định
  });
});

/**
 * Nhom E - kinh te "Muc" (PC-11 thuong luc cut / PC-12 spa + album + huy hieu).
 * Batch B1c, nua dau. TDD: src/logic/economy.ts CHUA ton tai => ca file RED.
 *
 * Quy uoc cu ban:
 *  - Moi gia tri ky vong la CONSTANT viet tay tu bang fixture duoi day
 *    (khong tinh ky vong bang chinh ham dang test).
 *  - Bang kinh te (muc ink, gia skin, cap album/badge) dinh nghia TRONG test;
 *    ham economy nhan bang QUA THAM SO, khong doc hang so ngam.
 */
import { describe, expect, it } from 'vitest';

import * as economy from '../../src/logic/economy';
import type {
  AlbumItem,
  Badge,
  InkTable,
  Inventory,
  SkinPrice,
} from '../../src/logic/economy';

const { inkAward, buySkin, addAlbumItems, awardBadge } = economy;

// ---------------------------------------------------------------- fixtures ---

const SKIN_CLASSIC = 'skin_classic';
const SKIN_ORIGAMI = 'skin_origami';
const SKIN_UNKNOWN = 'skin_gold_hummer';
const CREASE_MASTER = 'crease_master';

/** Sao 0..3 -> ink goc; streak moc 3/5/8 -> them bonus cua MOC CAO NHAT da cham. */
const INK_TABLE: InkTable = {
  baseByStars: [1, 2, 3, 5],
  streakBonus: [
    { at: 3, bonus: 2 },
    { at: 5, bonus: 4 },
    { at: 8, bonus: 8 },
  ],
};

/** Bang tra tay viet: [sao, streak, ink ky vong] = base + bonus moc lon nhat da cham. */
const INK_ROWS: ReadonlyArray<readonly [stars: number, streak: number, want: number]> = [
  [0, 0, 1],
  [0, 1, 1],
  [0, 2, 1],
  [0, 3, 3],
  [0, 4, 3],
  [0, 5, 5],
  [0, 6, 5],
  [0, 7, 5],
  [0, 8, 9],
  [0, 9, 9],
  [0, 40, 9],
  [1, 0, 2],
  [1, 2, 2],
  [1, 3, 4],
  [1, 4, 4],
  [1, 5, 6],
  [1, 7, 6],
  [1, 8, 10],
  [2, 0, 3],
  [2, 2, 3],
  [2, 3, 5],
  [2, 5, 7],
  [2, 7, 7],
  [2, 8, 11],
  [2, 99, 11],
  [3, 0, 5],
  [3, 1, 5],
  [3, 2, 5],
  [3, 3, 7],
  [3, 4, 7],
  [3, 5, 9],
  [3, 7, 9],
  [3, 8, 13],
  [3, 12, 13],
];

/** Bang KHAC de chung ham xai bang truyen vao chu khong xai hang so ngam. */
const ALT_TABLE: InkTable = {
  baseByStars: [2, 4, 6, 8],
  streakBonus: [
    { at: 2, bonus: 1 },
    { at: 6, bonus: 5 },
  ],
};

const SKIN_PRICES: readonly SkinPrice[] = [
  { id: SKIN_CLASSIC, ink: 0 },
  { id: SKIN_ORIGAMI, ink: 40 },
  { id: 'skin_foil', ink: 120 },
];

const ALBUM_CAP = 14;
const BADGE_CAP = 6;

/** 20 mau nop len, 15 id phan biet; thu xuat hien dau tien la a1..a15. */
const ALBUM_DUP_IDS: readonly string[] = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10',
  'a1', 'a2', 'a3', 'a4', 'a5', 'a11', 'a12', 'a13', 'a14', 'a15',
];

/** 14 id dau tien trong ALBUM_DUP_IDS sau khi dedupe + cat theo cap. */
const ALBUM_KEPT_IDS: readonly string[] = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10',
  'a11', 'a12', 'a13', 'a14',
];

function inv(ink: number, owned: string[], equipped: string): Inventory {
  return { ink, owned, equipped };
}

function albumItem(id: string, title: string): AlbumItem {
  return { id, title };
}

function badge(id: string, level: number): Badge {
  return { id, level };
}

function seq(n: number, prefix: string): string[] {
  return Array.from({ length: n }, (_unused, i) => `${prefix}${i + 1}`);
}

// --------------------------------------------------------------------- ink ---

describe('E1 inkAward - PC-11 (TC-INC-01)', () => {
  it('khop TUNG dong bang tra fixture: 4 so x 4 nhip streak', () => {
    expect(INK_ROWS.length).toBe(34);
    for (const [stars, streak, want] of INK_ROWS) {
      expect(inkAward(stars, streak, INK_TABLE), `sao=${stars} streak=${streak}`).toBe(want);
    }
  });

  it('moc cao nhat thang chu khong cong don; duoi moc 3 khong co bonus', () => {
    expect(inkAward(3, 8, INK_TABLE)).toBe(13);
    expect(inkAward(3, 7, INK_TABLE)).toBe(9);
    expect(inkAward(2, 99, INK_TABLE)).toBe(11);
    expect(inkAward(0, 0, INK_TABLE)).toBe(1);
    expect(inkAward(1, 2, INK_TABLE)).toBe(2);
    expect(inkAward(3, 2, INK_TABLE)).toBe(5);
  });

  // SỬA 1 DÒNG (báo cáo B1c): cung (1,5) voi ALT_TABLE = goc 4 + moc cao nhat da cham (at=2,
  // bonus=1) = 5. Ky vong 4 mau thuan bat voi 34 dong INK_ROWS + 2 dong ALT.con (cung mot
  // ham buoc, doc theo mo ta "MOC CAO NHAT da cham" o header file).
  it('nhan bang qua tham so: ALT_TABLE (3,8)=13, (0,2)=3, (1,5)=5', () => {
    expect(inkAward(3, 8, ALT_TABLE)).toBe(13);
    expect(inkAward(0, 2, ALT_TABLE)).toBe(3);
    expect(inkAward(1, 5, ALT_TABLE)).toBe(5);
  });
});

// -------------------------------------------------------------------- skin ---

describe('E2 mua skin chi tra bang Muc - PC-12 (TC-INC-02/03/04)', () => {
  it('du Muc: tru dung gia 100-40=60, them owned, equip lun skin vua mua', () => {
    const r = buySkin(inv(100, [SKIN_CLASSIC], SKIN_CLASSIC), SKIN_ORIGAMI, SKIN_PRICES);
    expect(r.ok).toBe(true);
    expect(r.state.ink).toBe(60);
    expect(r.state.owned).toEqual([SKIN_CLASSIC, SKIN_ORIGAMI]);
    expect(r.state.equipped).toBe(SKIN_ORIGAMI);
  });

  it('thieu dung 1 Muc (39/40): tu choi insufficient_ink, gi nguyen ink/owned/equipped', () => {
    const r = buySkin(inv(39, [SKIN_CLASSIC], SKIN_CLASSIC), SKIN_ORIGAMI, SKIN_PRICES);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient_ink');
    expect(r.state.ink).toBe(39);
    expect(r.state.owned).toEqual([SKIN_CLASSIC]);
    expect(r.state.equipped).toBe(SKIN_CLASSIC);
  });

  it('boundary ink bang dung gia 40/40: mua duoc va ink con 0', () => {
    const r = buySkin(inv(40, [SKIN_CLASSIC], SKIN_CLASSIC), SKIN_ORIGAMI, SKIN_PRICES);
    expect(r.ok).toBe(true);
    expect(r.state.ink).toBe(0);
    expect(r.state.owned).toEqual([SKIN_CLASSIC, SKIN_ORIGAMI]);
  });

  it('TC-INC-04: mua lai skin da owned -> already_owned, state gi nguyen (idempotent)', () => {
    const first = buySkin(inv(200, [SKIN_CLASSIC], SKIN_CLASSIC), SKIN_ORIGAMI, SKIN_PRICES);
    expect(first.ok).toBe(true);
    const second = buySkin(first.state, SKIN_ORIGAMI, SKIN_PRICES);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('already_owned');
    expect(second.state.ink).toBe(160);
    expect(second.state.owned).toEqual([SKIN_CLASSIC, SKIN_ORIGAMI]);
    expect(second.state.equipped).toBe(SKIN_ORIGAMI);
  });

  it('skin id khong co trong bang gia -> unknown_skin, khong tru ink', () => {
    const r = buySkin(inv(9999, [SKIN_CLASSIC], SKIN_CLASSIC), SKIN_UNKNOWN, SKIN_PRICES);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unknown_skin');
    expect(r.state.ink).toBe(9999);
    expect(r.state.owned).toEqual([SKIN_CLASSIC]);
  });

  it('ham thuan: mua khong bien doi Inventory dau vao', () => {
    const src = inv(100, [SKIN_CLASSIC], SKIN_CLASSIC);
    buySkin(src, SKIN_ORIGAMI, SKIN_PRICES);
    expect(src.ink).toBe(100);
    expect(src.owned).toEqual([SKIN_CLASSIC]);
    expect(src.equipped).toBe(SKIN_CLASSIC);
  });
});

// ------------------------------------------------------------------- album ---

describe('E3 album - PC-12 (TC-INC-05)', () => {
  it('nop 20 mau co trung id -> con 14 (cap), id doc nhat, giu thu tu xuat hien dau', () => {
    const incoming = ALBUM_DUP_IDS.map((id, i) => albumItem(id, `mau-${i}`));
    const out = addAlbumItems([], incoming, ALBUM_CAP);
    expect(out.length).toBe(14);
    expect(out.map((a) => a.id)).toEqual([...ALBUM_KEPT_IDS]);
    expect(new Set(out.map((a) => a.id)).size).toBe(14);
  });

  it('dedupe theo id: lan trung giu mau DA co, khong bi lan sau ghi de', () => {
    const out = addAlbumItems([], [albumItem('a1', 'dau-tien'), albumItem('a1', 'lan-two')], 14);
    expect(out.length).toBe(1);
    expect(out[0]?.title).toBe('dau-tien');
  });

  it('album da day 14 + 1 id moi -> van 14 mau, 14 mau cu khong bi mat', () => {
    const full = seq(ALBUM_CAP, 'x').map((id) => albumItem(id, `t-${id}`));
    const out = addAlbumItems(full, [albumItem('new', 'moi')], ALBUM_CAP);
    expect(out.length).toBe(14);
    expect(out.map((a) => a.id)).toEqual(full.map((a) => a.id));
  });

  it('cap la THAM SO: cap=3 voi 5 id doc nhat -> dung 3 dau, khong hardcode 14', () => {
    const incoming = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => albumItem(id, id));
    expect(addAlbumItems([], incoming, 3).map((a) => a.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

// ------------------------------------------------------------------- badge ---

type BadgeList = ReturnType<typeof awardBadge>['badges'];

function give(list: BadgeList, b: Badge): BadgeList {
  const r = awardBadge(list, b, BADGE_CAP);
  if (!r.ok) {
    throw new Error(`award ${b.id} phai ok, reason=${String(r.reason)}`);
  }
  return r.badges;
}

describe('E4 huy hieu - PC-12 (TC-INC-06)', () => {
  it('nop 8 huy hieu khac id -> giu dung 6; 6 lan dau ok, 2 lan cuoi bi chan', () => {
    let list: BadgeList = [];
    const oks: boolean[] = [];
    for (let i = 1; i <= 8; i += 1) {
      const r = awardBadge(list, badge(`b${i}`, 1), BADGE_CAP);
      list = r.badges;
      oks.push(r.ok);
    }
    expect(oks).toEqual([true, true, true, true, true, true, false, false]);
    expect(list.length).toBe(6);
    expect(list.map((b) => b.id)).toEqual(seq(6, 'b'));
  });

  it('cap trung lan 2 (cung id + cung level) -> duplicate_badge, danh sach khong doi', () => {
    const owned = give([], badge(CREASE_MASTER, 1));
    const r = awardBadge(owned, badge(CREASE_MASTER, 1), BADGE_CAP);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('duplicate_badge');
    expect(r.badges).toEqual([badge(CREASE_MASTER, 1)]);
  });

  it('bi chan o cap khong lam mat danh sach cu: reason cap_reached, van 6 cai', () => {
    let list: BadgeList = [];
    for (let i = 1; i <= 6; i += 1) {
      list = give(list, badge(`b${i}`, 1));
    }
    const r = awardBadge(list, badge('b7', 1), BADGE_CAP);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cap_reached');
    expect(r.badges.length).toBe(6);
    expect(r.badges.map((b) => b.id)).toEqual(seq(6, 'b'));
  });
});

// ----------------------------------------------------------------- surface ---

describe('E5 API surface - PC-12 (TC-INC-03)', () => {
  const REQUIRED = ['inkAward', 'buySkin', 'addAlbumItems', 'awardBadge'];
  const FORBIDDEN_RE = /money|purchaseiap|price_usd|payment/i;

  it('khong ten ham hay khoa doi tuong nao noi ve tien that trong export', () => {
    const mod = economy as unknown as Record<string, unknown>;
    const names = Object.keys(mod);
    expect(names.length).toBeGreaterThanOrEqual(REQUIRED.length);
    for (const name of names) {
      expect(name, `export ${name}`).not.toMatch(FORBIDDEN_RE);
      const value = mod[name];
      if (value !== null && typeof value === 'object') {
        for (const key of Object.keys(value)) {
          expect(key, `member ${name}.${key}`).not.toMatch(FORBIDDEN_RE);
        }
      }
    }
  });

  it('export du bon ham kinh te va chung la function', () => {
    const mod = economy as unknown as Record<string, unknown>;
    const names = Object.keys(mod);
    for (const name of REQUIRED) {
      expect(names).toContain(name);
      expect(typeof mod[name]).toBe('function');
    }
  });
});

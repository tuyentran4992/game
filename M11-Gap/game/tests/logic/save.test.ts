/**
 * Nhom H - save + ho so save (PC-16), phu ERR-01/02/09/10.
 * Batch B1c, nua dau. TDD: src/logic/save.ts CHUA ton tai => ca file RED.
 *
 * Quy uoc cu ban:
 *  - Ky vong luyen ra tu FIXTURE JSON viet tay (JSON.stringify cua raw object),
 *    khong lay chinh save.ts lam oracle cho save.ts.
 *  - KV la vat kieu localStorage, truyen theo kiieu cau truc.
 *  - Thu tu cuu ho (pack §4): main -> good backup -> fresh (gi skin tu wardrobe).
 */
import { describe, expect, it } from 'vitest';

import {
  MIGRATIONS,
  SAVE_KEYS,
  applyWrite,
  defaultSave,
  loadSave,
  migrateSave,
  parseSave,
  serializeSave,
  writeSave,
} from '../../src/logic/save';
import type { Save } from '../../src/logic/save';

// ---------------------------------------------------------------- fixtures ---

type KV = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const SKIN_CLASSIC = 'skin_classic';
const SKIN_FOIL = 'skin_foil';
const SKIN_NEON = 'skin_neon';

const ZERO_STARS = '0'.repeat(120);
const MIXED_STARS = '3210'.repeat(30);

/** Save lanh o key good (PC-16: du dung khi main hong). */
const GOOD_RAW: Record<string, unknown> = {
  version: 1,
  level: 44,
  stars: MIXED_STARS,
  ink: 900,
  skins_owned: [SKIN_CLASSIC, SKIN_FOIL],
  album_items: [{ id: 'a7', title: 'Thuyen' }],
  badges: [{ id: 'b1', level: 1 }],
  sound_on: true,
  rev: 3,
};
const GOOD_JSON = JSON.stringify(GOOD_RAW);

/** Save lanh o key main - de chung main duoc uu tien hon good. */
const MAIN_RAW: Record<string, unknown> = { ...GOOD_RAW, level: 61, ink: 1500, rev: 8 };
const MAIN_JSON = JSON.stringify(MAIN_RAW);

/** JSON bi cat giua chuoi (ERR-01). */
const TRUNCATED_JSON = '{"version":1,"ink":';

/** Wardrobe = cho mua skin nam ngoai save tien trinh. */
const WARDROBE_IDS = [SKIN_CLASSIC, SKIN_FOIL, SKIN_NEON];
const WARDROBE_JSON = JSON.stringify(WARDROBE_IDS);

/** Save cu khong co cac field moi (dong vai v0 -> v1). */
const V0_RAW: Record<string, unknown> = {
  version: 0,
  level: 7,
  stars: MIXED_STARS,
  ink: 1234,
};

/** Save co du du lieu nhung thieu sound_on / rev. */
const RICH_RAW: Record<string, unknown> = {
  version: 1,
  level: 9,
  stars: MIXED_STARS,
  ink: 4321,
  skins_owned: [SKIN_CLASSIC, SKIN_FOIL],
  album_items: [{ id: 'a1', title: 'Sieu' }, { id: 'a2', title: 'Thuyen' }],
  badges: [{ id: 'b1', level: 1 }],
  rev: 12,
};

/** Save cua ban mai sau: field la van doc duoc, field la bo qua. */
const FUTURE_RAW: Record<string, unknown> = {
  version: 999,
  level: 5,
  stars: MIXED_STARS,
  ink: 77,
  skins_owned: [SKIN_CLASSIC],
  album_items: [],
  badges: [],
  crease_atlas_v999: { anything: [1, 2, 3] },
};

function makeKV(initial: Record<string, string> = {}): KV {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? String(data.get(key)) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/** KV hu hoan toan (ERR-09/10): moi thao tac nem loi. */
const DEAD_KV: KV = {
  getItem: () => {
    throw new Error('kv doc bi hong');
  },
  setItem: () => {
    throw new Error('kv ghi bi hong');
  },
  removeItem: () => {
    throw new Error('kv xoa bi hong');
  },
};

/** KV nem khi ghi (quota) nhưng doc van duoc. */
function writeThrowingKV(stored: Record<string, string>): KV {
  const base = makeKV(stored);
  return {
    getItem: (key) => base.getItem(key),
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: (key) => base.removeItem(key),
  };
}

/** KV "tra false": setItem mao khong ghi duoc gi (storage bi tu choi). */
const SILENT_KV: KV = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function dropField(raw: Record<string, unknown>, field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...raw };
  delete copy[field];
  return copy;
}

function withRev(rev: number): Save {
  return { ...defaultSave(), rev };
}

const GHOST_80B = 'x'.repeat(80);

function isoDate(dayOffset: number): string {
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `2026-${pad(Math.floor(dayOffset / 31) + 1)}-${pad((dayOffset % 31) + 1)}`;
}

/** Save nang nhat hop le: 120 ghost 80B + 120 wall 5 phan tu + 365 ngay (TC-SAV-06). */
function worstCaseSave(): Save {
  return {
    ...defaultSave(),
    ghosts: Array.from({ length: 120 }, () => GHOST_80B),
    walls: Array.from({ length: 120 }, (_unused, i) => [i, i + 1, i + 2, i + 3, i + 4]),
    dates: Array.from({ length: 365 }, (_unused, i) => isoDate(i)),
  };
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

// --------------------------------------------------------------- default ---

describe('H1 defaultSave - PC-16 (TC-SAV-01)', () => {
  it('serialize roi parse lai deep-equal defaultSave() va serialize on dinh', () => {
    const text = serializeSave(defaultSave());
    const r = parseSave(text);
    if (!r.ok) {
      throw new Error(`parseSave(save mac dinh) phai ok, reason=${String(r.reason)}`);
    }
    expect(r.save).toEqual(defaultSave());
    expect(serializeSave(r.save)).toBe(text);
  });

  it('top-level co version la so nguyen >= 1', () => {
    const d = defaultSave();
    expect(Object.keys(d)).toContain('version');
    expect(Number.isInteger(d.version)).toBe(true);
    expect(d.version).toBeGreaterThanOrEqual(1);
  });

  it('stars mac dinh dung 120 ky tu trong 0..3 va toan bo la 0', () => {
    const d = defaultSave();
    expect(d.stars.length).toBe(120);
    expect(d.stars).toMatch(/^[0-3]{120}$/);
    expect(d.stars).toBe(ZERO_STARS);
  });

  it('goi defaultSave 2 lan khong dung chung mang (sua lan nay khong anh huong lan sau)', () => {
    const a = defaultSave();
    a.skins_owned.push(SKIN_NEON);
    expect(defaultSave().skins_owned).not.toContain(SKIN_NEON);
  });
});

// ---------------------------------------------------------------- migrate ---

describe('H2 migrate + version - PC-16 (TC-SAV-02/05, ERR-02)', () => {
  it('MIGRATIONS la chuoi KE KHAI: tang dan, bac cuoi cham version hien hanh, bac 0 sinh dung field v1', () => {
    const d = defaultSave();
    const steps = [...MIGRATIONS].sort((a, b) => a.from - b.from);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    for (const step of steps) {
      expect(step.to).toBeGreaterThan(step.from);
      expect(step.to).toBeLessThanOrEqual(d.version);
    }
    expect(steps[steps.length - 1].to).toBe(d.version);
    const taken: string[] = [];
    steps[0].migrate({}, (name) => {
      taken.push(name);
    });
    expect(taken.length).toBeGreaterThan(0);
    expect(taken).toEqual(expect.arrayContaining(['skins_owned', 'album_items', 'badges']));
    // migrateSave phai chay DUNG cac bac da khai, khong tu che them buoc
    expect(migrateSave(V0_RAW).migrated).toEqual([`${steps[0].from}->${steps[0].to}`]);
  });

  it('v0 thieu field moi -> dien default, khong mat ink/level/stars cu', () => {
    const d = defaultSave();
    const r = migrateSave(V0_RAW);
    expect(r.save.version).toBeTypeOf('number');
    expect(r.save.level).toBe(7);
    expect(r.save.ink).toBe(1234);
    expect(r.save.stars).toBe(MIXED_STARS);
    expect(r.save.skins_owned).toEqual(d.skins_owned);
    expect(r.save.album_items).toEqual(d.album_items);
    expect(r.save.badges).toEqual(d.badges);
    expect(r.save.sound_on).toBe(d.sound_on);
    expect(r.filled).toEqual(
      expect.arrayContaining(['skins_owned', 'album_items', 'badges', 'sound_on']),
    );
  });

  it('skins_owned / album_items / badges da co -> gi NGUYEN gia tri, khong reset', () => {
    const r = migrateSave(RICH_RAW);
    expect(r.save.skins_owned).toEqual(RICH_RAW.skins_owned);
    expect(r.save.album_items).toEqual(RICH_RAW.album_items);
    expect(r.save.badges).toEqual(RICH_RAW.badges);
    expect(r.save.level).toBe(9);
    expect(r.save.ink).toBe(4321);
    expect(r.save.rev).toBe(12);
    expect(r.save.sound_on).toBe(defaultSave().sound_on);
  });

  it('version tuong lai 999 -> co co fromFuture, khong wipe du lieu da biet; version hien tai -> false', () => {
    const r = migrateSave(FUTURE_RAW);
    expect(r.fromFuture).toBe(true);
    expect(r.save.level).toBe(5);
    expect(r.save.ink).toBe(77);
    expect(r.save.stars).toBe(MIXED_STARS);
    expect(r.save.skins_owned).toEqual([SKIN_CLASSIC]);
    expect(r.save.sound_on).toBe(defaultSave().sound_on);
    expect(migrateSave(RICH_RAW).fromFuture).toBe(false);
  });

  it('TC-SAV-04: thieu tung field (stars/ink/skins_owned/album_items/sound_on) -> fill default', () => {
    const d = defaultSave();
    const fields = ['stars', 'ink', 'skins_owned', 'album_items', 'sound_on'] as const;
    for (const field of fields) {
      const r = migrateSave(dropField(RICH_RAW, field));
      expect(r.save[field], `field ${field}`).toEqual(d[field]);
      expect(r.filled, `field ${field}`).toContain(field);
      expect(r.save.level, `field ${field}`).toBe(9);
    }
  });
});

// ----------------------------------------------------------------- corrupt ---

describe('H3 parse corrupt - ERR-01 (TC-SAV-03)', () => {
  it('JSON bi cat giua chuoi hoac chuoi rong -> ok:false reason corrupt_json, khong nem', () => {
    for (const text of [TRUNCATED_JSON, '', '   ', '\n']) {
      const r = parseSave(text);
      expect(r.ok, `parseSave(${JSON.stringify(text)})`).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe('corrupt_json');
      }
    }
  });

  it('JSON hop le nhung khong phai object -> ok:false reason not_object', () => {
    for (const text of ['null', '[]', '42', '"chuoi"', 'true']) {
      const r = parseSave(text);
      expect(r.ok, `parseSave(${text})`).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe('not_object');
      }
    }
  });
});

// --------------------------------------------------------------- cuu ho ---

describe('H4 cuu ho 3 tang - PC-16 (TC-SAV-03)', () => {
  it('main hong HOAC main chua ton tai + good lanh -> lay good, source backup', () => {
    const cases: Record<string, string>[] = [
      { [SAVE_KEYS.main]: TRUNCATED_JSON, [SAVE_KEYS.backup]: GOOD_JSON },
      { [SAVE_KEYS.backup]: GOOD_JSON },
    ];
    for (const entry of cases) {
      const r = loadSave(makeKV({ ...entry, [SAVE_KEYS.wardrobe]: WARDROBE_JSON }));
      if (!r.ok) {
        throw new Error(`loadSave phai ok, reason=${String(r.reason)}`);
      }
      expect(r.source).toBe('backup');
      expect(r.save.level).toBe(44);
      expect(r.save.ink).toBe(900);
      expect(r.save.skins_owned).toEqual([SKIN_CLASSIC, SKIN_FOIL]);
    }
  });

  it('ca main lan good deu hong -> fresh level 1 + sao 0, skin con nguyen tu wardrobe', () => {
    const kv = makeKV({
      [SAVE_KEYS.main]: TRUNCATED_JSON,
      [SAVE_KEYS.backup]: '{"version":1,"le',
      [SAVE_KEYS.wardrobe]: WARDROBE_JSON,
    });
    const r = loadSave(kv);
    if (!r.ok) {
      throw new Error('loadSave phai ok du phai lam moi');
    }
    expect(r.source).toBe('fresh');
    expect(r.save.level).toBe(1);
    expect(r.save.stars).toBe(ZERO_STARS);
    expect(r.save.album_items).toEqual([]);
    expect(r.save.badges).toEqual([]);
    expect(r.save.skins_owned).toEqual([SKIN_CLASSIC, SKIN_FOIL, SKIN_NEON]);
  });

  it('wardrobe cung hong -> fresh khong crash, skins_owned = mac dinh', () => {
    const kv = makeKV({
      [SAVE_KEYS.main]: 'khong phai json',
      [SAVE_KEYS.backup]: 'khong phai json',
      [SAVE_KEYS.wardrobe]: '{oops',
    });
    const r = loadSave(kv);
    if (!r.ok) {
      throw new Error('loadSave phai ok');
    }
    expect(r.source).toBe('fresh');
    expect(r.save.skins_owned).toEqual(defaultSave().skins_owned);
  });

  it('main lanh -> dung main, good bi bo qua', () => {
    const kv = makeKV({
      [SAVE_KEYS.main]: MAIN_JSON,
      [SAVE_KEYS.backup]: GOOD_JSON,
      [SAVE_KEYS.wardrobe]: WARDROBE_JSON,
    });
    const r = loadSave(kv);
    if (!r.ok) {
      throw new Error('loadSave phai ok');
    }
    expect(r.source).toBe('main');
    expect(r.save.level).toBe(61);
    expect(r.save.ink).toBe(1500);
  });
});

// ------------------------------------------------------------- ghi + rev ---

describe('H5 write + luat rev - PC-16 (§4 muc 5)', () => {
  it('storage rev cao hon RAM -> take-storage, khong de RAM ghi de im lang', () => {
    expect(applyWrite({ ram: withRev(5), storage: withRev(9) })).toBe('take-storage');
  });

  it('RAM rev cao hon storage -> write-storage', () => {
    expect(applyWrite({ ram: withRev(9), storage: withRev(5) })).toBe('write-storage');
  });

  it('RAM chua co save (lan dau tien) -> write-storage', () => {
    expect(applyWrite({ ram: null, storage: null })).toBe('write-storage');
    expect(applyWrite({ ram: null, storage: withRev(2) })).toBe('take-storage');
  });

  it('writeSave thanh cong thi loadSave doc lai dung du lieu', () => {
    const kv = makeKV({ [SAVE_KEYS.wardrobe]: WARDROBE_JSON });
    const next: Save = { ...defaultSave(), level: 42, ink: 500 };
    const w = writeSave(kv, SAVE_KEYS.main, next);
    expect(w.ok).toBe(true);
    expect(utf8Bytes(String(kv.getItem(SAVE_KEYS.main)))).toBe(w.bytes);
    const r = loadSave(kv);
    if (!r.ok) {
      throw new Error('loadSave phai doc duoc vua ghi');
    }
    expect(r.source).toBe('main');
    expect(r.save.level).toBe(42);
    expect(r.save.ink).toBe(500);
  });
});

// -------------------------------------------------------------- KV hong ---

describe('H6 KV hong - TC-SAV-07 / TC-NET-04 (ERR-09/10)', () => {
  it('KV nem khi doc -> loadSave ok:false reason kv_unavailable, khong nem', () => {
    const r = loadSave(DEAD_KV);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('kv_unavailable');
    }
  });

  it('KV nem khi ghi -> writeSave ok:false reason kv_error, khong nem', () => {
    const r = writeSave(writeThrowingKV({}), SAVE_KEYS.main, defaultSave());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('kv_error');
    }
  });

  it('KV setItem mao (tra that) -> loadSave khong crash, ket qua fresh', () => {
    const w = writeSave(SILENT_KV, SAVE_KEYS.main, defaultSave());
    const r = loadSave(SILENT_KV);
    expect(w.ok).toBe(true);
    if (!r.ok) {
      throw new Error('loadSave tren KV trong phai ok');
    }
    expect(r.source).toBe('fresh');
    expect(r.save.level).toBe(defaultSave().level);
  });
});

// ------------------------------------------------------------------- size ---

describe('H7 kich thuoc - TC-SAV-06', () => {
  it('worst-case 120 ghost 80B + 120 wall 5 + 365 ngay -> UTF-8 <= 100KB', () => {
    const bytes = utf8Bytes(serializeSave(worstCaseSave()));
    expect(bytes).toBeLessThanOrEqual(100_000);
    // chan doi ben: chung to ba mang lon that su duoc serialize (khong bi roi field).
    expect(bytes).toBeGreaterThan(10_000);
  });
});

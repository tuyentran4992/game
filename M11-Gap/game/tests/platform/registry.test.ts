// TC-SAO-03 (nhóm L) — 1 interface, 3 adapter: platformRegistry resolve đủ 3 khoá
// standalone/playgama/ytgame, cùng shape PlatformAdapter, không có nhánh if (platform === ...)
// quan sát được từ registry (pattern Strategy — SPEC §5.3).
//
// HỢP ĐỒNG CHỐT Ở TEST NÀY: src/platform/index.ts export
//   export const platformRegistry: PlatformRegistry        // tên chốt ở test này (pack B2 §1)
//   PlatformRegistry = { names: readonly PlatformName[], resolve(name: PlatformName): PlatformAdapter }
//   export type PlatformName = 'standalone' | 'playgama' | 'ytgame'   // resolve trả đúng nullAdapter
//                                                                          cho 'standalone'
import { describe, expect, it } from 'vitest';
import { nullAdapter } from '../../src/platform/nullAdapter';
import { platformRegistry } from '../../src/platform/index';
import {
  ADAPTER_METHODS,
  PLATFORM_STORAGE_KEYS,
  adapterSurface,
  settlesImmediately,
  type AnyAdapter,
} from './helpers/fakes';

const SORTED_SURFACE = [...ADAPTER_METHODS].sort();

describe('platformRegistry — TC-SAO-03 / PC-20', () => {
  it('names là bảng dữ liệu đúng 3 khoá standalone/playgama/ytgame', () => {
    expect(platformRegistry.names).toEqual(['standalone', 'playgama', 'ytgame']);
  });

  it('TC-SAO-03: cả 3 khoá resolve ra ĐÚNG bề mặt PlatformAdapter (không adapter nào thừa/thiếu method)', () => {
    for (const name of platformRegistry.names) {
      expect(adapterSurface(platformRegistry.resolve(name) as AnyAdapter)).toEqual(SORTED_SURFACE);
    }
  });

  it('TC-SAO-03: resolve ổn định theo khoá (gọi 2 lần cùng reference), 3 khoá là 3 object khác nhau, standalone chính là nullAdapter', () => {
    const first = platformRegistry.resolve('standalone');
    const second = platformRegistry.resolve('playgama');
    const third = platformRegistry.resolve('ytgame');
    expect(first).toBe(nullAdapter);
    expect(platformRegistry.resolve('standalone')).toBe(first);
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it('TC-SAO-03: khoá lạ rơi về default bảng (cùng reference với standalone) — không chuỗi if, không crash', () => {
    const unknown = platformRegistry.resolve('poki' as 'standalone');
    expect(unknown).toBe(platformRegistry.resolve('standalone'));
  });

  // C9(b) + C10 — lớp lỗi "crash im lặng": index ngoặc vuông cho tên coincidence với
  // Object.prototype trả về ĐỒ RÁC của prototype (hàm/object) thay vì MISS ⇒ không bao giờ
  // rơi về dòng mặc định của bảng. resolve phải luôn tra đúng 3 khoá, mọi tên khác là MISS.
  it('C10: tên trùng khoá prototype cũng là MISS — trả adapter mặc định, không phải hàm/Object của prototype', () => {
    const hostile = ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf', '', 'STANDALONE'];
    for (const raw of hostile) {
      const resolved = platformRegistry.resolve(raw as 'standalone');
      expect(typeof resolved, raw).toBe('object');
      expect(resolved, raw).toBe(platformRegistry.resolve('standalone'));
      expect(adapterSurface(resolved as AnyAdapter), raw).toEqual(SORTED_SURFACE);
    }
    // '__proto__' đặt trên bảng từng trả Object.prototype ⇒ phải khác resolve('standalone') (đo thật)
    expect(platformRegistry.resolve('__proto__' as 'standalone')).not.toBe(Object.prototype);
  });

  it('C10: names chỉ đúng 3 khoá của bảng, resolve theo từng khoá trong names là reference ổn định', () => {
    for (const name of platformRegistry.names) {
      expect(platformRegistry.resolve(name)).toBe(platformRegistry.resolve(name));
    }
    expect(platformRegistry.names.length).toBe(3);
  });

  it('TC-SAO-03 / TC-ERR-04: cả 3 adapter lạnh (0 bridge được cài) — đọc null, ghi không ném, ad unavailable settle ngay, lifecycle không ném', async () => {
    for (const name of platformRegistry.names) {
      const adapter = platformRegistry.resolve(name) as AnyAdapter;
      expect(adapter.storage.get('m11.save')).toBeNull();
      expect(() => adapter.storage.set('m11.save', '{"version":1}')).not.toThrow();
      expect(await settlesImmediately(adapter.ads.showRewarded('hint'))).toEqual({
        status: 'unavailable',
        place: 'hint',
      });
      expect(() => adapter.lifecycle.onPause(() => undefined)).not.toThrow();
      expect(() => adapter.lifecycle.mute(true)).not.toThrow();
    }
  });

  it('TC-SAO-03 / PC-16: cùng một hợp đồng storage trên cả 3 adapter — 4 khoá DATA-MODEL giữ nguyên value, reverse order không đổi kết quả', () => {
    const reversed = [...platformRegistry.names].reverse();
    for (const name of reversed) {
      const adapter = platformRegistry.resolve(name) as AnyAdapter;
      for (const key of PLATFORM_STORAGE_KEYS) {
        adapter.storage.set(key, name + ':' + key);
      }
      for (const key of PLATFORM_STORAGE_KEYS) {
        expect(adapter.storage.get(key)).toBe(name + ':' + key);
      }
    }
    expect(reversed).toEqual(['ytgame', 'playgama', 'standalone']);
  });
});

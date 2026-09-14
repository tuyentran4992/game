// Pattern: Factory + Registry
// TRÁCH NHIỆM: bảng ADAPTER duy nhất cho 3 môi trường build (SPEC §1.4.10) — resolve theo tên
//   là TRA BẢNG, không chuỗi if (TC-SAO-03); thêm nền tảng mới = thêm 1 dòng bảng + 1 file dịch
//   từ vựng. `detectPlatformName` dò môi trường lúc gọi (đọc global LAZY — pack B2 §8).
// HỢP ĐỒNG: platformRegistry.names = ['standalone','playgama','ytgame']; resolve('standalone')
//   chính là nullAdapter singleton; khoá lạ rơi về dòng mặc định của bảng (không crash) — kể cả
//   tên coincidence với Object.prototype ('toString', '__proto__', 'constructor': mục C10).

import { nullAdapter } from './nullAdapter';
import { createPlaygamaAdapter } from './playgamaAdapter';
import { createYtgameAdapter } from './ytgameAdapter';
import { globalObject } from './sdkAdapter';
import type { PlatformAdapter } from './types';

export type PlatformName = 'standalone' | 'playgama' | 'ytgame';

export type PlatformRegistry = {
  readonly names: readonly PlatformName[];
  resolve(name: PlatformName): PlatformAdapter;
};

/** Khoá mặc định khi môi trường không phải SDK nào (dev + build nộp standalone). */
const DEFAULT_PLATFORM: PlatformName = 'standalone';

/** Bảng dò môi trường: object mà chủ nhà dựng sẵn → khoá adapter. */
const ENVIRONMENT_PROBE: readonly { readonly global: string; readonly name: PlatformName }[] = [
  { global: 'Playgama', name: 'playgama' },
  { global: 'ytgame', name: 'ytgame' },
];

/** MỘT instance mỗi khoá (resolve 2 lần trả đúng reference — test chốt). Bridge vắng ⇒ lạnh. */
const ADAPTERS: Readonly<Record<PlatformName, PlatformAdapter>> = {
  standalone: nullAdapter,
  playgama: createPlaygamaAdapter(),
  ytgame: createYtgameAdapter(),
};

/**
 * Bảng tra bằng MAP, không phải object + ngoặc vuông: khoá tới từ chuỗi lạ (URL, host) thì
 * `ADAPTERS['toString']` từng trả về CHÍNH HÀM của Object.prototype và `ADAPTERS['__proto__']`
 * trả prototype — truthy nên không rơi về dòng mặc định (mục C9(b)/C10). Map chỉ có đúng 3 khoá.
 */
const ADAPTER_BY_NAME: ReadonlyMap<string, PlatformAdapter> = new Map(Object.entries(ADAPTERS));

export const PLATFORM_NAMES: readonly PlatformName[] = ['standalone', 'playgama', 'ytgame'];

export const platformRegistry: PlatformRegistry = {
  names: PLATFORM_NAMES,
  resolve(name) {
    const hit: PlatformAdapter | undefined = ADAPTER_BY_NAME.get(name);
    // Khoá ở đây là hằng compile-time của bảng ⇒ đọc trực tiếp, không phải chuỗi chưa kiểm.
    return hit ?? ADAPTERS[DEFAULT_PLATFORM];
  },
};

/** Chơi adapter nào? Chỉ nhìn sự hiện diện của object chủ nhà, không gọi gì cả. */
export function detectPlatformName(): PlatformName {
  const probe = ENVIRONMENT_PROBE.find((entry) => globalObject(entry.global) !== null);
  return probe === undefined ? DEFAULT_PLATFORM : probe.name;
}

/** "Chọn adapter theo môi trường" (STRUCTURE §1) — main.ts là chỗ gọi duy nhất. */
export function createAdapter(): PlatformAdapter {
  return platformRegistry.resolve(detectPlatformName());
}

/**
 * Cửa kiểu của tầng nền tảng: kinds KHÓA do `types.ts` sở hữu ⇒ index chỉ mở nguyên bảng,
 * không kể lại tên từng kiểu (kể lại là có bản sao thứ hai lệch nhau khi types.ts thêm khoá —
 * F4: khối 6 dòng kể tên từng kiểu ở đây từng trùng với khối import ở sdkAdapter.ts).
 */
export type * from './types';

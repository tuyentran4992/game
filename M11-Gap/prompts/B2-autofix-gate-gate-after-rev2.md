Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B2 (đợt gate-after-rev2).

Cổng máy `npm run gate` của batch B2 ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

tests/platform/ad-mock.test.ts(67,31): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(72,31): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(85,31): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(86,31): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(95,40): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(105,33): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(112,24): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(113,24): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(114,24): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(122,18): error TS2339: Property 'available' does not exist on type 'MockAds'.
tests/platform/ad-mock.test.ts(123,26): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(124,26): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/ad-mock.test.ts(125,26): error TS2345: Argument of type 'Promise<AdCallResult>' is not assignable to parameter of type 'Promise<string>'.
  Type 'AdCallResult' is not assignable to type 'string'.
tests/platform/helpers/fakes.ts(28,10): error TS6133: 'PLATFORM_STORAGE_KEYS' is declared but its value is never read.
tests/platform/helpers/fakes.ts(373,5): error TS2741: Property 'faults' is missing in type '{ get(key: string): string | null; set(key: string, value: string): void; }' but required in type 'PlatformStorage'.
tests/platform/helpers/fakes.ts(384,7): error TS2353: Object literal may only specify known properties, and 'available' does not exist in type 'PlatformAds'.
tests/platform/helpers/fakes.ts(386,25): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/helpers/fakes.ts(428,5): error TS2741: Property 'faults' is missing in type '{ get(key: string): string | null; set(key: string, value: string): void; }' but required in type 'PlatformStorage'.
tests/platform/helpers/fakes.ts(467,24): error TS2304: Cannot find name 'AdPlacement'.
tests/platform/helpers/fakes.ts(467,45): error TS2304: Cannot find name 'AdOutcome'.
tests/platform/host-shape.test.ts(29,15): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/host-shape.test.ts(57,24): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/host-shape.test.ts(89,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/host-shape.test.ts(127,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/host-shape.test.ts(143,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/network-ban.test.ts(131,26): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/null-adapter.test.ts(47,28): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/null-adapter.test.ts(110,19): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/playgama-adapter.test.ts(73,24): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/playgama-adapter.test.ts(147,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/playgama-adapter.test.ts(165,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/playgama-adapter.test.ts(168,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/ytgame-adapter.test.ts(78,24): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/ytgame-adapter.test.ts(134,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/ytgame-adapter.test.ts(148,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
tests/platform/ytgame-adapter.test.ts(151,21): error TS2339: Property 'available' does not exist on type 'PlatformAds'.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.

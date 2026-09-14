Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B2 (đợt gate1).

Cổng máy `npm run gate` của batch B2 ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

tests/platform/ad-mock.test.ts(30,10): error TS2724: '"./helpers/fakes"' has no exported member named 'REWARDED_PLACES'. Did you mean 'REWARDED_PLACEMENTS'?
tests/platform/ad-mock.test.ts(31,15): error TS2724: '"./helpers/fakes"' has no exported member named 'RewardedPlace'. Did you mean 'RewardedPlacement'?
tests/platform/helpers/fakes.ts(249,108): error TS2345: Argument of type '(enabled: boolean) => void' is not assignable to parameter of type '(payload?: unknown) => void'.
  Types of parameters 'enabled' and 'payload' are incompatible.
    Type 'unknown' is not assignable to type 'boolean'.
tests/platform/helpers/fakes.ts(326,96): error TS2345: Argument of type '(enabled: boolean) => void' is not assignable to parameter of type '(payload?: unknown) => void'.
  Types of parameters 'enabled' and 'payload' are incompatible.
    Type 'unknown' is not assignable to type 'boolean'.
tests/platform/playgama-adapter.test.ts(58,48): error TS2550: Property 'at' does not exist on type 'string[][]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2022' or later.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.

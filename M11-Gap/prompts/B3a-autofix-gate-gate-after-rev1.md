Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3a (đợt gate-after-rev1).

Cổng máy `npm run gate` của batch B3a ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

src/render/components/OptionCard.ts(10,15): error TS6133: 'holeBudget' is declared but its value is never read.
src/render/scenes/PlayScene.ts(25,56): error TS6133: 'registerTestid' is declared but its value is never read.
tests/logic/view-b3a-geometry.test.ts(38,1): error TS6192: All imports in import declaration are unused.
tests/logic/view-b3a-geometry.test.ts(161,21): error TS6133: 'd' is declared but its value is never read.
tests/logic/view-b3a-timing.test.ts(426,10): error TS2304: Cannot find name 'MAX_HOLES'.
tests/logic/view-b3a-timing.test.ts(426,28): error TS2304: Cannot find name 'MAX_HOLES'.
tests/logic/view-b3a-timing.test.ts(427,20): error TS2304: Cannot find name 'MAX_HOLES'.
tests/logic/view-b3a-timing.test.ts(428,21): error TS2304: Cannot find name 'MAX_HOLES'.
tests/logic/view-b3a-timing.test.ts(491,26): error TS2304: Cannot find name 'MAX_HOLES'.
tests/logic/view-b3a-timing.test.ts(492,23): error TS2304: Cannot find name 'MAX_HOLES'.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.

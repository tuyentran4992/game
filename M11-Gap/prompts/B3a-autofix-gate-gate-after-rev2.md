Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3a (đợt gate-after-rev2).

Cổng máy `npm run gate` của batch B3a ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

tests/logic/scene-boot.test.ts(6,1): error TS6133: 'BootScene' is declared but its value is never read.
tests/logic/scene-boot.test.ts(13,7): error TS6133: 'step' is declared but its value is never read.
tests/logic/scene-boot.test.ts(50,7): error TS2554: Expected 1-2 arguments, but got 0.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.

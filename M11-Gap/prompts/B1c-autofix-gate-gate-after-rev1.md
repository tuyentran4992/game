Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B1c (đợt gate-after-rev1).

Cổng máy `npm run gate` của batch B1c ĐANG ĐỎ. Output thật (cuối):
```

> paper-crease@0.1.0 gate
> npm run typecheck && npm run test:logic && node tools/gate-smell.mjs


> paper-crease@0.1.0 typecheck
> tsc --noEmit

tests/logic/save.test.ts(14,3): error TS6133: 'MIGRATIONS' is declared but its value is never read.
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua).

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.

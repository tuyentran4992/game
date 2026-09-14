Bạn là dev Phaser 3 + TypeScript. **VÒNG SỬA HẸP B3a** — cổng máy chỉ còn **2 test đỏ** trong **1 file**, sửa cho xanh, KHÔNG làm gì khác.

## Lỗi còn lại (đo thật từ `npm run gate`)
```
FAIL tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường)
   > boot headless => đăng đủ rect HUD + 4 ô, số hữu hạn và không nhỏ hơn trần chạm
   AssertionError: scene chơi phải là scene đang chạy: expected [] to include 'Play'
FAIL tests/logic/scene-boot.test.ts > PlayScene khi boot (F2: hết test dò đường)
   > shutdown thì rect của màn chơi bị xoá khỏi registry (không còn vùng bấm vô hình)
   AssertionError: scene phải đã dừng hẳn trước khi đo rect: expected null to be false
Test Files  1 failed | 35 passed (36) | Tests  2 failed | 555 passed (557)
```

## Việc
1. Xác định **nguyên nhân thật**: là **test-harness đọc sai trạng thái scene** (hàm kiểm tra lifecycle chưa mô phỏng đúng `scene.start/stop` trong môi trường headless) hay là **lỗi code** (`PlayScene` không đăng ký/không dọn rect)?
   - Nếu là **test-harness sai** ⇒ sửa harness cho phản ánh đúng hành vi thật (vẫn phải assert giá trị cụ thể, không được nới thành `expect(true)`).
   - Nếu là **lỗi code thật** ⇒ sửa code (ví dụ `PlayScene` không được `scene.start` đúng, hoặc `shutdown` không xoá rect khỏi registry).
   - Ghi rõ trong báo cáo bạn chọn nhánh nào và bằng chứng (`file:dòng`).
2. Bảo đảm **không còn test dò đường/rỗng**: mọi `it()` phải assert giá trị cụ thể; không `console.log`.
3. Chạy `npm run gate` **đúng 1 lần** ở cuối và **phải PASS: 0 test đỏ + 0 vi phạm gate-smell**, rồi dán output thật.

## RÀNG BUỘC
- Chỉ sửa `game/src/**` + `game/tests/**`. KHÔNG đụng `harness/`, `specs/`, `tools/gate-smell.mjs`, KHÔNG commit/push.
- **CẤM mở browser/Playwright/CDP/vite preview** — chỉ kiểm ở tầng code.
- Sắp hết lượt ⇒ (1) typecheck xanh → (2) 557 test xanh → (3) gate-smell 0 vi phạm → (4) báo cáo.
BÁO CÁO: nguyên nhân (test hay code) + file:dòng · output `npm run gate` · việc không làm được.

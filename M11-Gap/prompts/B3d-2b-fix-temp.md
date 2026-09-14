# VÒNG HẸP — dọn TEST TẠM + xác nhận 3 việc layout (≤30 lượt, chỉ 1 file test)

## Sự thật đo được (không cần điều tra lại)
`tests/logic/layout.test.ts` (dòng 439-478) còn **một TEST TẠM** do phiên trước để lại, tự ghi chú `// TEMP STATS (xoat truoc khi giao)` — nó cố tình `throw` để in số đo nên **suite đỏ**: `676 test: 675 pass, 1 fail` ⇒ `build-channels.sh` FAIL theo (script build chạy test trước khi đóng gói).
Số nó đo được (dùng để chuyển thành khẳng định thật): `minPairPx = 7.17 at lv35 card3 n=4` · `maxR = 8.93` · `holes side = 162.31` · `paper side = 191.52`; số chấm `n` từ **1..48**.

## Việc 1 (bắt buộc) — thay test tạm bằng KHẲNG ĐỊNH THẬT
Xoá khối `describe('TEMP do cham')` và viết một test thật (tên tiếng Anh, không dấu `TEMP`) khẳng định trên **toàn bộ 120 màn**:
1. mọi chấm nằm trong `innerRect(card, PAD_MIN)` (vùng an toàn)
2. khoảng cách giữa **2 chấm bất kỳ ≥ 6 px** (dùng đúng công thức `minPair` như test tạm: `Math.hypot(dx,dy) * art.holes.w`)
3. bán kính chấm `holeRadius(...)` **không vượt** nửa khoảng cách nhỏ nhất trong cùng card (để không chồng) và vẫn ≥ bán kính tối thiểu đọc được
4. nếu một màn vi phạm: báo **level + card + n** trong message để lần sau khỏi phải đo lại.
Test phải XANH với code hiện tại (nếu đỏ thì sửa `holeRadius`/vùng vẽ trong `src/render/**` cho tới khi xanh — đó mới là mục đích).

## Việc 2 — xác nhận 3 việc của phiên trước đã xong THẬT (không viết lại code nếu đã có)
Đối chiếu nhanh trong code và ghi rõ file:dòng vào báo cáo:
a) **nền giấy + vignette đối xứng** cho 2 bên cột (không còn dải xám/vệt sáng chéo) + điện thoại **kín bề ngang**;
b) **canh trục**: nhãn "MÀN", hàng sao, hàng nút thẳng trục cột;
c) **xoá testid của scene cũ khi scene shutdown** (registry QA không còn id của Title scene khi đang ở Play).
Nếu mục nào CHƯA làm thì làm nốt (file được sửa: `src/render/**`, `src/ui/**`, `index.html`).

## Xong khi
- `npx vitest run tests/logic/layout.test.ts` → **XANH, không còn test tên TEMP**
- `npm run gate` → **XANH**
- `bash scripts/build-channels.sh` → chạy hết, 3 kênh `check-bundle` PASS
Dán output thật của 3 lệnh trên. CẤM sửa `specs/**`, `harness/**`; CẤM commit/push; CẤM browser/Playwright.

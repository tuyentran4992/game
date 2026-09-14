# VÒNG HẸP CUỐI — trả 2 vi phạm cổng + 1 việc còn sót (≤45 lượt)

## Đã đo, không cần điều tra lại
- Test **677/677 xanh**. Bundle: `standalone` PASS, `ytgame` PASS, `playgama` PASS (nhưng lưu ý: lần kiểm đó dùng snapshot CŨ vì `build-channels.sh` chạy CỔNG trước và **dừng ngay khi cổng đỏ** — nên sau khi cổng xanh BẮT BUỘC chạy lại `scripts/build-channels.sh` để build MỚI rồi mới kiểm).
- Cổng còn **2 vi phạm thật**:
  1. `G1 src/render/layout.ts = 361 dòng > 350` (trần file)
  2. `G3 giá trị 12 được đặt tên GATE_STARS (src/logic/progression.ts) / SAFE_PAD (src/render/layout.ts)` — nghi cùng một luật
- Ảnh chụp thật (Playwright, desktop 1280×900 + điện thoại 480×900) cho thấy: nền giấy + vignette ĐẠT; hết đè chữ; **còn**: vài chấm ở card 1 và card 3 **chạm nhẹ** viền trong của ô đáp án.
- **Còn sót 1 việc của vòng trước**: khi vào PlayScene, registry QA vẫn còn rect của màn Title (`testid-title-play`, `testid-title-shop`, `testid-loading-bar`) ⇒ mọi phép kiểm chồng lấn bị nhiễu.

## V1 — Trả G1: `layout.ts` phải ≤ 350 dòng
Tách phần **bảng dữ liệu** (hằng số/tỷ lệ/hình học theo mockup) ra file riêng (ví dụ `src/render/layoutTable.ts`) để `layout.ts` chỉ còn hàm dựng `Layout`. **Cấm đổi số** — test `layout.test.ts` (44 case) phải vẫn xanh nguyên.

## V2 — Trả G3: một luật chỉ một nguồn
`SAFE_PAD` và `GATE_STARS` cùng giá trị 12: xác định chúng có phải CÙNG một luật không.
- Nếu CÙNG luật: chọn 1 nguồn sự thật (export từ nơi phù hợp, nơi kia import) rồi xoá hằng trùng.
- Nếu KHÁC luật: đổi tên/giá trị sao cho khác nghĩa rõ ràng và ghi 1 dòng giải thích tại chỗ.
Báo cáo phải nói rõ chọn hướng nào + vì sao.

## V3 — Chấm không được CHẠM viền trong của ô đáp án
Hiện card 1 và card 3 còn chấm chạm nhẹ viền trong. Dùng `innerRect(card, PAD_MIN)` với **`PAD_MIN` = bán kính chấm + khe tối thiểu**, và thêm test: **mọi chấm, mọi màn (120 màn)** phải cách viền trong ≥ **2px** (không chỉ "nằm trong").

## V4 — Xoá registry QA khi đổi màn
Khi một scene shutdown, **xoá hết testid của scene đó** (một cửa, ví dụ `clearTestidsOf(scope)` trong `src/ui/testids.ts`; scene gọi trong `shutdown`).
Test: sau khi chuyển Title→Play, registry **không còn** id nào của Title (`testid-title-*`, `testid-loading-bar`).

## Xong khi (dán output THẬT của từng lệnh)
1. `npx vitest run tests/logic/layout.test.ts` → xanh (44+ case, không còn test tên TEMP)
2. `npm run gate` → **XANH** (chỉ còn 2 mục nợ G1 đã khai: PlayScene 487 dòng, sdkAdapter 251 dòng)
3. `bash scripts/build-channels.sh` → chạy HẾT 5 bước, build MỚI
4. `ls -l --time-style=+%H:%M build/ytgame/index.html build/playgama/index.html dist/index.html` → **giờ phải MỚI hơn** thời điểm bạn bắt đầu sửa (chứng minh artifact mới, không dùng bản cũ)
5. `node tools/check-bundle.mjs build/ytgame --channel ytgame` + `build/playgama` + `dist` → cả 3 PASS
Được sửa: `src/render/**`, `src/ui/**`, `src/logic/progression.ts` (chỉ hằng số), `tests/logic/layout.test.ts`. CẤM `specs/**`, `harness/**`, commit/push, browser.

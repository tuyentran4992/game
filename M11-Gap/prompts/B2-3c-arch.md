Bạn là REVIEWER ĐỘC LẬP cho batch B2 — KIẾN TRÚC/PATTERN. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — **đọc phần đó trước, KHÔNG cần mở file checklist nào**.
Đọc thêm đúng: `game/src/platform/*.ts`, `game/src/main.ts`, `game/tests/platform/*.test.ts` (không đọc specs/, không quét cây thư mục).

Chấm các mục **A1..A15** (REVIEW-2-ARCHITECTURE.md) — đặc biệt bốn mục dưới đây là SỐNG-CÒN của B2, chấm kỹ trước:
- A1 Ranh giới 1 CHIỀU `config → logic → platform → render → main`: vẽ lại sơ đồ import thật từ `src/platform/*` + `main.ts`. `src/logic` vẫn 0 import platform/phaser/DOM/SDK (grep). Platform KHÔNG import render. Adapter không import `src/logic` trừ type thuần (`types.ts`).
- A3 + A6 + A12 **Null Object thật, không phải `if (cóAds)` trá hình**: grep caller (main + mọi file) chuỗi `if (.*ads`, `if (.*available`, `platform ===`, `instanceof NullAdapter`, tên `playgama`/`ytgame`/`standalone` lọt ra NGOÀI `platform/index.ts` + `debug.ts` ⇒ mỗi chỗ là 1 FAIL kèm file:dòng. Nơi gọi chỉ gọi interface, nhận kết quả degraded.
- A4/A8 Adapter chọn bằng REGISTRY (`platformRegistry`), không chuỗi if theo môi trường; thêm kênh thứ 3 (Reddit Devvit trong tương lai) = thêm 1 file adapter + 1 dòng registry — làm thật phép thử A5 trong /tmp: copy `src/platform` sang /tmp, thêm `exampleAdapter.ts` giả + 1 dòng ⇒ đếm số file CŨ phải sửa, >2 ⇒ FAIL.
- Debug hooks nằm GOM về 1 module (strip được khỏi build nộp — SPEC §5.4); nếu `location.search`/`debug=` rải rác >1 chỗ ⇒ FAIL (không test được strip).
- A13: lỗi SDK (throw/reject) xử lý đúng tầng adapter, không nuốt im lặng không log, không ném trần ra scene.
- A9: ghi số dòng mỗi file (cảnh báo, không FAIL).

- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Chạy lệnh thật rồi dán số (không tóm tắt thay output).
- Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể.
- Xong trong ≤25 lượt. Nếu thiếu thời gian: chấm A1/A3/A5/A6 trước, ghi rõ mục nào bỏ dở.

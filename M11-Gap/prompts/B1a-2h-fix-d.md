Bạn là dev TypeScript. **VÒNG FIX D** cho batch B1a — CHỈ SỬA ĐÚNG/SAI (cấu trúc để vòng sau). 4 việc theo thứ tự.

Luật phiên + hợp đồng + SPEC §7.5 đã ở system prompt. KHÔNG mở SPEC/DOC, KHÔNG dò tooling.

## D1 (BUG THẬT #1 — 0,43% đề hỏng): `cfg.folds` có 'D' ở vị trí KHÔNG hợp lệ ⇒ lỗ NGOÀI TỜ
Bằng chứng: 27/6.222 đề fuzz `validateSpec.ok=false`, mọi ca đều `"toạ độ ngoài tờ giấy [0,1]×[0,1]"`. Repro tối thiểu:
`levelSpec('DPROOF', 5, {chapter:3, levelInChapter:8, foldCount:3, punchCount:1, useCut:false, useDiagonal:true, timerOn:false, folds:['H','H','D']})` → `answerHoles` chứa `-3/8`.
Nguyên nhân: `generator.ts:186-205` (`declaredChain`) chặn kiểu lạ / độ dài / `D` khi `useDiagonal=false`, **nhưng không chặn "nếp chéo D khi packet KHÔNG còn vuông"** — `foldRules.ts:70` (`D.swap`) giả định tờ vuông (oracle `g01_fold_sim.py` ghi rõ "needs square").
YÊU CẦU: chuỗi nếp chứa `D` chỉ hợp lệ khi **packet còn vuông tại thời điểm gấp**; sai ⇒ **NÉM lỗi rõ ràng** (nêu chuỗi nếp + lý do), KHÔNG trả đề. Test bắt buộc: `folds` = `['D']`, `['D','H']`, `['H','D']`, `['H','H','D']`, `['V','V','D']`, `['D','V','V','D']` ⇒ 6 ca ném lỗi/không sinh đề ngoài tờ (assert thêm: mọi toạ độ của `answerHoles` và 4 ô nằm trong [0,1]×[0,1] với mọi chuỗi hợp lệ).

## D2 (BUG THẬT #2 — luật §7.5 chưa cài thật): phân loại cụm cắt vô dụng
Bằng chứng: 339 đề cut ⇒ `classifyCluster(..., leg)` trả `'full-hole'` **0/1.165 cụm** (vì ngưỡng `3×leg` luôn lớn hơn span thật của cụm raster ≤ 1/16) ⇒ rule nhiễu `notch-vs-hole` (`generator.ts:646-661`) **không bao giờ phân biệt được khuyết-mép ↔ lỗ-tròn** = §7.5 mục "phân loại tổn thương" chưa có tác dụng.
YÊU CẦU:
- `classifyCluster` phải **có tác dụng thật**: phân loại theo **span của cụm trong lưới raster 16×16** so với **cỡ cắt `size`** (không dùng `3×leg` mù quáng) sao cho **cả hai lớp `edge-notch` và `full-hole-ish` đều xuất hiện** trong dải `CUT_SIZES` hiện có; cỡ nhỏ ⇒ notch, cỡ lớn ⇒ hole-ish. Ghi 1 dòng comment giải thích ngưỡng và **để ngưỡng thành const có tên** (không magic number).
- Rule nhiễu `notch-vs-hole` phải **thực sự tạo ra ô nhiễu phân biệt được** (hamming ≥ MIN_RASTER_DISTANCE) cho đề cut.
- Test bắt buộc: (a) gọi trực tiếp `classifyCluster` với cụm nhỏ và cụm lớn ⇒ trả 2 lớp KHÁC nhau; (b) quét ≥200 đề cut ⇒ **cả 2 lớp đều xuất hiện**; (c) đề cut có ít nhất 1 ô nhiễu sinh từ rule `notch-vs-hole`.
- LƯU Ý ĐỪNG ĐUỔI THEO SỐ CỦA ORACLE: oracle `g01_fold_sim.py` cắt notch `1/32` với lưới mẫu 8×8 nên đếm 13-42 cụm — **không phải đích so sánh** cho §7.5 (SPEC chọn `size ≥ 1/16` để hiện được trên lưới 16×16). Đích đúng là 3 luật §7.5 + bitmap/hamming.

## D3 (oracle trong test vẫn copy giả định SAI của src — review F8)
`tests/logic/helpers.ts:352-358` (`handLayers`) **copy nguyên giả định sai** "D = swap vô điều kiện, không kiểm packet vuông" ⇒ test không thể phát hiện bug D1. Sửa `handLayers` thành **độc lập và ĐÚNG** (áp luật vuông như D1). Thêm test: `cfg.folds` chứa `D` (đúng/sai vị trí) + gọi trực tiếp mã phân loại `full-hole`/`notch` (hiện **0 test** gọi `classifyCluster`/`NOTCH_SPAN`).

## D4 (sai tầng báo lỗi — review F2 "trừ 1 chỗ")
`levelSpec(seed, idx, cfg)` với `cfg = undefined/null` ⇒ `TypeError: Cannot read properties of undefined (reading 'punchCount')`. Sửa: kiểm `cfg` là object có field bắt buộc ⇒ **ném lỗi có thông điệp rõ** (nêu field thiếu), không để TypeError trần.

## KHÔNG LÀM ở vòng này
KHÔNG tách file (`generator.ts` đang 881 dòng — vòng sau lo), KHÔNG đổi tên hằng, KHÔNG xoá API chết, KHÔNG đụng `gate-allow.json`, KHÔNG đổi cấu trúc test.

## RÀNG BUỘC
- Chỉ `game/src/logic/**` + `game/tests/logic/**`. KHÔNG sửa SPEC/docs, KHÔNG commit/push, KHÔNG đổi chữ ký hàm công khai.
- Chạy `npm run gate` ĐÚNG 1 LẦN ở cuối (giữa các bước dùng `npx tsc --noEmit`). Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) báo cáo.

BÁO CÁO: mỗi mục D1..D4 → file:dòng + 1 câu · test thêm/sửa · output `npm run gate` · việc không làm được.

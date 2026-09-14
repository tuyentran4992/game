Bạn là REVIEWER ĐỘC LẬP cho batch B1c — CODE ĐÚNG/SAI (PC-11/12/15/16/19). **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — **đọc phần đó trước, KHÔNG cần mở file checklist nào**.
Đọc thêm đúng: `game/src/logic/{economy,save,records,telemetry,i18n}.ts`, `game/config/{ink,skins,album}.json` và `game/tests/logic/{economy,save,records,telemetry,i18n}.test.ts` (không đọc specs/, không quét cây thư mục).

Chấm các mục **C1..C12** theo bối cảnh B1c — bám bằng chứng đo được, không suy đoán. Điều chỉnh trọng số:
- C3 ở B1c = case ring-buffer 10.000 event chạy ĐỦ vòng thật (không `if (i>100) break`) và byte-cap đo bằng `TextEncoder` thật.
- C4 = migrate deterministic: fixture save hỏng/cũ đưa qua `rescueLoad`/`migrateSave` 2 lần ⇒ cùng kết quả.
- C5 = đối chiếu hành vi cứu hộ với THỨ TỰ §4 gói B1c (main→good→fresh+wardrobe) — viết snippet /tmp dựng 3 tổ hợp hỏng và chạy thật.
- C6 = PC-11 (bảng Mực nằm ở config, không hardcode), PC-16 (1 object có `version`, ≤100KB), PC-19 (grep chuỗi hardcode trong src/logic + 9 chuỗi nộp đủ) — rule nào CHƯA cài thật, chỉ rõ.
- C9 edge bắt buộc dò: `parseSave('')`, `version:999`, thiếu `skins_owned`, KV `throw`, streak âm, mua skin giá 0, ring nhận event timestamp nhỏ hơn.

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Chạy lệnh thật (`npm run typecheck && npm run test:logic`, grep) rồi dán số — không tóm tắt thay output.
- Tin nhắn CUỐI PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể.
- Xong trong ≤25 lượt. Thiếu thời gian ⇒ chấm C1/C6/C9 (save+PC-16) trước, ghi rõ mục bỏ dở.

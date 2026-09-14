Bạn là REVIEWER ĐỘC LẬP cho batch B3a — CODE ĐÚNG/SAI. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist C1-C12 + gói ngữ cảnh B3a đã nằm trong system prompt — đọc phần đó trước, KHÔNG cần mở file checklist nào.

Đọc thêm đúng: `game/src/render/**`, `game/src/ui/**`, `game/src/main.ts`, `game/tests/logic/view-b3a-*.test.ts` (không đọc specs/, không quét cây thư mục).

Chấm các mục **C1..C12** — bám bằng chứng đo được (`file:dòng` hoặc số), không suy đoán. C1-C10 hiểu theo bối cảnh render: test xanh THẬT là `npm run gate` (typecheck + test:logic + gate-smell); purity = scene không import gì ngoài phaser + logic + ui + platform.

**BỔ SUNG 3 mục riêng của batch render — bắt buộc chấm:**
- **C-R1 — scene có tính lại nghiệp vụ không**: `grep -rnE "correctIndex|=== *answer|holes\.length" src/render src/ui` — mọi chỗ chạm `correctIndex` chỉ được là TRUYỀN để vẽ (label testid/ẩn-hiện theo state đã chốt từ levelState); nếu thấy SO SÁNH ra đúng/sai, ĐẾM lỗ, hoặc suy sao trong scene ⇒ FAIL kèm file:dòng.
- **C-R2 — text hardcode không**: quét literal chuỗi hiển thị trong `src/render/**`: cho phép `testid-*`, màu hex, key asset; mọi `setText(` phải bọc `t(`. 1 chuỗi EN không qua i18n ⇒ FAIL (PC-19).
- **C-R3 — testid đủ không**: đối chiếu danh sách 20 tên trong pack §6 với các lần `registerTestid(` thật — thiếu 1 tên FAIL; rect đăng ký <44px chiều chạm FAIL thêm (PC-U-05).
- **C-R4 — thông số animation khớp pack §5**: mở bung 140/110 (4→470ms·8→910ms), pop 250/60, explain ≥700, breathe 1200 yoyo repeat 2 idle 5000, màn kế 400, shake ≤4. Số sai lệch trong code mà không có ghi chú duyệt ⇒ FAIL.
- **C-R5 — có win screen trá hình không**: sau state correct phải là PlayScene dựng tờ màn kế + 1 nút UNFOLD; bất kỳ scene "You win"/modal chắn 2 bước ⇒ FAIL (PC-09).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Chạy lệnh thật rồi dán số (không tóm tắt thay output).
Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể.
Xong trong ≤25 lượt. Nếu thiếu thời gian: chấm C-R1..C-R5 + C1-C3 trước, ghi rõ mục nào bỏ dở.

# REVIEW-2 — KIẾN TRÚC & DESIGN PATTERN (code gọn, sạch, dễ mở rộng)

> Phiên review ĐỘC LẬP #2 · session MỚI · **CẤM sửa file trong repo** (được tạo file nháp trong `/tmp` để đo) · mọi kết luận kèm `file:dòng`/bằng chứng.
> Nguồn chuẩn: `docs/ARCHITECTURE.md` (7 ADR + điểm cắm) · `docs/STRUCTURE.md` (bảng pattern ↔ file + ranh giới).
> ⚠️ Nguyên tắc: **1 file = 1 TRÁCH NHIỆM** là tiêu chí chính. **KHÔNG** chấm FAIL theo số dòng (chỉ ghi con số làm cảnh báo).

| # | Tiêu chí | Cách kiểm |
|---|---|---|
| A1 | Ranh giới 1 CHIỀU đúng | `src/logic` không import `render/platform/ui/sdk`; không import ngược tầng; vẽ lại sơ đồ phụ thuộc thật từ import |
| A2 | 1 file = 1 trách nhiệm | mỗi file: trách nhiệm khai báo (STRUCTURE) ↔ trách nhiệm thực tế (đọc code); lệch ⇒ FAIL |
| A3 | Pattern khai báo có THẬT trong code | vd `generator` phải đúng Factory+Seed; `foldRules` đúng Registry+Strategy; nếu file chỉ "đội tên pattern" mà code không phản ánh ⇒ FAIL |
| A4 | Registry/bảng tra thay chuỗi điều kiện | đếm `if/else if` ≥3 nhánh + `switch`; nhánh nào đúng ra phải là dữ liệu ⇒ FAIL |
| A5 | **Phép thử mở rộng**: thêm 1 biến thiên đã biết | thử nháp trong /tmp: thêm 1 `FoldKind` mới ⇒ phải chỉ sửa **bảng dữ liệu** (`FOLD_RULES`) + type. Sửa >2 file ⇒ FAIL (điểm cắm hỏng) |
| A6 | Phụ thuộc INTERFACE, không hardcode nền tảng | tìm `if (platform === ...)`/tên nền tảng trong logic ⇒ FAIL nếu có |
| A7 | Không abstraction THỪA (bọc mù) | interface/class chỉ có 1 cài đặt và không có biến thiên đã biết ⇒ FAIL |
| A8 | Cấu hình = DỮ LIỆU | số chương/màn/ngưỡng/skin không nằm trong code logic |
| A9 | Kích thước/phức tạp (cảnh báo) | ghi số dòng mỗi file + hàm dài nhất; >~150 dòng hoặc hàm >~40 dòng ⇒ ghi cảnh báo, KHÔNG tự FAIL |
| A10 | Đặt tên & comment | tên rõ nghĩa, không viết tắt mơ hồ; comment nêu LÝ DO (không kể lể, không lặp code) |
| A11 | Không lặp logic (DRY thật) | 2 chỗ cùng logic ⇒ FAIL; khác ngữ cảnh mà giống ⇒ cảnh báo |
| A12 | Hàm thuần & state rõ ràng | không side-effect ẩn (ghi biến ngoài, đọc global, đọc thời gian); state là máy trạng thái, không boolean rời rạc |
| A13 | Lỗi/edge xử lý đúng tầng | không nuốt lỗi im lặng (`catch {}`); lỗi lập trình phải ném rõ, lỗi dữ liệu phải trả kết quả có kiểu |
| A14 | Test là lưới an toàn cho refactor | đổi implementation (không đổi hợp đồng) mà test vẫn xanh ⇒ đạt; test chạm vào chi tiết nội bộ ⇒ FAIL |
| A15 | Thước đo 1 câu | "thêm 1 tính năng mới phải sửa bao nhiêu file CŨ?" — >3 ⇒ FAIL kiến trúc (kèm danh sách file) |

**Kết luận bắt buộc:** PASS / FAIL (danh sách A#) + **3 nợ kiến trúc phải trả sớm nhất** + **đề xuất 1 thay đổi nhỏ làm code gọn hơn ngay** (không code hộ).

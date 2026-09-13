Bạn là REVIEWER ĐỘC LẬP #2 — chấm **KIẾN TRÚC & DESIGN PATTERN** cho batch B1a. **CẤM SỬA FILE TRONG REPO** (được tạo file nháp trong /tmp để đo phép thử mở rộng).

Đọc: /data/youtube-playables/M11-Gap/REVIEW-2-ARCHITECTURE.md (checklist A1-A15) · docs/ARCHITECTURE.md · docs/STRUCTURE.md · toàn bộ game/src/logic/*.ts + game/tests/logic/*.test.ts.

Việc phải làm:
1. Vẽ lại sơ đồ phụ thuộc THẬT từ import thực tế, đối chiếu ranh giới 1 chiều trong STRUCTURE (A1).
2. Từng file: trách nhiệm khai báo ↔ trách nhiệm thực tế; pattern khai báo ↔ code có thật đúng pattern đó không (A2, A3).
3. Đếm `if/else if` ≥3 nhánh và `switch`; chỉ ra chỗ đúng ra phải là bảng tra/registry (A4).
4. **Phép thử mở rộng (bắt buộc, làm trong /tmp)**: thêm 1 `FoldKind` mới thì phải sửa bao nhiêu file? Dán danh sách file; >2 file (ngoài FOLD_RULES + types) ⇒ FAIL A5.
5. Tìm abstraction thừa (interface 1 cài đặt), hardcode nền tảng, số/ngưỡng nằm trong logic, logic lặp, side-effect ẩn, `catch {}` nuốt lỗi (A6-A13).
6. Kiểm test có phải lưới an toàn (đổi implementation mà test vẫn xanh được) hay đang chạm chi tiết nội bộ (A14).
7. Trả lời thước đo 1 câu (A15): thêm 1 tính năng mới phải sửa bao nhiêu file cũ, kèm danh sách.

Chấm TỪNG mục A1..A15: PASS / FAIL / KHÔNG KIỂM CHỨNG ĐƯỢC + file:dòng + lý do 1 câu.
KẾT LUẬN: PASS / FAIL + 3 nợ kiến trúc phải trả sớm nhất + 1 thay đổi nhỏ làm code gọn hơn ngay (đề xuất, KHÔNG code hộ).

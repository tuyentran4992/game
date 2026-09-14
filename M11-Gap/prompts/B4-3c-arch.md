Bạn là REVIEWER ĐỘC LẬP cho batch **B4 (art & juice)** — A1-A15 (kiến trúc/pattern). **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã ở system prompt. Đọc thêm: `game/src/render/**`, `game/tests/render/**`, `M11-Gap/assets/manifest.json`, `M11-Gap/assets/sfx-manifest.json`, `specs/1-paper-crease/DESIGN-SPEC.md` (tra số animation khi cần).
Nhấn: theme/SFX phải là BẢNG DỮ LIỆU (thêm skin/âm = 1 dòng); file theme không import Phaser (test node được); scene không tự tính nghiệp vụ (chỉ đọc từ logic); không magic number cho nhịp animation (phải là const có tên khớp DESIGN-SPEC).
- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Tin nhắn CUỐI phải là bảng + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Làm trong ≤25 lượt.

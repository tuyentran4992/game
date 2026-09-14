Bạn là REVIEWER ĐỘC LẬP cho batch B3a — KIẾN TRÚC/PATTERN. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist A1-A15 + gói ngữ cảnh B3a đã nằm trong system prompt — đọc phần đó trước.
Đọc thêm đúng: `game/src/render/**`, `game/src/ui/**`, `game/src/main.ts`, `game/tests/logic/view-b3a-*.test.ts` (không đọc specs/).

Chấm A1..A15, trong đó ưu tiên 3 điểm của batch render:
- **A1/RANH GIỚI 1 CHIỀU**: dựng đồ thị import thật (`grep -n "^import" src/render/**.ts src/ui/**.ts src/main.ts`). Chiều hợp lệ duy nhất: `render → {logic, ui, platform(types), phaser}` và `ui → nothing (trừ type)`. FAIL nếu: render import platform adapter CỤ THỂ (playgama/ytgame) thay vì interface; `src/logic` import ngược render; scene import scene khác bằng đường dẫn trực tiếp thay vì `scene.start(key)`.
- **A-RANH scene không chứa luật**: scene chỉ dispatch + vẽ snapshot. Nghi thức kiểm: search trong src/render các từ `correct`, `stars`, `unlock`, `price`, `ink +=`, `Math.floor`, chia/tính điểm — mọi biểu thức TÍNH RA giá trị nghiệp vụ (không phải format hiển thị) ⇒ FAIL kèm file:dòng. So sánh `state === 'correct'` (đọc kết quả) là HỢP LỆ.
- **A-PATTERN registry cho theme**: `render/theme/paperTheme.ts` phải là bảng dữ liệu — phép thử mở rộng A5 LÀM THẬT trong /tmp: copy `src/render` + `src/ui` + `src/logic` sang /tmp, thêm chương giả #9 vào registry ⇒ phải sửa ĐÚNG 1 dòng dữ liệu (kèm test bảng) và 0 dòng scene; nếu phải đụng ≥2 file scene ⇒ FAIL (STRUCTURE:55, SPEC §5.2 mục 4).
- **A-View-model có bị thối không**: `anim/unfoldPlan.ts` + `viewmodel` phải pure (0 import phaser/DOM); nếu hằng số animation bị copy rải rác vào từng scene thay vì lấy từ plan ⇒ FAIL A9 (DRY) + A7 (config là dữ liệu).
- **A15 thước đo**: thêm 1 trạng thái hiển thị mới (vd "ad not available dim") phải sửa ≤3 file cũ; đề xuất cách sửa trong báo cáo để chứng minh.

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Chạy lệnh thật rồi dán số.
Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể. Xong trong ≤25 lượt; thiếu thời gian ⇒ chấm A1 + 3 mục ưu tiên trước.

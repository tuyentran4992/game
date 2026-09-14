Bạn là REVIEWER ĐỘC LẬP cho batch B3b — KIẾN TRÚC/PATTERN. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist A1-A15 + gói ngữ cảnh B3b đã nằm trong system prompt — đọc trước.
Đọc thêm đúng: `game/src/render/**`, `game/src/ui/**`, `game/src/main.ts`, `game/tests/logic/view-b3b-*.test.ts` (không đọc specs/).

Chấm **A1..A15**, ưu tiên 4 điểm của batch tiến trình:
- **A1 — ranh giới render↔logic 1 CHIỀU**: `grep -n "^import" src/render/**.ts src/ui/**.ts src/main.ts` dựng đồ thị thật. Hợp lệ: `render → {logic, ui, platform(interface), phaser}`; FAIL nếu: scene import adapter cụ thể (playgama/ytgame) thay vì interface; render chạm `localStorage`/`window.ytgame`/`fetch` trực tiếp (save chỉ qua `logic/save` + adapter — ADR-01/PC-15/PC-16); scene này import scene kia bằng path trực tiếp (chỉ `scene.start`).
- **A-RANH scene không chứa luật (PC-07/11/12/18)**: mapModel/scene chỉ SẮP XẾP + VẺ dữ liệu; mọi phép tính ngưỡng sao, giá skin, cap album, điều kiện endgame phải nằm trong `logic/progression|economy`. Kiểm bằng grep số học trên dữ liệu save trong `src/render`: `>= 12`, `ink -`, `price`, `.slice(0`, `stars +=` ⇒ có biểu thức tính nghiệp vụ = FAIL (so sánh state/nhãn hiển thị hợp lệ).
- **A-PATTERN Registry (theme + skin + badge)**: `paperTheme.ts` là bảng; `SkinCard/BadgeIcon` đọc metadata từ `config/*.json` qua economy, không hardcode 8 skin trong scene. Phép thử A5 LÀM THẬT trong /tmp: copy `src/render`+`src/ui`+`src/logic` sang /tmp, thêm skin #9 + theme chương #9 ⇒ chỉ sửa file DỮ LIỆU (config/registry) + test, 0 dòng scene; phải đụng ≥2 file scene ⇒ FAIL (STRUCTURE:51,55).
- **A15 — thêm 1 màn hình meta** (vd tường top-5 records, B-future): đếm số file phải sửa theo cấu trúc hiện tại (đề xuất phương án trong báo cáo); >3 file cũ ⇒ FAIL A15.
- **A2/A6 — viewmodel đúng cỡ**: `mapModel.ts` không được phình thành "logic giả" (chứa luật ⇒ lỗi tầng A11); scene không rỗng tới mức mọi thứ nằm trong main (Composition Root chỉ boot + đăng ký scene — main.ts phải giữ ≤~60 dòng, không có callback nghiệp vụ).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Chạy lệnh thật rồi dán số.
Tin nhắn CUỐI: bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể. ≤25 lượt; thiếu giờ ⇒ A1 + 4 mục ưu tiên trước.

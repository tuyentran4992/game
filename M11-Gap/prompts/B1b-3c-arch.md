Bạn là REVIEWER ĐỘC LẬP cho batch B1b — KIẾN TRÚC/PATTERN. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Phạm vi: `src/logic/levelState.ts` + `src/logic/progression.ts` + 4 file test B1b. B1a đã chấm — chỉ ghi nhận nếu lỗi B1a lan sang 2 file mới.
Chuẩn: pack B1b mục 2-5 (hợp đồng, bảng §6.1, bẫy) + pattern STRUCTURE §2 (`levelState`=State machine, `progression`=Registry).

## Chấm A1..A15, ép riêng B1b
- A1: đồ thị import thật của 2 file mới (grep `^import`) ⇒ chỉ `./types` (+`./rational`); `levelState` ↔ `progression` không được import nhau; không đụng platform/render.
- A2: 1 file 1 trách nhiệm — levelState KHÔNG được tính sao/kinh tế; progression KHÔNG được giữ phase.
- A3: pattern có THẬT — `TRANSITIONS` phải là đồ thị dữ liệu (không phải if/else rải trong từng hàm); `CAMPAIGN` phải là bảng dòng-chương. File "đội tên pattern" mà code là chuỗi nhánh ⇒ FAIL.
- A4: đếm `if/else`/`switch` ≥3 nhánh trong 2 file mới; chuyển phase ≥3 nhánh mà không tra `TRANSITIONS` ⇒ FAIL.
- A5 **phép thử mở rộng (làm THẬT trong /tmp)**: copy `progression.ts` sang /tmp ⇒ (i) thêm chương 9 (`vocab` mới, `revealLevel` 2, layers 8, timer true) phải chỉ sửa 1 dòng bảng + type; (ii) thêm phase 'paused' — đếm số file phải sửa. >2 file (ngoài bảng + type + test) ⇒ FAIL. Không sửa repo.
- A8/A9/A10: số 120/15/12/2 nằm trong const có tên + nguồn, không nằm giữa hàm; không lặp logic với B1a (vd tự viết lại `ceil(level/15)` ở cả 2 nơi trong cùng file); các hàm `tap/resolve/...` thuần, không module-level mutable.
- A11: `explainKey`/`paperTheme`/`FoldVocabId` là ID dữ liệu, không chuỗi hiển thị hardcoded (PC-19, điểm cắm i18n B1c).
- A12: `levelState` là máy trạng thái THẬT — không được dùng 4-5 boolean rời rạc suy ra phase.
- A14: test B1b chỉ gọi hàm export, không chạm chi tiết nội bộ (không import const nội bộ, không test số dòng bảng).
- A15 thước đo: "thêm 1 skin/chương mới sửa bao nhiêu file CŨ?" + `grep` xác nhận 2 file không có nợ khai trong `tools/gate-allow.json` (file này phải KHÔNG đổi so với B1a).

## Quy tắc
- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Lệnh thật, dán output: `cd /data/youtube-playables/M11-Gap/game && npm run gate` (chạy 1 lần, dán khối kết quả) + `grep -nE "^import" src/logic/levelState.ts src/logic/progression.ts` + `wc -l` 2 file.
- Tin nhắn CUỐI PHẢI là bảng kết luận + "3 NỢ KIẾN TRÚC TRẢ SỚM NHẤT" + "1 ĐỀ XUẤT NHỎ LÀM GỌN HƠN" (không code hộ) + "ĐIỂM NGHI NGỜ".
- Xong trong ≤25 lượt; thiếu thời gian ⇒ A1/A3/A5/A12/A15 trước, ghi rõ mục bỏ dở.

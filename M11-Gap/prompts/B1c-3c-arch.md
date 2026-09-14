Bạn là REVIEWER ĐỘC LẬP cho batch B1c — KIẾN TRÚC/PATTERN (economy · save · records · telemetry · i18n). **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — **đọc phần đó trước, KHÔNG cần mở file checklist nào**.
Đọc thêm đúng: `game/src/logic/*.ts` (5 file mới + 5 file B1a để soi ranh giới) và `game/tests/logic/{economy,save,records,telemetry,i18n}.test.ts` (không đọc specs/, không quét cây thư mục).

Chấm các mục **A1..A15** với trọng số B1c:
- A2: mỗi file mới đúng 1 trách nhiệm theo pack §2 — economy không tự parse save, records không chạm KV, telemetry không biết gì về skin, i18n không chứa luật game ⇒ lệch là FAIL.
- A3: pattern PHẢI THẬT — save = migration **chuỗi registry** (thêm version = thêm 1 dòng bảng, không phải sửa switch); telemetry = ring buffer đúng nghĩa (head/size, không phải array splice rải rác); economy = bảng tra data-driven; i18n = dictionary registry.
- A4: đếm `if/else if` ≥3 nhánh + `switch` trong 5 file mới — cứu hộ save (§4 pack) là chuỗi BƯỚC có thứ tự, chấp nhận được; bảng giá/hệ số nằm TRONG code thay config ⇒ FAIL.
- A5 **phép thử mở rộng làm thật trong /tmp** (copy src sang /tmp rồi sửa, không đụng repo):
  (a) thêm `version 2` với 1 field mới ⇒ phải chỉ thêm 1 hàm migrate + 1 dòng registry — sửa >2 file ⇒ FAIL;
  (b) thêm skin thứ 9 + badge thứ 7 ⇒ chỉ thêm dòng config;
  (c) thêm ngôn ngữ `vi` ⇒ chỉ thêm dictionary, không sửa hàm `t`.
- A8/A12: `SaveV1` field khớp ĐÚNG tên §3 pack (checklist file:dòng); mọi hàm export có mutated input không (đòi THUẦN).
- A11/A12 pack §8: có `catch {}` nuốt im lặng nào không; có tham số thời gian ngầm không (`Date` bị cấm — ai lách bằng default param đọc giờ ⇒ FAIL).
- A14: test B1c chạm chi tiết nội bộ (số dòng registry, tên biến private qua export tạm) ⇒ FAIL.
- A15: "thêm 1 tính năng kinh tế mới (vd ruy băng/streak dài hạn) phải sửa bao nhiêu file CŨ?" — >3 ⇒ FAIL kèm danh sách file.
- API chết: export không test nào dùng và không nằm trong pack §2 ⇒ liệt kê, đề xuất xoá (cảnh báo, không FAIL nếu ≤3).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Chạy lệnh thật (`npm run typecheck && npm run test:logic`, `grep -n "^import" src/logic/*.ts` dựng đồ thị phụ thuộc) rồi dán số.
- Tin nhắn CUỐI PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT" + 3 nợ kiến trúc nên trả sớm nhất + 1 đề xuất gọn hoá (không code hộ). Ngắn nhất có thể.
- Xong trong ≤25 lượt. Thiếu thời gian ⇒ A1/A2/A5 trước, ghi rõ mục bỏ dở.

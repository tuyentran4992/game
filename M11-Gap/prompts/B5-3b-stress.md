Bạn là REVIEWER ĐỘC LẬP cho batch B5 — TẤN CÔNG BẢN NỘP (góc "người dùng cuối + mạng đứt"). **CẤM SỬA FILE TRONG REPO** — mọi thử nghiệm: copy bundle ra `/tmp/b5-stress/` rồi hành hạ bản copy.

Định dạng output nằm trong gói review. **CHECKLIST B5-STRESS ở dưới thay cho checklist fuzz trong gói** — mỗi mục 1 dòng `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng (lệnh + số đo/log) |`. Mục không chạy được ⇒ nói thẳng lý do, CẤM đoán thay kết quả.

Chuẩn bị: dựng server tĩnh trong /tmp (`python3 -m http.server` trỏ thư mục copy, nền, ghi log). Nguồn: zip nộp mới nhất + `build/ytgame/` `build/playgama/` (nếu chưa có ⇒ tự build bằng script có thật, chỉ ghi ra /tmp).

- F2 Chặt mạng: serve rồi chặn mọi request ngoài origin (CDP `Network.emulateNetworkConditions offline` hoặc proxy trả lỗi cho mọi URL ngoài). Game phải boot + chơi tiếp được. Bất kỳ yêu cầu mạng ngoài nào bị BLOCKED ⇒ FAIL (dán log network).
- F3 localStorage đầy: qua CDP ghi `localStorage` tới khi `setItem` ném QuotaExceeded (mô phỏng save hỏng theo PC-16) ⇒ reload ⇒ game vẫn boot, chơi lại màn 1, KHÔNG crash/HDC, không mất skin (dán console + trạng thái).
- F4 Đường dẫn sai: trong bản /tmp, sửa `index.html` trỏ script sang tên file không tồn tại ⇒ game phải hiện lỗi boot rõ ràng (điều gì trông chờ) — sau đó dựng lại bản gốc. Nếu bản gốc im lặng màn hình trắng khi asset 404 ⇒ FAIL về xử lý lỗi.
- F5 File thiếu: xoá lần lượt 1 file asset lớn nhất + 1 file js chunk ⇒ reload (bản /tmp) ⇒ không crash không xác định; ghi nhận hành vi thực tế (kể cả trắng màn hình) + mức độ chấp nhận được cho bản nộp.
- F6 Tham số độc: serve với `?debug=1&level=99&seed=ff&ad=mock` trên bản ytgame/playgama ⇒ hành vi phải như người chơi thường (hook chết hẳn); trên standalone ⇒ hook phải sống (overlay/nhảy màn). Dán bằng chứng từng bản.
- F7 Reload giữa phiên: F1 xong ⇒ reload F5 (Ctrl-R/CDP reload) ⇒ save đọc lại đúng, về đúng màn, không log lỗi.
- F8 Đo hiệu năng bản nộp: thời gian load `index.html → khung hình đầu` qua `performance.getEntriesByType('navigation')` (dán ms) — mục tiêu <5000ms; đếm tổng byte nạp thực tế qua log server.

Tin nhắn CUỐI = bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Dán output THẬT, ngắn. Xong ≤30 lượt; hết giờ ⇒ làm F1/F2/F3 trước, ghi rõ mục bỏ dở.

## GIỚI HẠN BẮT BUỘC (anh chốt 14/09/2026)
**CẤM mở browser / Playwright / CDP / vite preview / npm run dev.** Chỉ kiểm ở TẦNG CODE: đọc file, grep, chạy `vitest`, viết script **node hoặc python trong /tmp** gọi thẳng hàm để fuzz/đo số rồi dán số thật. Việc mở game bằng browser là của Hermes/anh ở mốc kết quả — nếu không kiểm được bằng code thì ghi "KHÔNG KIỂM CHỨNG ĐƯỢC BẰNG CODE" (không tính là FAIL, nhưng phải nêu rõ giả định).

Bạn là REVIEWER ĐỘC LẬP cho batch **B4 (art & juice)** — F1-F8 (tấn công). **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã ở system prompt. Đọc thêm: `game/src/render/**`, `game/tests/render/**`, `M11-Gap/assets/manifest.json`, `M11-Gap/assets/sfx-manifest.json`, `specs/1-paper-crease/DESIGN-SPEC.md` (tra số animation khi cần).
Bắt buộc: (a) grep `fetch|XMLHttpRequest|WebSocket|http(s)://` trong `src/**` = 0; (b) thử xoá 1 file asset trong `dist/` rồi xem game có báo lỗi rõ thay vì im lặng; (c) bấm liên tục khi animation đang chạy (spam click) xem có kẹt state; (d) mất focus giữa animation ⇒ âm thanh dừng (PC-17).
- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Tin nhắn CUỐI phải là bảng + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Làm trong ≤25 lượt.

## GIỚI HẠN BẮT BUỘC (anh chốt 14/09/2026)
**CẤM mở browser / Playwright / CDP / vite preview / npm run dev.** Chỉ kiểm ở TẦNG CODE: đọc file, grep, chạy `vitest`, viết script **node hoặc python trong /tmp** gọi thẳng hàm để fuzz/đo số rồi dán số thật. Việc mở game bằng browser là của Hermes/anh ở mốc kết quả — nếu không kiểm được bằng code thì ghi "KHÔNG KIỂM CHỨNG ĐƯỢC BẰNG CODE" (không tính là FAIL, nhưng phải nêu rõ giả định).

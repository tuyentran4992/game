Bạn là REVIEWER ĐỘC LẬP cho batch B3a — TẤN CÔNG/STRESS. **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist F1-F8 + gói ngữ cảnh B3a đã nằm trong system prompt — đọc phần đó trước, KHÔNG cần mở file nào thêm.
Đọc thêm đúng: `game/src/render/**`, `game/src/ui/**`, `game/tests/logic/view-b3a-*.test.ts`.


**4 kịch bản stress bắt buộc (đây là trọng tâm batch render):**
- **S1 — bấm nút nhanh**: spam `testid-option-*` + `testid-btn-hint` + `testid-btn-undo` liên tục <50ms/cú (kể cả spam Enter/1-4 bàn phím). Kỳ vọng: đúng 1 lượt được tính (PC-05); cú bấm rơi vào lúc animate bị buffer, KHÔNG mất lượt, KHÔNG 2 lượt, KHÔNG uncaught error; HUD stars/ink không nhảy sai (E2E PC-L-05).
- **S2 — timer hết giờ / chương 7**: vào `?debug=1&level=98&seed=qa` (màn có timer); để đồng hồ chạy hết. Kỳ vọng: hành vi game-over do logic trả về, scene chỉ vẽ; không NaN/âm trên mặt đồng hồ; bấm đúng nhịp 50ms trước vạch 0 ⇒ không crash race.
- **S3 — mất focus**: `document.hidden`/blur giữa tween mở bung và giữa màn có timer. Kỳ vọng: timer + animate + nhạc dừng (PC-17), resume đúng frame — KHÔNG chạy bù bằng `Date.now` (grep source: `performance.now|Date.now` trong src/render ⇒ phải 0, trừ code có chú thích vì sao).
- **S4 — resize 4 tỷ lệ**: 1080×1920 → 1920×1080 → 1080×1080 → 2560×1080, mỗi lần đổi khi ĐANG ở giữa màn (đã hint 1 lần). Kỳ vọng: không vỡ layout, sheet không cắt, HUD không đè playfield, **đề không đổi state** (E2E PC-R-04), rect `window.__pcTestids` cập nhật theo (testid cũ mà rect cũ = S1 sẽ click hụt — verify rect sau resize).

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |` — dán số đo thật (ms giữa 2 cú bấm, số error console, kích thước rect trước/sau resize).
Thêm 2 mục phụ: **S5 — reload 3 lần liên tiếp** vào title: 0 exception, 0 white flash >1 frame (PC-B-04) · **S6 — network tab**: lọc ngoài localhost ⇒ 0 request (PC-15/E2E PC-B-03).
Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể. Xong trong ≤25 lượt; thiếu thời gian ⇒ chấm S1-S4 trước.

## GIỚI HẠN BẮT BUỘC (anh chốt 14/09/2026)
**CẤM mở browser / Playwright / CDP / vite preview / npm run dev.** Chỉ kiểm ở TẦNG CODE: đọc file, grep, chạy `vitest`, viết script **node hoặc python trong /tmp** gọi thẳng hàm để fuzz/đo số rồi dán số thật. Việc mở game bằng browser là của Hermes/anh ở mốc kết quả — nếu không kiểm được bằng code thì ghi "KHÔNG KIỂM CHỨNG ĐƯỢC BẰNG CODE" (không tính là FAIL, nhưng phải nêu rõ giả định).

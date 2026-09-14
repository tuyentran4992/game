Bạn là REVIEWER ĐỘC LẬP cho batch B2 — CODE ĐÚNG/SAI (nền tảng: `platform/*` + debug hooks). **CẤM SỬA FILE TRONG REPO** (nháp trong /tmp thì được).

Luật phiên + checklist + lệnh + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — **đọc phần đó trước, KHÔNG cần mở file checklist nào**.
Đọc thêm đúng: `game/src/platform/*.ts`, `game/src/main.ts`, `game/tests/platform/*.test.ts` (không đọc specs/, không quét cây thư mục, không chấm `src/logic`).

Chấm các mục **C1..C12** (checklist REVIEW-1-CODE.md, áp vào B2) — bám bằng chứng đo được, không suy đoán. Trọng tâm B2:
- C1: `cd /data/youtube-playables/M11-Gap/game && npm run gate` — dán số pass/fail thật.
- C6: PC-13/14/17/20 implement THẬT tới đâu — trỏ file:dòng từng rule; rule nào chỉ ở test/mock ⇒ nêu rõ chưa có trong adapter.
- C8 + cổng riêng B2: chạy grep mạng trong pack §7 (`fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|navigator.connection|https?://` trên `src/**/*.ts`) ⇒ phải 0; grep `window|document|localStorage` ngoài `src/platform/` + `main.ts` ⇒ phải 0.
- C10: input xấu — `?level=abc/-9/1.5/1e6`, `?seed=zz`, bridge thiếu hàm, storage ném ⇒ hành vi xác định, không crash im lặng.
- C12: không `console.log` lọt vào adapter (debug overlay nếu có phải sau cờ `debug`).

- Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`.
- Chạy lệnh thật rồi dán số (không tóm tắt thay output).
- Tin nhắn CUỐI của bạn PHẢI là bảng kết luận + "ĐIỂM NGHI NGỜ" + "3 RỦI RO LỚN NHẤT". Ngắn nhất có thể.
- Xong trong ≤25 lượt. Nếu thiếu thời gian: chấm mục quan trọng trước (C1, C6, C8), ghi rõ mục nào bỏ dở.

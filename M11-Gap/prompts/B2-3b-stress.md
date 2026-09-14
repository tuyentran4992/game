Bạn là REVIEWER ĐỘC LẬP cho batch B2 — TẤN CÔNG/STRESS (góc "phá SDK giả", không phải "đọc code"). **CẤM SỬA FILE TRONG REPO** — viết script nháp trong `/tmp` (vitest không cần: dựng `npx tsx`-free — dùng `node --experimental-strip-types` hoặc compile tạm bằng `npx tsc` vào /tmp; cấm npm install) và dán output thật.

Luật phiên + checklist + ĐỊNH DẠNG OUTPUT đã nằm trong system prompt (gói review) — đọc trước, KHÔNG mở file checklist.
Đọc thêm đúng: `game/src/platform/*.ts`, `game/src/main.ts`, `game/tests/platform/*.test.ts`.

Đòn kiểm F1..F8 (dịch từ REVIEW-3-STRESS.md sang B2 — mục tiêu: ca mà test của tác giả KHÔNG phủ):
- F1 SDK giả THIẾU HÀM: bridge Playgama/ytgame chỉ còn 1 nửa method (xoá `saveData`, `ads` undefined, lifecycle null) ⇒ adapter phải degraded an toàn, không `TypeError` thoát ra ngoài.
- F2 SDK giả NÉM LỖI: mọi method bridge `throw` (kể cả giữa promise — trả `Promise.reject`) ⇒ game loop vẫn chạy trọn 5 màn, lỗi chỉ vào log (`save_error`), không unhandled rejection.
- F3 SDK giả TREO: method trả promise KHÔNG BAO GIỜ resolve (`new Promise(()=>{})`) ⇒ gọi `showRewarded` có timeout/fallback không? Ghi rõ adapter nào treo vô hạn ⇒ FAIL PC-20 (state §7 "Ad không load" phải không chặn game).
- F4 `?ad=mock` mọi tổ hợp: rewarded/interstitial × ok/fail/timeout ⇒ hành vi xác định cả 6 ô; mock trả sai kiểu (string thay object, null) ⇒ không crash.
- F5 Seed/level rác: `?seed=` 200 chuỗi rác (unicode, `0x`, số âm, 1e309, rỗng lặp 1000 ký tự) × `?level=` rác ⇒ `parseDebugQuery` tổng hợp được 100% input, không exception, output luôn đúng kiểu đã chốt.
- F6 Determinism hooks: cùng query string 100 lần ⇒ `DebugFlags` deep-equal; `?seed=<hex>` cố định ⇒ `levelSpec` trả đề giống hệt 2 lần chạy (nối với `src/logic/generator` qua import thường).
- F7 CẤM MẠNG: chạy `grep -rnE '\bfetch\s*\(|XMLHttpRequest|WebSocket' game/src --include='*.ts'` ⇒ PHẢI = 0 (dán output). Mở rộng: `EventSource|sendBeacon|importScripts|navigator\.connection|https?://`. Sau đó chạy toàn bộ tests/platform với `globalThis.fetch/XHR/WebSocket` đặt thành hàm ghi lời gọi ⇒ 0 lời gọi.
- F8 Test tự-làm-oracle: chỉ ra case nào chỉ so implementation với chính nó (vd mock trả gì assert nấy) vs case nào chốt bằng con số/bảng độc lập. Liệt kê ca test xanh nhưng hành vi sai.

Mỗi mục 1 dòng: `| mã | PASS/FAIL/KHÔNG KIỂM CHỨNG ĐƯỢC | bằng chứng file:dòng hoặc số đo |`. Dán số đo thật, không tóm tắt thay.
Tin nhắn CUỐI PHẢI là bảng kết luận + mọi ca làm adapter sai/chết kèm repro tối thiểu (input → output thật vs mong đợi) + "3 RỦI RO LỚN NHẤT". Không tìm thấy lỗi ⇒ ghi rõ ĐÃ THỬ những gì.
Xong trong ≤25 lượt; thiếu giờ thì ưu tiên F3, F7.

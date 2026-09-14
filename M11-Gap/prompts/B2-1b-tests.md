Bạn là dev viết test cho game TypeScript — BƯỚC 1 của batch B2, NỬA SAU: 4 debug hooks + cổng "0 call mạng". Đọc trước khi viết:
- /data/youtube-playables/M11-Gap/harness/packs/b2.md (§4 debug hooks nguyên văn SPEC §5.4, §7 lệnh grep cấm mạng, §8 điều kiện vitest environment node)
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/SPEC.md (mục 5.4 — chỉ mục này, không đọc lan man)
- src/logic/types.ts (chữ ký `levelSpec(seed, levelIndex, cfg)` để test hook nối đúng)

NHIỆM VỤ: viết bộ test (file src chưa tồn tại ⇒ test PHẢI ĐỎ):
1. `tests/platform/debug.test.ts` — test `parseDebugQuery(search: string) -> DebugFlags` (hàm THUẦN, không đọc `window`):
   - `?debug=1` ⇒ bật overlay; `?debug=0`/absent ⇒ tắt.
   - `?level=23` ⇒ levelIndex 23 + cờ "không ghi save thật" (hook này bật chế độ ephemeral save); các giá trị rác `level=abc`, `level=-9`, `level=0`, `level=1e6`, `level=1.5` ⇒ hành vi XÁC ĐỊNH (fallback về null/không bật), không NaN lọt ra ngoài.
   - `?seed=<hex>` ⇒ seed số hợp lệ; `?seed=zz`, rỗng ⇒ xác định, không crash.
   - `?ad=mock` ⇒ cờ bật mock ads; tổ hợp `?debug=1&seed=...&level=...&ad=mock` (đúng kiểu E2E dùng) ⇒ đủ 4 cờ độc lập, không suy ra nhau.
   - Chuỗi search rác tổng quát (`?`, `?=&`, `?level`) ⇒ không exception.
2. `tests/platform/network-ban.test.ts` — cổng grep bằng máy, chạy trong vitest (đọc file bằng `node:fs`, scan src, không cần browser):
   - Quét `src/**/*.ts`: 0 kết quả `\bfetch\s*\(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `navigator.connection`, `https?://` (kể cả comment — bài học B1a: gate-smell phải strip comment vì JSDoc từng bị bắt oan, ở đây TA CỐT bắt cả comment nên scan text thô). Trừ: không có ngoại lệ nào — pack §7 ghi cấm tuyệt đối.
   - Quét `src/logic/**`: 0 import `phaser`/`@game/sdk`/`platform`/`window`/`document` (chống hồi quy ADR-01).
   - Boot null adapter + chạy 5 lượt vòng lặp screen với `globalThis.fetch` bị thay bằng hàm GHI LẠI lời gọi ⇒ 0 lời gọi bị ghi (kiểm runtime, không chỉ text — cùng mục đích TC-NET-05 bằng đường khác).
3. `tests/platform/ad-mock.test.ts` — `?ad=mock` (qua `DebugFlags`, không qua window): mock trả `rewarded: 'ok'` ⇒ caller nhận hoàn thành; `'fail'` ⇒ nhận unavailable, không treo; HẸN GIỜ timeout (kích thước hàm nhận `result: 'timeout'`) ⇒ hết chờ, luồng chạy tiếp 0 exception (PC-20, TC-AD-07); thứ tự lời gọi được recorder ghi lại đúng.

QUY TẮC:
- Tên hàm/field: `parseDebugQuery(search)`, `DebugFlags { debug, level, seed, adMock }` là hợp đồng ĐẶT RA Ở TEST NÀY (pack chỉ chốt 4 hook, không chốt tên) — chú thích `// tên chốt ở test này` cạnh import; code phải theo.
- Fake tự dựng, assert giá trị cụ thể, mỗi `it()` ghi rule (PC-15/PC-20 + SPEC §5.4). Mục tiêu 20-35 case.
- KHÔNG gọi mạng thật, KHÔNG đọc `window.location` trong test (môi trường node) — truyền chuỗi `search` thẳng vào hàm thuần.
- Chỉ tạo/sửa trong `game/tests/platform/`. CẤM sửa `src/`, `tests/logic/`, package.json, specs/, docs/.

LỆNH CHỨNG MINH ĐỎ: `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/platform` (toàn bộ tests/platform, gồm nửa 1a nếu đã tồn tại — file nào chưa đỏ được thì ghi rõ trong báo cáo).
KHÔNG commit/push. Xong trong ≤90 lượt.

BÁO CÁO CUỐI: file test đã tạo · tổng case · output đỏ THẬT · tên `DebugFlags`/`parseDebugQuery` đã chốt · số kết quả grep mạng tìm thấy lúc này (phải là 0 vì src/platform chưa có code).

Bạn là dev TypeScript — MỘT TÁC GIẢ duy nhất của batch B2: implement `src/platform/` + `debug.ts` + nối `main.ts` để bộ test B2 đang ĐỎ chuyển XANH.

Đọc trước khi code:
- /data/youtube-playables/M11-Gap/harness/packs/b2.md (hợp đồng tên, Null Object, 4 hook, luật cấm mạng, điều kiện node/no-DOM)
- game/tests/platform/*.test.ts — ĐÂY LÀ HỢP ĐỒNG: test đã chốt tên (`PlatformAdapter`, `platformRegistry`, `parseDebugQuery`, `DebugFlags`, tên nhà máy adapter...). CẤM ĐỔI HỢP ĐỒNG: không đổi tên/kiều/tham số mà test đã import; nếu 2 nửa test (1a vs 1b) mâu thuẫn tên ⇒ chọn tên trong file test, KHÔNG sửa test, ghi vào mục "PHẢI LỆCH" của báo cáo.
- docs/STRUCTURE.md §1/§4 (cây file + pattern ↔ file) · src/logic/types.ts (chỉ đọc).

FILE ĐƯỢC PHÉP (chỉ những file này):
- Tạo: `src/platform/types.ts` · `nullAdapter.ts` · `standaloneAdapter` nếu test tách riêng (xem test mà quyết, đừng thừa file) · `playgamaAdapter.ts` · `ytgameAdapter.ts` · `sdkAdapter.ts` · `index.ts` (factory + `platformRegistry`) · `debug.ts` · `adMock.ts` (nếu test đòi tách mock ads khỏi debug)
- Sửa: `src/main.ts` (composition root: parseDebugQuery → factory → gắn hook vào vòng boot; placeholder hiện tại được phép thay hết)
- Sửa ĐÚNG 1 dòng trong `package.json`: `"test:logic": "vitest run tests/logic tests/platform"` để cổng gộp cả B2.
- CẤM: mọi file `src/logic/**`, `tests/**`, `specs/`, `docs/`, `index.html`, `vite.config.ts`, tạo `src/utils.ts`/helper chung.

RÀNG BUỘC CỨNG:
1. Chỉ `src/platform/` + `main.ts` được chạm DOM/global (`window`, `localStorage`, `document`, `location`). Logic/render không biết nền tảng (ranh giới STRUCTURE §3).
2. PC-15: `src/**/*.ts` không được chứa `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`sendBeacon`/`importScripts`/`navigator.connection`/`http(s)://` — tính cả comment (test network-ban scan text thô). SDK bridge = object TIÊM VÀO (tham số hoặc global đã có sẵn do chủ nhà dựng), adapter không tự tạo request, không tự bịa URL.
3. Null Object THẬT (PC-20): `nullAdapter` không ném ở mọi method; ads trả unavailable ngay; storage lỗi ⇒ nuốt lỗi + chơi tiếp (DATA-MODEL §7.2.5). Không rải `if (cóAds)`.
4. Debug hooks theo đúng SPEC §5.4: `?level=NN` KHÔNG ghi save thật (route save qua bản in-memory khi flag bật); `?seed=<hex>` khoá seed; `?ad=mock` thay ads bằng mock cấu hình được; parse là hàm THUẦN nhận string, `main.ts` truyền `location.search` vào — nhờ vậy test chạy được trong node.
5. Adapter đọc global LAZY lúc gọi (vitest environment node, không có `window` lúc import).
6. Mỗi file 1 trách nhiệm + header `// Pattern: <tên>` (Strategy / Null Object / Factory / Registry). ≥3 nhánh ⇒ bảng tra. CẤM `any`, `@ts-ignore`, `Math.random`, `Date.now` trong logic (adapter được dùng thời gian CHỈ cho timeout mock nếu test đòi — ưu tiên inject hàm thời gian).
7. Không bịa tên SDK: API cầu Playgama/ytgame chưa có trong repo ⇒ định nghĩa interface bridge TỐI GIẢN ngay trong adapter file (vd `interface PlaygamaBridge {...}`), nhận bridge qua tham số tạo adapter; phần dò SDK thật là nợ B5, ghi chú 1 dòng.

TRÌNH TỰ BẮT BUỘC (thang ưu tiên khi sắp hết lượt):
(1) `npm run typecheck` XANH → (2) `npx vitest run tests/platform` XANH → (3) gate gộp XANH → (4) báo cáo.
CHẠY `cd /data/youtube-playables/M11-Gap/game && npm run gate` ĐÚNG 1 LẦN ở cuối (trước đó chỉ chạy lệnh narrowly như ở trên; đừng lặp typecheck/vitest tràn lan). Gate đỏ ⇒ sửa ⇒ chạy lại (tối đa 2 lần).

BÁO CÁO CUỐI (ngắn):
- Danh sách file tạo/sửa + 1 câu trách nhiệm/file.
- Bảng PC-13/14/17/20 → file implement (rule nào chỉ chạm 1 phần ⇒ ghi rõ, đừng tuyên bố quá).
- Output THẬT của `npm run gate` (lọc `| tail -20`) + kết quả lệnh grep mạng trong pack §7 (dán thật, phải ra `0 MẠNG`).
- Số test trước/sau. Việc KHÔNG LÀM ĐƯỢC + lý do. Mọi chỗ lệch hợp đồng/test + lý do. KHÔNG commit/push.

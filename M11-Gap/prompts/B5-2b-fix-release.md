Bạn là dev build/packaging TypeScript+Vite. **VÒNG ĐÁNH BÓNG 1 — làm 3 bundle nộp PASS `tools/check-bundle.mjs`.** 3 việc, đúng thứ tự.

## Bối cảnh (số thật, không cần điều tra lại)
Build cả 3 mode đều OK (`vite build --mode <x>`, ~11s, 2,7MB). Kiểm bằng `node tools/check-bundle.mjs <dir> --channel <x>`:
- `standalone` → **PASS**
- `ytgame` → **FAIL 5 vi phạm**: `debug-surface:global(location)` 1 · `.search` 2 · `query-key(debug|seed)` 2 · `ad-value("mock")` 1 · `remote-url:vendor-hosts-ngoai-prefix` 15
- `playgama` → **FAIL 6 vi phạm**: y hệt ytgame + **"thiếu playgama-bridge-config.json trong bundle"**
Gói ngữ cảnh + luật bundle đã ở system prompt. **CẤM mở browser/Playwright/CDP/`vite preview`** — chỉ dùng node/vite/grep.

## V1 — STRIP debug hook khỏi build NỘP (ytgame, playgama)
Hiện `?debug` `?level` `?seed` `?ad=mock` + `location.search` **còn nguyên** trong bundle nộp ⇒ vi phạm luật (SPEC: debug hook bị strip khỏi bản nộp; `standalone` là kênh dev nên ĐƯỢC phép giữ).
- Cách làm sạch: đưa toàn bộ mặt debug vào **một cửa duy nhất** và biến nó thành **dead code** ở mode release (ví dụ nhánh `import.meta.env.MODE === 'standalone'` quanh `parseDebugQuery`/adapter mock, hoặc `define` trong `vite.config.ts` với hằng `__DEV_TOOLS__` để Rollup tree-shake). Chọn cách khiến **chuỗi** `?debug`/`seed`/`ad=mock`/`location.search` **không còn trong file .js của bundle nộp**.
- Yêu cầu bằng chứng: sau khi build lại, dán output `grep -c` các chuỗi đó trong `dist/assets/*.js` của **ytgame** (phải = 0) và của **standalone** (được phép > 0).

## V2 — playgama phải CÓ `playgama-bridge-config.json` trong bundle
Thêm bước copy file cấu hình bridge vào gốc bundle ở mode `playgama` (làm trong `scripts/build-channels.sh`/bước build, **cấm hardcode**: danh sách file cần copy là dữ liệu). Chứng minh: `ls` file đó trong bundle playgama + `check-bundle --channel playgama` không còn báo thiếu.

## V3 — Luật `remote-url:vendor-hosts-ngoai-prefix` phải MIỄN chunk engine
15 hit hiện nằm trong `assets/vendor-phaser-*.js` (chuỗi nội bộ của engine như `phaser.io`) — luật này sinh ra để bắt **URL do MÌNH thêm**, không phải URL trong engine. Sửa `tools/check-bundle.mjs`: áp cùng cơ chế whitelist `@vendor` như các rule network khác, **nhưng vẫn in số hit vendor ở dạng `audit`** để không giấu thông tin. KHÔNG nới luật cho file code của mình.

## XONG KHI (bắt buộc dán output thật)
1. `bash scripts/build-channels.sh` (hoặc lần lượt 3 lệnh build) chạy sạch.
2. `node tools/check-bundle.mjs <dist-standalone> --channel standalone` → **PASS**
3. … `--channel ytgame` → **PASS** (0 URL ngoài, 0 debug surface)
4. … `--channel playgama` → **PASS** (đúng 1 URL bridge + có bridge-config)
5. `npm run gate` xanh (typecheck + test + gate-smell; mục "NỢ ĐÃ KHAI" bỏ qua).
Chỉ sửa `game/scripts/**`, `game/tools/check-bundle.mjs`, `game/vite.config.ts`, `game/src/platform/**`, `game/index.html` (nếu cần). **CẤM** sửa `src/logic/**`, `harness/**`, `specs/**`; KHÔNG commit/push.
BÁO CÁO: mỗi mục V1-V3 → file:dòng + 1 câu · 4 output kiểm ở trên · việc không làm được.

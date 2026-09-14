Bạn là dev build/packaging. Thực hiện batch B5: cổng kiểm bundle + hồ sơ nộp + quy trình build 3 nền tảng cho Paper Crease.

Đọc trước: `harness/packs/b5.md` (script thật + luật + lệnh, đã trích sẵn — không cần đọc lại specs) · `game/package.json` · `game/vite.config.ts` · mẫu CHỈ-ĐỌC `/data/youtube-playables/M1-Rescue-Dodge/games/buzz-blitz.yaml` và `/data/youtube-playables/M1-Rescue-Dodge/metadata/metadata.json`.

PHẠM VI FILE (chỉ được tạo/sửa trong M11-Gap):
1. `game/tools/check-bundle.mjs` — cổng kiểm bundle. CLI: `node tools/check-bundle.mjs <dir> --channel <ytgame|playgama|standalone>`, exit ≠ 0 nếu vi phạm. Luật để dạng BẢNG DỮ LIỆU (pattern + limit), ≥3 nhánh ⇒ registry, không if/else dây. Bắt buộc kiểm: debug-hook (`?debug` `?level=` `?seed=` `?ad=mock`, channel nộp phải 0), network (`fetch(` `XMLHttpRequest` `WebSocket` `sendBeacon`; ytgame cả `https?://` = 0; playgama whitelist ĐÚNG 1 URL `bridge.playgama.com/v2/stable/playgama-bridge.js` — bản standalone bỏ qua luật debug), kích thước (tổng thư mục, file to nhất ≤512KB), đường dẫn asset (`index.html` không còn `/src/`, mọi `src=`/`href=` trỏ file CÓ THẬT), còn tên cũ "GẤP".
2. `game/metadata/metadata.json` + `M11-Gap/games/paper-crease.yaml` theo đúng schema mẫu. Version lấy từ `package.json` — KHÔNG hardcode ở nơi khác. title ≤50 ký tự, short_desc + how_to_play ≤150 ký tự TIẾNG ANH, publisher như mẫu. Thumbnail/preview: KHÔNG tạo file giả — nếu thiếu thì ghi "thiếu, chờ B4" vào báo cáo.
3. Quy trình build: chạy đúng thứ tự trong pack §"Quy trình build" (build từng mode → copy `dist/ → build/<mode>/` NGAY → check-bundle). Không sửa `vite.config.ts` để đổi outDir.

CẤM: sửa `packages/pipeline/**` · sửa source `src/` để "lách" cổng (thấy lỗi ở đâu BÁO ở đó) · thêm script mạng/CDN · commit/push.

TRƯỚC KHI BÁO XONG — chạy THẬT và dán output từng bước (lọc `| tail -20`):
- `cd /data/youtube-playables/M11-Gap/game && npm run gate`
- `npm run build:ytgame && npm run build:playgama && npm run build:standalone` (mỗi cái kèm `node tools/check-bundle.mjs build/<mode> --channel <mode>` sau bước copy)
- `cd /data/youtube-playables/packages/pipeline/src && python3 -m pipeline validate --game-dir /data/youtube-playables/M11-Gap`
- `cd /data/youtube-playables && bash scripts/verify_game.sh M11-Gap`
- Chứng minh check-bundle KHÔNG vô nghĩa: copy 1 bundle sang /tmp, chèn tay `fetch('http://x')` + `?debug=1` vào file js, chạy check ⇒ phải FAIL (dán output), xoá thư mục /tmp.

Nếu build fail vì nợ batch trước (B2–B4 chưa xong) ⇒ không vá hộ: liệt kê chính xác lỗi + file gây lỗi, báo "CHẶN Ở B< n>".

BÁO CÁO: file đã tạo · output thật các lệnh · số đo (byte từng bundle, số match từng pattern) · mục nào KHÔNG LÀM ĐƯỢC + lý do.

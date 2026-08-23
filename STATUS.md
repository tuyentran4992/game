# YOUTUBE PLAYABLES GAMES — BUSINESS STATUS (cập nhật 2026-08-22)

> Tài liệu nguồn để lần sau TIẾP TỤC business này. Đọc trước, không bắt đầu lại từ đầu.
> Mỗi lần làm xong 1 game/1 bước → CẬP NHẬT file này cho session sau.

---

## 1. TÓM TẮT BUSINESS
- Mô hình: làm **casual HTML5 game** đưa lên **YouTube Playables** (chơi ngay trên app, Google host, chi phí UA ≈ 0). Google cho game CẤM tự nhét ads/IAP — tiền qua **SDK ads** (pre-roll/interstitial/rewarded) + revenue-share pilot (qua **Mediacube**), IAP mở khi 2027.
- Chiến lược **factory**: nhiều game thể loại khác nhau (đa dạng, giảm rủi ro) — KHÔNG kỳ vọng 1 game ăn ngay.
- Tech: **Phaser 3 (TS+vite)** + **pipeline Python 3.11+** (scaffold/assets/validate/package) + **AI-Box WAN 2.7** gen asset + **Claude Code GLM-5.2** viết code.
- Repo: **https://github.com/tuyentran4992/game** (private) — chứa nhiều module M1, M2...
- Thư mục local business: **/data/youtube-playables/**

## 2. HIỆN TRẠNG 2 GAME (DONE)

### M1 — "Cuu Meo" (`M1-Rescue-Dodge/`) — rescue/dodge, mèo né ong ✅ HOÀN CHỈNH
- 5 file SPEC đủ (SPEC/DESIGN-SPEC/DATA-MODEL/TEST-CASES/E2E) + `games/cuu-meo.yaml` + `game/` + pipeline copy.
- Gameplay: mèo né ong 3 lane; input = chạm/click → mèo đi tới lane gần nhất + phím ↑↓/WS; level-up đổi 3 palette nền; combo; kỷ lục.
- Âm thanh: 8 file (sfx + bgm) gen bằng numpy→mp3 (`scripts/gen_audio.py`).
- Sprite WAN: mèo `cat_idle.png` (360px) + ong `bee_wasp.png` — gen qua `scripts/gen_sprites.py`.
- **Gói nộp Mediacube sẵn sàng:** `build/cuu-meo.zip` + `build/metadata/` (thumb 1:1/5:7/16:9 + preview_16x9.mp4 + metadata.json). Verify zip chạy được.
- Test: pipeline 53 pytest · game vitest 19 · tsc 0 · build OK. Đã fix input ngược hướng (nút chơi bấm).

### M2 — "Neon Sort: Galaxy Pour" (`M2-Color-Sort/`) — color-sort, xếp màu ống ✅ HOÀN CHỈNH
- Puzzle xếp chất lỏng ống (tối ưu giữ chân); art **Neon Galaxy** (nền tối + chất lỏng neon glow) — khác apps nước truyền thống (anh Tuyền chốt).
- 5 file SPEC đủ + `games/neon-sort.yaml` + `game/` + pipeline copy.
- Logic `game/src/logic/color-sort.ts`: board, luật đổ, sinh board LUÔN giải được, level ramp 4→12 ống/capacity 4-5.
- Art WAN: `bg_space.png` (galaxy) + `tube_base.png` (ống thủy tinh) — `scripts/gen_assets_m2.py`. Audio 5 file (`scripts/gen_audio_m2.py`).
- UI đã fix: **3 nút (Undo/Restart/Hint) hết đè nhau** + icon tím vẽ Graphics (không phụ font).
- Test: game vitest **32** (gồm generator solvable) · tsc 0 · build OK · browser đẹp.
- CHƯA đóng gói nộp Mediacube (chờ anh duyệt Đẹp xong).

## 3. CÁCH CHẠY/TEST (Windows, máy anh)
```powershell
# M1
cd M1-Rescue-Dodge\game ; npm install; npm run dev; mở localhost:5173
# M2
cd M2-Color-Sort\game ; npm install; npm run dev; mở localhost:5173
```
Server local preview (VPS): `python3 -m http.server 8131` (serve M1/game/dist) · 8133 (M2/game/dist).

## 4. PIPELINE (dùng chung, mỗi module 1 bản copy)
```bash
python -m pipeline scaffold --config games/<name>.yaml   # (M2: cần lib dummy lane/bee/progression để qua validate)
python -m pipeline assets   --config games/<name>.yaml --job gen
python -m pipeline validate --game-dir games/<name>
python -m pipeline package  --game-dir games/<name>      # tạo build/<name>.zip + build/metadata (placeholder → override thumb/video thật bằng PIL/ffmpeg)
```
Lưu ý: `scaffold.py`/`validate.py` vốn viết riêng cho M1 (độ cứng lane/bee) — validate đã sửa đo đúng (bundle=dist+assets; logic scan=src). Package đã sửa gói `game/dist` (zip chạy được).

## 5. ĐỐI TÁC / NỘP
- **Mediacube** = publisher pilot monetize Playables (non-exclusive, revshare cao, MC Pay thanh toán nhanh/advance, giúp cert + tích hợp SDK + promote). 
- **Anh Tuyền đang tự đăng ký account Mediacube/MC Pay** (2026-08-22) → xong báo em để hướng dẫn apply M1, sau đó M2.
- Apply: upload `build/<name>.zip` + metadata + thumbnail + preview lên MC Play (`mcplay.mediacube.io`).
- Ước tính thu nhập M1 (research): thấp $30-100/tháng (game mới ít recommend) · trung $1-3k/tháng (algorithm pick up) · cao $10-30k+ (game ăn khách) — sau khi trừ share. Các yếu tố: fill rate (chưa 100%), beta 7 nước, IAP 2027 = unlock doanh thu lớn.

## 6. HƯỚNG TIẾP THEO (điểm dừng)
1. **Nộp Mediacube**: M1 gói sẵn → khi anh có account, hướng dẫn apply; sau đó M2 (cần đóng gói + thumbnail/preview mới từ art đẹp).
2. **Game 3** (ý tưởng đã đề xuất: Stack & Go tháp gỗ / Pull the Pin / khác) — theo quy trình 5-file SPEC → GLM code → QA → package.
3. Khi 2026→2027 mở **IAP**: thêm vào game + tối ưu monetize.
4. Cân nhắc post-process/thêm art sâu nếu muốn M2 "lung linh" hơn nữa (hiện đã đẹp, ổn).

## 6b. MEDIACUBE ONBOARDING (cập nhật 2026-08-23) — ĐANG TIẾN HÀNH
- **Đã đăng ký MC Pay** (`mcpay.io`) thành công — anh Tuyền account "Tuyen Tran", CONFIRMED Yes.
- **MC Play** (`mcplay.mediacube.io`) đã vào, dùng **indie developer** profile (không company — chưa có pháp nhân; sau này có công ty mới nâng cấp).
- Đã điền: contact email preferred, bio EN, **portfolio link = Netlify demo M1** `https://fancy-frangollo-dde64c.netlify.app` (host M1 dist qua Netlify Drop, QA THẬT: boot OK, start→gameplay→gameover→kỷ lục mới, 0 lỗi JS).
- **Status: PENDING** chờ admin MC Play duyệt (game management mở sau khi approval).
- **Khi được duyệt → nộp M1:** dùng `build/cuu-meo.zip` + `build/metadata/` (đã sửa publisher name `ExcelToApp Games` + genre `Casual/Arcade`). Mediacube hỗ trợ integrate SDK + pre-cert.
- Lưu ý an toàn: MCP Play link đúng domain `mediacube.io` (cẩn thận kẻ mạo danh `mediacubenetwork.com` giả). Review tiêu cực Reddit nói về Mediacube MCN (video), KHÔNG liên quan mảng Playables.
- **Đã soát hợp đồng Mediacube** (đã lưu `docs/mediacube-agreement.md` + soát rủi ro `docs/mediacube-contract-review.md`): revshare 80% cố định (không đổi đơn phương) ✔, non-exclusive ✔, nhưng ràng 12 tháng/game + không rút trong 12 tháng đầu, tranh chấp ở tòa Cyprus, trần trách nhiệm $5k, tiền nhận ~70-90 ngày. **Chấp nhận được cho indie** — KHÔNG ký advance, rút tiền đều, đa nguồn publisher.

## 6c. M3 "Juicy Merge" — ĐÃ CÓ 5 FILE SPEC (2026-08-23, chờ duyệt + code)
- Game 3 = **physics-merge kiểu Suika/Watermelon**: thả trái cây, 2 cùng loại chạm → gộp bậc lên (chain 12 trái cherry→watermelon), vạch danger + game over, rewarded "Tiếp tục" ≤1 lần. Đa dạng hóa factory: reflex(M1)—logic(M2)—physics-merge(M3).
- Ý tưởng chọn bởi MoA (quality) 2026-08-23. 5 file SPEC /data/youtube-playables/M3-Juicy-Merge/ (SPEC/DESIGN-SPEC/DATA-MODEL/TEST-CASES/E2E-TESTS) đã commit + push git.
- **TIẾP THEO:** anh duyệt SPEC M3 → tạo `games/juicy-merge.yaml` + `CLAUDE.md` → giao Claude GLM-5.2 code (TDD TEST-CASES) → QA browser+vision → đóng gói.

## 7. CHI PHÍ (của Claude Code GLM, AI-Box) — cộng dồn
- M1: pipeline $2.23 + game $1.96 + qafixes $1.62 + UX-fixes ~$? ≈ ~$6-8
- M2: code $3.04 + fix layout $0.44 + icon/glow + icon-final ≈ ~$4-5
- GLM-5.3 (ZHIPU/GLM-5.3) chất lượng cao NHƯNG đắt (~$12/vụ) → mặc định dùng **GLM-5.2** (rẻ+đủ); chỉ 5.3 khi anh chỉ định thử.

## 8. PITFALLS ĐÃ HỌC (đọc lại để khỏi vấp)
- **QA = browser+vision THẬT**, không tin report agent (agent báo "làm xong" nhưng icon/nút có thể chưa hiện thật).
- Browserbase headless: PointerEvent dispatch KHÔNG qua Phaser Input → phải **grid-tap nhiều điểm** mới vào được gameplay; không có loa (verify audio qua console không-lỗi).
- Phaser `HexStringToColor` (KHÔNG phải HexToColor); `new Phaser.Game()` đúng import. `Scale.FIT`.
- **Layout ngang (desktop)**: nút toolbar dễ đè nhau → responsive theo width, co nút; icon vẽ **Graphics màu đậm** trên nút trắng (icon trắng trên trắng = vô hình).
- Audio preload URL phải đúng đuôi `.mp3` (thiếu → "no audio URLs").
- `.gitignore`: dùng `dist/` `node_modules/` (không leading slash — trim mọi cấp), KHÔNG `/game/dist/` (chỉ neo root).
- Push: repo private, remote URL không nhúng token (dùng `GH_TOKEN` env qua x-access-token). Config creds trong `/data/scripts/` (KHÔNG ghi vào repo).
- Memory/Skill phiên: ghi state business vào file này + skill `youtube-playables*` + memory 1 dòng.
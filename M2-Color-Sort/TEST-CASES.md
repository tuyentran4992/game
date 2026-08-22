# M2: "Neon Sort — Galaxy Pour" (Color Sort · YouTube Playables) — TEST CASES

> **Loại file:** Test-case mô tả cho DEV (bảng Steps/Expected) — KHÔNG phải code test.
> **📍 File này do DEV chạy TRƯỚC khi bàn giao/deploy.**
> **Project:** `/data/youtube-playables/M2-Color-Sort/` · Nguồn sự thật: `SPEC.md`
> **Chuẩn:** NON-Laravel — KHÔNG áp dụng `php artisan test`.
> Thay vào đó: **pipeline** test bằng `pytest` (Python) + **game** test bằng `vitest` (logic thuần)
> + browser manual check cho game (E2E bằng Playwright + vision chạy sau ở Hermes QA).

---

## 0. CÁCH CHẠY (thay cho `php artisan test`)

| Đối tượng | Lệnh | Ghi chú |
|-----------|------|---------|
| Pipeline Python (toàn bộ) | `cd /data/youtube-playables/M2-Color-Sort && python -m pytest pipeline/tests/ -v` | Phiên kiểm thử tự động, phải PASS 100% |
| 1 lệnh pipeline đơn lẻ | `python -m pipeline validate --game-dir games/neon-sort` (tương tự `scaffold`/`assets`/`package`) | Chạy thủ công theo từng group A |
| Game logic thuần (Phaser) | `cd game && npx vitest run` | Test pure functions: `pour`, `isWin`, `generateBoard`, `undo/restart` logic — KHÔNG cần browser |
| Game logic UI/ương tác | Mở `game/` build bằng dev server → thao tác browser manual theo group B | Với input touch/mouse; dùng Playwright cho E2E (Hermes QA) |
| Chuẩn bị trước khi chạy | `python -m pipeline scaffold --config games/neon-sort.yaml` + `python -m pipeline assets --config games/neon-sort.yaml --job gen` | Đảm bảo có config + asset trước khi validate/package |

> Nguyên tắc: nếu nhóm QA chạy E2E bằng Playwright + vision trùng test case nào, coi test case đó đã chạy tự động — đánh dấu ✅ PASS.

---

## A. TEST CASES — PIPELINE PYTHON

ID dạng `PC-<n>`. Bước 0 mặc định: nằm trong repo `/data/youtube-playables/M2-Color-Sort/`, đã có `games/neon-sort.yaml`.

### A.1 `python -m pipeline scaffold --config games/neon-sort.yaml`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-01 | Scaffold tạo cấu trúc game/ | Chạy scaffold lên `games/neon-sort.yaml` | Tạo đủ: `game/src/main.ts`, `game/src/scenes/{Start,LevelSelect,Gameplay,Result}.ts`, `game/src/sdk-handler.ts`, `game/src/logic/` (pure funcs), `game/package.json`. Exit code 0. | ☐ |
| PC-02 | scaffold idempotent (chạy lại) | Chạy scaffold 2 lần cùng config | Không lỗi, không ghi đè mất file logic đã có; hoặc hỗ trợ overwrite có flag tường minh. | ☐ |
| PC-03 | Config là nguồn sự thật (M2 mod config) | So tên game/theme/asset/level-set spec khai trong `scaffold` output vs `games/neon-sort.yaml` | Mọi giá trị title/"Neon Sort"/art Neon Galaxy/asset key/level-set (ống, màu, capacity) lấy đúng từ config; không hardcode khác config. | ☐ |
| PC-04 | scaffold thiếu config | Chạy `scaffold` không có `--config` (hoặc path sai) | Báo lỗi rõ ràng, exit code ≠ 0, không tạo file rác. | ☐ |
| PC-05 | Engine phiên bản đúng | Kiểm tra `package.json` trong `game/` | Phaser `3.60+`. | ☐ |

### A.2 `python -m pipeline assets --config games/neon-sort.yaml --job gen`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-06 | Sinh asset từ AI-Box | Gọi assets `--job gen` | Sinh asset đủ theo asset spec Neon Galaxy: nhiều ống tube, chất lỏng chất lỏng màu neon, nền thiên hà tối, UI icon (undo/restart/hint/start/next) → `assets/raw/`. Model null/empty exit ≠ 0. | ☐ |
| PC-07 | Định dạng + kích thước asset | Kiểm tra file sinh ra | Đúng loại `.png`/audio như spec; kích thước hợp lệ (mỗi file < 30 MiB, target < 512 KiB). | ☐ |
| PC-08 | Asset nhân vật / viên là nền tĩnh | Inspect asset ống + chất lỏng | Ống dựng bằng Phaser graphics/shape + tween (KHÔNG sprite-sheet nhiều frame do AI bịa góc); họa tiết ống/đổ do code vẽ để rate/border đồng nhất. | ☐ |
| PC-09 | Asset spec đủ key | Map key trong config qua từng asset file | Mọi asset key spec có file tương ứng, không thiếu, không key thừa. | ☐ |

### A.3 `python -m pipeline validate --game-dir games/neon-sort`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-10 | PASS trên build chuẩn | Validate trên game đúng cuối pipeline | PASS hết, exit code 0, báo gọn ràng buộc thỏa (M2-10). | ☐ |
| PC-11 | Bundle initial quá size | Đưa initial bundle > 30 MiB (target > 5 MiB) | FAIL: mục "initial bundle < 30 MiB" + warning target < 5 MiB. | ☐ |
| PC-12 | File lẻ quá size | Đưa 1 file > 30 MiB; test thêm mức warning > 512 KiB | FAIL khi > 30 MiB; warning khi > 512 KiB target. | ☐ |
| PC-13 | Tổng bundle quá size | Tổng bundle > 250 MiB | FAIL "total bundle < 250 MiB". | ☐ |
| PC-14 | Cấm chạy compression | Đưa file nén (gzip/deflate minified gzip) vào | FAIL: phát hiện compression (M2-10: cấm nén; chỉ cho decompression fallback). | ☐ |
| PC-15 | Cấm gọi mạng ngoài (M2-09) | Nhét URL ngoài (`http(s)://` domain lạ, WS, fetch/XHR external) | FAIL: phát hiện network ngoài / analytics third-party / payment server. | ☐ |
| PC-16 | Load time | Đo bundle → tương tác được | Không vượt 5s (target có thể benchmark, không fail cứng nếu không đo được — note rõ). | ☐ |
| PC-17 | Responsive flag | Kiểm tra build có Scale/RESIZE config | PASS khi có xử lý resize/responsive; ngược lại FAIL/warning theo chuẩn. | ☐ |
| PC-18 | Saved-game size | Estimate `saveData` payload (best-level, current-level, best-moves) | ≤ 3 MiB (target < 500 KiB). | ☐ |
| PC-19 | Validate dừng đúng lỗi | Chạy validate với nhiều lỗi | Liệt kê đủ lỗi, exit ≠ 0, không crash giữa chừng. | ☐ |

### A.4 `python -m pipeline package --game-dir games/neon-sort`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-20 | Tạo zip | Chạy package | Sinh `build/neon-sort.zip` đúng tên, không lỗi, exit 0. | ☐ |
| PC-21 | Content zip đầy đủ | Mở zip | Chứa game build (index, js, assets) cần thiết để chạy; không sót file. | ☐ |
| PC-22 | metadata/ thumbnails | Kiểm tra `build/metadata/` | Đủ thumbnail **1:1 + 5:7 + 16:9** + preview **16:9**. | ☐ |
| PC-23 | metadata/ desc + title | Đọc title/short desc | title ≤ 50 ký tự đúng **"Neon Sort: Galaxy Pour"**; short desc ≤ 150 ký tự; mô tả đúng cơ chế xếp màu. | ☐ |
| PC-24 | Không branding | So thumbnail/title/desc | KHÔNG logo/branding trong thumbnail/title/desc. | ☐ |
| PC-25 | Publisher + genre | Kiểm tra metadata | Khai publisher + 1–2 genre (puzzle/logic). | ☐ |
| PC-26 | Package idempotent / ghi đè | Chạy package 2 lần | Không lỗi, zip + metadata mới thay thế sạch. | ☐ |

---

## B. TEST CASES — GAME LOGIC (Color Sort)

**Logic thuần (`game/src/logic/`) chạy bằng `vitest`; phần UI/browser manual.**
ID dạng `GL-<n>`. Mọi phần tử tương tác phải có `data-testid` theo SPEC §5:
`start-btn`, `level-select`, `level-label`, `move-count`, `board`, `tube-<i>`, `undo-btn`, `restart-btn`, `hint-btn`, `next-level-btn`.

### B.1 Chọn ống & đổ chất lỏng (cốt lõi game)

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-01 | Tap ống nguồn → chọn/highlight | Tap `tube-<i>` có chất lỏng | Ống được highlight rõ, ready đổ; tap lại (hoặc tap nguồn khác) huỷ/bỏ chọn. | ☐ |
| GL-02 | Đổ hợp lệ cùng màu | Chọn ống có đỉnh lục → tap đích cũng đỉnh lục, đích còn chỗ | Chất lỏng đỉnh chuyển sang đích; board cập nhật; `move-count` +1. | ☐ |
| GL-03 | Đổ vào ống trống | Tap ống nguồn → tap ống trống | Chuyển chất lỏng sang ống trống; hợp lệ. | ☐ |
| GL-04 | Đổ không hợp lệ (đỉnh khác màu) | Nguồn đỉnh lục → đích đỉnh đỏ | KHÔNG đổi board; rung nhẹ nguồn + sfx lỗi; `move-count` KHÔNG đổi (M2-01). | ☐ |
| GL-05 | Đích đầy — không đổ | Đích đạt capacity C đầy → tap đổ | KHÔNG đổ, không đổi board, phản hồi lỗi (M2-01). | ☐ |
| GL-06 | Đổ cả chuỗi cùng màu đỉnh | Chuỗi n lát cùng màu đỉnh, đích đủ chỗ | Đổ chuyển **cả** chuỗi n lát sang đích (1 nước đi). | ☐ |
| GL-07 | Đổ 1 phần khi đích ít chỗ | 3 lục đỉnh, đích chỉ còn 2 chỗ | Đổ 2, dừng; 1 lục còn lại nguồn (M2 §4.1). | ☐ |
| GL-08 | Capacity bất biến | Sau nhiều nước đi, inspect mọi `tube-<i>` | Mỗi ống KHÔNG bao giờ > C lát; không lát nào biến mất / nhân đôi. | ☐ |
| GL-09 | Chọn ống trống làm nguồn | Tap ống trống | Không chọn được/highlight khi ống rỗng (không có gì để đổ). | ☐ |

### B.2 Win check & Clear

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-10 | Thắng khi mọi ống sạch | Sắp xong: mỗi ống 1 màu hoặc trống | `isWin` = true; hiện popup Clear "Hoàn thành!" + confetti + âm (M2-02). | ☐ |
| GL-11 | Chưa thắng khi còn ống lẫn màu | Còn ≥ 1 ống chứa 2 màu | `isWin` = false; không popup Clear, vẫn chơi tiếp. | ☐ |
| GL-12 | Popup Clear + nút Next | Sau win | `next-level-btn` hiển thị rõ trên popup "Level tiếp"/"Next"; bấm chuyển level (interstitial giữa level). | ☐ |
| GL-13 | Không thắng nhầm khi workspace trống | Có ống trống nhưng còn ống lẫn màu | KHÔNG win (ống trống hợp lệ, nhưng ống lẫn màu vẫn là chưa xong). | ☐ |

### B.3 Undo / Restart / Kẹt

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-14 | Undo quay lại nước trước | Đổ 1 nước → bấm `undo-btn` | Board về đúng trạng thái trước nước đó; `move-count` giảm 1 (M2-05). | ☐ |
| GL-15 | Undo nhiều bước theo lịch sử | Đổ 5 nước → undo 5 lần | Về lần lượt từng trạng thái (stack), cuối về board gốc; `move-count` về 0. | ☐ |
| GL-16 | Undo khi chưa có nước | Ở đầu level bấm `undo-btn` | Không đổi gì / nút disable; không lỗi, không reset level. | ☐ |
| GL-17 | Restart reset board gốc | Đổ vài nước → bấm `restart-btn` | Board về đúng cấu hình gốc level; `move-count` = 0 (M2-05). | ☐ |
| GL-18 | Restart không đổi level/tiến trình | Restart giữa level | Vẫn ở same level, không nhảy level, không tạo level mới. | ☐ |
| GL-19 | Kẹt → gợi ý Undo/Restart/Hint | Đưa board về trạng thái không còn nước đi hợp lệ (simulate) | Phát hiện kẹt: hiện tooltip/nhắc bấm `undo-btn`/`restart-btn`/`hint-btn`; game chỉ stuck KHÔNG thua (M2-03). | ☐ |

### B.4 Level generator (sinh board luôn giải được)

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-20 | Board sinh LUÔN giải được | Chạy `generateBoard` cho N=2000 level / nhiều seed | Mọi board đều `isSolvable`=true (verify bằng solver hoặc sinh ngược) — KHÔNG có board mù (M2-04). | ☐ |
| GL-21 | Sinh ngược từ trạng thái sort | Inspect thuật toán | Generator tạo ống sort rồi đổ ngược ngẫu nhiên (các bước hợp lệ ngược) — đúng SPEC §4.2. | ☐ |
| GL-22 | Mỗi lần chơi board mới (đa dạng) | Gen 2 level cùng tham số khác seed | 2 board khác nhau (không lặp cấu hình y hệt). | ☐ |
| GL-23 | Deterministic theo seed | Gen cùng seed 2 lần | 2 board GIỐNG hệt (tái lập được khi cần debug/QA). | ☐ |
| GL-24 | Level đầu: ống/màu/capacity chuẩn | Gen level đầu (config mặc định) | 4 ống / 3 màu / capacity C=4; có 1–2 ống trống workspace (M2 §4.2, §4.3). | ☐ |
| GL-25 | Level ramp tăng dần | Gen level 1 → 10 → 20 | Số ống + màu + capacity tăng dần (từ 4 ống/3 màu lên cao hơn); độ khó tăng rõ (M2 §4.3). | ☐ |
| GL-26 | Level cao giảm workspace | Gen level thấp vs cao | Level cao có ít ống trống workspace hơn (khó hơn). | ☐ |
| GL-27 | Số lát khớp số ống × màu | Verify board | Tổng lát màu = số ống đầy × capacity (đủ, không thừa/thiếu màu). | ☐ |

### B.5 Progression & SDK (rewarded / interstitial / save) — game logic + browser

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-28 | Next-level sang level kế + interstitial | Clear level → bấm `next-level-btn` | Chuyển sang level kế; `level-label` cập nhật; interstitial chạy **giữa level** (M2-07). | ☐ |
| GL-29 | KHÔNG interstitial level đầu | Clear/start level đầu | KHÔNG có interstitial ở level đầu (M2-07). | ☐ |
| GL-30 | Hint (rewarded) gợi ý nước đúng | Bấm `hint-btn` → reward earned | Highlight/cho biết 1 nước đi đúng tiếp theo; không thực hiện nước cho player (M2-06). | ☐ |
| GL-31 | Extra tube (rewarded) | (level khó) bấm nút extra → reward earned | Thêm 1 ống trống workspace; tối đa theo level design; làm giảm kẹt (M2-06). | ☐ |
| GL-32 | saveData: best/current level/best-moves | Clear level → check save | `saveData` ghi best-level, current-level, best-moves đúng (M2-08). | ☐ |
| GL-33 | saveData/loadData lỗi fallback | Giả lập `saveData` reject + `loadData` lỗi | Bỏ qua, đánh dấu phiên không lưu, KHÔNG crash (M2-08). | ☐ |
| GL-34 | Tiếp tục từ level đang chơi | Reload sau khi chơi giữa level | Mở lại vào đúng current-level đã lưu (hoặc level-select chọn tiếp tục). | ☐ |
| GL-35 | sendScore khi clear | Mỗi level clear | `sendScore(level)` được gọi đúng mốc clear. | ☐ |
| GL-36 | gameReady + pre-roll | Mở game, quan sát console/preload | `gameReady` fire khi có thể tương tác; pre-roll chạy trước; sau ad mới nhận tap; spinner khi loading. | ☐ |

### B.6 Nền tảng (pause/mute/responsive/network/content)

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-37 | Pause/resume obey | Gọi `onPause` → `onResume` | Pause: dừng update loop + mute; Resume: chạy lại đúng trạng thái board (M2-11). | ☐ |
| GL-38 | Mute obey | Gọi `onAudioEnabledChange(false)` | Mute toàn bộ SFX/BGM ngay lập tức; bật lại hoạt động (M2-11). | ☐ |
| GL-39 | Resize giữ state | Resize viewport giữa phiên | Scale auto, giữ board/move/level, không reset, không vỡ (M2-11). | ☐ |
| GL-40 | Responsive aspect ratio | Test nhiều tỷ lệ (9:16, 16:9, 1:1, cực đoan dọc/ngang) | Board co đúng, không vỡ, tap-zone chạm được; touch + mouse (M2-11). | ☐ |
| GL-41 | KHÔNG gọi mạng ngoài runtime | Mở Network tab; chơi nhiều level | Chỉ request local bundle; KHÔNG request `http(s)://` ngoài / analytics beacon (M2-09). | ☐ |
| GL-42 | Không tự đặt ad | Review code + network | Game KHÔNG gọi ad/IAP ngoài YouTube SDK; mọi monetize chỉ qua `ytgame.ads.*` (M2-09). | ☐ |
| GL-43 | Content phù hợp 13+ | Review text + art | Target 13+ general; không nội dung nhạy cảm; không hướng trẻ em quá mức (M2-11). | ☐ |
| GL-44 | data-testid đầy đủ | Inspect DOM/GameObjects | Đủ `start-btn`, `level-select`, `level-label`, `move-count`, `board`, `tube-<i>`, `undo-btn`, `restart-btn`, `hint-btn`, `next-level-btn` đúng SPEC §5. | ☐ |

---

## C. COVERAGE MATRIX

### C.1 Business Rule × Test Case (M2-01..11)

| BR | Rule tóm tắt | Test cases |
|----|-------------|------------|
| M2-01 | Đổ chỉ khi đích trống hoặc (≥1 chỗ VÀ cùng màu); vi phạm → không đổi board + lỗi | GL-02, GL-03, GL-04, GL-05, GL-09 |
| M2-02 | Thắng = mọi ống trống/1 màu → popup Clear + confetti + next | GL-10, GL-11, GL-12, GL-13 |
| M2-03 | Không thua; kẹt → nhắc Undo/Restart/Hint | GL-19 |
| M2-04 | Board LUÔN giải được (sinh ngược); cấm board không lời giải | GL-20, GL-21, GL-22, GL-23 |
| M2-05 | Undo quay nước trước; Restart reset board gốc | GL-14, GL-15, GL-16, GL-17, GL-18 |
| M2-06 | Rewarded: Hint (gợi ý nước đúng) + Extra tube (thêm ống trống) | GL-30, GL-31 |
| M2-07 | Interstitial giữa 2 level; không level đầu | GL-28, GL-29 |
| M2-08 | saveData best/current/best-moves; lỗi không crash | GL-32, GL-33, GL-34 |
| M2-09 | Cấm mạng ngoài / ads bên 3 / self-monetize — chỉ ytgame SDK | PC-15, PC-14, GL-41, GL-42 |
| M2-10 | Bundle < 30MiB initial (target<5MiB), file<30MiB (target<512KiB), load<5s, save<3MiB, cấm nén | PC-11, PC-12, PC-13, PC-16, PC-18, PC-14 |
| M2-11 | Responsive mọi aspect + touch/mouse + obey pause/mute + target 13+ | GL-37, GL-38, GL-39, GL-40, GL-43, PC-17 |

### C.2 API / Pipeline Command × Test Case

| Command / API | Test cases |
|---------------|------------|
| `scaffold --config games/neon-sort.yaml` | PC-01..PC-05 |
| `assets --config ... --job gen` | PC-06..PC-09 |
| `validate --game-dir games/neon-sort` | PC-10..PC-19 |
| `package --game-dir games/neon-sort` | PC-20..PC-26 |
| Pure logic: `pour/tryPour` | GL-02..GL-09 |
| Pure logic: `isWin` | GL-10, GL-11, GL-13 |
| Pure logic: `undoStack` / `restart` | GL-14..GL-18 |
| Pure logic: `generateBoard` / solver | GL-20..GL-27 |
| `ytgame.pause()/resume()` + `onPause`/`onResume` | GL-37 |
| `isAudioEnabled` / `onAudioEnabledChange` | GL-38 |
| `ytgame.ads.requestRewardedAd('hint')` | GL-30 |
| `ytgame.ads.requestRewardedAd('extra-tube')` | GL-31 |
| `ytgame.ads.requestInterstitialAd()` | GL-28, GL-29 |
| `saveData()`/`loadData()` | GL-32, GL-33, GL-34 |
| `sendScore(level)` | GL-35 |
| `gameReady` / pre-roll (auto) | GL-36 |

### C.3 Game State (SPEC §7) × Test Case

| State (theo SPEC §7) | Test cases |
|----------------------|------------|
| Loading playable | GL-36 |
| Pre-roll ad | GL-36 |
| Chọn ống nguồn | GL-01, GL-09 |
| Đổ hợp lệ | GL-02, GL-03, GL-06, GL-07, GL-08 |
| Đổ không hợp lệ | GL-04, GL-05 |
| Level Clear | GL-10, GL-11, GL-12, GL-13 |
| Undo | GL-14, GL-15, GL-16 |
| Restart | GL-17, GL-18 |
| Hint (rewarded) | GL-30 |
| Extra tube (rewarded) | GL-31 |
| Kẹt (no legal move) | GL-19 |
| Resize | GL-39, GL-40 |
| Pause/Mute | GL-37, GL-38 |
| Save score / level | GL-32, GL-33 |

---

## D. TIÊU CHÍ PASS TRƯỚC KHI BÀN GIAO

- [ ] Mọi test case **A (PC-01..26)** PASS (`pytest` + CLI chạy thủ công).
- [ ] Mọi test case **B (GL-01..44)** PASS (`vitest` cho logic thuần + browser manual cho UI).
- [ ] Solver khẳng định **board luôn giải được** (GL-20: N ≥ 2000 level, nhiều seed) — đúng M2-04.
- [ ] `python -m pipeline validate --game-dir games/neon-sort` trả PASS sạch (không cảnh báo khối).
- [ ] `build/neon-sort.zip` + `build/metadata/` đủ file nộp portal (PC-20..25).
- [ ] Điền cột "Trạng thái" mỗi ca = ✅ PASS hoặc ❌ FAIL + note; commit file cập nhật cùng bàn giao.

---
*FILE NÀY = checklist dev-validate trước deploy. Cập nhật theo từng vòng test; không xóa ca đã từng FAIL (giữ trace).*
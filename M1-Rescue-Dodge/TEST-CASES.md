# M1: Rescue/Dodge MVP — "Cứu Mèo" — TEST CASES

> **Loại file:** Test-case mô tả cho DEV (bảng Steps/Expected) — KHÔNG phải code test.
> **📍 File này do DEV chạy TRƯỚC khi bàn giao/deploy.**
> **Project:** `/data/youtube-playables/M1-Rescue-Dodge/` · Nguồn sự thật: `SPEC.md`
> **Chuẩn:** NON-Laravel — KHÔNG áp dụng `php artisan test`.
> Thay vào đó: **pipeline** test bằng `pytest` (Python), **game** test bằng browser manual check (Playwright + vision cho E2E QA chạy sau).

---

## 0. CÁCH CHẠY (thay cho `php artisan test`)

| Đối tượng | Lệnh | Ghi chú |
|-----------|------|---------|
| Pipeline Python (toàn bộ) | `cd /data/youtube-playables/M1-Rescue-Dodge && python -m pytest pipeline/tests/ -v` | Phiên kiểm thử tự động, phải PASS 100% |
| 1 lệnh pipeline đơn lẻ | `python -m pipeline validate --game-dir games/cuu-meo` (tương tự `scaffold`/`assets`/`package`) | Chạy thủ công theo từng group A |
| Game logic (Phaser) | Mở `game/` build bằng dev server → thao tác bằng browser manual theo group B | Với input touch/mouse/keyboard; dùng Playwright cho E2E |
| Chuẩn bị trước khi chạy | `python -m pipeline scaffold --config games/cuu-meo.yaml` + `python -m pipeline assets --config games/cuu-meo.yaml --job gen` | Đảm bảo có config + asset trước khi validate/package |

> Nguyên tắc: nếu nhóm QA chạy E2E bằng Playwright + vision trùng test case nào, coi test case đó đã chạy tự động — đánh dấu ✅ PASS.

---

## A. TEST CASES — PIPELINE PYTHON

ID dạng `PC-<n>`. Bước 0 mặc định: nằm trong repo `/data/youtube-playables/M1-Rescue-Dodge/`, đã có `games/cuu-meo.yaml`.

### A.1 `python -m pipeline scaffold --config games/cuu-meo.yaml`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-01 | Scaffold tạo cấu trúc game/ | Chạy scaffold lên `games/cuu-meo.yaml` | Tạo đủ: `game/src/main.ts`, `game/src/scenes/{Start,Tutorial,Gameplay,GameOver}.ts`, `game/src/sdk-handler.ts`, `game/package.json`. Exit code 0. | ☐ |
| PC-02 | scaffold idempotent (chạy lại) | Chạy scaffold 2 lần cùng config | Không lỗi, không ghi đè mất file logic đã có; hoặc support overwrite có flag tường minh. | ☐ |
| PC-03 | Config là nguồn sự thật (BR-13) | So tên game/style/asset spec khai trong `scaffold` output vs `games/cuu-meo.yaml` | Mọi giá trị title/theme/asset key lấy đúng từ config; không hardcode khác config. | ☐ |
| PC-04 | scaffold thiếu config | Chạy `scaffold` không có `--config` (hoặc path sai) | Báo lỗi rõ ràng, exit code ≠ 0, không tạo file rác. | ☐ |
| PC-05 | Engine phiên bản đúng | Kiểm tra `package.json` trong `game/` | Phaser `3.60+`. | ☐ |

### A.2 `python -m pipeline assets --config games/cuu-meo.yaml --job gen`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-06 | Sinh asset từ AI-Box | Gọi assets `--job gen` | Sinh asset đủ theo asset spec: 1 mèo, 1–2 ong, nền, UI icon → `assets/raw/`. Model null/empty exit ≠ 0. | ☐ |
| PC-07 | Định dạng + kích thước asset | Kiểm tra file sinh ra | Đúng loại `.png`/audio như spec; kích thước hợp lệ. | ☐ |
| PC-08 | Asset nhân vật là nền tĩnh (BR-08) | Inspect asset mèo/ong | Chỉ 1 khung tĩnh image (KHÔNG sprite-sheet nhiều frame do AI bịa góc). | ☐ |
| PC-09 | Asset spec đủ key | Map key trong config qua từng asset file | Mọi asset key spec có file tương ứng, không thiếu, không key thừa. | ☐ |

### A.3 `python -m pipeline validate --game-dir games/cuu-meo`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-10 | PASS trên build chuẩn | Validate trên game đúng cuối pipeline | PASS hết, exit code 0, báo gọn ràng buộc thỏa (BR-03). | ☐ |
| PC-11 | Bundle initial quá size | Đưa initial bundle > 30 MiB (target > 5 MiB) | FAIL: mục "initial bundle < 30 MiB" + warning target < 5 MiB. | ☐ |
| PC-12 | File lẻ quá size | Đưa 1 file > 30 MiB; test thêm mức warning > 512 KiB | FAIL khi > 30 MiB; warning khi > 512 KiB target. | ☐ |
| PC-13 | Tổng bundle quá size | Tổng bundle > 250 MiB | FAIL "total bundle < 250 MiB". | ☐ |
| PC-14 | Cấm chạy compression | Đưa file nén (gzip/deflate minified gzip) vào | FAIL: phát hiện compression (BR: cấm nén; chỉ cho decompression fallback). | ☐ |
| PC-15 | Cấm gọi mạng ngoài (BR-02) | Nhét URL ngoài (`http(s)://` domain lạ, WS, fetch/XHR external) | FAIL: phát hiện network ngoài / analytics third-party / payment server. | ☐ |
| PC-16 | Load time | Đo bundle → tương tác được | Không vượt 5s (target có thể benchmark, không fail cứng nếu không đo được — note rõ). | ☐ |
| PC-17 | Responsive flag | Kiểm tra build có Scale/RESIZE config | PASS khi có xử lý resize/responsive; ngược lại FAIL/warning theo chuẩn. | ☐ |
| PC-18 | Saved-game size | Estimate `saveData` payload | ≤ 3 MiB (target < 500 KiB). | ☐ |
| PC-19 | Validate dừng đúng lỗi | Chạy validate với nhiều lỗi | Liệt kê đủ lỗi, exit ≠ 0, không crash giữa chừng. | ☐ |

### A.4 `python -m pipeline package --game-dir games/cuu-meo`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-20 | Tạo zip | Chạy package | Sinh `build/cuu-meo.zip` đúng tên, không lỗi, exit 0. | ☐ |
| PC-21 | Content zip đầy đủ | Mở zip | Chứa game build (index, js, assets) cần thiết để chạy; không sót file. | ☐ |
| PC-22 | metadata/ thumbnails | Kiểm tra `build/metadata/` | Đủ thumbnail **1:1 + 5:7 + 16:9** + preview **16:9** (BR-07). | ☐ |
| PC-23 | metadata/ desc + title (BR-07) | Đọc title/short desc | title ≤ 50 ký tự; short desc ≤ 150 ký tự; không thổi phồng, mô tả đúng cơ chế. | ☐ |
| PC-24 | Không branding (BR-07) | So thumbnail/title/desc | KHÔNG logo/branding trong thumbnail/title/desc. | ☐ |
| PC-25 | Publisher + genre | Kiểm tra metadata | Khai publisher + 1–2 genre (BR-07). | ☐ |
| PC-26 | Package idempotent / ghi đè | Chạy package 2 lần | Không lỗi, zip + metadata mới thay thế sạch. | ☐ |

---

## B. TEST CASES — GAME LOGIC (Phaser 3)

ID dạng `GL-<n>`. Kiểm bằng browser manual trên build `game/` (touch/mouse + keyboard). Mọi phần tử tương tác phải có `data-testid` theo SPEC 4.2 (gồm mới: `level-label`, `level-popup`, `combo-popup`, `record-popup`).

### B.1 Flow chính

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-01 | Start → Tutorial → Gameplay → Game Over (BR-12) | Mở game → bấm `start-btn` → xem tutorial → chơi → để mèo trúng ong | Chuỗi 4 màn đúng thứ tự; mọi màn có phần tử mong đợi hiển thị. | ☐ |
| GL-02 | Nút Start có testid | Inspect `start-btn` | bấm vào chuyển sang Tutorial. | ☐ |
| GL-03 | Tutorial 3s tự vào Gameplay | Quan sát `tutorial-text` | Hiện text "Giữ để né ong" / EN fallback; hết 3s auto vào gameplay, không cần bấm. | ☐ |
| GL-04 | gameReady đúng thời điểm | Mở game quan sát console/preload | `gameReady` fire khi có thể tương tác; preload tối thiểu; spinner khi loading (State "Loading playable"). | ☐ |
| GL-05 | Pre-roll không block input | Giả lập pre-roll ad xong | Sau ad mới nhận input; trước đó tap không ảnh hưởng. | ☐ |

### B.2 Gameplay / cơ chế

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-06 | Tap đổi lane né ong | Chạm bên trái/phải `game-canvas` | Mèo chuyển lane tương ứng; né được ong. | ☐ |
| GL-07 | Hold/release mechanic | Giữ → mèo lật/hạ; thả → né | Hành vi đúng câu hướng dẫn "Giữ để né ong". | ☐ |
| GL-08 | Chạm ong = game over | Để mèo trúng ong | Gameplay dừng, vào Game Over. | ☐ |
| GL-09 | Score tăng đúng | Theo thời gian + mỗi lần né | `score-label` tăng đủ thời gian lẫn bonus né; không tăng khi chưa né/pause. | ☐ |
| GL-10 | Điểm tăng theo thời gian | Đứng im, không né | Score vẫn tăng theo rate thời gian đã định. | ☐ |
| GL-11 | Khó tăng theo thời gian | Chơi lâu | Tốc độ/số lượng/nhịp ong tăng dần theo thời gian. | ☐ |
| GL-12 | Input touch + mouse + keyboard | Thử tap (touch phải mô phỏng), click chuột, phím | Cả 3 đều điều khiển được (BR-05 input). | ☐ |

### B.3 Game Over / ads

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-13 | Game Over đủ thông tin (BR-12) | Chạm ong game over | Hiện `final-score`, `best-score`, nút `retry-btn` + `continue-btn`. | ☐ |
| GL-14 | sendScore + saveData (BR-11) | Kết thúc 1 phiên | `sendScore(score)` + `saveData` được gọi, `best-score` cập nhật. | ☐ |
| GL-15 | saveData/loadData lỗi fallback (BR-11) | Giả lập `saveData` reject + `loadData` lỗi | Bỏ qua, đánh dấu phiên không lưu, KHÔNG crash (State "Save score lỗi"). | ☐ |
| GL-16 | Rewarded continue (BR-10) | Bấm `continue-btn` lần 1 | `requestRewardedAd('reward-id')`; earned → resume 1 mạng và tiếp tục chơi; not earned → ở Game Over. | ☐ |
| GL-17 | Continue giới hạn 1 lần (BR-10) | Bấm `continue-btn` lần 2 (sau khi dùng xong) | Nút bị vô hiệu hóa/ẩn/skip — KHÔNG cho tiếp tục lần 2 trong cùng game over. | ☐ |
| GL-18 | Interstitial chỉ lần 2+ (BR-09) | Chơi → game over lần 1 → Retry → game over lần 2 | Lần game over thứ 1 KHÔNG có interstitial; lần 2+ MỚI hiện interstitial. Không ad trong 10s đầu / level đầu. | ☐ |
| GL-19 | Retry reset phiên | Bấm `retry-btn` | Về lại Gameplay, score reset, best giữ nguyên; interstitial theo BR-09 (nếu lần 2+). | ☐ |

### B.4 Nền tảng / SDK

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-20 | Pause/resume obey (BR-04) | Gọi `onPause` → rồi `onResume` | Pause: dừng update loop + mute; Resume: chạy lại đúng trạng thái. | ☐ |
| GL-21 | Mute obey (BR-04) | Gọi `onAudioEnabledChange(false)` | Mute toàn bộ SFX/BGM ngay lập tức; bật lại hoạt động. | ☐ |
| GL-22 | Resize giữ state (BR-05) | Resize cửa sổ/viewport giữa phiên | Scale auto theo viewport, giữ score/state/lane; không mất tiến trình. | ☐ |
| GL-23 | Responsive aspect ratio (BR-05) | Test nhiều tỷ lệ khung hình (1:1, 5:7, 16:9, màn dọc/ngang cực đoan) | Game co theo viewport, không vỡ layout (BR-05); không khóa orientation. | ☐ |
| GL-24 | KHÔNG gọi mạng ngoài runtime (BR-02) | Mở Network tab; chơi 1 phiên | Chỉ có request local bundle; KHÔNG request `http(s)://` ngoài / analytics / analytics beacon. | ☐ |
| GL-25 | Không tự đặt ad (BR-01) | Review code + network | Game KHÔNG gọi ad/IAP ngoài YouTube SDK; mọi monetize chỉ qua `ytgame.ads.*`. | ☐ |
| GL-26 | Content phù hợp (BR-06) | Review text + asset | Target 13+ general; không nội dung nhạy cảm với trẻ em. | ☐ |
| GL-27 | Game 100% offline / mạng mất (State "Network mất") | Tắt mạng khi chơi | Game không gọi mạng nên không phụ thuộc; không lỗi (câm). | ☐ |

### B.5 Progression & Retention (BR-14..17)

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| GL-28 | Level-up mỗi 10 điểm, không reset (BR-14) | Chơi đạt score 10 → quan sát `level-label` + `score-label` | `level-label` đổi lên "Cấp 2"; score KHÔNG reset — vẫn tiếp tục tăng từ mốc 10; cứ mỗi 10đ lên 1 level. | ☐ |
| GL-29 | Đổi palette nền khi level-up (BR-14) | Chơi qua mốc 10/20/30, chụp nền từng level | Nền đổi palette/cảnh mới ở mỗi level; có ≥ 3 palette (level 1–3+ vòng lại). | ☐ |
| GL-30 | Popup level-up 1.5s, không chặn (BR-14) | Level lên → chụp ngay + chờ ~2s | `level-popup` hiện "Cấp {n}" ~1.5s rồi tự ẩn; game vẫn chạy (ong vẫn động), KHÔNG chặn gameplay, không ad xen giữa. | ☐ |
| GL-31 | Combo né liên tiếp +5 (BR-15) | Né 5 lần liên tiếp không chạm | Cộng thưởng bonus +5; hiện `combo-popup` hiệu ứng "+5". | ☐ |
| GL-32 | Combo reset khi chạm ong (BR-15) | Đạt streak 5 → chạm ong → né lại đếm lại | Sau khi chạm combo về 0; để được +5 tiếp phải né lại đủ liên tiếp 5 lần mới tính. | ☐ |
| GL-33 | Kỷ lục mới khi vượt best (BR-16) | Chơi score > best đã lưu | `record-popup` "KỶ LỤC MỚI!" hiện; `best-score` cập nhật; saveData/sendScore đẩy best mới. | ☐ |
| GL-34 | record-popup không lặp trong phiên (BR-16) | Vượt best → tiếp tục chơi điểm cao hơn | Popup kỷ lục KHÔNG hiện lại lần 2 trong cùng phiên (chỉ 1 lần/phiên). | ☐ |
| GL-35 | 10s đầu tốc độ thấp (BR-17) | Vào Gameplay, đo tốc độ ong trong 10s đầu | 10s đầu ong bay THẤP (giữ chân người mới); sau 10s tốc độ tăng rõ. | ☐ |
| GL-36 | Tốc độ tăng theo thời gian + nhảy bậc level (BR-17) | Chơi lâu + qua các mốc level | Tốc độ/spawn ong tăng liên tục sau 10s + nhảy bậc rõ ở mỗi milestone Level. | ☐ |
| GL-37 | Không interstitial level đầu (BR-17 + BR-09) | Chơi level đầu / 10s đầu | KHÔNG có interstitial ad ở level đầu / 10s đầu (khớp BR-09); ad chỉ khi game over lần 2+. | ☐ |
| GL-38 | data-testid Progression (BR-14/15/16) | Inspect `level-label`, `level-popup`, `combo-popup`, `record-popup` | Cả 4 testid tồn tại, hiển thị đúng thời điểm theo SPEC 4.2. | ☐ |

---

## C. COVERAGE MATRIX

### C.1 Business Rule × Test Case (BR-01..17)

| BR | Rule tóm tắt | Test cases |
|----|-------------|------------|
| BR-01 | Cấm tự đặt ad/IAP — chỉ qua YouTube SDK | GL-25, GL-24 |
| BR-02 | Cấm gọi mạng ngoài / analytics / multiplayer / payment | PC-15, PC-14, GL-24, GL-27 |
| BR-03 | Bundle: initial < 30MB (target < 5MB), file < 30MB (target < 512KB), load < 5s, save < 3MB | PC-11, PC-12, PC-13, PC-16, PC-18 |
| BR-04 | Obey pause/mute/resume ngay lập tức | GL-20, GL-21 |
| BR-05 | Responsive mọi aspect ratio + giữ state khi resize + input đa dạng | GL-22, GL-23, GL-12, PC-17 |
| BR-06 | Target 13+, không nhắm trẻ em | GL-26 |
| BR-07 | Metadata: title ≤50, desc ≤150, thumbs 1:1/5:7/16:9, preview 16:9, publisher+genre, không branding | PC-22, PC-23, PC-24, PC-25 |
| BR-08 | Asset nhân vật = nền tĩnh + tween/physics; cấm AI nhiều frame | PC-08 |
| BR-09 | Interstitial không level 1-2 / 10s đầu — chỉ game over lần 2+ | GL-18 |
| BR-10 | Rewarded continue tối đa 1 lần/game over | GL-16, GL-17 |
| BR-11 | sendScore + saveData; load lỗi dùng phiên hiện tại không crash | GL-14, GL-15 |
| BR-12 | Game over phải có nút hành động rõ | GL-01, GL-13 |
| BR-13 | M1 chỉ 1 game "Cuu Meo"; config là nguồn sự thật | PC-03 |
| BR-14 | Progression: mỗi 10đ lên 1 Level, KHÔNG reset; đổi palette nền + nhảy bậc + popup "Cấp {n}" 1.5s; ≥ 3 palette | GL-28, GL-29, GL-30, GL-38 |
| BR-15 | Combo streak: mỗi 5 lần né liên tiếp cộng +5 (popup combo); reset khi chạm ong | GL-31, GL-32 |
| BR-16 | Kỷ lục: vượt best → popup record 1 lần/phiên + cập nhật best (saveData/sendScore) | GL-33, GL-34 |
| BR-17 | Difficulty: 10s đầu tốc độ THẤP; sau tăng + nhảy bậc level; không interstitial level đầu | GL-35, GL-36, GL-37 |

### C.2 API / Pipeline Command × Test Case

| Command / API | Test cases |
|---------------|------------|
| `scaffold --config games/cuu-meo.yaml` | PC-01, PC-02, PC-03, PC-04, PC-05 |
| `assets --config ... --job gen` | PC-06, PC-07, PC-08, PC-09 |
| `validate --game-dir games/cuu-meo` | PC-10..PC-19 (toàn bộ ràng buộc BR-03/BR-02...) |
| `package --game-dir games/cuu-meo` | PC-20..PC-26 |
| `ytgame.pause()/resume()` + `onPause`/`onResume` | GL-20 |
| `isAudioEnabled` / `onAudioEnabledChange` | GL-21 |
| `ytgame.ads.requestInterstitialAd()` | GL-18 |
| `ytgame.ads.requestRewardedAd('reward-id')` | GL-16, GL-17 |
| `saveData()`/`loadData()` | GL-14, GL-15 |
| `sendScore(score)` | GL-14 |
| `gameReady` / pre-roll (auto) | GL-04, GL-05 |

### C.3 Game State × Test Case

| State (theo SPEC §7) | Test cases |
|----------------------|------------|
| Loading playable | GL-04 |
| Pre-roll ad | GL-05 |
| Nhấn Start | GL-01, GL-02 |
| Tutorial | GL-03 |
| Gameplay (active) | GL-06, GL-07, GL-08, GL-09, GL-10, GL-11, GL-12 |
| Level-up (progression) | GL-28, GL-29, GL-30 |
| Combo (streak) | GL-31, GL-32 |
| Kỷ lục mới (vượt best) | GL-33, GL-34 |
| Game over (chạm ong) | GL-08, GL-13 |
| Continue qua rewarded | GL-16, GL-17 |
| Retry | GL-19, GL-18 |
| Resize viewport | GL-22, GL-23 |
| Platform pause | GL-20 |
| Audio mute | GL-21 |
| Save score lỗi | GL-15 |
| Network mất | GL-27 |

---

## D. TIÊU CHÍ PASS TRƯỚC KHI BÀN GIAO

- [ ] Mọi test case **A (PC-01..26)** PASS (`pytest` + CLI chạy thủ công).
- [ ] Mọi test case **B (GL-01..38)** PASS (browser manual / Playwright E2E).
- [ ] `python -m pipeline validate --game-dir games/cuu-meo` trả PASS sạch (không cảnh báo khối).
- [ ] `build/cuu-meo.zip` + `build/metadata/` đủ file nộp portal (PC-20..25).
- [ ] Điền cột "Trạng thái" mỗi ca = ✅ PASS hoặc ❌ FAIL + note; commit file cập nhật cùng bàn giao.

---
*FILE NÀY = checklist dev-validate trước deploy. Cập nhật theo từng vòng test; không xóa ca đã từng FAIL (giữ trace).*
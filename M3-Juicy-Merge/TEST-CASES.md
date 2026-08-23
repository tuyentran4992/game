# M3: "Juicy Merge — Fruit Pop" (Physics-Merge · YouTube Playables) — TEST CASES

> **Loại file:** Test-case mô tả cho DEV (bảng Steps/Expected) — KHÔNG phải code test.
> **📍 File này do DEV chạy TRƯỚC khi bàn giao/deploy.**
> **Project:** `/data/youtube-playables/M3-Juicy-Merge/` · Nguồn sự thật: `SPEC.md`
> **Chuẩn:** NON-Laravel — KHÔNG áp dụng `php artisan test`.
> Thay vào đó: **pipeline** test bằng `pytest` (Python) + **game** test bằng `vitest` (logic thuần physics/merge)
> + browser manual check cho game (E2E bằng Playwright + vision chạy sau ở Hermes QA).

---

## 0. CÁCH CHẠY (thay cho `php artisan test`)

| Đối tượng | Lệnh | Ghi chú |
|-----------|------|---------|
| Pipeline Python (toàn bộ) | `cd /data/youtube-playables/M3-Juicy-Merge && python -m pytest pipeline/tests/ -v` | Phiên kiểm thử tự động, phải PASS 100% |
| 1 lệnh pipeline đơn lẻ | `python -m pipeline validate --game-dir games/juicy-merge` (tương tự `scaffold`/`assets`/`package`) | Chạy thủ công theo group A |
| Game logic thuần (Phaser) | `cd game && npx vitest run` | Test pure funcs: fruit-chain, merge rule, danger/game-over, RNG deterministic, score bảng §4.4 |
| Game UI/tương tác | Mở `game/` build bằng dev server → thao tác browser manual theo group B | Với input touch/mouse; dùng Playwright cho E2E (Hermes QA) |
| Chuẩn bị trước khi chạy | `python -m pipeline scaffold --config games/juicy-merge.yaml` + `python -m pipeline assets --config games/juicy-merge.yaml --job gen` | Đảm bảo có config + asset trước validate/package |

> Nguyên tắc: nếu nhóm QA chạy E2E bằng Playwright + vision trùng test case nào, coi test case đó đã chạy tự động — đánh dấu ✅ PASS.

---

## A. TEST CASES — PIPELINE PYTHON

ID dạng `PC-<n>`. Bước 0: nằm trong `/data/youtube-playables/M3-Juicy-Merge/`, đã có `games/juicy-merge.yaml`.

### A.1 `python -m pipeline scaffold --config games/juicy-merge.yaml`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-01 | Scaffold tạo cấu trúc game/ | Chạy scaffold lên `games/juicy-merge.yaml` | Tạo đủ: `game/src/main.ts`, `game/src/scenes/{Start,Gameplay,GameOver}.ts`, `game/src/sdk-handler.ts`, `game/src/logic/` (pure funcs), `game/package.json`. Exit 0. | ☐ |
| PC-02 | scaffold idempotent | Chạy scaffold 2 lần cùng config | Không lỗi, không ghi đè mất file logic đã có; hoặc overwrite flag tường minh. | ☐ |
| PC-03 | Config là nguồn sự thật | So tên game/theme/asset/chain/score khai trong scaffold vs `games/juicy-merge.yaml` | Mọi giá trị ("Juicy Merge"/art Kawaii/asset key/chain 12 trái/bảng điểm) lấy từ config; không hardcode khác. | ☐ |
| PC-04 | scaffold thiếu config | Chạy scaffold không `--config` (hoặc path sai) | Báo lỗi rõ, exit ≠ 0, không tạo file rác. | ☐ |
| PC-05 | Engine phiên bản đúng | Kiểm tra `package.json` trong `game/` | Phaser `3.60+` (có Matter.js). | ☐ |

### A.2 `python -m pipeline assets --config games/juicy-merge.yaml --job gen`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-06 | Sinh asset từ AI-Box | Gọi assets `--job gen` | Sinh đủ asset Kawaii: 12 trái cây (`fruit_01.._12`), bucket, bg gradient, logo, ui icon, 10 audio → `assets/raw/`. Model null/empty exit ≠ 0. | ☐ |
| PC-07 | Định dạng + kích thước | Kiểm tra file sinh | Đúng `.png`/`.mp3` như spec; mỗi file < 30 MiB, target < 512 KiB. | ☐ |
| PC-08 | Sprite nền tĩnh | Inspect 12 trái | Ảnh tĩnh (KHÔNG sprite-sheet nhiều frame); viền đậm đồng tông (DESIGN-SPEC §6). | ☐ |
| PC-09 | Asset spec đủ key | Map key trong config qua từng file | Mọi asset key có file tương ứng, không thiếu, không key thừa. | ☐ |

### A.3 `python -m pipeline validate --game-dir games/juicy-merge`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-10 | PASS trên build chuẩn | Validate game đúng cuối pipeline | PASS hết, exit 0, báo gọn ràng buộc thỏa (M3-11). | ☐ |
| PC-11 | Bundle initial quá size | Đưa initial > 30 MiB | FAIL "initial bundle < 30 MiB" + warning target < 5 MiB. | ☐ |
| PC-12 | File lẻ quá size | Đưa file > 30 MiB; test mức warning > 512 KiB | FAIL khi > 30 MiB; warning khi > 512 KiB. | ☐ |
| PC-13 | Tổng bundle quá size | Đưa tổng > 250 MiB | FAIL "total bundle < 250 MiB". | ☐ |
| PC-14 | Cấm nén | Đưa file nén (gzip/deflate) | FAIL phát hiện compression (M3-11: cấm nén; chỉ decompression fallback). | ☐ |
| PC-15 | Cấm gọi mạng ngoài (M3-09) | Nhét URL ngoài (`http(s)://` lạ, WS, fetch/XHR external) | FAIL phát hiện network ngoài / analytics / payment server. | ☐ |
| PC-16 | Load time | Đo bundle → tương tác được | Không vượt 5s (target benchmark, không fail cứng nếu không đo được — note rõ). | ☐ |
| PC-17 | Responsive flag | Kiểm tra build có Scale/RESIZE | PASS khi có xử lý resize/responsive; ngược lại FAIL/warning. | ☐ |
| PC-18 | Saved-game size | Estimate `saveData` (best_score) | ≤ 3 MiB (target < 500 KiB). | ☐ |
| PC-19 | Validate dừng đúng lỗi | Chạy với nhiều lỗi | Liệt kê đủ lỗi, exit ≠ 0, không crash giữa chừng. | ☐ |

### A.4 `python -m pipeline package --game-dir games/juicy-merge`

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| PC-20 | Tạo zip | Chạy package | Sinh `build/juicy-merge.zip` đúng tên, exit 0. | ☐ |
| PC-21 | Content zip đầy đủ | Mở zip | Chứa game build (index, js, assets) chạy được; không sót file. | ☐ |
| PC-22 | metadata thumbnails | Kiểm tra `build/metadata/` | Đủ thumbnail **1:1 + 5:7 + 16:9** + preview **16:9**. | ☐ |
| PC-23 | metadata desc + title | Đọc title/short_desc | ≤ 50 / ≤ 150 ký tự, EN, mô tả đúng cơ chế (SPEC §5). | ☐ |

---

## B. TEST CASES — GAME LOGIC THUẦN (vitest, `cd game && npx vitest run`)

ID dạng `GC-<n>`. Test pure funcs — KHÔNG cần browser. Module gợi ý: `game/src/logic/`.

| ID | Ca | Steps (assert) | Expected | Trạng thái |
|----|----|---------------|----------|-----------|
| GC-01 | Chain đủ 12 bậc | Load `chain`, `score_per_tier` | 12 trái đúng thứ tự cherry→watermelon; 12 điểm theo bảng §4.4 SPEC. | ☐ |
| GC-02 | Merge 2 cùng loại | `merge(a_tier=k, b_tier=k)` | sinh trái `tier k+1`; score += `score_per_tier[k+1]` (M3-02). | ☐ |
| GC-03 | Merge 2 khác loại | `merge(a_tier=1, b_tier=2)` | KHÔNG merge; không đổi score; không sinh trái (M3-02). | ☐ |
| GC-04 | Merge bậc cao nhất | `merge(a_tier=11, b_tier=11)` | KHÔNG merge tiếp (watermelon max); chỉ jackpot điểm khi sinh (M3-02). | ☐ |
| GC-05 | Game over khi trái trên vạch đã settle | body sleep=true + trái `y<dangerY` | game over = true (M3-03). | ☐ |
| GC-06 | KHÔNG game over khi đang rơi ngang vạch | body đang moving + trái qua vạch | game over = false (M3-03). | ☐ |
| GC-07 | Game over không kích khi chưa settle | body chưa sleep + trái trên vạch | game over = false (M3-03). | ☐ |
| GC-08 | RNG deterministic cùng seed | 2 lần khởi tạo `same seed`, thả cùng chuỗi | 2 lần ra SAME chuỗi trái (M3-04). | ☐ |
| GC-09 | RNG khác seed khác chuỗi | 2 seed khác nhau | Chuỗi trái khác nhau (hoặc ít nhất phân bố khác) (M3-04). | ☐ |
| GC-10 | Score bảng khớp | Merge qua các bậc 1..12 | Tổng score đúng `sum(score_per_tier)` các lần merge; (M3 §4.4). | ☐ |
| GC-11 | Cooldown thả | Gọi drop 2 lần < 250ms | Lần 2 bị chặn (không sinh trái) (M3-01). | ☐ |
| GC-12 | Rewarded continue ≤1 lần | Đếm `continueUsed`; gọi game over 2 lần | Chỉ lần 1 hiện rewarded; lần 2 dùng interstitial (M3-05). | ☐ |
| GC-13 | Continue earned loại trái trên vạch | game over → continue earned | mọi trái `y<dangerY` bị xóa; trái còn đẩy xuống; tiếp tục (M3-05). | ☐ |
| GC-14 | Best-score lưu | game over với score>best | saveData/best cập nhật; sendScore gọi (M3-08). | ☐ |

---

## C. TEST CASES — GAME UI / INTERACTION (browser manual, group B)

ID dạng `UI-<n>`. Mở `game/` bằng dev server (`npm run dev`), thao tác bằng tay hoặc Playwright.

| ID | Ca | Steps | Expected | Trạng thái |
|----|----|-------|----------|-----------|
| UI-01 | Start → vào Gameplay | Load → click `start-btn` | Vào Gameplay, `bucket`, `drop-ghost`, `score-label` hiện. | ☐ |
| UI-02 | Di chuyển ghost theo pointer | Di chuột qua lại trên vùng thả | `drop-ghost` trái theo X, clamp trong bucket, không lọt ra ngoài. | ☐ |
| UI-03 | Thả trái | Click/nhả khi ghost đang ở X | Trái sinh tại đỉnh bucket đúng X, rơi xuống vật lý. | ☐ |
| UI-04 | Merge hiện pop + score | Thả 2 trái cùng loại chạm nhau | Merge thành trái lớn hơn + pop + score tăng đúng bảng + sfx. | ☐ |
| UI-05 | Vạch danger hiển thị | Nhìn Gameplay | `danger-line` dashed rõ ràng, đúng vị trí ~20% đỉnh bucket. | ☐ |
| UI-06 | Game over popup lần 1 | Để trái quá vạch + settle | Panel + `continue-btn` (rewarded) hiện; KHÔNG interstitial lần 1. | ☐ |
| UI-07 | Continue earned tiếp tục | Chấp nhận rewarded | Trái trên vạch biến mất; trái còn đẩy xuống; tiếp tục chơi. | ☐ |
| UI-08 | Game over lần 2+ interstitial | Game over lần 2 | Interstitial chạy rồi mới hiện panel retry. | ☐ |
| UI-09 | Retry chơi lại | Click `retry-btn` | RNG seed mới, restart, score=0. | ☐ |
| UI-10 | Best lưu qua reload | Chơi đạt score, reload | Enter lại Start → Gameplay; best giữ nguyên. | ☐ |
| UI-11 | Kỷ lục mới popup | Đạt score > best | `record-popup` "KỶ LỤC MỚI!" hiện + sendScore gọi. | ☐ |
| UI-12 | Pause/mute obey | Bấm pause/mute | Đúng ngay; trái đứng yên khi pause; im khi mute; visual tương đương. | ☐ |

> Sau UI manual pass → làm E2E (file E2E-TESTS.md) bằng Playwright + vision (Hermes QA).

---

## D. COVERAGE MATRICES

### BR × TC
| BR | PC/GC/UI |
|----|----------|
| M3-01 | GC-11, UI-03 |
| M3-02 | GC-02/03/04, UI-04 |
| M3-03 | GC-05/06/07, UI-06 |
| M3-04 | GC-08/09 |
| M3-05 | GC-12/13, UI-06/07 |
| M3-07 | GC-12, UI-08 |
| M3-08 | GC-14, UI-10/11 |
| M3-09 | PC-15 |
| M3-10 | UI-12 |
| M3-11 | PC-11..18 |
| M3-12 | PC-22/23 |

### Pipeline command × PC
| Lệnh | PC |
|------|----|
| scaffold | PC-01..05 |
| assets | PC-06..09 |
| validate | PC-10..19 |
| package | PC-20..23 |

### Logic × GC
| Module logic | GC |
|--------------|----|
| chain/score | GC-01/10 |
| merge | GC-02/03/04 |
| game-over | GC-05/06/07 |
| RNG | GC-08/09 |
| cooldown | GC-11 |
| continue | GC-12/13 |
| save | GC-14 |
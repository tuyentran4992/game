# E2E-TESTS — M11 "Paper Crease" (gấp giấy → đục lỗ → đoán hình mở bung)

> **E2E do Hermes chạy bằng Playwright + vision sau khi build; agent code KHÔNG viết E2E.**
> File này chỉ là bảng test case + bước + kỳ vọng nhìn thấy được + đường dẫn ảnh evidence — **không phải code Playwright**.
> Hermes QA mở game build **standalone** trong browser thật, chụp PNG từng bước, rồi **soi ảnh bằng vision** để chốt PASS/FAIL. Test xanh mà ảnh xấu = vẫn FAIL.

**Nguồn sự thật:** `SPEC.md` cùng thư mục — BR `PC-01`..`PC-20`, data-testid mục §4, user flow §3, state handling §7.
**Cách chạy:** dựng build standalone (`dev` target), serve tĩnh cục bộ, mở `index.html`. KHÔNG nộp Playgama/Playables trước khi bảng kết luận §6 pass hết.
**Evidence:** mọi case lưu PNG tại `out/qa/e2e-<ID>.png` (nhiều bước thì thêm hậu tố `_before` / `_after` / `_step2`). Trước mỗi nhóm: browser profile mới + dọn save (xem §5 "user test cần dọn").
**Ngưỡng fail chung:** load >3s; bất kỳ uncaught JS/console error; black/white screen; playfield (`testid-sheet-folded`) bị cắt; interstitial trong 60s đầu; chữ tiếng Việt hardcode/UI không phải EN (PC-19).
**Màn debug:** dùng `?debug=1&seed=N` (án lệ M10) để nhảy màn/bật timer chương 7+ — ghi rõ seed đã dùng vào evidence note, và **xoá save do debug tạo sau khi QA** (§5).

---

## 1. BẢNG CASE

Cột **BR** = Business Rule trong SPEC §6. Cột Nhóm viết tắt: B=boot · O=onboarding · L=vòng lặp màn · R=responsive · A=ad · P=pause/mute · S=save · U=usability · G=endgame.

### 1.1 Nhóm B — BOOT & LOAD (≤3s, 0 lỗi console, canvas boot, không scrollbar)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-B-01 | boot | Cold boot | Dựng server tĩnh, mở `index.html`, đồng hồ bấm từ request đầu → title hiện | Title trong **≤3s**, logo giấy gấp + `testid-title-play` bấm được, canvas đã boot, **0 lỗi console** | `out/qa/e2e-PC-B-01.png` | PC-20, PC-10 |
| PC-B-02 | boot | Title, 9:16 | Set viewport 1080×1920, chụp toàn trang, kiểm tra thanh cuộn | Không có scrollbar dọc/ngang, không tràn nội dung, `testid-hud-level`/HUD chưa hiện nhầm trên title | `out/qa/e2e-PC-B-02.png` | PC-20 |
| PC-B-03 | boot | Network log | Chặn log mạng, chơi 2 màn, lọc request ngoài localhost | **0 call mạng ngoài** (không analytics, không leaderboard); mọi request là asset cục bộ | `out/qa/e2e-PC-B-03.png` (chụp Network tab) | PC-15 |
| PC-B-04 | boot | Boot lặp lại | Reload 3 lần liên tiếp vào title, đọc console từng lần | Lần nào cũng vào title sạch, 0 exception, không white flash quá 1 khung hình | `out/qa/e2e-PC-B-04_step2.png`, `out/qa/e2e-PC-B-04_step3.png` | PC-20 |
| PC-B-05 | boot | Màn Loading | Mở ở mạng mô phỏng chậm, chụp ngay lúc đang load | Có màn loading (logo + tiến trình mảnh), **không** màn hình trắng; loading screen không phải "chờ không phản hồi" | `out/qa/e2e-PC-B-05.png` | PC-20 |

### 1.2 Nhóm O — ONBOARDING 60 GIÂY, KHÔNG CHỮ (PC-09)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-O-01 | onboarding | Link → chơi | Browser mới (0 save), đếm số click từ lúc title hiện tới lúc được bấm đáp án | **1 click** (`testid-title-play`) là đã ở màn 1 với `testid-sheet-folded` + 4 ô `testid-option-0`, `testid-option-1`, `testid-option-2`, `testid-option-3` bấm được; tổng ≤3 click tới hành động thật | `out/qa/e2e-PC-O-01.png` | PC-09 |
| PC-O-02 | onboarding | Màn 1 "tắt chữ" | Chụp màn 1, vision kiểm tra: có buộc phải đọc chữ nào để biết bấm gì không | Người mới nhìn là hiểu: tờ gấp giữa màn, 4 ô hình bên dưới, không câu hướng dẫn dài dòng; bấm đúng bằng trực giác (dùng seed debug để biết đáp án trước) | `out/qa/e2e-PC-O-02.png` | PC-09 |
| PC-O-03 | onboarding | Gợi ý thị giác | Vào màn 1, quay/chụp liên tiếp 2s đầu | `testid-hint-breath`: nếp gấp "thở" (nhấp nháy) **đúng 1 lần** chỉ đúng chỗ lỗ — không lặp, không biến mất tức thì | `out/qa/e2e-PC-O-03.png`, `out/qa/e2e-PC-O-03_step2.png` | PC-09 |
| PC-O-04 | onboarding | 60s đầu sạch | Đồng hồ từ lúc boot, chơi hết màn 1 trong 60s đầu | Không popup xếp hạng/xin quyền/"rate us", **không** interstitial, không màn đăng nhập (flow §3.1 SPEC) | `out/qa/e2e-PC-O-04.png` | PC-09, PC-14 |
| PC-O-05 | onboarding | Nối màn không nghỉ | Bấm đúng màn 1, chờ xong animate, bấm `testid-btn-menu` mở map | Không có "win screen": tờ giấy màn 2 đã gấp sẵn giữa màn hình; vào map thấy màn 1 có sao, màn 2 là current | `out/qa/e2e-PC-O-05.png` | PC-09, PC-07 |

### 1.3 Nhóm L — VÒNG LẶP MÀN (chọn đúng / chọn sai / mở bung)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-L-01 | vòng lặp | Chọn ĐÚNG | Vào màn có `testid-hint-breath` (màn dạy luật), bấm ô đúng, chụp 3 khoảnh khắc: trước / giữa animate / sau | `testid-unfold-anim` mở bung **từng lớp** 0.7–0.9s, lỗ hiện dần theo từng lớp — không "bập hiện" kết quả | `out/qa/e2e-PC-L-01_before.png`, `out/qa/e2e-PC-L-01_mid.png`, `out/qa/e2e-PC-L-01_after.png` | PC-03, PC-09 |
| PC-L-02 | vòng lặp | Sau đúng | Chụp ngay sau animate | 3 ô còn lại mờ đi, `testid-hud-stars` sáng số sao, `testid-hud-level` nhảy "MÀN n+1/120", tờ `testid-sheet-folded` mới đã gấp sẵn + 1 nút MỞ/UNFOLD — **không** màn hình "You win" | `out/qa/e2e-PC-L-02.png` | PC-06, PC-09 |
| PC-L-03 | vòng lặp | Chọn SAI | Vào màn (seed debug), bấm ô sai, chụp 2 khoảnh khắc | Rung nhẹ + `testid-unfold-anim` chạy bản giải thích (chấm lỗ nhân bản theo lớp, chỉ rõ vì sao sai) + `testid-feedback-wrong` hiện dòng giải thích + `testid-btn-retry` ("Thử lại") và `testid-btn-undo-ad` ("Gỡ (video)") | `out/qa/e2e-PC-L-03_before.png`, `out/qa/e2e-PC-L-03_explain.png` | PC-05 |
| PC-L-04 | vòng lặp | Thử lại | Bấm `testid-btn-retry` sau khi sai, bấm tiếp ô đúng | Về lại tờ đang gấp của **cùng màn**, đề không đổi; thắng sau đó chỉ còn tối đa 2 sao trên `testid-hud-stars` (PC-06: 3 sao = thắng ngay lần đầu) | `out/qa/e2e-PC-L-04.png` | PC-05, PC-06 |
| PC-L-05 | vòng lặp | Bấm trong lúc animate | Bấm 1 ô đáp án trong lúc `testid-unfold-anim` đang chạy | 4 ô khoá bấm, cú bấm được buffer (không mất lượt, không crash, không register 2 lượt); HUD `testid-hud-stars`/`testid-hud-ink` không nhảy sai | `out/qa/e2e-PC-L-05.png` | PC-05, PC-16 |
| PC-L-06 | vòng lặp | Seed ổn định | Mở màn 23 (seed debug), chụp đề; đóng browser, profile mới, mở lại màn 23, chụp | Hai ảnh **giống hệt nhau** (cùng kiểu gấp, cùng vị trí lỗ, cùng 4 phương án) — đề sinh từ seed, không random, không đọc từ save | `out/qa/e2e-PC-L-06_run1.png`, `out/qa/e2e-PC-L-06_run2.png` | PC-02 |
| PC-L-07 | vòng lặp | Chất lượng 4 ô | Zoom chụp `testid-option-0`..`testid-option-3` ở 5 màn khác nhau (chương 1, 4, 8) | Đúng 1 ô là đáp án thật; 3 ô nhiễu mỗi ô khác đáp án ít nhất 1 lỗ; 2 ô bất kỳ không giống nhau (vision đếm số lỗ từng ô) | `out/qa/e2e-PC-L-07.png` | PC-03, PC-04 |
| PC-L-08 | vòng lặp | Luật sao + hint | Màn A: thắng ngay không hint. Màn B: bấm `testid-btn-hint` (soi 1 nếp) rồi thắng. Chụp `testid-hud-stars` cả hai | Màn A = 3 sao; màn B ≤2 sao (hint mất sao 3 — PC-08); hint chỉ bấm được 1 lần/màn, lần 2 nút disabled; hint miễn phí đầu tiên có cooldown 2 màn | `out/qa/e2e-PC-L-08_3star.png`, `out/qa/e2e-PC-L-08_hint.png` | PC-06, PC-08 |
| PC-L-09 | vòng lặp | Hết chương | Jump (seed debug) tới màn 15, thắng | `testid-scorecard-stars` hiện tổng sao chương + thời gian + kỷ lục; `testid-scorecard-next` ("Chương tiếp") — đây là **điểm duy nhất** interstitial được phép | `out/qa/e2e-PC-L-09.png` | PC-01, PC-14 |
| PC-L-10 | vòng lặp | Nhịp phiên | Chơi 5 màn liên tiếp không dùng hint, bấm giờ từng màn qua log ring-buffer | Mỗi màn hết 45–75s với người chơi mới; phiên 5 màn ≥4 phút; không màn nào "treo" không có phản hồi | `out/qa/e2e-PC-L-10.png` (chụp HUD + note thời gian) | PC-10 |
| PC-L-11 | vòng lặp | Tiến bộ theo chương | So sánh ảnh màn đầu chương 1 vs chương 4 vs chương 8 (seed debug) | Chương sau phức tạp hơn đo được: nhiều lượt gấp liên tiếp/lỗ trên nếp/giao nếp; theme giấy mỗi chương một bộ token khác nhau; timer **chỉ** xuất hiện từ chương 7 | `out/qa/e2e-PC-L-11_ch1.png`, `out/qa/e2e-PC-L-11_ch4.png`, `out/qa/e2e-PC-L-11_ch8.png` | PC-01 |

### 1.4 Nhóm R — RESPONSIVE (9:16 · 16:9 · 32:9)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-R-01 | responsive | 9:16 (1080×1920) | Vào màn 5, chụp Title + PLAY + Level map | `testid-sheet-folded` nguyên vẹn không cắt, 4 ô `testid-option-*` đủ lớn chạm, HUD (`testid-hud-level`, `testid-hud-stars`, `testid-hud-ink`) **không đè** playfield | `out/qa/e2e-PC-R-01_title.png`, `out/qa/e2e-PC-R-01_play.png` | PC-20 |
| PC-R-02 | responsive | 16:9 (1920×1080) | Cùng 3 màn ở trên, viewport ngang | Không stretch méo tờ giấy; nếu pillarbox thì 2 bên cân, mọi control trong safe area, không trôi | `out/qa/e2e-PC-R-02_play.png` | PC-20 |
| PC-R-03 | responsive | 32:9 (ultrawide) | Set viewport siêu ngang, vào PLAY | Playfield không bị kéo giãn/vỡ; không có vùng chết che `testid-option-*`; không scrollbar | `out/qa/e2e-PC-R-03_play.png` | PC-20 |
| PC-R-04 | responsive | Đổi tỷ lệ giữa màn | Đang ở giữa màn (đã hint 1 lần), đổi 9:16 → 16:9 → về 9:16 | Tờ giấy/sao/mực **giữ nguyên trạng thái**, không reset đề (không sinh đề theo layout), không vỡ layout hậu resize | `out/qa/e2e-PC-R-04_before.png`, `out/qa/e2e-PC-R-04_after.png` | PC-02, PC-16 |

### 1.5 Nhóm A — AD (rewarded / interstitial, Null Object)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-A-01 | ad | Không có SDK | Chạy build standalone (Null Object — không mock ad), vào màn, bấm sai 1 lần | Chơi được bình thường tới cùng; nút ad (`testid-btn-undo`, `testid-btn-undo-ad`) **ẩn hoặc disabled** — không phải bấm rồi treo chờ video; `testid-btn-retry` vẫn còn | `out/qa/e2e-PC-A-01.png` | PC-20, PC-13, PC-05 |
| PC-A-02 | ad | Rewarded undo (mock) | Mock rewarded SDK; sai 1 lượt → bấm `testid-btn-undo-ad`, xem mock, chụp trước/sau | Undo hoàn lượt sai, về chọn lại; dùng xong nút ẩn, chỉ còn `testid-btn-retry` (state "hết lượt undo" §7); ≤1 lần/màn | `out/qa/e2e-PC-A-02_before.png`, `out/qa/e2e-PC-A-02_after.png` | PC-05, PC-13 |
| PC-A-03 | ad | Vị trí interstitial | Mock interstitial; thắng màn 15 → score card → bấm `testid-scorecard-next` | Interstitial **chỉ** chạy SAU `testid-scorecard-stars` (đã hiện thưởng), đúng ranh giới chương; không chạy trước score card | `out/qa/e2e-PC-A-03_scorecard.png`, `out/qa/e2e-PC-A-03_ad.png` | PC-14 |
| PC-A-04 | ad | Cấm ad sớm | Browser mới, đồng hồ chạy, chơi màn 1–5 liên tục | **Không** bất kỳ interstitial/rewarded-cưỡng-bức nào trong 60s đầu và trước khi kết thúc màn đầu; không ad giữa hai màn thường | `out/qa/e2e-PC-A-04.png` (chụp log ad-mock trống) | PC-14, PC-09 |
| PC-A-05 | ad | Game over + continue | Mock; ở màn có timer (chương 7, seed debug) để hết giờ → game over lần 1, rồi lần 2 | Lần 1: có lựa chọn continue (rewarded 1 lần/game over), **không** interstitial. Lần 2 game over: interstitial chỉ sau score screen. 4 điểm rewarded đúng danh sách PC-13 (undo/hint/continue/x2 Mực) | `out/qa/e2e-PC-A-05_over1.png`, `out/qa/e2e-PC-A-05_over2.png` | PC-13, PC-14 |
| PC-A-06 | ad | Ad không load được | Mock rewarded fail/timeout, bấm `testid-btn-hint` cần rewarded (khi đã hết lượt miễn phí) | Hiện thông báo nhẹ rồi **ẩn nút ad**, chơi tiếp bình thường, không chặn màn (state "Ad không load" §7) | `out/qa/e2e-PC-A-06.png` | PC-13, PC-08 |

### 1.6 Nhóm P — PAUSE / MUTE (PC-17)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-P-01 | pause/mute | Rời tab có timer | Ở màn timer (chương 7), ghi giờ trên `testid-hud-level`/timer + trạng thái tờ gấp; ẩn tab 5s; quay lại | Timer **đứng yên** khi ẩn tab, nhạc dừng; quay lại tiếp **đúng chỗ**, không trừ oan, không restart màn | `out/qa/e2e-PC-P-01_hidden.png`, `out/qa/e2e-PC-P-01_back.png` | PC-17, PC-01 |
| PC-P-02 | pause/mute | Nút loa | Chụp `testid-btn-sound` state bật → bấm → chụp state tắt → bấm lại | Icon đổi rõ 2 trạng thái; mute tắt tiếng tức thì (kể cả giữa animate mở bung); state không mất khi reload | `out/qa/e2e-PC-P-02_on.png`, `out/qa/e2e-PC-P-02_muted.png` | PC-17 |
| PC-P-03 | pause/mute | Settings | `testid-btn-menu` → Settings, bấm `testid-set-sound` rồi `testid-set-mute` | Nút mute trong settings hoạt động như `testid-btn-sound` (một nguồn sự thật — không lệch trạng thái 2 nút); toggle sound đọc được | `out/qa/e2e-PC-P-03.png` | PC-17 |
| PC-P-04 | pause/mute | Pause giữa animate | Tắt tab ngay giữa `testid-unfold-anim`, bật lại sau 3s | Animate resume hoặc kết thúc sạch (không kẹt nửa tờ); không mất lượt đã tính; không uncaught error | `out/qa/e2e-PC-P-04.png` | PC-17, PC-05 |

### 1.7 Nhóm S — SAVE (reload giữa chương, reset, hỏng save)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-S-01 | save | Reload giữa chương | Chơi (không debug) tới màn 8 trong chương 1, ghi `testid-hud-ink` + sao; F5 reload | Title hiện nút `testid-title-play` dạng **"Continue — Level 8"**; vào đúng màn 8; `testid-hud-stars`/`testid-hud-ink` giữ nguyên từng giá trị | `out/qa/e2e-PC-S-01_before.png`, `out/qa/e2e-PC-S-01_after.png` | PC-16 |
| PC-S-02 | save | Reset không mất skin | `testid-title-shop` → mua 1 skin bằng Mực (`testid-shop-skin-{i}`, `testid-shop-price`); Settings → `testid-set-reset` xác nhận xoá save → chơi màn 1 | Về đúng màn 1 sao = 0 mực = 0; vào shop skin **đã mua vẫn sở hữu** (không khoá lại, không cộng giá); không crash migrate | `out/qa/e2e-PC-S-02_bought.png`, `out/qa/e2e-PC-S-02_afterreset.png` | PC-16, PC-11 |
| PC-S-03 | save | Save hỏng | Gán rác/JSON cụt vào key save (profile QA), reload | Game không crash, về chơi màn 1 như save thiếu, **skin đã mua vẫn giữ** (state "Save hỏng/thiếu" §7); console không spam error | `out/qa/e2e-PC-S-03.png` | PC-16 |
| PC-S-04 | save | Map & khoá chương | Chơi chương 1 đạt ~12 sao, mở `testid-btn-menu` → map | `testid-map-chapter-{1..8}` đủ 8 tab; `testid-map-node-{n}` hiện đúng sao từng màn; `testid-map-locked` trên chương 2/3 hiện rõ điều kiện "~12/15 sao", không bắt full sao | `out/qa/e2e-PC-S-04.png` | PC-07, PC-01 |
| PC-S-05 | save | Skip = 0 sao | Ở map có quyền chọn lại màn đã thắng, không chơi nữa mà tiến màn sau (hoặc để lỡ) | Màn không chơi tính 0 sao, **không** chặn tiến trình; sao tổng không bị trừ ảo | `out/qa/e2e-PC-S-05.png` | PC-07 |
| PC-S-06 | save | Cỡ save | Đọc object save trong storage SDK local sau 1 chương đầy đủ | JSON có trường `version`, kích thước **≤100KB thực tế**; không chứa nội dung đề (đề không vào save) | `out/qa/e2e-PC-S-06.png` (chụp payload độ dài) | PC-16, PC-02 |
| PC-S-07 | save | Album + huy hiệu | Hoàn chương 1 rồi mở Album | `testid-album-item-{i}` thêm mẫu giấy đã mở của chương, `testid-badge-{i}` sáng đúng 1 huy hiệu chương; tổng mục album ≤14, badge ≤6 | `out/qa/e2e-PC-S-07.png` | PC-12 |

### 1.8 Nhóm U — USABILITY (bắt buộc, soi như khách khó tính)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-U-01 | usability | Nút không mơ hồ | Chụp HUD + hàng nút dưới; vision đọc từng nút `testid-btn-sound`, `testid-btn-menu`, `testid-btn-hint`, `testid-btn-undo` | Nhìn là biết bấm xong xảy ra gì (copy EN chuẩn §4.3: "Peek a fold" / "Undo (watch video)"); không ký hiệu lạ không nhãn | `out/qa/e2e-PC-U-01.png` | PC-08, PC-05 |
| PC-U-02 | usability | Không click thừa | Tính số click trung bình để sang màn kế sau khi thắng | Đúng 1 click (UNFOLD/màn kế đã sẵn) — không có "next → play" 2 bước; không màn nào >1 hành động chính | `out/qa/e2e-PC-U-02.png` | PC-09 |
| PC-U-03 | usability | Chữ không cắt + EN | Chụp mọi chuỗi ở 9:16 nhỏ nhất: "Continue — Level 120", "Chapter complete", "You unfolded all 120", `testid-feedback-wrong` dòng dài | Không tràn/elip-e mất nghĩa; UI mặc định **tiếng Anh** toàn bộ, không chuỗi hardcode lẫn tiếng Việt; chuỗi qua lớp i18n (đổi language setting disabled — chấp nhận grey-out) | `out/qa/e2e-PC-U-03_long.png`, `out/qa/e2e-PC-U-03_copy.png` | PC-19, PC-14 |
| PC-U-04 | usability | Contrast | Vision đo trên ảnh: hình lỗ trên nền giấy mỗi theme (8 chương), chữ HUD trên nền, ô đáp án state mờ | Phân biệt được lỗ/đáp án mà không cần zoom; contrast chữ đạt mức đọc được trong 1s; state "mờ đi" của ô sai vẫn thấy hình dạng | `out/qa/e2e-PC-U-04.png` | PC-01, PC-04 |
| PC-U-05 | usability | Không phần tử vô hình | AX/DOM scan + sweep chuột/vision trên toàn Play: mọi vùng trông như bấm được | Không "ảo giác nút": vùng có border/hình nhưng không bấm được phải không tồn tại; mọi control hiển = hit area đủ lớn (≥44px cảm ứng); không element thừa đè invisible lên `testid-option-*` | `out/qa/e2e-PC-U-05.png` | PC-20, PC-03 |
| PC-U-06 | usability | Phản hồi ≤150ms | Bấm 1 ô đáp án, chụp khung hình ngay tại thời điểm +150ms | Đã thấy phản hồi thị giác (highlight/rung/khởi động animate) — không "lặng" quá 150ms; bấm HUD (`testid-hud-ink`) không có dead zone khó chịu | `out/qa/e2e-PC-U-06.png` | PC-10 |
| PC-U-07 | usability | Một hành động/màn | Vision đếm số phần tử "kêu bấm" trên PLAY | Focus là 4 ô đáp án; hint/undo nhỏ hơn thứ cấp; không có 2 CTA cùng cấp giành sự chú ý | `out/qa/e2e-PC-U-07.png` | PC-09 |

### 1.9 Nhóm G — ENDGAME (màn 120 → Master)

| ID | Nhóm | Màn/Flow | Bước (ngắn) | Kỳ vọng nhìn thấy được | Ảnh/evidence path | BR liên quan |
|---|---|---|---|---|---|---|
| PC-G-01 | endgame | Hết 120 màn | Seed debug nhảy màn 120, thắng | End screen: `testid-end-total-stars` = tổng sao khớp save, copy "You unfolded all 120", nút `testid-end-master` hiện rõ — game **khai báo hết nội dung** (bắt buộc Playables) | `out/qa/e2e-PC-G-01.png` | PC-18, PC-01 |
| PC-G-02 | endgame | Vòng Master | Bấm `testid-end-master`, chơi 2 màn | Vào master level 1 của vòng chơi lại 120 màn; `testid-btn-hint` **ẩn/không tồn tại** (master không hint); không timer; đề vẫn deterministic theo seed | `out/qa/e2e-PC-G-02.png` | PC-18, PC-02 |
| PC-G-03 | endgame | Sao/mực không cộng 2 lần | Trong Master, thắng 1 màn đã từng thắng ở vòng chính | Không cấp sao cộng dồn làm sai `testid-end-total-stars` vòng chính; Mực Gấp cấp theo luật §PC-11 (không farm vô hạn qua map) — ghi nhận số học từ log | `out/qa/e2e-PC-G-03.png` | PC-18, PC-06, PC-11 |
| PC-G-04 | endgame | Save qua endgame | Tới end screen, reload, mở lại title | Title vẫn "Continue" hợp lệ (không kẹt ở end screen lặp vô hạn); vào được map/menu từ end screen qua `testid-btn-menu` | `out/qa/e2e-PC-G-04.png` | PC-16, PC-18 |

---

## 2. DEVICE / ASPECT MATRIX

Mỗi ô = chụp tối thiểu 3 màn (Title / PLAY / Score card hoặc Map). Fail bất kỳ ô nào ⇒ nhóm responsive FAIL.

| Viewport | Tỷ lệ | Scenario | Title | PLAY 4 ô | Map/Score | Ghi chú khi soi ảnh |
|---|---|---|---|---|---|---|
| 1080×1920 | 9:16 | Mobile dọc (Playables chủ lực) | `out/qa/matrix-916-title.png` | `out/qa/matrix-916-play.png` | `out/qa/matrix-916-map.png` | Ngón tay cái với tới `testid-option-*`; không scrollbar |
| 720×1280 | 9:16 nhỏ | Mobile giá rẻ | `out/qa/matrix-720-title.png` | `out/qa/matrix-720-play.png` | `out/qa/matrix-720-score.png` | Chữ nhỏ nhất vẫn đọc ≥4.5:1 |
| 1920×1080 | 16:9 | Desktop ngang | `out/qa/matrix-169-title.png` | `out/qa/matrix-169-play.png` | `out/qa/matrix-169-map.png` | Không stretch tờ giấy |
| 1080×1080 | 1:1 | Embedded/vuông | `out/qa/matrix-11-title.png` | `out/qa/matrix-11-play.png` | `out/qa/matrix-11-score.png` | Ô đáp án không chồng HUD |
| 2560×1080 | 32:9 | Ultrawide | `out/qa/matrix-329-title.png` | `out/qa/matrix-329-play.png` | `out/qa/matrix-329-map.png` | Không vùng chết/nội dung trôi ra giữa vô nghĩa |
| 1920×1080→xoay dọc | đổi giữa màn | Rotate (PC-R-04) | — | `out/qa/matrix-rotate-play.png` | — | Giữ state tờ gấp + sao |

---

## 3. KẾT LUẬN MẪU (Hermes QA điền sau khi soi ảnh)

Quy ước: **PASS** = mắt thấy đúng kỳ vọng trong ảnh · **FAIL** = thấy sai/thiếu · **NỢ** = môi trường chưa dựng được (mock SDK, thiết bị), ghi rõ nợ gì.

| Nhóm | Case | Kết quả | Người soi | Ghi chú / link ảnh lỗi |
|---|---|---|---|---|
| B — boot | PC-B-01..05 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| O — onboarding | PC-O-01..05 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| L — vòng lặp | PC-L-01..11 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| R — responsive | PC-R-01..04 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| A — ad | PC-A-01..06 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| P — pause/mute | PC-P-01..04 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| S — save | PC-S-01..07 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| U — usability | PC-U-01..07 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| G — endgame | PC-G-01..04 | ☐ PASS ☐ FAIL ☐ NỢ: __ | | |
| **Chốt** | Gate nộp Playgama/Playables | ☐ SHIP ☐ KHÔNG | | FAIL nhóm U hoặc A-04 = chặn ship |

**Quy tắc chốt:** toàn bộ nhóm B, O, L, R, U phải PASS. Nhóm A/P/S có NỢ được phép khi thiếu mock SDK nhưng phải nộp kèm trước gate duyệt art; bất kỳ FAIL usability (PC-U-*) là **chặn ship**, không phải "fix sau". Không xoá ca từng FAIL — giữ ảnh làm trace.

---

## 4. PHỦ BR → CASE (tra ngược từ SPEC §6)

| BR | Case phủ | | BR | Case phủ |
|---|---|---|---|---|
| PC-01 | L-09, L-11, P-01, G-01 | | PC-11 | S-02, G-03 |
| PC-02 | L-06, R-04, G-02 | | PC-12 | S-07 |
| PC-03 | L-01, L-07, U-05 | | PC-13 | A-01, A-02, A-05, A-06 |
| PC-04 | L-07, U-04 | | PC-14 | O-04, L-09, A-03, A-04, A-05, U-03 |
| PC-05 | L-03, L-04, L-05, P-04, A-01, A-02, U-01 | | PC-15 | B-03 |
| PC-06 | L-02, L-04, L-08, G-03 | | PC-16 | L-05, R-04, S-01, S-02, S-03, S-06, G-04 |
| PC-07 | O-05, S-04, S-05 | | PC-17 | P-01, P-02, P-03, P-04 |
| PC-08 | L-08, A-06, U-01 | | PC-18 | G-01, G-02, G-03, G-04 |
| PC-09 | O-01..O-05, L-01, L-02, U-02, U-07 | | PC-19 | U-03 |
| PC-10 | B-01, L-10, U-06 | | PC-20 | B-01..B-05, R-01..R-03, A-01, U-05 |

---

## 5. USER TEST CẦN DỌN (bắt buộc trước khi đóng QA)

QA tạo ra nhiều save rác — **phải dọn hết**, không để lại trên máy build/artifact:

1. **Save debug:** mọi case dùng `?debug=1&seed=...` (L-03, L-06, L-09, L-11, A-05, P-01, G-*) tạo save nhảy màn rác → cuối phiên QA **xoá sạch qua `testid-set-reset`** hoặc tính năng dev "clear save"; xác nhận bằng ảnh `out/qa/e2e-cleanup-reset.png`.
2. **Profile/browser tạm:** các profile mới tinh (B-04, O-*, S-01) để lại storage + ring-buffer log → đóng và xoá profile.
3. **Skin đã mua trong S-02:** nếu dùng skin debug cộng Mực, reset luôn currency về 0; không để tài khoản dev còn Mực ảo.
4. **Ring-buffer log event:** sau khi xong QA số, xuất log 1 lần cuối để P4-06 dùng, rồi **clear buffer** để ca QA sau không lẫn funnel.
5. **Không commit ảnh QA vào repo game** — `out/qa/` là artifact chạy QA, để ngoài build nộp.

---

## 6. CHECKLIST TÓM TẮT TRƯỚC KHI KÝ SHIP

- [ ] Boot ≤3s + 0 console error + 0 mạng ngoài (B-01, B-03, B-04)
- [ ] Newbie vào chơi trong ≤3 click, hiểu luật không cần chữ (O-01, O-02)
- [ ] Không có win screen — màn kế đã gấp sẵn (O-05, L-02)
- [ ] Sai ⇒ animate giải thích + Thử lại (L-03, L-04)
- [ ] Seed tái lập đề (L-06, R-04)
- [ ] 3 tỷ lệ 9:16 / 16:9 / 32:9 không cắt, HUD không đè (R-01..R-03)
- [ ] Không ad trong 60s đầu; interstitial chỉ sau score card (A-03, A-04)
- [ ] Pause/mute tôn trọng nền tảng (P-01..P-04)
- [ ] Reload giữ đúng màn + sao + skin; reset không mất skin đã mua (S-01, S-02)
- [ ] End screen + Master không hint (G-01, G-02)
- [ ] Toàn bộ nhóm U PASS (chặn ship)
- [ ] Đã dọn save rác/debug theo §5

*File này là gate QA của Hermes (Playwright + vision). Agent code chỉ được báo "xong" khi bảng §3 không còn FAIL/NỢ chưa giải trình. Giữ lại mọi ca FAIL + ảnh làm trace.*

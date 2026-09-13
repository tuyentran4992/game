# M11 "Paper Crease" — TEST CASES (vitest, cho DEV)

> **TEST-CASES.md = test cho DEV (vitest, chạy TRƯỚC khi báo xong); E2E-TESTS.md = QA browser của Hermes (file khác).**
> **Loại file:** bảng case mô tả — KHÔNG phải code test. Dev tự dịch mỗi dòng thành 1 `it()` trong vitest.
> **Nguồn sự thật:** `SPEC.md` (rule PC-01..PC-20, §7 State handling) · số neo đo lường: `../../retention/P1.json`, `../../retention/P4.json` (cấm bịa thêm benchmark).
> **Phạm vi vitest:** chỉ `src/logic` (thuần TS, không Phaser/DOM/SDK — SPEC §2). Mọi thứ cần mắt người/consol browser → chuyển `E2E-TESTS.md`, ghi rõ "chỉ E2E" ở coverage matrix.

---

## 0. LỆNH SELF-CHECK TRƯỚC KHI BÁO XONG (bắt buộc, cả 2 bước phải xanh)

| Bước | Lệnh | Điều kiện |
|---|---|---|
| 1. Typecheck | `cd game && npx tsc --noEmit` | 0 lỗi |
| 2. Logic tests | `cd game && npm run test:logic` | PASS 100%, không `skip`, không `todo` |

- Cổng kiểm kiến trúc: `test:logic` phải chạy được **không cần browser** (SPEC §2). Nếu cần `jsdom` cho một case logic ⇒ thiết kế sai, sửa thiết kế chứ không thêm jsdom.
- Case nào FAIL khi bàn giao ⇒ **dán output vitest thật** vào cột ghi chú + giữ dòng đó trong file (không xoá ca từng FAIL — giữ trace, theo chuẩn M2).
- Cột "Trạng thái" điền ✅ PASS / ❌ FAIL khi chạy.

---

## 1. NHÓM A — SINH ĐỀ & ĐÁP ÁN (PC-02, PC-03, PC-04)

> Máy đếm bằng validator, không đếm bằng mắt. Ngưỡng "khác biệt" lấy đúng định nghĩa PC-04: mỗi ô nhiễu **khác đáp án đúng ở ≥1 lỗ**, không ô nào trùng đáp án, 2 ô bất kỳ khác nhau.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-GEN-01 | A. Sinh đề | PC-02 | Seed ổn định theo levelIndex | `levelSpec(23)` gọi 2 lần trong 2 process khác nhau | Hai kết quả deep-equal từng trường (kiểu gấp, vị trí lỗ, 4 ô, đáp án) | unit | `src/logic/__tests__/generator/seed-stability.spec.ts` | ☐ |
| TC-GEN-02 | A. Sinh đề | PC-02 | Seed không phụ thuộc thời gian/thứ tự chơi | Sinh level 23 trước, level 5 giữa, level 23 sau; mock đồng hồ nhảy sang ngày khác | Level 23 trả về y hệt ở mọi thời điểm/thứ tự (seed = hash(gameId+levelIndex), SPEC §5.4) | unit | `src/logic/__tests__/generator/seed-time-independent.spec.ts` | ☐ |
| TC-GEN-03 | A. Sinh đề | PC-02 | Đề KHÔNG nằm trong save | Chơi 3 màn → serialize object save | Không có key nào chứa levelSpec/folds/options của bất kỳ màn nào | unit | `src/logic/__tests__/save/no-level-content-in-save.spec.ts` | ☐ |
| TC-GEN-04 | A. Đáp án | PC-03 | Đủ 120 màn đều có đúng 1 đáp án | Vòng lặp `levelSpec(1..120)` | Mỗi màn: đúng 1/4 ô khớp trạng thái mở bung do simulator gấp tính ra (không xáo ngẫu nhiên) | unit | `src/logic/__tests__/generator/solution-uniqueness-120.spec.ts` | ☐ |
| TC-GEN-05 | A. Đáp án | PC-03, PC-04 | **10.000 đề liên tiếp — đếm bằng máy** | Sinh 10.000 đề trên dải seed tổng hợp (không phải 120 màn chính), chạy validator từng đề | Bộ đếm vi phạm = **0**: mọi đề có đúng 1 đáp án + 3 ô nhiễu đạt ngưỡng khác biệt PC-04. Ghi thời lượng chạy vào báo cáo bàn giao (không đặt benchmark cứng). | unit (stress) | `src/logic/__tests__/generator/validator-10000.spec.ts` | ☐ |
| TC-GEN-06 | A. Đáp án | PC-04 | Mỗi ô nhiễu khác đáp án ≥1 lỗ | Với mỗi đề trong 10.000 (dùng chung fixture TC-GEN-05) | Không tồn tại ô nào có tập lỗ trùng đáp án đúng | unit | `src/logic/__tests__/generator/distractor-diff.spec.ts` | ☐ |
| TC-GEN-07 | A. Đáp án | PC-04 | 2 ô bất kỳ khác nhau | So cặp C(4,2)=6 cho từng đề đã sinh | Không có 2 ô y hệt nhau | unit | `src/logic/__tests__/generator/options-pairwise-distinct.spec.ts` | ☐ |
| TC-GEN-08 | A. Đáp án | PC-04 | Validator bắt được đề xấu | Dựng tay 3 spec hỏng: (1) ô nhiễu trùng đáp án, (2) 2 ô nhiễu giống nhau, (3) 0 hoặc 2 đáp án đúng | Validator FAIL cả 3 fixture, mỗi lần nêu đúng lý do — chứng minh TC-GEN-05 không phải "luôn xanh giả" | error/boundary | `src/logic/__tests__/generator/validator-catches-bad.spec.ts` | ☐ |
| TC-GEN-09 | A. Sinh đề | PC-03 | Toán gấp đúng: lỗ TRÊN NẾP | Fold H×2 (4 lớp), 1 lỗ đặt đúng trên đường nếp | Simulator mở bung ra đúng số lỗ của từng lớp trùng khít (lỗ trên nếp ⇒ 2 lớp ghép — copy gốc SPEC §4.3 "only makes 2 holes"), đáp án sinh từ kết quả đó | unit | `src/logic/__tests__/fold/crease-hole-count.spec.ts` | ☐ |
| TC-GEN-10 | A. Sinh đề | PC-03 | Toán gấp đúng: lỗ GIỮA mặt / ở mép | Cùng fold, lỗ giữa mặt và lỗ sát mép tờ gấp | Số vị trí lỗ khi mở bung khớp bảng tra fold rules (thêm kiểu gấp = thêm dòng bảng tra, SPEC §5.3 — không có nhánh if cứng) | boundary | `src/logic/__tests__/fold/registry-table.spec.ts` | ☐ |
| TC-GEN-11 | A. Sinh đề | PC-01, PC-03 | Đề chương 4+ có cắt góc chéo | `levelSpec` các màn từ đầu chương 4 | Có xuất hiện dạng "cắt 1 góc chéo" hợp lệ; đáp án tính theo hình cắt mở bung, không phải lỗ tròn | unit | `src/logic/__tests__/generator/cut-corner-levels.spec.ts` | ☐ |

**Không test được ở vitest (chuyển E2E):** hình 4 ô có "nhìn khác nhau thật" với mắt người, độ hấp dẫn đề — chỉ E2E (vision QA), vì validator máy chỉ đo được điều kiện PC-04.

---

## 2. NHÓM B — LUẬT SAO + HINT (PC-06, PC-08; liên quan PC-05)

> Neo P1-03 (retention/P1.json): sao chấm theo first-try/không-hint để phản ánh trình thật; màn skip = 0 sao.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-STR-01 | B. Sao | PC-06 | Thắng ngay lần đầu, không hint | `win(firstTry=true, hintUsed=false)` | 3 sao | unit | `src/logic/__tests__/stars/star-rules.spec.ts` | ☐ |
| TC-STR-02 | B. Sao | PC-06, PC-08 | Thắng lần đầu NHƯNG đã dùng hint | `win(firstTry=true, hintUsed=true)` | 2 sao (dùng hint ⇒ mất sao 3) | unit | `src/logic/__tests__/stars/star-rules.spec.ts` | ☐ |
| TC-STR-03 | B. Sao | PC-06 | Thắng sau khi sai ≥1 lần | `win(firstTry=false)` (kèm/không hint) | 1 sao — hint hay retry đều không còn cửa 2–3 sao | unit | `src/logic/__tests__/stars/star-rules.spec.ts` | ☐ |
| TC-STR-04 | B. Hint | PC-08 | Hint tối đa 1 lần/màn | Bấm hint lần 2 trong cùng màn | Lần 2 bị từ chối, không cộng hintUsed lần 2, state không đổi | boundary | `src/logic/__tests__/hint/hint-once-per-level.spec.ts` | ☐ |
| TC-STR-05 | B. Hint | PC-08 | Cooldown 2 màn cho hint miễn phí đầu | Hint miễn phí đầu tiên ở màn n; thử màn n+1, n+2 | n+1: chưa free (phải rewarded); n+2: free trở lại — đúng note PC-08 | boundary | `src/logic/__tests__/hint/hint-free-cooldown.spec.ts` | ☐ |
| TC-STR-06 | B. Hint | PC-08 | Nội dung hint = soi ĐÚNG 1 nếp gấp | Gọi `getHint(levelSpec)` | Trả về thông tin 1 nếp gấp duy nhất (fold index), không lộ đáp án | unit | `src/logic/__tests__/hint/hint-reveals-one-fold.spec.ts` | ☐ |
| TC-STR-07 | B. Undo | PC-05 | Undo ≤1 lần/màn | undo hợp lệ 1 lần (rewarded); yêu cầu lần 2 cùng màn | Lần 2 từ chối; hết lượt undo ⇒ logic chỉ còn đường "Thử lại" (khớp state §7 "Hết lượt undo") | boundary | `src/logic/__tests__/level/undo-limit.spec.ts` | ☐ |
| TC-STR-08 | B. Sao | PC-06, PC-07 | Màn skip = 0 sao, không vào tổng chương | Đánh dấu skip màn | Star của màn đó = 0, tổng sao chương không tăng | unit | `src/logic/__tests__/stars/skipped-level-zero-stars.spec.ts` | ☐ |

---

## 3. NHÓM C — TIẾN TRÌNH & MỞ KHOÁ CHƯƠNG (PC-01, PC-07)

> Neo P1-01 (P1.json): 120 = 8 chương × 15 màn, không lives, không gate tiền tệ. Neo P1-02: mỗi chương đúng 1 từ vựng mới, khó tăng bằng số bước suy luận, **không** bằng đếm ngược (timer chỉ từ chương 7 — PC-01). Gate chương chỉ cần sao tối thiểu ~12/15, đừng bắt full sao — rủi ro đã nêu trong P1 summary.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-PRG-01 | C. Tiến trình | PC-01 | Cấu trúc chiến dịch đúng | Đọc `config/chapters.json` | Đúng 8 chương × 15 màn = 120; không có chương rỗng/dư | unit | `src/logic/__tests__/progression/campaign-shape.spec.ts` | ☐ |
| TC-PRG-02 | C. Tiến trình | PC-01 | Mỗi chương đúng 1 từ vựng gấp/cắt mới | So `newFoldVocab` giữa 2 chương kề nhau | Mỗi chương khai báo đúng 1 từ vựng mới, không chương nào 0 hoặc ≥2, không trùng chương khác | unit | `src/logic/__tests__/progression/one-new-rule-per-chapter.spec.ts` | ☐ |
| TC-PRG-03 | C. Tiến trình | PC-01 | Không giới thiệu 2 luật mới cùng màn (neo P4-02) | Quét 120 levelSpec | Không màn nào đồng thời ra mắt 2 biến thể luật | unit | `src/logic/__tests__/progression/no-double-rule-reveal.spec.ts` | ☐ |
| TC-PRG-04 | C. Tiến trình | PC-01 | Ramp bằng số bước suy luận, timer chỉ từ chương 7 | So cấu hình màn 1→15 trong chương; cờ `timerEnabled` theo chương 1..8 | Số bước suy luận không giảm dọc chương; timer `false` với chương 1-6, `true` từ chương 7 | unit | `src/logic/__tests__/progression/difficulty-ramp.spec.ts` | ☐ |
| TC-PRG-05 | C. Mở khoá | PC-07 | Ngưỡng mở khoá 12/15 sao | Chương 1 tổng sao = 11 / 12 / 15 (3 fixture) | 11 ⇒ chương 2 khoá; 12 ⇒ mở; 15 ⇒ mở — **không bắt full sao** | boundary | `src/logic/__tests__/progression/chapter-unlock-gate.spec.ts` | ☐ |
| TC-PRG-06 | C. Mở khoá | PC-07 | Sao skip không được tính vào ngưỡng | Chương 1: 12 màn thắng (12 sao) + 3 màn skip (0 sao) | Đúng ngưỡng 12 ⇒ mở chương 2 (chứng minh TC-PRG-05 cộng từ sao thật, không đếm màn) | boundary | `src/logic/__tests__/progression/unlock-counts-real-stars.spec.ts` | ☐ |
| TC-PRG-07 | C. Tiến trình | PC-07 | Không tụt khoá khi chơi lại mất sao | Đang 12 sao, chơi lại mất 1 sao | Chương đã mở KHÔNG bị khoá lại (mở khoá một chiều, lưu cờ) — tránh softlock | error | `src/logic/__tests__/progression/no-relock.spec.ts` | ☐ |
| TC-PRG-08 | C. Tiến trình | PC-01, PC-02 | Theme giấy đổi theo chương từ dữ liệu | levelSpec chương 1 vs 2 vs 8 | Mỗi chương trỏ 1 bộ token theme qua registry (thêm chương = thêm dòng, SPEC §5.3) | unit | `src/logic/__tests__/progression/theme-registry.spec.ts` | ☐ |

**Chỉ E2E / playtest (ghi rõ để dev không cố test giả):** win-rate màn 1-30 ≥75% (băng mục tiêu PC-01 + neo P1-02) là **số đo người thật**, vitest chỉ đảm bảo log `level_start/complete/fail` đủ để tính — không assert win-rate trong unit test.

---

## 4. NHÓM D — PHIÊN & MỘT-MÀN-KẾ (PC-09, PC-10; liên quan PC-05)

> Neo P4-03 (P4.json): continue rate level→level **≥85% trong 10 màn đầu**, màn kế đã gấp sẵn, không win screen. Neo P4-04: phiên mục tiêu **5-7 phút (~5-7 màn, 45-75s/màn)**, median phiên mục tiêu **≥4 phút** (ngưỡng Poki đã ghi trong P4); màn = breakpoint tự nhiên.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-SES-01 | D. Máy trạng thái | PC-09 | Không tồn tại state win-screen | Liệt kê mọi state của `levelState` | Tập state = loading→ready→answered→correct/wrong→next (SPEC §5.3); không có `WIN_SCREEN`; từ `correct` chỉ sang `next` | unit | `src/logic/__tests__/level/state-machine.spec.ts` | ☐ |
| TC-SES-02 | D. Máy trạng thái | PC-05, PC-09 | Sai ⇒ vẫn trong màn, được Thử lại | Chọn đáp án sai | State `wrong`, sinh animate giải thích (dữ liệu: lỗ nào thuộc nếp nào); `retry()` đưa về `ready` cùng đề, không trừ mạng/lives | unit | `src/logic/__tests__/level/wrong-retry-loop.spec.ts` | ☐ |
| TC-SES-03 | D. Máy trạng thái | PC-05 | 1 lượt chọn/màn + khoá ô khi resolve | Ở `ready` bấm ô 1 rồi bấm ô 2 ngay | Chỉ lượt đầu được tính; các bấm sau bị buffer/ignore theo state (không mất lượt — khớp §7 "Đang mở bung: bấm ⇒ buffer") | boundary | `src/logic/__tests__/level/single-choice-lock.spec.ts` | ☐ |
| TC-SES-04 | D. One-more-level | PC-09 | Màn kế được chuẩn bị sẵn khi đúng | Chuyển `correct` màn n | `levelSpec(n+1)` đã được generate trong cùng transaction — điều kiện cần của "tờ giấy đã gấp sẵn trên màn hình" | unit | `src/logic/__tests__/level/next-precomputed.spec.ts` | ☐ |
| TC-SES-05 | D. Phiên | PC-10 | Timer mềm 45-75s/màn, không phạt | Fake clock: chạy timer quá 75s | Không có sự kiện fail/lock nào do timer hết giờ; timer chỉ là số đo (neo P4-04) | unit | `src/logic/__tests__/session/soft-timer.spec.ts` | ☐ |
| TC-SES-06 | D. Phiên | PC-10 | Màn = breakpoint — nghỉ bất kỳ lúc nào không hỏng save | Lưu+reload tại mọi state của một màn | Reload ra đúng màn, đúng trạng thái sao; không màn nào "dở dang không vào lại được" | unit | `src/logic/__tests__/session/level-breakpoint-resume.spec.ts` | ☐ |
| TC-SES-07 | D. Log phiên | PC-09, PC-10, PC-15 | Đủ cặp event để tính continue rate & median phiên (neo P4-03/P4-04/P4-06) | Play mô phỏng 10 màn qua logic + inspect ring-buffer log | Log chứa cặp `level_end→next_level_start` và `session_start/session_end` có timestamp — data để QA tính ≥85% / ≥4 phút ở ngoài, vitest chỉ assert **độ đủ log** (mục tiêu P4-06: ≥95% phiên đủ cặp là ngưỡng nội bộ đã ghi trong P4.json, đo trên playtest — không assert máy) | unit | `src/logic/__tests__/session/log-funnel-events.spec.ts` | ☐ |

**Chỉ E2E/playtest:** continue rate ≥85%, median phiên ≥4 phút, cảm giác "không có win screen chặn giữa" — là số đo hành vi người thật qua log; vitest chỉ verify điều kiện cấu trúc + log đủ.

---

## 5. NHÓM E — MỰC / SKIN / ALBUM (PC-11, PC-12)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-INC-01 | E. Kinh tế | PC-11 | Mực +theo số sao & streak đúng bảng | Thắng màn với 1/2/3 sao, streak 0..k (đọc `config` ink.json) | Cộng Mực khớp từng dòng bảng tra (sao × streak); không hardcode số trong scene | unit | `src/logic/__tests__/economy/ink-award-table.spec.ts` | ☐ |
| TC-INC-02 | E. Kinh tế | PC-11 | Mua skin bằng Mực | Đủ Mực / thiếu 1 Mực mua skin `config/skins.json` | Đủ ⇒ owned+equip, trừ đúng giá; thiếu ⇒ từ chối, Mực và owned không đổi | boundary | `src/logic/__tests__/economy/skin-purchase.spec.ts` | ☐ |
| TC-INC-03 | E. Kinh tế | PC-11 | Không có đường bán bằng tiền thật | Scan API surface của shop + logic | Shop chỉ nhận 1 loại tiền = Mực Gấp; không hàm nào tên/ý nghĩa IAP, không call nền tảng tiền tệ (PC-11 + out of scope §1.5) | unit | `src/logic/__tests__/economy/no-real-money.spec.ts` | ☐ |
| TC-INC-04 | E. Kinh tế | PC-11 | Mua lại skin đã sở hữu | Buy skin đã owned | Từ chối, không trừ Mực, idempotent | error | `src/logic/__tests__/economy/skin-rebuy-guard.spec.ts` | ☐ |
| TC-INC-05 | E. Album | PC-12 | Album chặn ở ≤14 mục, dedupe theo mẫu | Thêm 20 mẫu mở bung (có trùng) | Album ≤14, mỗi mẫu chỉ 1 suất, thêm trùng không tăng số | boundary | `src/logic/__tests__/economy/album-cap.spec.ts` | ☐ |
| TC-INC-06 | E. Album | PC-12 | Huy hiệu chương ≤6, cấp 1 lần | Hoàn thành chương nhiều lần / hoàn thành 8 chương | Mỗi chương tối đa 1 huy hiệu, tổng lưu ≤6 theo `config/album.json` (bộ nhỏ có chủ đích); cấp lại lần 2 bị chặn | unit | `src/logic/__tests__/economy/badges.spec.ts` | ☐ |

**Chỉ E2E/playtest:** % equip skin khác mặc định trong 7 ngày, % mở ≥80% album (cột đo PC-11/PC-12) — số liệu người dùng, không tồn tại trong unit test.

---

## 6. NHÓM F — AD & LUẬT ĐẶT AD (PC-13, PC-14) — chạy bằng SDK mock, không gọi mạng thật

> Cấm mọi network thật trong test. Toàn bộ dùng `MockAds` ghi lại thứ tự/lời gọi.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-AD-01 | F. Rewarded | PC-13 | Rewarded chỉ ở đúng 4 điểm | Gọi `requestRewarded(place)` với 4 place hợp lệ (undo, hint, continue, x2 Mực) + 3 place bịa (skip-ad, revive-ad, shop-ad) | 4 place đầu đi qua adapter; mọi place khác bị chặn ở tầng policy, không tới SDK | unit | `src/logic/__tests__/ads/rewarded-place-policy.spec.ts` | ☐ |
| TC-AD-02 | F. Rewarded | PC-13 | Continue-after-game-over ≤1 lần/phiên | Game over ⇒ rewarded continue lần 1 OK; lần 2 cùng phiên | Lần 2 từ chối ngay ở policy | boundary | `src/logic/__tests__/ads/continue-once-per-session.spec.ts` | ☐ |
| TC-AD-03 | F. Interstitial | PC-14 | Interstitial chỉ sau score screen | 3 thời điểm: giữa màn thường, hết màn 15 chương (đã hiện score card), game over lần 2+ | Chỉ 2 thời điểm sau được phép; giữa màn thường không | unit | `src/logic/__tests__/ads/interstitial-places.spec.ts` | ☐ |
| TC-AD-04 | F. Interstitial | PC-14 | Cấm trong 60 giây đầu | Fake clock t=10s/59s/61s ⇒ request interstitial | t<60s luôn chặn (kể cả "hết game over lần 2" giả định); t≥60s qua policy thời gian | boundary | `src/logic/__tests__/ads/interstitial-60s-guard.spec.ts` | ☐ |
| TC-AD-05 | F. Interstitial | PC-14 | Cấm trước khi kết thúc màn đầu | Mọi request trước `level_complete(1)` | Chặn tuyệt đối (PC-14 vế 2) | boundary | `src/logic/__tests__/ads/no-ad-before-first-level.spec.ts` | ☐ |
| TC-AD-06 | F. Interstitial | PC-14 | Luôn hiện SAU khi đã trao thưởng | Spy thứ tự: score card trao sao/Mực vs lời gọi interstitial | Thứ tự log mock: `reward_granted` → `interstitial_request` (không đảo ngược) | unit | `src/logic/__tests__/ads/ad-after-reward-order.spec.ts` | ☐ |
| TC-AD-07 | F. Null-Object | PC-14, PC-20 | Ad không load ⇒ không chặn game | Mock ad trả `fail`/timeout cho cả rewarded + interstitial | Rewarded ⇒ ẩn nút ad tương ứng, player dùng đường "Thử lại" thường (state §7); interstitial ⇒ bỏ qua, luồng chạy tiếp 0 exception | error | `src/logic/__tests__/ads/ad-failure-degradation.spec.ts` | ☐ |

**Chỉ E2E/playtest:** "engagement 2-4 views/DAU" và "tỷ lệ thoát 5s sau ad" (cột đo PC-13/PC-14) — số kênh/log người thật; vitest chỉ verify **luật đặt ad**, không verify cảm nhận quảng cáo.

---

## 7. NHÓM G — CẤM MẠNG (PC-15)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-NET-01 | G. Cấm mạng | PC-15 | Quét mã nguồn: 0 API mạng | Scan AST/text toàn bộ `src/` (logic+render+ui, trừ adapter SDK tập trung) | 0 kết quả: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `navigator.connection`, URL `http(s)://` ngoài tài liệu comment | unit (source scan) | `src/logic/__tests__/net/no-network-api.spec.ts` | ☐ |
| TC-NET-02 | G. Cấm mạng | PC-15 | Logic không đụng SDK/nền tảng trực tiếp | Scan `src/logic/**` | 0 import Phaser/DOM/SDK; 0 tham chiếu `window.ytgame`/bridge (contract SPEC §2 — mọi call nền tảng đi qua `@game/sdk`) | unit (source scan) | `src/logic/__tests__/net/logic-purity.spec.ts` | ☐ |
| TC-NET-03 | G. Ring-buffer | PC-15 | Log local ring-buffer ≤100KB | Ghi 10.000 event qua logger | Tổng serialized ≤100KB, event cũ nhất bị bay trước, timestamp còn đơn điệu (đúng cơ chế P4-06) | boundary | `src/logic/__tests__/log/ring-buffer-cap.spec.ts` | ☐ |
| TC-NET-04 | G. Ring-buffer | PC-15, PC-16 | Storage chết ⇒ vẫn chơi được | Mock storage luôn `throw` (chế độ ẩn danh) | Game chạy trọn vòng lặp màn 1-2 không exception; chỉ mất log/save (hành vi P4-06 mô tả) | error | `src/logic/__tests__/log/storage-throw-still-playable.spec.ts` | ☐ |
| TC-NET-05 | G. Cấm mạng | PC-15 | Build không phát sinh request runtime | Chơi logic-mô-phỏng 20 màn với spy network toàn cục | 0 lời gọi mạng bị spy bắt được trong suốt phiên mô phỏng | unit | `src/logic/__tests__/net/zero-requests-runtime.spec.ts` | ☐ |

**Chỉ pipeline/E2E:** `validate.py` quét 0 network trên **bundle thật** (DoD §8.5) và mở Network tab browser ⇒ thuộc E2E-TESTS.md/QA, không phải vitest.

---

## 8. NHÓM H — SAVE + MIGRATE + SAVE HỎNG (PC-16)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-SAV-01 | H. Save | PC-16 | Save là 1 object JSON có `version`, round-trip | Save → load qua mock SDK storage | Deep-equal; top-level đúng 1 object; có `version` số | unit | `src/logic/__tests__/save/roundtrip-version.spec.ts` | ☐ |
| TC-SAV-02 | H. Migrate | PC-16 | Migrate từng bước version cũ → mới | Fixture save v1 (schema cũ nhất khai trong DATA-MODEL) | Sau migrate: đủ field default v hiện hành, dữ liệu cũ không mất (sao, skin, Mực); migrate là hàm thuần, test được mọi cặp version liền kề | unit | `src/logic/__tests__/save/migrate-chain.spec.ts` | ☐ |
| TC-SAV-03 | H. Save hỏng | PC-16 | JSON hỏng ⇒ chơi lại màn 1, KHÔNG mất skin đã mua | Save corrupt (nửa chuỗi JSON) + fixture skin đã mua nằm ở vùng recoverable khi khôi tạo save mới | Progression về level 1, sao về 0; owned skins + equip còn nguyên (đúng hàng "Save hỏng/thiếu" §7); không crash | error | `src/logic/__tests__/save/corrupt-save-recovery.spec.ts` | ☐ |
| TC-SAV-04 | H. Save thiếu field | PC-16 | Thiếu field ⇒ default, không crash | Save hợp lệ nhưng xoá 1 lúc: `stars`, `ink`, `skins`, `album`, `settings` | Mỗi lần load: fill default, game tiếp tục được, log cảnh báo cục bộ | error | `src/logic/__tests__/save/missing-field-defaults.spec.ts` | ☐ |
| TC-SAV-05 | H. Save lạ | PC-16 | `version` tương lai/không rõ | Save version = 999 | Không wipe sạch một cách hung bạo / không crash: fallback chơi từ level 1, giữ phần parse được (quy tắc phòng thủ, ghi chú DATA-MODEL) | error | `src/logic/__tests__/save/unknown-version.spec.ts` | ☐ |
| TC-SAV-06 | H. Kích thước | PC-16 | Save worst-case ≤100KB thực tế và thấp hơn nhiều ngưỡng 3MB nền tảng | Dựng save đầy nhất: 120 màn 3 sao, 8 skin, 14 album, 6 huy hiệu, log 100KB, ghost, streak | Serialize UTF-8 bytes ≤100KB phần save game (ring-buffer tính riêng theo PC-15); tổng vẫn dưới nhiều so với 3MB (§5.2) | boundary | `src/logic/__tests__/save/size-budget.spec.ts` | ☐ |
| TC-SAV-07 | H. Save quota | PC-16 | SDK storage reject khi ghi | Mock `saveData` trả quota-exceeded | Không crash, không mất state trong bộ nhớ, session hiện tại chơi tiếp (pattern fallback đã chuẩn hoá ở M2) | error | `src/logic/__tests__/save/write-quota-fail.spec.ts` | ☐ |

---

## 9. NHÓM I — PAUSE / MUTE (PC-17)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-PSE-01 | I. Pause | PC-17 | Pause dừng timer, resume đúng chỗ | level đang chạy t=20s ⇒ `onPause()` ⇒ fake-clock 30s ⇒ `onResume()` | elapsed không tăng trong pause (vẫn 20s khi resume); state màn không đổi (đúng §7 "quay lại tiếp tục đúng chỗ") | unit | `src/logic/__tests__/platform/pause-timer.spec.ts` | ☐ |
| TC-PSE-02 | I. Mute | PC-17 | Mute nền tảng + mute riêng độc lập | `onAudioEnabledChange(false)`; rồi toggle mute trong game on/off | Cả 2 nguồn đều cắt cờ phát nhạc/SFX ở audio-state; bật mute trong game không "unmute" lệnh mute của nền tảng (AND semantics) | unit | `src/logic/__tests__/platform/mute-sources.spec.ts` | ☐ |
| TC-PSE-03 | I. Pause | PC-17 | Mất focus giữa animate mở bung | State `unfolding` ⇒ `onPause()` ⇒ `onResume()` | Không mất lượt, không đổi kết quả đã chốt; logic đánh dấu animation cần vẽ lại tiếp (phần tween thật = E2E) | boundary | `src/logic/__tests__/platform/pause-during-unfold.spec.ts` | ☐ |
| TC-PSE-04 | I. Pause | PC-17 | Pause khi đang `answered` chờ resolve | `onPause` giữa lúc đúng/sai chưa render xong | Resume trả về đúng sub-state, không nhảy màn, không double-award sao | error | `src/logic/__tests__/platform/pause-mid-resolve.spec.ts` | ☐ |

**Chỉ E2E:** tab hidden/blur thật + visibilitychange thật, nhạc có ngừng tai nghe hay không — vitest chỉ test handler logic qua mock event.

---

## 10. NHÓM J — MASTER / ENDGAME (PC-18; liên quan PC-09, PC-14)

> Neo P1-06 (P1.json): Playables **bắt buộc** game khai báo hết nội dung — end screen là điều kiện cert, không được để người chơi tự đoán.

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-END-01 | J. Endgame | PC-18 | Hết màn 120 ⇒ cờ + dữ liệu end screen | Thắng màn 120 | Cờ `campaign_completed` bật; payload end screen tính đúng tổng sao/percentage full-sao từng chương; KHÔNG sinh `levelSpec(121)` | unit | `src/logic/__tests__/endgame/campaign-complete.spec.ts` | ☐ |
| TC-END-02 | J. Endgame | PC-18 | Màn cuối chương ≠ hết game | Thắng màn 15, 30, ..., 105 | Chỉ score card chương, không cờ hoàn thành; chỉ màn 120 mới trigger endgame (PC-01) | boundary | `src/logic/__tests__/endgame/chapter-end-vs-campaign-end.spec.ts` | ☐ |
| TC-END-03 | J. Master | PC-18 | Master mở khoá chỉ sau hết 120 màn | Query `isMasterAvailable` trước/sau `campaign_completed` | Trước ⇒ false; sau ⇒ true (đúng PC-18 "mở sau khi hết màn 120") | unit | `src/logic/__tests__/endgame/master-unlock-gate.spec.ts` | ☐ |
| TC-END-04 | J. Master | PC-18, PC-08 | Luật Master: không hint, không timer | Trong Master: gọi hint, request timer tick | Hint bị chặn ở mọi màn Master; timer tắt (kể cả màn vốn có timer chương 7-8); 120 màn replay dùng lại đúng seed cũ ⇒ cùng đề (PC-02) | unit | `src/logic/__tests__/endgame/master-rules.spec.ts` | ☐ |
| TC-END-05 | J. Master | PC-18, PC-14 | Game over trong Master & ad | Master, fail ⇒ continue rewarded; hết Master 120 màn | Rewarded continue vẫn đúng PC-13 (1/phiên); kết thúc Master lần 2 ⇒ không infinite end-screen, state về map | boundary | `src/logic/__tests__/endgame/master-edge.spec.ts` | ☐ |

**Chỉ E2E:** end screen **hiển thị** lời khai báo hết nội dung ("You unfolded all 120" — copy §4.3) và dấu mộc full-sao trên map ⇒ screenshot + vision QA.

---

## 11. NHÓM K — i18n, KHÔNG HARDCODE CHUỖI (PC-19)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-I18-01 | K. i18n | PC-19 | 0 chuỗi hardcode trong scene/logic | Scan `src/render/**`, `src/ui/**`, `src/logic/**` tìm string literal hiển thị được (ngoài `i18n/en.json` + whitelist key/testid) | 0 vi phạm — đúng tiêu chí grep cột đo PC-19 | unit (source scan) | `src/logic/__tests__/i18n/no-hardcoded-strings.spec.ts` | ☐ |
| TC-I18-02 | K. i18n | PC-19 | File EN phủ đủ mọi key dùng trong code | So key `t(...)` thu được từ scan vs `i18n/en.json` | Không key nào thiếu; không key mồ côi quá ngưỡng cho phép | unit | `src/logic/__tests__/i18n/key-coverage.spec.ts` | ☐ |
| TC-I18-03 | K. i18n | PC-19 | Copy nộp đúng SPEC §4.3 | Đọc `en.json` | Đủ và đúng các chuỗi: `Paper Crease`, `PLAY`, `Continue — Level {n}` (có placeholder), `UNFOLD`, `Peek a fold`, `Undo (watch video)`, `Chapter complete`, `You unfolded all 120`, câu giải thích sai "*Right on the crease — that punch only makes 2 holes.*" | unit | `src/logic/__tests__/i18n/required-copy.spec.ts` | ☐ |
| TC-I18-04 | K. i18n | PC-19 | Key thiếu ⇒ fallback EN, không crash | `t('no.such.key')` | Trả về fallback có chủ đích (key hoặc EN default) + ghi log cục bộ; **không** quăng exception | error | `src/logic/__tests__/i18n/missing-key-fallback.spec.ts` | ☐ |
| TC-I18-05 | K. i18n | PC-19, DoD §8.8 | Không sót tên cũ | Scan chuỗi hiển thị + metadata | 0 chuỗi người chơi thấy còn chứa "GẤP"/tên nội bộ cũ; tên = Paper Crease (điều kiện DoD 8) | unit (source scan) | `src/logic/__tests__/i18n/legacy-name-scan.spec.ts` | ☐ |

**Chỉ E2E:** ngôn ngữ hiển thị thật trên màn hình (disabled selector theo §4.2) — thuộc QA browser.

---

## 12. NHÓM L — STANDALONE KHÔNG SDK (PC-20, Null Object)

| ID | Nhóm | BR | Tên case | Đầu vào | Kỳ vọng | Loại | Evidence path | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| TC-SAO-01 | L. Standalone | PC-20 | Null Object không quăng lỗi ở mọi method | Gọi toàn bộ interface platform (load/save/ad rewarded/ad interstitial/pause/mute callbacks) trên bản standalone, 0 SDK cài | 0 exception; ad trả "unavailable" ngay (để TC-AD-07 kích hoạt); storage đọc `null`/ghi no-op | unit | `src/logic/__tests__/platform/null-object-surface.spec.ts` | ☐ |
| TC-SAO-02 | L. Standalone | PC-20, PC-09 | Chơi trọn vòng lặp không SDK | scripted play: boot → level 1 → chọn đúng → next → 5 màn, chỉ dùng logic + Null Object | Chuỗi state hợp lệ đến `next`, save in-memory hoạt động, log ring-buffer ghi đủ | unit | `src/logic/__tests__/platform/standalone-full-loop.spec.ts` | ☐ |
| TC-SAO-03 | L. Standalone | PC-20 | 1 interface, 3 adapter (registry) | Import `platformRegistry` với 3 khoá `standalone`/`playgama`/`ytgame` (adapter thật của 2 khoá sau mock ở tầng bridge) | Registry resolve đủ 3, cùng shape interface; logic không nhánh `if (platform === ...)` (pattern Strategy SPEC §5.3) | unit | `src/logic/__tests__/platform/registry-adapters.spec.ts` | ☐ |

**Chỉ E2E:** "boot standalone, 0 lỗi console" (nguyên văn PC-20) — console lỗi chỉ thấy khi chạy browser ⇒ E2E-TESTS.md; vitest thế bằng TC-SAO-01/02 không exception.

---

## 13. COVERAGE MATRIX — PC-01..PC-20 × TEST CASES

| BR | Rule tóm tắt (SPEC §6) | Case vitest | Không test được bằng vitest → ghi rõ |
|---|---|---|---|
| PC-01 | 120 màn = 8×15, 1 từ vựng/chương, ramp theo bước suy luận, timer từ ch.7 | TC-PRG-01..04, TC-PRG-08, TC-GEN-11, TC-END-02 | Win-rate ≥75% màn 1-30 → **chỉ playtest/E2E** (đo người thật, log local) |
| PC-02 | Seed deterministic, không lưu đề vào save | TC-GEN-01, TC-GEN-02, TC-GEN-03, TC-END-04 | — |
| PC-03 | Đúng 1 đáp án trong 4, sinh từ trạng thái mở | TC-GEN-04, TC-GEN-05, TC-GEN-08..11 | Thẩm mỹ độ "gần giống" của ô nhiễu → **chỉ E2E vision QA** |
| PC-04 | Ô nhiễu khác đáp án ≥1 lỗ, đôi một khác | TC-GEN-05..08 | — |
| PC-05 | 1 lượt chọn/màn, sai ⇒ Thử lại, undo rewarded ≤1/màn | TC-SES-02, TC-SES-03, TC-STR-07, TC-AD-01 | Tỷ lệ phiên có rewarded undo ≥30% → **chỉ playtest** |
| PC-06 | Sao 1/2/3 theo thắng/hint/first-try | TC-STR-01..03, TC-STR-08 | Đếm sao từ log local trên người thật → E2E |
| PC-07 | Mở khoá chương ~12/15 sao, skip = 0 sao | TC-PRG-05..07, TC-STR-08 | Ô khoá "hiện điều kiện" trên map → **chỉ E2E** (UI) |
| PC-08 | Hint soi 1 nếp, ≤1/màn, mất sao 3, cooldown 2 màn | TC-STR-02, TC-STR-04..06 | Anim "thở" chỉ nếp (PC-08 §4.1 `testid-hint-breath`) → **chỉ E2E** |
| PC-09 | Không win screen, màn kế gấp sẵn | TC-SES-01, TC-SES-02, TC-SES-04, TC-SES-07 | Continue rate ≥85% + cảm giác không bị chặn → **chỉ playtest/E2E** |
| PC-10 | Phiên 5-7 phút, màn = breakpoint, median ≥4 phút (neo P4-04) | TC-SES-05, TC-SES-06, TC-SES-07 | Median phiên thật → **chỉ playtest** (đọc JSONL log) |
| PC-11 | Mực theo sao+streak, tiêu skin, không tiền thật | TC-INC-01..04 | % equip skin 7 ngày → **chỉ playtest** |
| PC-12 | Album ≤14, huy hiệu ≤6 | TC-INC-05, TC-INC-06 | % mở ≥80% album → **chỉ playtest** |
| PC-13 | Rewarded đúng 4 điểm: undo/hint/continue/x2 | TC-AD-01, TC-AD-02, TC-AD-05(áp lực), TC-STR-07 | Engagement 2-4 views/DAU → **chỉ playtest/kênh** |
| PC-14 | Interstitial sau score card; cấm 60s đầu & trước hết màn 1; sau thưởng | TC-AD-03..07 | Tỷ lệ thoát 5s sau ad → **chỉ playtest/kênh** |
| PC-15 | Cấm mọi call mạng; log ring-buffer ≤100KB | TC-NET-01..05 | `validate.py` trên bundle + Network tab → **pipeline/E2E** |
| PC-16 | Save 1 object có version ≤100KB; hỏng ⇒ màn 1, giữ skin | TC-SAV-01..07, TC-GEN-03, TC-NET-04 | Save <3MB trên build thật + SDK storage thật → **E2E** |
| PC-17 | Tôn trọng pause/mute nền tảng, có mute riêng | TC-PSE-01..04 | Focus/blur thật, tai nghe thật → **chỉ E2E** (SPEC ghi "E2E có case") |
| PC-18 | Master: replay 120 không hint; end screen khai báo hết nội dung | TC-END-01..05 | Màn hình end screen hiển thị lời khai báo → **chỉ E2E** (điều kiện cert Playables, neo P1-06) |
| PC-19 | EN mặc định, mọi chuỗi qua i18n, không hardcode | TC-I18-01..05 | Rendered text trên màn hình → **chỉ E2E** |
| PC-20 | Chạy standalone không SDK (Null Object) | TC-SAO-01..03, TC-AD-07 | "0 lỗi console" khi boot browser → **chỉ E2E** |

→ **20/20 rule có ≥1 case vitest.** Cột phải liệt kê phần chỉ-do-được-bằng-E2E/playtest kèm lý do, dev không được fake chúng bằng unit test.

---

## 14. BẢNG ERROR / EDGE CASES (tổng hợp riêng để chạy đủ)

| ID | Edge case | Kích hoạt | Kỳ vọng | BR liên quan | Trạng thái |
|---|---|---|---|---|---|
| TC-ERR-01 | Save hỏng (JSON corrupt) | Nửa chuỗi JSON trong storage | Về màn 1, giữ skin đã mua, không crash | PC-16 (§7) | ☐ (= TC-SAV-03) |
| TC-ERR-02 | Save thiếu field / version lạ | Xoá từng field; version 999 | Fill default / phòng thủ giữ data parse được | PC-16 | ☐ (= TC-SAV-04/05) |
| TC-ERR-03 | Ad không load / timeout | Mock ad fail mọi type | Ẩn nút ad, chơi bình thường, không chặn luồng | PC-14, §7 | ☐ (= TC-AD-07) |
| TC-ERR-04 | SDK vắng hoàn toàn | Boot standalone Null Object | Toàn bộ call surface không exception | PC-20 | ☐ (= TC-SAO-01) |
| TC-ERR-05 | Mất focus giữa animate mở bung | `onPause` state `unfolding` | Không mất lượt, resume vẽ tiếp đúng kết quả đã chốt | PC-17, §7 | ☐ (= TC-PSE-03; tween thật → E2E) |
| TC-ERR-06 | Bấm liên tục trong lúc animate | Spam 4 ô × 10 lần khi `unfolding` | Buffer/khoá theo state, chỉ 1 resolve, không double sao/Mực, không mất lượt | PC-05, PC-09, §7 | ☐ (= TC-SES-03 + bổ sung assert không nhân thưởng) |
| TC-ERR-07 | Màn cuối chương (15/30/.../105) | Thắng màn 15 | Score card chương, không cờ campaign, không level 121-leak | PC-01, PC-18 | ☐ (= TC-END-02) |
| TC-ERR-08 | Hết 120 màn | Thắng màn 120 | `campaign_completed`, end data đúng, Master mở, `levelSpec(121)` bị chặn | PC-18 | ☐ (= TC-END-01/03) |
| TC-ERR-09 | Save sát ngưỡng kích thước | Worst-case save (mục 13) | ≤100KB thực tế, <3MB nền tảng | PC-16, §5.2 | ☐ (= TC-SAV-06) |
| TC-ERR-10 | Storage bị trình duyệt xoá giữa phiên (ẩn danh) | Mock storage clear/throw | Chơi tiếp không crash, mất save chấp nhận được, save kế tiếp khởi tạo lại | PC-15, PC-16 | ☐ (= TC-NET-04/TC-SAV-07) |
| TC-ERR-11 | Ring-buffer tràn khi log dày | 10.000 event | Cắt event cũ nhất, ≤100KB, timestamp đơn điệu | PC-15 | ☐ (= TC-NET-03) |
| TC-ERR-12 | Request rewarded/interstitial sai ngữ cảnh | Gọi từ code UI tuỳ hứng | Policy tầng logic chặn trước SDK | PC-13, PC-14 | ☐ (= TC-AD-01/03..05) |
| TC-ERR-13 | Hint + undo cùng bấm 1 nhịp | Click hint rồi undo rewarded trong cùng màn | Mỗi loại đúng 1 lần, không cộng dồn sai sao | PC-05, PC-06, PC-08 | ☐ (bổ sung vào `stars/star-rules.spec.ts` — case tổ hợp) |

---

## 15. GHI CHÚ DÙNG SỐ NEO (P1/P4) — KHÔNG ĐƯỢC BỊA THÊM

- 120 = 8×15, chunk 15 màn: **P1-01** (neo Candy Crush episode 15 — nguồn đã ghi trong P1.json).
- Sao chấm theo first-try/không-hint, skip = 0 sao: **P1-03**; gate mở khoá chỉ 12/15, đừng gánh retention lên sao: **P1 summary** (Foldit).
- Win-rate màn 1-30 ≥75%, checkpoint 40-60%: **P1-02** — chỉ là băng mục tiêu playtest.
- Continue rate level→level ≥85% (10 màn đầu): **P4-03**; phiên mục tiêu 5-7 phút (45-75s/màn), median ≥4 phút: **P4-04**; end screen khai báo hết nội dung là luật cert Playables: **P1-06**; ring-buffer ≤100KB + coverage cặp event ≥95% (ngưỡng nội bộ, đã đánh dấu `unverified` trong P4.json): **P4-06**.
- Cấm thêm con số benchmark mới không có trong SPEC/retention. Test nào cần ngưỡng ⇒ đọc từ file `config/*.json`, không hardcode trong spec test.

---

## 16. ĐIỀU KIỆN BÀN GIAO DEV (gate cuối)

- [ ] `npx tsc --noEmit` = 0 lỗi VÀ `npm run test:logic` = xanh 100% (mọi nhóm A..L + ERR), không case nào `skip`/`todo`.
- [ ] TC-GEN-05 (10.000 đề) chạy trong timeout mặc định của vitest; kết quả bộ đếm vi phạm = 0 được dán số thật vào báo cáo.
- [ ] Coverage matrix §13: 20/20 PC có case; mọi dòng "chỉ E2E/playtest" còn nguyên — không unit test giả nào claim số người dùng.
- [ ] Case FAIL nào cũng có output vitest thật + giữ dòng FAIL trong file (không xoá trace — chuẩn M2).
- [ ] File `E2E-TESTS.md` được nhắc tới trong PR để Hermes QA nối phần browser (không phải việc dev ở file này).

# E2E TESTS — M1 Rescue/Dodge (YouTube Playables "Cứu Mèo")

> UI/visual test do **Hermes QA** verify bằng **Playwright/agent-browser + vision**.
> Agent KHÔNG viết E2E — Hermes QA chạy **sau khi deploy**, mở game cục bộ
> (server tĩnh / localhost) trong browser thật, chụp screenshot + dùng vision
> để xác nhận kết quả. File này chỉ là bảng test case + steps + expected +
> evidence paths, **không phải code Playwright hoàn chỉnh**.

---

## 0. Chuẩn bị & Quy ước chung

- **Cách chạy:** dựng server tĩnh cục bộ (vd `python3 -m http.server` trong thư mục build/),
  mở `index.html` bằng agent-browser. KHÔNG deploy lên YouTube trước khi pass file này.
- **data-testid:** `start-btn`, `tutorial-text`, `game-canvas`, `score-label`,
  `level-label`, `level-popup`, `combo-popup`, `record-popup`,
  `final-score`, `best-score`, `retry-btn`, `continue-btn`.
- **Các màn:** Start → Tutorial (text 3s) → Gameplay → Game Over.
- **Evidence:** với mỗi test, chụp screenshot tại các bước chính, lưu kèm theo
  các tham chiếu `📸` dưới đây. Path gợi ý theo cấu trúc
  `artifacts/e2e/<DATE>/<TEST_ID>_<step>.png`.
- **User test cần dọn:** nếu test cần điểm cao thật / best score thật thì **reset
  localStorage trước khi chạy** (`localStorage.removeItem('m1_best_score')` qua console
  hoặc chạy trong profile/browser mới) để tránh nhiễu giữa các lượt test.
- **Ngưỡng thất bại:** loading ≥ 5s = FAIL (xem E2E-20). Bất kỳ ngoại lệ JS
  uncaught nào trong console = FAIL.

---

## 1. NHÓM FUNCTIONAL

### 1.1 Khởi động & luồng màn hình

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-01 | Server tĩnh phục vụ game không lỗi | 1) Chạy server tĩnh cục bộ. 2) Fetch `/` và `/index.html` về. 3) Kiểm tra HTTP 200. | Server trả 200, HTML đầy đủ, không 404 asset. | `E2E-01_index_200.png` |
| E2E-02 | Load game không crash & đúng màn Start | 1) Mở URL localhost. 2) Wait canvas init. 3) Chụp màn Start. | Không exception, hiện **start-btn**, không có lỗi console. | `E2E-02_start.png` |
| E2E-03 | Start → Tutorial (text 3s) | 1) Click `start-btn`. 2) Chụp ngay. 3) Wait 3s rồi chụp. | Có **tutorial-text** hiển thị rõ, sau ~3s tự vào Gameplay; không crash. | `E2E-03_tutorial.png`, `E2E-03_gameplay_auto.png` |
| E2E-04 | Tutorial → Gameplay đủ control | 1) Qua Tutorial. 2) Click/giữ trong `game-canvas`. 3) Chụp gameplay. | Vào Gameplay, **score-label** hiển thị, thao tác được trên canvas. | `E2E-04_gameplay.png` |
| E2E-05 | Luồng full tới Game Over | 1) Vào Gameplay. 2) Tap hoặc để chạm ong đến khi thua. 3) Chụp Game Over. | Màn Game Over hiện **final-score**, **best-score**, **retry-btn**, **continue-btn**. | `E2E-05_gameover.png` |

### 1.2 Tap né ong (dodge) — cơ chế chơi

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-06 | Tap né ong đúng làm tăng score | 1) Vào Gameplay. 2) Ghi score ban đầu. 3) Tap/chậm ong tránh va chạm đúng thời điểm vài lần, sống qua. | Mèo đổi hướng/vị trí theo tap; **score-label** tăng theo từng điểm/ong né được. | `E2E-06_avoid.png`, `E2E-06_score.png` |
| E2E-07 | Score tăng theo đúng mình | 1) Đếm số ong né thành công N. 2) Đối chiếu score-label. | score tăng đúng N (không tự tăng khi không né). | `E2E-07_score_check.png` |
| E2E-08 | Chạm ong kết thúc trò chơi | 1) Cố tình để ong chạm mèo. 2) Chụp ngay sau va chạm. | Vào Game Over ngay khi va chạm; **final-score** = score cuối. | `E2E-08_hit.png`, `E2E-08_gameover.png` |

### 1.3 Retry / Continue / Best score

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-09 | Retry reset về Start/Gameplay mới | 1) Ở Game Over. 2) Click `retry-btn`. 3) Chụp. | Reset về khởi đầu lượt mới (màn Start hoặc Tutorial), score=0, không crash. | `E2E-09_retry.png` |
| E2E-10 | Continue rewarded (nếu môi trường cho phép) | 1) Ở Game Over. 2) Click `continue-btn`. 3) Chụp + để vài giây. | Continue hiện đúng UI (rewarded ad placeholder / hồi sinh), đưa người chơi về gameplay hoặc hiện thông báo rõ ràng; không lỗi. *(Nếu không bật rewarded → khoá/ẩn nút và ghi nhận.)* | `E2E-10_continue.png`, `E2E-10_resume.png` |
| E2E-11 | Best score được cập nhật | 1) Chơi đạt score mới > best cũ. 2) Chụp Game Over. | **best-score** ≥ final-score mới. | `E2E-11_best.png` |
| E2E-12 | Best score còn lại sau reload | 1) Nhớ best hiện tại. 2) Reload lại trang. 3) Chơi thua 1 lượt, chụp Game Over. | **best-score** sau reload = best cũ (giữ nguyên, lưu localStorage). | `E2E-12_reload_best.png` |
| E2E-13 | **User test cần dọn** — best score reset khi localStorage xoá | 1) Reset localStorage (`best_score`). 2) Reload. 3) Thua 1 lượt chụp. | Sau khi dọn, best-score về 0/mặc định. | `E2E-13_best_reset.png` |

### 1.4 Progression & Retention (BR-14..17)

> Phần này verify từ góc người chơi "dễ chơi hơn, dễ nghiện hơn" — level-up đổi cảnh nhìn thấy được,
> combo bonus khuyến khích, kỷ lục tạo hứng khởi, difficulty giữ chân người mới.
> User test: để đạt score cao / vượt best thật cần **reset localStorage trước** (xem §0) cho lượt của các test E2E-34..35.

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-30 | Level-up đổi cảnh nhìn thấy được (BR-14) | 1) Trong Gameplay đạt score 10. 2) Chụp ngay lúc level lên. | `level-label` đổi lên "Cấp 2"; nền đổi palette/cảnh mới rõ ràng; score KHÔNG reset (vẫn tăng tiếp). | `E2E-30_levelup.png` |
| E2E-31 | Popup level-up 1.5s không chặn gameplay (BR-14) | 1) Level lên → chụp ngay. 2) Chờ ~2s → chụp lại. | `level-popup` hiện "Cấp {n}" ~1.5s rồi tự ẩn; ong vẫn động, game vẫn chạy được; không ad xen giữa. | `E2E-31_level_popup.png`, `E2E-31_level_popup_after.png` |
| E2E-32 | Combo +5 khi né liên tiếp (BR-15) | 1) Né liên tiếp ≥5 lần không chạm. 2) Ghi score trước/sau. | Score tăng thêm bonus +5; `combo-popup` "+5" hiện lên. | `E2E-32_combo.png` |
| E2E-33 | Combo reset khi chạm ong (BR-15) | 1) Đạt streak 5. 2) Để ong chạm. 3) Né lại, đếm. | Sau khi chạm combo về 0; +5 tiếp chỉ tính khi né đủ liên tiếp 5 lần nữa. | `E2E-33_combo_reset.png` |
| E2E-34 | **User test cần dọn** — popup kỷ lục mới khi vượt best (BR-16) | 1) Reset localStorage. 2) Chơi vượt best cũ. 3) Chụp. | `record-popup` "KỶ LỤC MỚI!" hiện; `best-score` cập nhật ≥ final-score. | `E2E-34_record.png` |
| E2E-35 | Kỷ lục mới chỉ 1 lần/phiên (BR-16) | 1) Vượt best. 2) Tiếp tục chơi điểm cao hơn nữa, chụp. | Popup `record-popup` KHÔNG hiện lại lần 2 trong cùng phiên dù score tiếp tục vượt. | `E2E-35_record_single.png` |
| E2E-36 | 10s đầu tốc độ thấp giữ chân (BR-17) | 1) Vào Gameplay. 2) Chụp trong and sau 10s đầu. | 10s đầu ong bay THẤP, dễ né (người mới không bỏ sớm); sau 10s tốc độ/nhịp tăng rõ. | `E2E-36_slow.png`, `E2E-36_faster.png` |
| E2E-37 | Nhảy khó rõ rệt theo level (BR-17) | 1) Ghi tốc độ ong trước level. 2) Level lên chụp so sánh. | Sau level-up tốc độ/spawn ong nhảy lên bậc thấy rõ (không mượt mịn tuyến tính). | `E2E-37_level_diff.png` |
| E2E-38 | Không interstitial level đầu / 10s đầu (BR-17 + BR-09) | 1) Chơi qua level đầu + 10s đầu. 2) Quan sát màn hình. | KHÔNG có ad/interstitial che màn trong level đầu/10s đầu; ad chỉ khi game over lần 2+. | `E2E-38_no_ad_first.png` |

---

## 2. NHÓM USABILITY (UX trước code — test "dễ dùng")

> Mục tiêu: verify từ góc người chơi casual mới, không phải chỉ "chạy được".
> Hermes QA bắt chước hành vi người dùng: không biết nút ở đâu, không biết luật chơi.

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-14 | User mới đạt hành động chính trong ≤3 click | 1) Load trang (màn Start). 2) Đếm số click/tap tối thiểu để vào được gameplay và né được ong. | Đạt hành động chính ("nách ong bắt đầu chơi") trong ≤ 3 thao tác rõ ràng. | `E2E-14_clicks.png`, `E2E-14_flow.png` |
| E2E-15 | Nút/nhiệm vụ rõ ràng | 1) Mở Start. 2) Vision đọc từng nút. | Mỗi nút có nhãn dễ hiểu, phân biệt được chức năng (PLAY bắt đầu, RETRY chơi lại, CONTINUE tiếp tục); không ký hiệu mơ hồ. | `E2E-15_labels.png` |
| E2E-16 | Màn không quá tải | 1) Chụp các màn Start/Gameplay/Game Over. 2) Vision đếm phần tử nổi bật. | Ít phần tử cạnh tranh sự chú ý, focus đúng hành động chính, không rối mắt. | `E2E-16_start.png`, `E2E-16_gameover.png` |
| E2E-17 | Text hướng dẫn đủ hiểu | 1) Chụp **tutorial-text**. 2) Vision đọc nội dung. | Text ngắn, đủ nghĩa: biết "chạm để né ong", "đừng để ong chạm mèo"; người mới hiểu phải làm gì. | `E2E-17_tutorial.png` |
| E2E-18 | Phản hồi khi đúng/sai | 1) Né ong thành công: chụp. 2) Chạm ong: chụp. | Có phản hồi rõ (score tăng/hiệu ứng khi né, hiệu ứng va chạm khi thua) để user hiểu mình làm đúng/sai. | `E2E-18_feedback_ok.png`, `E2E-18_feedback_fail.png` |
| E2E-19 | Loading không quá lâu | 1) Mở URL. 2) Đo từ lúc request → màn Start sẵn sàng. | Thời gian loading < 5s (≥ 5s = FAIL). | `E2E-19_loading.png` |
| E2E-20 | Responsive đúng kích thước | 1) Resize viewport nhiều cỡ (nhỏ→lớn, kéo từ từ). 2) Chụp sau mỗi cỡ. | Canvas/nút co giãn mượt, không vỡ layout, không tràn/che nút. | `E2E-20_resize_small.png`, `E2E-20_resize_large.png` |
| E2E-21 | Tỉ lệ 9:16 (dọc, mobile) | 1) Set viewport 9:16 (vd 1080×1920). 2) Chụp các màn. | Game hiển thị đầy đủ, không vỡ layout, nút trong tầm tay. | `E2E-21_9x16_start.png`, `E2E-21_9x16_gameover.png` |
| E2E-22 | Tỉ lệ 16:9 (ngang, desktop) | 1) Set viewport 16:9 (vd 1920×1080). 2) Chụp các màn. | Không vỡ, không lệch, nút đúng vị trí. | `E2E-22_16x9_start.png` |
| E2E-23 | Tỉ lệ 1:1 (vuông, YouTube Shorts/embedded) | 1) Set viewport 1:1 (vd 1080×1080). 2) Chụp các màn. | Không vỡ layout, mọi control nhìn rõ. | `E2E-23_1x1_start.png` |

---

## 3. NHÓM PLATFORM COMPLIANCE (YouTube Playables)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-24 | Pause khi đổi tab | 1) Đang chơi gameplay. 2) Đổi tab/ẩn cửa sổ 5s. 3) Quay lại, chụp + so sánh trạng thái. | Game dừng render (không chạy ngầm, ong/score đứng yên), âm đã tắt; quay lại tiếp tục mượt từ trạng thái cũ. | `E2E-24_hidden.png`, `E2E-24_back.png` |
| E2E-25 | Mute hoạt động | 1) Bật âm. 2) Chụp nút mute/trạng thái. 3) Mute. | Mute tắt tiếng tức thì; nút phản ánh đúng trạng thái on/off. | `E2E-25_mute.png` |
| E2E-26 | Resize khi đang chơi giữ state | 1) Đang gameplay. 2) Resize viewport rồi chụp. | Score/trạng thái/vị trí mèo giữ nguyên sau resize, không reset trò chơi, không vỡ. | `E2E-26_resize_state.png` |
| E2E-27 | Khởi đầu không crash | 1) Load nhiều lần (3×) vào Start. 2) Note console mỗi lần. | Lần nào cũng vào Start sạch, không exception/crash. | `E2E-27_cold_start_1..3.png` |
| E2E-28 | Không gọi mạng ngoài | 1) Clear console + network log. 2) Chơi 1 vòng. 3) Lọc external request (≠ localhost). | **Không có** request tới domain ngoài (0 external); mọi request localhost. Bất kỳ external = FAIL. | `E2E-28_network.png` |
| E2E-29 | Không ngoại lệ JS uncaught | 1) Chơi full vòng + đổi tab + resize. 2) Đọc console. | Không có uncaught exception / error đáng kể. | `E2E-29_console.png` |

---

## 4. Checklist tóm tắt

- [ ] Functional: E2E-01 → E2E-38
- [ ] Usability (UX): E2E-14 → E2E-23
- [ ] Platform compliance: E2E-24 → E2E-29
- [ ] Progression & Retention (BR-14..17): E2E-30 → E2E-38
- [ ] Loading < 5s (E2E-19)
- [ ] 0 external network request (E2E-28)
- [ ] 0 uncaught JS exception (E2E-29)
- [ ] User test cần dọn: E2E-13, E2E-34, E2E-35 (reset localStorage)

> Kết luận: game chỉ được đưa lên YouTube Playables khi **toàn bộ** functional +
> usability + compliance pass. Bất kỳ FAIL thuộc usability (E2E-14→23) đều phải
> fix trước khi ship — "dễ dùng" là tiêu chí chặn, không phải tuỳ chọn.
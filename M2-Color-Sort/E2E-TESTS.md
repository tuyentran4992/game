# E2E TESTS — M2 Color Sort ("Neon Sort: Galaxy Pour" · YouTube Playables)

> UI/visual test do **Hermes QA** verify bằng **Playwright/agent-browser + vision**.
> Agent KHÔNG viết E2E — Hermes QA chạy **sau khi deploy**, mở game cục bộ
> (server tĩnh / localhost) trong browser thật, chụp screenshot + dùng vision
> để xác nhận kết quả. File này chỉ là bảng test case + steps + expected +
> evidence paths, **không phải code Playwright hoàn chỉnh**.

---

## 0. Chuẩn bị & Quy ước chung

- **Cách chạy:** dựng server tĩnh cục bộ (vd `python3 -m http.server` trong thư mục build/),
  mở `index.html` bằng agent-browser. KHÔNG deploy lên YouTube trước khi pass file này.
- **data-testid (SPEC §5):** `start-btn`, `level-select`, `level-label`, `move-count`,
  `board`, `tube-<i>`, `undo-btn`, `restart-btn`, `hint-btn`, `next-level-btn`.
- **Các màn:** Start → LevelSelect/Level 1 → Gameplay (board ống) → Level Clear popup → Next level.
- **Hành động chính:** tap `tube-<i>` chọn → tap ống đích đổ (thao tác 2 tap/nước đi).
- **Evidence:** với mỗi test, chụp screenshot tại các bước chính, lưu kèm theo
  các tham chiếu `📸` dưới đây. Path gợi ý theo cấu trúc
  `artifacts/e2e/<DATE>/<TEST_ID>_<step>.png`.
- **User test cần dọn:** nếu test cần level/best-moves thật thì **reset
  localStorage trước khi chạy** (xoá key `m2_save` / `neon_sort_save` qua console
  hoặc chạy profile/browser mới) để tránh nhiễu giữa các lượt test.
- **Ngưỡng thất bại:** loading ≥ 5s = FAIL (xem E2E-16). Bất kỳ ngoại lệ JS
  uncaught nào trong console = FAIL.

---

## 1. NHÓM FUNCTIONAL

### 1.1 Khởi động & luồng màn hình

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-01 | Server tĩnh phục vụ game không lỗi | 1) Chạy server tĩnh cục bộ. 2) Fetch `/` và `/index.html` về. 3) Kiểm tra HTTP 200. | Server trả 200, HTML đầy đủ, không 404 asset. | `E2E-01_index_200.png` |
| E2E-02 | Load game không crash & đúng màn Start | 1) Mở URL localhost. 2) Wait canvas init. 3) Chụp màn Start. | Không exception, hiện **start-btn**, không có lỗi console. | `E2E-02_start.png` |
| E2E-03 | Start → vào level 1 (board ống) | 1) Click `start-btn`. 2) Chờ vào gameplay. 3) Chụp board. | Vào Gameplay/Level 1, **board** + các `tube-<i>` hiển thị, **level-label** = 1, **move-count** = 0. | `E2E-03_gameplay.png` |
| E2E-04 | Level-select / tiếp tục (nếu có) | 1) Mở `level-select`. 2) Chọn level / bấm tiếp tục. 3) Chụp. | `level-select` mở, chọn level vào đúng board đó, không crash. | `E2E-04_levelselect.png` |

### 1.2 Đổ màu (cơ chế chơi — M2-01)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-05 | Tap ống nguồn highlight | 1) Vào Gameplay. 2) Tap `tube-<i>` có chất lỏng. 3) Chụp. | Ống nguồn highlight rõ; sẵn sàng đổ (trạng thái "chọn"). | `E2E-05_select.png` |
| E2E-06 | Đổ hợp lệ cùng màu | 1) Chọn nguồn. 2) Tap đích đỉnh cùng màu còn chỗ. 3) Chụp. | Chất lỏng đỉnh chuyển sang đích; **move-count** tăng 1. | `E2E-06_pour_ok.png` |
| E2E-07 | Đổ vào ống trống hợp lệ | 1) Chọn nguồn. 2) Tap ống trống `tube-<j>`. 3) Chụp. | Chuyển chất lỏng sang ống trống; hợp lệ, move-count +1. | `E2E-07_pour_empty.png` |
| E2E-08 | Đổ không hợp lệ không đổi board | 1) Nguồn đỉnh màu A → tap đích đỉnh màu B (khác). 2) Chụp trước & sau. | KHÔNG có microns nào chuyển; nguồn bị rung nhẹ; **move-count KHÔNG đổi**. | `E2E-08_invalid_before.png`, `E2E-08_invalid_after.png` |
| E2E-09 | Đích đầy → không đổ | 1) Chọn nguồn. 2) Tap đích đã đầy C lát. 3) Chụp. | Không đổ, không đổi board, có phản hồi lỗi. | `E2E-09_full_tube.png` |

### 1.3 Level Clear → Next level (M2-02, M2-07)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-10 | Xếp xong → Level Clear | 1) Thao tác tới khi mọi ống 1 màu/trống. 2) Chụp ngay lúc clear. | Popup "Hoàn thành!"/Clear + **next-level-btn** hiển thị + confetti, `sendScore`/save đúng. | `E2E-10_clear.png` |
| E2E-11 | Next → level kế (interstitial) | 1) Click `next-level-btn`. 2) Chụp. | Chuyển sang level kế, **level-label** tăng, board mới; interstitial chạy giữa level. | `E2E-11_next.png`, `E2E-11_levelup.png` |
| E2E-12 | Không interstitial level đầu | 1) Mới Start qua level đầu. 2) Quan sát. | KHÔNG có interstitial ad ở level đầu (M2-07). | `E2E-12_no_ad_first.png` |

### 1.4 Undo / Restart / Hint / Save (M2-05, M2-06, M2-08)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-13 | Undo quay nước trước | 1) Đổ 1 nước. 2) Click `undo-btn`. 3) Chụp. | Board về đúng nước trước; **move-count** giảm 1. | `E2E-13_undo.png` |
| E2E-14 | Restart reset board gốc | 1) Đổ vài nước. 2) Click `restart-btn`. 3) Chụp. | Board về cấu hình gốc level; **move-count** = 0; vẫn cùng level. | `E2E-14_restart.png` |
| E2E-15 | Hint rewarded (nếu môi trường cho phép) | 1) Click `hint-btn`. 2) Chụp + chờ. | Rewarded placeholder chạy; earned → highlight 1 nước đi đúng; không tự đổ (M2-06). *(Không bật rewarded → nút khoá/ẩn, ghi nhận.)* | `E2E-15_hint.png` |
| E2E-16 | Tiến trình lưu sau reload | 1) Chơi tới level X, nhớ current-level. 2) Reload. 3) Vào lại chụp. | Vào đúng current-level đã lưu (hoặc level-select hiện đúng); best-level/best-moves giữ. | `E2E-16_reload.png` |
| E2E-17 | **User test cần dọn** — save reset khi xoá localStorage | 1) Reset localStorage (`m2_save`). 2) Reload. 3) Chụp. | Tiến trình về level 1 / mặc định sau khi dọn. | `E2E-17_save_reset.png` |

---

## 2. NHÓM USABILITY (UX trước code — test "dễ dùng")

> Mục tiêu: verify từ góc người chơi casual mới, không phải chỉ "chạy được".
> Hermes QA bắt chước hành vi người dùng: không biết nút ở đâu, không biết luật chơi.

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-18 | User mới đạt hành động chính trong ≤3 tap | 1) Load trang (màn Start). 2) Đếm số tap tối thiểu để chọn ống nguồn được. | Đạt hành động chính ("tap ống + đổ") trong ≤ 3 thao tác rõ ràng (Start 1 tap → chọn ống 1 tap). | `E2E-18_taps.png`, `E2E-18_flow.png` |
| E2E-19 | Board ống rõ ràng, phân biệt màu | 1) Chụp `board`. 2) Vision đếm ống + màu. | Các ống tách biệt rõ, màu chất lỏng neon phân biệt được (đúng art-theme Neon Galaxy), không rối mắt. | `E2E-19_board_clear.png` |
| E2E-20 | Đổ trực quan / dễ hiểu | 1) Chọn nguồn + chụp. 2) Đổ + chụp ngay. | Người mới nhìn là hiểu: nguồn highlight, chất lỏng chuyển rõ sang đích; phản hồi đúng/sai trực quan. | `E2E-20_visual_pour.png` |
| E2E-21 | Nút/nhiệm vụ rõ ràng | 1) Chụp HUD. 2) Vision đọc từng nút. | Mỗi nút (`undo-btn`, `restart-btn`, `hint-btn`) có nhãn/icon dễ hiểu, phân biệt chức năng; không ký hiệu mơ hồ. | `E2E-21_labels.png` |
| E2E-22 | Màn không quá tải | 1) Chụp Start + Gameplay. 2) Vision đếm phần tử nổi bật. | Ít phần tử cạnh tranh, focus vào board ống; HUD gọn. | `E2E-22_start.png`, `E2E-22_gameplay.png` |
| E2E-23 | Loading không quá lâu | 1) Mở URL. 2) Đo request → màn Start sẵn sàng. | < 5s (≥ 5s = FAIL). | `E2E-23_loading.png` |
| E2E-24 | Responsive đúng kích thước | 1) Resize viewport nhiều cỡ (nhỏ→lớn, kéo từ từ). 2) Chụp sau mỗi cỡ. | Board/nút co giãn mượt, không vỡ layout, không tràn/che nút. | `E2E-24_resize_small.png`, `E2E-24_resize_large.png` |
| E2E-25 | Tỉ lệ 9:16 (dọc, mobile) | 1) Set viewport 9:16 (vd 1080×1920). 2) Chụp các màn. | Game hiển thị đầy đủ, board ống trong màn hình, nút trong tầm tay, không vỡ. | `E2E-25_9x16_start.png`, `E2E-25_9x16_gameplay.png` |
| E2E-26 | Tỉ lệ 16:9 (ngang, desktop) | 1) Set viewport 16:9 (vd 1920×1080). 2) Chụp các màn. | Không vỡ, board ống hiển thị đủ, không lệch, nút đúng vị trí. | `E2E-26_16x9_start.png` |
| E2E-27 | Tỉ lệ 1:1 (vuông, Shorts/embedded) | 1) Set viewport 1:1 (vd 1080×1080). 2) Chụp các màn. | Không vỡ layout, mọi control nhìn rõ, ống không bị cắt. | `E2E-27_1x1_start.png` |

---

## 3. NHÓM PLATFORM COMPLIANCE (YouTube Playables)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-28 | Pause khi đổi tab | 1) Đang chơi. 2) Đổi tab/ẩn cửa sổ 5s. 3) Quay lại chụp + so sánh. | Game dừng (board/move đứng yên), âm đã tắt; quay lại tiếp tục từ trạng thái cũ, không reset/nhảy. | `E2E-28_hidden.png`, `E2E-28_back.png` |
| E2E-29 | Mute hoạt động | 1) Bật âm. 2) Chụp trạng thái. 3) Mute. | Mute tắt tiếng tức thì; nút phản ánh đúng on/off. | `E2E-29_mute.png` |
| E2E-30 | Resize khi đang chơi giữ state | 1) Đang gameplay (đổ vài nước). 2) Resize rồi chụp. | Board/move/level giữ nguyên sau resize; không reset, không vỡ. | `E2E-30_resize_state.png` |
| E2E-31 | Khởi đầu không crash | 1) Reload nhiều lần (3×) vào Start. 2) Note console mỗi lần. | Lần nào cũng vào Start sạch, không exception/crash. | `E2E-31_cold_start_1..3.png` |
| E2E-32 | Không gọi mạng ngoài | 1) Clear console + network log. 2) Chơi 1–2 level. 3) Lọc external (≠ localhost). | **Không có** request tới domain ngoài (0 external); mọi request localhost (M2-09). | `E2E-32_network.png` |
| E2E-33 | Không ngoại lệ JS uncaught | 1) Chơi full vòng + đổi tab + resize. 2) Đọc console. | Không có uncaught exception / error đáng kể. | `E2E-33_console.png` |

---

## 4. Checklist tóm tắt

- [ ] Functional: E2E-01 → E2E-17
- [ ] Usability (UX): E2E-18 → E2E-27
- [ ] Platform compliance: E2E-28 → E2E-33
- [ ] Loading < 5s (E2E-23)
- [ ] Đổ màu đúng luật — phản hồi đúng/sai (E2E-06, E2E-08, E2E-09)
- [ ] 0 external network request (E2E-32)
- [ ] 0 uncaught JS exception (E2E-33)
- [ ] User test cần dọn: E2E-17 (reset localStorage)

> Kết luận: game chỉ được đưa lên YouTube Playables khi **toàn bộ** functional +
> usability + compliance pass. Bất kỳ FAIL thuộc usability (E2E-18→27) đều phải
> fix trước khi ship — "dễ dùng" là tiêu chí chặn, không phải tuỳ chọn.

---
*FILE NÀY = check QA sau deploy. Hermes QA điền kết quả/thêm screenshot evidence; không xoá ca đã từng FAIL (giữ trace).*
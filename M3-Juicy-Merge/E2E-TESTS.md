# E2E TESTS — M3 Juicy Merge ("Juicy Merge: Fruit Pop" · YouTube Playables)

> UI/visual test do **Hermes QA** verify bằng **Playwright/agent-browser + vision**.
> Agent KHÔNG viết E2E — Hermes QA chạy **sau khi deploy**, mở game cục bộ
> (server tĩnh / localhost) trong browser thật, chụp screenshot + dùng vision
> để xác nhận kết quả. File này chỉ là bảng test case + steps + expected +
> evidence paths, **không phải code Playwright hoàn chỉnh**.

---

## 0. Chuẩn bị & Quy ước chung

- **Cách chạy:** dựng server tĩnh cục bộ (vd `python3 -m http.server` trong thư mục build/),
  mở `index.html` bằng agent-browser. KHÔNG deploy lên YouTube trước khi pass file này.
- **data-testid (SPEC §5):** `start-btn`, `score-label`, `best-label`, `combo-popup`, `bucket`,
  `danger-line`, `drop-ghost`, `next-fruit`, `final-score`, `best-score`, `record-popup`,
  `continue-btn`, `retry-btn`.
- **Các màn:** Start → Gameplay (bucket) → merge → Game Over (lần 1 rewarded / lần 2+ interstitial).
- **Hành động chính:** di chuyển pointer (ghost) → click/nhả để thả trái tại X (thao tác 1 chạm).
- **Physics note:** game dùng Matter.js — cần cho trái rơi + settle ổn định trước khi assert merge/game-over. Dùng cooldown thả thật.
- **Evidence:** với mỗi test chụp screenshot tại các bước chính, lưu theo
  `artifacts/e2e/<DATE>/<TEST_ID>_<step>.png`.
- **User test cần dọn:** reset localStorage (xoá key như `m3_save` / `juicy_merge_save` qua console
  hoặc profile/browser mới) trước khi chạy để tránh nhiễu best-score giữa lượt.
- **Ngưỡng thất bại:** loading ≥ 5s = FAIL (E2E-16). Bất kỳ exception JS uncaught trong console = FAIL.
- **Simulate click qua Phaser Input:** dispatch PointerEvent đơn MỘT MÌNH KHÔNG trigger Phaser Input
  (đã học M1/M2) → phải dispatch *PointerEvent + MouseEvent(mousedown/up) + TouchEvent(touchstart/end)*
  cùng coord qua vài vị trí dọc (grid-tap) để may trúng vùng thả → vào game.

---

## 1. NHÓM FUNCTIONAL

### 1.1 Khởi động & luồng màn hình

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-01 | Server tĩnh không lỗi | 1) Chạy server. 2) Fetch `/`. 3) Check HTTP 200. | 200, HTML đủ, không 404 asset. | `E2E-01_index_200.png` |
| E2E-02 | Load game không crash & màn Start | 1) Mở URL. 2) Wait canvas init. 3) Chụp Start. | Không exception, hiện `start-btn`, không lỗi console. | `E2E-02_start.png` |
| E2E-03 | Start → vào Gameplay (bucket) | 1) Click `start-btn`. 2) Chờ vào gameplay. 3) Chụp. | Vào Gameplay, `bucket` + `drop-ghost` + `score-label` = 0, `next-fruit` hiện. | `E2E-03_gameplay.png` |

### 1.2 Thả & merge (cơ chế chơi — M3-01/02)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-04 | Ghost theo pointer clamp trong bucket | 1) Di chuột qua lại vùng thả. 2) Chụp vài vị trí. | `drop-ghost` trái theo X, clamp trong `bucket`, không lọt ngoài. | `E2E-04_ghost.png` |
| E2E-05 | Thả trái rơi | 1) Ghost ở X giữa. 2) Click/nhả. 3) Chụp sau rơi. | Trái sinh đỉnh bucket đúng X, rơi xuống, `next-fruit` cập nhật. | `E2E-05_drop.png` |
| E2E-06 | Merge 2 cùng loại | 1) Thả 2 trái cùng bậc chạm nhau. 2) Chờ merge. 3) Chụp. | Thành trái bậc kế (to hơn) + pop + `score-label` tăng đúng bảng + sfx. | `E2E-06_merge.png` |
| E2E-07 | Không merge khác loại | 1) Thả 2 trái khác bậc cạnh nhau. 2) Chờ. | KHÔNG hợp nhất; 2 trái tồn tại riêng; score không đổi sai. | `E2E-07_merge_other.png` |

### 1.3 Danger line & game over (M3-03)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-08 | Vạch danger hiển thị | 1) Nhìn Gameplay. 2) Chụp. | `danger-line` dashed rõ, đúng ~20% đỉnh bucket. | `E2E-08_dangerline.png` |
| E2E-09 | Game over khi trái trên vạch + settle | 1) Để trái lấn quá vạch cho tới settle. 2) Chụp. | Panel game over hiện; không chụp khi đang rơi ngang. | `E2E-09_gameover.png` |

### 1.4 Rewarded continue & interstitial (M3-05/07)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-10 | Game over lần 1 rewarded continue | 1) Game over lần đầu. 2) Chụp. | Hiện `continue-btn` (rewarded), KHÔNG interstitial lần 1. | `E2E-10_continue.png` |
| E2E-11 | Continue earned tiếp tục | 1) Chấp nhận rewarded. 2) Chụp sau. | Trái trên vạch biến mất; trái còn đẩy xuống; gameplay tiếp. | `E2E-11_resume.png` |
| E2E-12 | Game over lần 2 interstitial | 1) Game over lần 2. 2) Chụp. | Interstitial chạy trước khi panel retry hiện. | `E2E-12_interstitial.png` |
| E2E-13 | Retry chơi lại | 1) Click `retry-btn`. 2) Chụp. | RNG seed mới, `score-label`=0, restart bucket. | `E2E-13_retry.png` |

### 1.5 Score / best / save (M3-08)

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-14 | Best score lưu sau reload | 1) Đạt score. 2) Reload. 3) Vào lại. 4) Chụp. | `best-label` giữ bằng score đạt được. | `E2E-14_reload.png` |
| E2E-15 | Kỷ lục mới popup | 1) Làm score > best đã lưu. 2) Chụp. | `record-popup` "KỶ LỤC MỚI!" + sendScore gọi. | `E2E-15_record.png` |
| E2E-16 | User test cần dọn — save reset | 1) Reset localStorage (`m3_save`). 2) Reload. 3) Chụp. | best về 0 / mặc định sau dọn. | `E2E-16_save_reset.png` |

---

## 2. NHÓM USABILITY (UX trước code — test "dễ dùng")

> Mục tiêu: verify từ góc người chơi casual mới, không biết nút ở đâu, không biết luật.

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-17 | User mới đạt hành động chính ≤3 thao tác | 1) Load trang (Start). 2) Đếm thao tác để thả được trái. | Đạt "thả trái" trong ≤3 thao tác rõ ràng (Start 1 tap → ghost → thả 1). | `E2E-17_flow.png` |
| E2E-18 | Merge tự giải thích không cần chữ | 1) Quan sát merge, KHÔNG có tutorial. 2) Chụp. | Việc "2 cùng loại → 1 trái to" hiểu ngay qua visual (pop + to lên). | `E2E-18_selfexplain.png` |
| E2E-19 | Vạch danger rõ ràng | 1) Nhìn Gameplay gần vạch. 2) Chụp. | Người mới nhận biết vùng nguy hiểm (khác nền thùng, dashed). | `E2E-19_clear_danger.png` |
| E2E-20 | Rewarded không gây khó hiểu | 1) Chạm `continue-btn`. 2) Chụp panel. | Có label giải thích (ad reward), không nhầm lẫn với retry. | `E2E-20_continue_clear.png` |
| E2E-21 | Điều khiển không mơ hồ | 1) Thao tác thả vài lần. 2) Quan sát. | Ghost trùng vị trí thả thật; không lệch cảm giác X. | `E2E-21_ghost_accurate.png` |

---

## 3. NHÓM VISUAL QA (lệch px/layout/màn hình)

> Hermes QA kiểm visual tỉ mỉ (đúng quy tắc anh Tuyền: bắt lỗi lệch px/layout/tỉ lệ).

| ID | Tên | Steps | Expected | Evidence |
|----|-----|-------|----------|----------|
| E2E-22 | Layout khớp DESIGN-SPEC mockup | 1) So màn Start/Gameplay vs §3 DESIGN-SPEC. 2) Chụp. | Vị trí/kích thước HUD, bucket, nút, margin khớp; không lệch px. | `E2E-22_layout.png` |
| E2E-23 | Sprite không méo/greyscale | 1) Xem 12 trái. 2) So DESIGN-SPEC §6. | Màu/kích thước/viền đậm đúng từng bậc; không méo, không chữ/watermark. | `E2E-23_fruits.png` |
| E2E-24 | Responsive các tỉ lệ | 1) Đổi viewport 9:16, 1:1, 16:9, 32:9. 2) Chụp. | Scale.FIT letterbox/pillarbox; HUD không đè, không méo; bucket centered. | `E2E-24_responsive_{ar}.png` |
| E2E-25 | Jackpot Watermelon được hiển thị | 1) Merge tới watermelon. 2) Chụp. | Trái to nhất + glow; pop + score jackpot đúng. | `E2E-25_watermelon.png` |
| E2E-26 | Không lỗi console | 1) Mở console trong mọi màn. 2) Ghi lỗi. | Không uncaught exception / 404 asset / no-audio-URLs. | `E2E-26_console.png` |
| E2E-27 | Chọn màn chơi (Stage Select) | 1) Từ Menu bấm Adventure. 2) Màn hình chọn màn hiện 30 levels. | Hiển thị đúng số sao, màn khóa/mở, bấm vào màn 1 để chơi. | `E2E-27_stageselect.png` |
| E2E-28 | Gameplay Stage Goal & Obstacles | 1) Vào màn có Băng/Gỗ. 2) Merge trái cạnh chướng ngại vật. | Băng tan vỡ, Goal HUD đếm đúng tiến độ hoàn thành. | `E2E-28_stage_goal.png` |
| E2E-29 | Sử dụng Búa/Bom Power-up | 1) Bấm nút Búa/Bom trên action bar. 2) Kích hoạt lên sân. | Phá hủy vật thể mục tiêu, trừ số lượng power-up chính xác. | `E2E-29_powerup.png` |
| E2E-30 | Hoàn thành màn (Stage Victory) | 1) Đạt mục tiêu trước khi hết lượt. 2) Màn thắng hiện ra. | Bảng sao 1-3 ⭐, nút Next Stage mở khóa màn kế tiếp. | `E2E-30_stage_victory.png` |

---

## 4. KẾT LUẬN

- Tất cả E2E-01..30 PASS + không exception + layout khớp DESIGN-SPEC mới coi game sẵn sàng đóng gói.
- Sau đó chạy `python -m pipeline package --game-dir games/juicy-merge` → unzip zip → serve → browser:
  bản nộp phải chạy được từ zip (không chỉ dev build).
- M3 nhập trạng thái "sẵn sàng nộp Mediacube / Playgama" trong `STATUS.md`.
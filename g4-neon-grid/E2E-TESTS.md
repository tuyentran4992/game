# M4: E2E-TESTS — "Neon Grid" (Block Puzzle)

> **Dành cho Hermes QA.** Chạy bằng browser thật (Playwright + vision). KHÔNG phải unit test.
> Game: `g4-neon-grid/`, chạy `pnpm dev` → localhost:5173.
> **Cập nhật:** 2026-08-26 — thêm meta progression E2E tests.

---

## 1. SETUP

```bash
cd /data/youtube-playables/g4-neon-grid
pnpm install
pnpm dev
# Mở http://localhost:5173
```

---

## 2. E2E TEST CASES

### E2E-01: Start Screen (v2)

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Mở game | Màn Start hiển thị | `start-title` |
| 2 | Check 3 nút | PLAY (primary, pulse) + DAILY (secondary, badge "NEW") + SKINS (ghost) | `play-btn`, `daily-btn`, `skins-btn` |
| 3 | Check achievement count | "🏆 0/15" hiển thị | `achievement-count` |
| 4 | Check best score | "BEST: 0" (hoặc số đã lưu) | `best-score` |
| 5 | Tap PLAY | Fade → Gameplay | `play-btn` |

**Evidence:** screenshot `01-start-v2.png`

### E2E-02: Gameplay — Core Loop

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Vào Gameplay | Grid 8×8 trống + 3 piece cards | `grid`, `piece-0`, `piece-1`, `piece-2` |
| 2 | Check score | "SCORE: 0" | `score-label` |
| 3 | Tap piece 0 | Highlight + ghost preview | `piece-0` |
| 4 | Tap grid | Block đặt vào grid | `grid` |
| 5 | Đặt hết 3 piece | 3 piece mới xuất hiện | `piece-0`, `piece-1`, `piece-2` |

**Evidence:** screenshot `02-gameplay-core.png`, `03-ghost-preview.png`

### E2E-03: Power-ups

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Check power-up buttons | 3 nút: Undo, Shuffle, Bomb | `undo-btn`, `shuffle-btn`, `bomb-btn` |
| 2 | Tap Undo | Quay lại nước trước (nếu có) | `undo-btn` |
| 3 | Tap Shuffle | 3 piece mới xuất hiện | `shuffle-btn` |
| 4 | Tap Bomb | Chế độ chọn ô → tap grid → xoá block | `bomb-btn` |
| 5 | Dùng hết free → rewarded ad | Rewarded ad prompt | — |

**Evidence:** screenshot `04-powerups.png`

### E2E-04: Clear Lines

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Xếp để clear 1 hàng | Flash + particle + score popup | — |
| 2 | Xếp để clear liên tiếp | Combo +50% điểm | `score-label` |
| 3 | Xếp để all-clear | ×2 bonus | `score-label` |

**Evidence:** video `05-clear-animation.mp4`

### E2E-05: Game Over

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Chơi tới game over | Modal hiển thị | `game-over-modal` |
| 2 | Check score | Score hiển thị đúng | `final-score` |
| 3 | Tap RETRY | Gameplay mới | `retry-btn` |
| 4 | Game over → tap MENU | Về Start | `menu-btn` |

**Evidence:** screenshot `06-game-over.png`

### E2E-06: Daily Challenge

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Từ Start → tap DAILY | Gameplay với daily mode | `daily-btn` |
| 2 | Check daily progress bar | "Daily: 0/12 lines" + progress bar | `daily-progress` |
| 3 | Xếp và clear lines | Progress bar cập nhật | `daily-progress` |
| 4 | Đạt goal | Popup "📅 DAILY COMPLETE!" | `daily-complete-popup` |
| 5 | Check reward | Skin unlock notification | `daily-reward` |
| 6 | Tap CLAIM | Về Start, skin unlocked | `daily-claim-btn` |
| 7 | Vào Daily lần nữa | Badge "NEW" biến mất, không thể claim lại | `daily-btn` |

**Evidence:** screenshot `07-daily-start.png`, `08-daily-complete.png`, `09-daily-claimed.png`

### E2E-07: Achievement

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Chơi đạt 100 điểm | Game over → popup "🏆 NEW! First Blood" | `achievement-popup` |
| 2 | Tap OK | Popup đóng | `achievement-ok-btn` |
| 3 | Check achievement count trên Start | "🏆 1/15" | `achievement-count` |
| 4 | Chơi đạt achievement có reward skin | Popup + skin unlock | `achievement-reward` |
| 5 | Achievement không popup lại | Đã unlock → không hiện lại | — |

**Evidence:** screenshot `10-achievement-popup.png`, `11-achievement-count.png`

### E2E-08: Skin Select

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Start → tap SKINS | Skin Select screen | `skins-title` |
| 2 | Check skin list | 7 skin, skin 0 (Cyan) active, others locked | `skin-0`...`skin-6` |
| 3 | Check unlock condition | "Unlock: Clear 100 lines" | `skin-unlock-condition` |
| 4 | Tap locked skin | Không có phản hồi (hoặc thông báo) | — |
| 5 | Tap unlocked skin | Preview, APPLY | — |
| 6 | Tap BACK | Về Start | `skin-back-btn` |
| 7 | Vào gameplay | Skin áp dụng (grid màu khác) | `grid` |

**Evidence:** screenshot `12-skin-select.png`, `13-skin-applied.png`

### E2E-09: Score Persistence

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Chơi score > 0 | — | — |
| 2 | Game over → MENU | Về Start | `menu-btn` |
| 3 | Check best score | "BEST: X" cập nhật | `best-score` |
| 4 | Refresh tab | Data vẫn còn | — |
| 5 | Chơi score thấp hơn | Best không đổi | — |
| 6 | Chơi score cao hơn | Best cập nhật | — |

**Evidence:** screenshot `14-persistence.png`

### E2E-10: Responsive

| Bước | Mô tả | Expected |
|------|-------|----------|
| 1 | Resize 360×640 (mobile S) | Game fit, không truncate |
| 2 | Resize 414×896 (mobile L) | Game fit, tỉ lệ đẹp |
| 3 | Resize 1024×768 (tablet ngang) | Pillarbox, game giữa |
| 4 | Resize 1920×1080 (desktop) | Pillarbox, game giữa |

**Evidence:** screenshot `15-responsive-mobile.png`, `16-responsive-desktop.png`

---

## 3. UX CHECKLIST (visual QA)

- [ ] Màn Start: 3 nút rõ ràng, badge "NEW" trên Daily nếu chưa làm
- [ ] Gameplay: grid cân, ghost preview, power-up buttons dễ hiểu
- [ ] Daily progress bar: tracking đúng, dễ thấy
- [ ] Power-up: Undo hoạt động, Shuffle đổi piece, Bomb chọn ô
- [ ] Clear animation: flash + particle, score popup, combo
- [ ] Achievement popup: excitement, reward rõ ràng
- [ ] Skin Select: 7 skin grid, unlock condition, preview
- [ ] Game Over modal: score, RETRY, MENU
- [ ] Màu sắc: neon glow nổi, contrast đủ
- [ ] Touch: vùng chạm ≥44px, không miss
- [ ] Console: 0 error, 0 warning (trừ favicon)

---

## 4. QA PROTOCOL

1. Chạy `pnpm dev` → mở localhost
2. Chụp screenshot từng màn
3. Verify bằng vision: màu sắc, layout, font, shadow
4. Test flow: Start → PLAY → chọn piece → đặt → clear → power-up → game over → achievement → skin
5. Test daily: Start → DAILY → clear lines → claim reward → verify skin unlock
6. Test persistence: refresh → data còn
7. Test responsive: resize trình duyệt
8. Ghi kết quả vào `QA-FIXES.md` nếu có lỗi
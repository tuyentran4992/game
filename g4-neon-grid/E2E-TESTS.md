# M4: E2E-TESTS — "Neon Grid" (Block Puzzle)

> **Dành cho Hermes QA.** Chạy bằng browser thật (Playwright + vision). KHÔNG phải unit test.
> Game: `g4-neon-grid/`, chạy `pnpm dev` → localhost:5173.

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

### E2E-01: Start Screen

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Mở game | Màn Start hiển thị | `start-title` |
| 2 | Nhìn title "NEON GRID" | Chữ to, stroke cyan, dễ đọc | — |
| 3 | Nhìn nút PLAY | Button gradient cyan, pulse glow | `play-btn` |
| 4 | Check decorative blocks | 7 khối màu neon phía trên title | — |
| 5 | Tap PLAY | Fade out → màn Gameplay | `play-btn` |

**Evidence:** screenshot `01-start.png`, `02-start-to-gameplay.png`

### E2E-02: Gameplay — Grid & Pieces

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Vào Gameplay | Grid 8×8 trống hiển thị | `grid` |
| 2 | Check 3 piece cards | 3 card dưới grid, mỗi card có preview shape | `piece-0`, `piece-1`, `piece-2` |
| 3 | Check score HUD | "SCORE: 0" hiển thị | `score-label` |
| 4 | Tap piece 0 | Card highlight border cyan | `piece-0` |
| 5 | Di chuột lên grid | Ghost preview vị trí đặt | — |

**Evidence:** screenshot `03-gameplay-empty.png`, `04-ghost-preview.png`

### E2E-03: Place Block

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Tap piece 0 | Highlight | `piece-0` |
| 2 | Tap vào ô grid | Block đặt vào grid, piece 0 biến mất | `grid` |
| 3 | Check score | Score tăng (nếu có clear) | `score-label` |
| 4 | Đặt tiếp 2 block còn lại | Cả 3 dùng hết → 3 piece mới xuất hiện | `piece-0`, `piece-1`, `piece-2` |
| 5 | Đặt block sai vị trí (chồng) | Block không đặt, không mất piece | — |

**Evidence:** screenshot `05-block-placed.png`, `06-new-pieces.png`

### E2E-04: Clear Lines

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Đặt block để clear 1 hàng | Hàng đầy → flash + particle + score popup | — |
| 2 | Check combo | Nếu clear liên tiếp → combo +50% | — |
| 3 | Check score | Điểm tăng đúng công thức | `score-label` |

**Evidence:** video `07-clear-animation.mp4` (screen recording)

### E2E-05: Game Over

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Đặt block tới khi kẹt | Game Over modal hiện | `game-over-modal` |
| 2 | Check modal content | "GAME OVER" title + score + 2 buttons | — |
| 3 | Tap RETRY | Quay lại Gameplay | `retry-btn` |
| 4 | Chơi tới game over → tap MENU | Về màn Start | `menu-btn` |

**Evidence:** screenshot `08-game-over-modal.png`, `09-retry-gameplay.png`

### E2E-06: Score Persistence

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Chơi được score > 0 | — | — |
| 2 | Game over → về MENU | — | — |
| 3 | Vào game lại | "BEST: X" hiển thị trên màn Start | `best-score` |
| 4 | Chơi game mới, score thấp hơn | Best không đổi | — |
| 5 | Chơi game mới, score cao hơn | Best cập nhật | — |

**Evidence:** screenshot `10-best-score.png`

### E2E-07: Responsive

| Bước | Mô tả | Expected |
|------|-------|----------|
| 1 | Resize 360×640 (mobile S) | Game fit, không truncate |
| 2 | Resize 414×896 (mobile L) | Game fit, tỉ lệ đẹp |
| 3 | Resize 1024×768 (tablet ngang) | Pillarbox, game giữa |
| 4 | Resize 1920×1080 (desktop) | Pillarbox, game giữa |

**Evidence:** screenshot `11-responsive-mobile.png`, `12-responsive-desktop.png`

---

## 3. UX CHECKLIST (visual QA)

- [ ] Start screen: title đẹp, cân đối, PLAY button nổi bật
- [ ] Gameplay: grid cân giữa, piece card dễ thấy
- [ ] Ghost preview: hiển thị đúng khi chọn piece + di chuột
- [ ] Clear animation: flash + particle có cảm giác "đã", không giật
- [ ] Score counter: animation mượt, glow đẹp
- [ ] Game Over modal: hiển thị đúng, button đủ lớn
- [ ] Màu sắc: neon glow đủ nổi trên nền tối, contrast đủ
- [ ] Touch: vùng chạm ≥44px, không bị miss
- [ ] Font: Poppins + JetBrains Mono load đúng, không fallback font xấu
- [ ] Console: 0 error, 0 warning (trừ favicon)

---

## 4. QA PROTOCOL

1. Chạy `pnpm dev` → mở localhost
2. Chụp screenshot từng màn (Start, Gameplay, Game Over)
3. Verify bằng vision: màu sắc, layout, font, shadow
4. Test flow: Start → chọn piece → đặt → clear → game over → RETRY
5. Test responsive: resize trình duyệt
6. Test persistence: đóng tab → mở lại → best score còn
7. Ghi kết quả vào `QA-FIXES.md` nếu có lỗi
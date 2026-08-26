# M4: "Neon Grid" (Block Puzzle · YouTube Playables)

> **Research date:** 2026-08-26
> **Sources:** Block Blast (303M downloads, #1 casual 2025-2026), CrazyGames block puzzle trends, kinh nghiệm M1 (reflex) + M2 (sort) + M3 (physics-merge)
> **Depends on:** `packages/core` (@game/core UI framework + design tokens) · `packages/sdk` (@game/sdk Playgama SDK) · `packages/pipeline` (Python pipeline 1 bản)
> **Contract:** `g4-neon-grid/` — game logic pure TS trong `src/logic/` · render adapter `src/render/` · scenes mỏng `src/scenes/`
> **Art-theme:** NEON CYBERPUNK (nền tối, khối neon phát sáng, grid cyan)
> **Kiến trúc mới:** monorepo (pnpm workspace) · logic ≠ rendering (có thể đổi engine sau)

---

## 1. TỔNG QUAN

### Mục tiêu
Game **block puzzle** kiểu Block Blast: kéo-thả các khối hình học vào grid 8×8, clear hàng/cột để ghi điểm. Thể loại **puzzle không gian** (tư duy xếp hình) — khác reflex (M1), sort (M2), physics (M3). Là module 4 của factory, kiến trúc monorepo đầu tiên.

### Đối tượng
- Người chơi: khán giả 13+ quốc tế trên YouTube Playables (Playgama distribution).
- Vận hành: Hermes (PM/QA) + Claude GLM-5.2 (Dev) + anh Tuyền (duyệt).

### IN SCOPE
- Grid 8×8, 13 block shapes (tetromino + smaller), 7 màu neon.
- Kéo-thả block vào grid (drag & drop hoặc chọn-chạm).
- Clear hàng/cột đầy → điểm + combo.
- 3 block dự trữ mỗi lượt, game over khi không đặt được.
- Score + best score lưu saveData (localStorage / Playgama bridge).
- Monetize qua SDK: interstitial (game over), rewarded (hint/undo).
- Art Neon Cyberpunk + âm thanh (numpy synth).
- Responsive portrait 9:16 (mobile-first).

### OUT OF SCOPE
- Không timer, không thua (puzzle, chỉ game over khi kẹt).
- KHÔNG gọi mạng ngoài / multiplayer / self-ads.
- Không rotation (shapes cố định — feature sau).
- Không IAP (chờ 2027).

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser 3 WebGL (TS, vite build) · `@game/core` (UI components + tokens) · `@game/sdk` (Playgama + Mock) · `packages/pipeline` Python.
- **Monorepo:** pnpm workspace, `g4-neon-grid/` chỉ chứa code game-specific.
- **Tách logic:** `src/logic/` = pure TS (0 Phaser import) · `src/render/` = Phaser adapter · `src/scenes/` = mỏng (orchestrate).
- **Playables SDK:** `@game/sdk` — auto-detect Playgama Bridge → Mock local.
- **Pipeline CLI (1 bản chung):**
```bash
cd packages/pipeline && python -m src validate --game-dir ../../g4-neon-grid
cd packages/pipeline && python -m src package  --game-dir ../../g4-neon-grid
```

---

## 3. USER FLOW

```
Mở game (pre-roll ad) → Start (nút PLAY, title neon, hiệu ứng glow)
→ Gameplay: grid 8×8 + 3 khối dự trữ phía dưới
  • Chọn 1 khối (tap) → highlight khối + ghost preview trên grid
  • Tap vào grid → đặt khối (nếu hợp lệ)
  • Hàng/cột đầy → clear + particle burst + score popup
  • Hết 3 khối → sinh 3 khối mới
  • Không đặt được → GAME OVER modal (score + best + RETRY)
→ Interstitial ad (game over) → RETRY về Start / Gameplay
→ Đóng giữa chừng → saveData lưu score (không lưu board state)
```

---

## 4. NỘI DUNG & BỐ CỤC

### Màn hình Start
```
┌──────────────────────────────┐
│         NEON GRID            │  ← title 56px, stroke cyan
│        Block Puzzle          │  ← subtitle 24px, muted
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐      │  ← decorative blocks (7 màu)
│   └──┘ └──┘ └──┘ └──┘      │
│                              │
│        ┌──────────┐          │
│        │ ▶  PLAY  │          │  ← Button primary, pulse glow
│        └──────────┘          │
│                              │
│        BEST: 4200            │  ← high score (nếu có)
│                              │
│     v1.0 · @game/core        │
└──────────────────────────────┘
```

**data-testid:** `start-title`, `play-btn`, `best-score`

### Màn hình Gameplay
```
┌──────────────────────────────┐
│       NEON GRID     SCORE    │  ← HUD: title + score counter
│   ┌──────────────────────┐   │
│   │  ██  ██  ██          │   │
│   │  ██  ██  ██  ██  ██  │   │  ← Grid 8×8 (64px cell)
│   │      ██  ██  ██  ██  │   │
│   │  ██  ██      ██      │   │
│   │  ██  ██  ██  ██  ██  │   │
│   │      ██  ██      ██  │   │
│   │  ██  ██  ██  ██  ██  │   │
│   │  ██  ██  ██  ██  ██  │   │
│   └──────────────────────┘   │
│                              │
│   ┌──────┐ ┌──────┐ ┌──────┐│  ← 3 piece cards (96×80px)
│   │  ██  │ │ ████ │ │  ██  ││
│   │  ██  │ │      │ │  ██  ││
│   └──────┘ └──────┘ └──────┘│
│     [TAP]    [TAP]    [TAP]  │
└──────────────────────────────┘
```

**data-testid:** `score-label`, `grid`, `piece-0`, `piece-1`, `piece-2`, `game-over-modal`, `retry-btn`, `menu-btn`

---

## 5. TECHNICAL REQUIREMENTS

- **Stack:** Phaser 3 WebGL · TypeScript · Vite · pnpm workspace.
- **Resolution:** 720×1280 (portrait 9:16), Scale.FIT, auto-center.
- **Font:** Poppins (Google Fonts) — loaded in index.html.
- **SDK:** `@game/sdk` handler — initialize before gameReady.
- **Save:** `@game/sdk.saveData({ score })` + localStorage fallback.

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| NG-01 | Grid 8×8 cố định. Block chỉ đặt vào ô trống, không chồng. |
| NG-02 | Mỗi lượt 3 block ngẫu nhiên (từ 13 shape, 7 màu). Hết → sinh 3 mới. |
| NG-03 | Hàng/cột đầy 8 ô → clear. Clear nhiều cùng lúc → combo +50% điểm. |
| NG-04 | Game over khi không đặt được block nào trong 3. |
| NG-05 | Score = (số line × 100) × (1 + combo × 0.5). All-clear (grid rỗng) ×2. |
| NG-06 | Rewarded ad: undo (quay lại nước trước) — feature sau. |
| NG-07 | Interstitial: game over → RETRY. |
| NG-08 | Lưu best score qua saveData. CẤM gọi mạng ngoài. |
| NG-09 | Responsive portrait 9:16, touch + mouse, target 13+. |
| NG-10 | Bundle < 5MB initial, file lẻ < 512KB, load < 5s. |

---

## 7. STATE HANDLING

| State | Cách phát hiện | Xử lý |
|-------|----------------|-------|
| Loading game | gameReady chưa fire | Spinner, fire gameReady khi sẵn sàng |
| Pre-roll ad | platform tự chạy | Không block; sau ad mới nhận tap |
| Chọn block | tap vào piece card | Highlight card, ghost preview trên grid |
| Đặt block hợp lệ | tap vào ô trống trên grid | Đặt block, kiểm tra clear, cập nhật score |
| Clear hàng/cột | hàng/cột đầy | Animation 350ms + particle burst + score popup |
| Hết block | 3 block đã dùng hết | Sinh 3 block mới |
| Kẹt (game over) | không đặt được block nào | Modal GAME OVER + interstitial ad |
| Game Over | modal hiện | RETRY → gameplay / MENU → start |
| Resize | resize event | Scale.FIT auto |
| Pause/Mute | onPause/onAudioChange | Dừng + tắt âm; resume |

---

## 8. TIÊU CHÍ HOÀN THÀNH

1. Game chạy local browser: Start → Gameplay → chọn block → đặt → clear → game over → RETRY.
2. Board logic test (pure TS) pass: place, clear, game over, score.
3. SDK: interstitial (game over), rewarded (hint), save/load, gameReady.
4. UI: @game/core components (Button, ScoreText, Modal) hiển thị đúng.
5. Ghost preview khi chọn block.
6. Particle effects khi clear hàng/cột.
7. Validate Playables pass (size/cấm mạng/responsive/13+).
8. QA browser + vision PASS functional + visual.
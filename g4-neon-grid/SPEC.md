# M4: "Neon Grid" (Block Puzzle · YouTube Playables)

> **Research date:** 2026-08-26 · **Meta progression update:** 2026-08-26
> **Sources:** Block Blast (303M downloads, #1 casual 2025-2026), Royal Match (meta retention), CrazyGames block puzzle trends, kinh nghiệm M1 (reflex) + M2 (sort) + M3 (physics-merge)
> **Depends on:** `packages/core` (@game/core UI framework + design tokens) · `packages/sdk` (@game/sdk Playgama SDK) · `packages/pipeline` (Python pipeline 1 bản)
> **Contract:** `g4-neon-grid/` — game logic pure TS trong `src/logic/` · render adapter `src/render/` · scenes mỏng `src/scenes/`
> **Art-theme:** NEON CYBERPUNK (nền tối, khối neon phát sáng, grid cyan)
> **Kiến trúc mới:** monorepo (pnpm workspace) · logic ≠ rendering (có thể đổi engine sau)

---

## 1. TỔNG QUAN

### Mục tiêu
Game **block puzzle** kiểu Block Blast: kéo-thả các khối hình học vào grid 8×8, clear hàng/cột để ghi điểm. Thể loại **puzzle không gian** (tư duy xếp hình) — khác reflex (M1), sort (M2), physics (M3). Là module 4 của factory, kiến trúc monorepo đầu tiên.

**Meta progression:** Daily Challenge + Achievement System + Skin/Theme Unlock + Power-ups → giữ chân người chơi quay lại mỗi ngày.

### Đối tượng
- Người chơi: khán giả 13+ quốc tế trên YouTube Playables (Playgama distribution).
- Vận hành: Hermes (PM/QA) + Claude GLM-5.2 (Dev) + anh Tuyền (duyệt).

### IN SCOPE
- **Core:** Grid 8×8, 13 block shapes, 7 màu neon, chọn-chạm đặt block, clear hàng/cột, combo, 3 piece dự trữ, game over.
- **Daily Challenge:** Mỗi ngày 1 puzzle seed cố định, reward skin/theme mới.
- **Achievements:** 15 achievements (milestone, skill, daily), unlock skin khi đạt.
- **Skin/Theme:** 7 skin, unlock qua achievement/daily, chọn từ màn Start.
- **Power-ups:** Shuffle (xoá 3 piece mới), Bomb (xoá 1 block bất kỳ), Extra Slot (+1 piece). Undo có sẵn.
- **Monetize:** interstitial (game over), rewarded (power-up khi hết lượt free).
- Art Neon Cyberpunk + âm thanh numpy synth.
- Responsive portrait 9:16 (mobile-first).

### OUT OF SCOPE
- Không timer, không thua (puzzle, chỉ game over khi kẹt).
- KHÔNG gọi mạng ngoài / multiplayer / self-ads.
- Không rotation shapes (feature sau).
- Không IAP (chờ 2027).

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser 3 WebGL (TS, vite build) · `@game/core` (UI components + tokens) · `@game/sdk` (Playgama + Mock) · `packages/pipeline` Python.
- **Monorepo:** pnpm workspace, `g4-neon-grid/` chỉ chứa code game-specific.
- **Tách logic:** `src/logic/` = pure TS (0 Phaser import) · `src/render/` = Phaser adapter · `src/scenes/` = mỏng (orchestrate).
- **Save schema mở rộng:** lưu best score, achievements đã mở, skin đã unlock, skin đang dùng, daily challenge completion.
- **Playables SDK:** `@game/sdk` — auto-detect Playgama Bridge → Mock local.
- **Pipeline CLI (1 bản chung):**
```bash
cd packages/pipeline && python -m src validate --game-dir ../../g4-neon-grid
cd packages/pipeline && python -m src package  --game-dir ../../g4-neon-grid
```

---

## 3. USER FLOW

```
Mở game (pre-roll ad) → Start
  ├── ▶ PLAY → Gameplay (classic mode)
  │   └── Game over → RETRY / MENU
  ├── 📅 DAILY CHALLENGE → Gameplay (daily seed)
  │   └── Hoàn thành → reward skin / theme
  └── 🎨 SKINS → Skin Select → chọn skin → về Start

Gameplay:
  • Chọn 1 khối (tap) → highlight + ghost preview
  • Tap vào grid → đặt khối
  • Hàng/cột đầy → clear + particle + score popup
  • Hết 3 khối → sinh 3 khối mới
  • Không đặt được → GAME OVER modal
  • Game over → check achievement unlocked → popup achievement
  → RETRY / MENU

Achievement popup (khi mới unlock):
  "🏆 Combo King! — Clear 3 lines in a row"
  → Nhấn OK → tiếp tục
```

---

## 4. NỘI DUNG & BỐ CỤC

### Màn hình Start (mở rộng)
```
┌──────────────────────────────┐
│         NEON GRID            │  ← title 56px, stroke theo skin hiện tại
│        Block Puzzle          │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐      │  ← decorative blocks
│   └──┘ └──┘ └──┘ └──┘      │
│                              │
│        ┌──────────┐          │
│        │ ▶  PLAY  │          │  ← Button primary
│        └──────────┘          │
│        ┌──────────┐          │
│        │ 📅 DAILY  │          │  ← Button secondary (badge "NEW" nếu chưa làm)
│        └──────────┘          │
│        ┌──────────┐          │
│        │ 🎨 SKINS  │          │  ← Button ghost
│        └──────────┘          │
│                              │
│     BEST: 4200   🏆 5/15    │  ← best score + achievement count
│                              │
│     v1.0 · @game/core        │
└──────────────────────────────┘
```

**data-testid:** `start-title`, `play-btn`, `daily-btn`, `skins-btn`, `best-score`, `achievement-count`

### Màn hình Gameplay (có power-ups)
```
┌──────────────────────────────┐
│       NEON GRID     SCORE    │
│   ┌──────────────────────┐   │
│   │  Grid 8×8            │   │
│   └──────────────────────┘   │
│                              │
│   ┌──────┐ ┌──────┐ ┌──────┐│  ← 3 piece cards
│   │  ██  │ │ ████ │ │  ██  ││
│   └──────┘ └──────┘ └──────┘│
│                              │
│   [↺Undo] [🔀Shuffle] [💣]  │  ← Power-up buttons (3 cái)
│                              │
│   Daily: Clear 15 lines  ██░░│  ← Daily progress bar (nếu daily mode)
└──────────────────────────────┘
```

**data-testid:** `score-label`, `grid`, `piece-0/1/2`, `undo-btn`, `shuffle-btn`, `bomb-btn`, `daily-progress`

### Màn hình Skin Select
```
┌──────────────────────────────┐
│           SKINS              │  ← title
│                              │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │🌟  │ │🔒  │ │🔒  │       │  ← Skin grid 3 cột
│  │Cyan│ │Mag │ │Gold│       │  ● đang dùng, 🔒 locked
│  └────┘ └────┘ └────┘       │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │🔒  │ │🔒  │ │🔒  │       │
│  │Ocean│ │Arcade│ │Mid  │       │
│  └────┘ └────┘ └────┘       │
│                              │
│  Current: Neon Cyan          │
│  Unlock: "Clear 100 lines"   │
│                              │
│        ┌──────────┐          │
│        │  ← BACK  │          │  ← Button ghost
│        └──────────┘          │
└──────────────────────────────┘
```

**data-testid:** `skins-title`, `skin-0`...`skin-6`, `skin-back-btn`, `skin-current-label`, `skin-unlock-condition`

### Màn hình Achievement Popup
```
┌──────────────────────────────┐
│  (overlay đen 70%)           │
│       ┌──────────────┐       │
│       │   🏆 NEW!     │       │
│       │  Combo King   │       │  ← title achievement name
│       │              │       │
│       │  Clear 3     │       │  ← description
│       │  lines in a  │       │
│       │  row         │       │
│       │              │       │
│       │  Reward: 🌟  │       │  ← reward (skin/theme)
│       │  Magenta     │       │
│       │  Dream       │       │
│       │              │       │
│       │  ┌────────┐  │       │
│       │  │  OK!   │  │       │  ← Button primary
│       │  └────────┘  │       │
│       └──────────────┘       │
└──────────────────────────────┘
```

**data-testid:** `achievement-popup`, `achievement-title`, `achievement-reward`, `achievement-ok-btn`

### Màn hình Daily Challenge Complete
```
┌──────────────────────────────┐
│  (overlay đen 70%)           │
│       ┌──────────────┐       │
│       │  📅 DAILY     │       │
│       │  COMPLETE!    │       │  ← title
│       │              │       │
│       │  Lines: 15/15│       │
│       │  Score: 3200 │       │
│       │              │       │
│       │  Reward: 🌟  │       │
│       │  Ocean Deep  │       │  ← skin reward
│       │  skin!       │       │
│       │              │       │
│       │  ┌────────┐  │       │
│       │  │  CLAIM! │  │       │  ← Button primary
│       │  └────────┘  │       │
│       └──────────────┘       │
└──────────────────────────────┘
```

**data-testid:** `daily-complete-popup`, `daily-reward`, `daily-claim-btn`

---

## 5. TECHNICAL REQUIREMENTS

- **Stack:** Phaser 3 WebGL · TypeScript · Vite · pnpm workspace.
- **Resolution:** 720×1280 (portrait 9:16), Scale.FIT, auto-center.
- **Font:** Poppins (Google Fonts) — loaded in index.html.
- **SDK:** `@game/sdk` handler — initialize before gameReady.
- **Save:** `@game/sdk.saveData({ score, achievements, skins, daily, ... })` + localStorage fallback.
- **Daily seed:** `seed = dateToSeed(new Date())` — deterministic, same for all players.
- **Skin storage:** index 0-6, lưu skinId đang dùng. Skin 0 (Cyan) luôn unlocked.

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| NG-01 | Grid 8×8 cố định. Block chỉ đặt vào ô trống, không chồng. |
| NG-02 | Mỗi lượt 3 block ngẫu nhiên (từ 13 shape, 7 màu). Hết → sinh 3 mới. |
| NG-03 | Hàng/cột đầy 8 ô → clear. Clear nhiều cùng lúc → combo +50% điểm. |
| NG-04 | Game over khi không đặt được block nào trong 3. |
| NG-05 | Score = (số line × 100) × (1 + combo × 0.5). All-clear (grid rỗng) ×2. |
| NG-06 | **Undo:** quay lại 1 nước, free 3 lần/game, tiếp theo → rewarded ad. |
| NG-07 | **Shuffle:** xoá 3 piece hiện tại → sinh 3 piece mới, rewarded ad. |
| NG-08 | **Bomb:** xoá 1 block bất kỳ trên grid, rewarded ad. |
| NG-09 | **Extra Slot:** +1 piece dự trữ (tổng 4), rewarded ad. |
| NG-10 | Interstitial: game over → RETRY. |
| NG-11 | Lưu best score + achievements + skins + daily qua saveData. CẤM gọi mạng ngoài. |
| NG-12 | **Daily Challenge:** seed cố định theo ngày, mục tiêu (vd clear 15 lines), reward 1 skin mới. |
| NG-13 | **Achievements:** 15 cái, 3 nhóm (milestone/skill/daily). Mỗi achievement unlock 1 lần. |
| NG-14 | **Skins:** 7 skin, skin 0 (Cyan) mặc định. Unlock qua achievement/daily. |
| NG-15 | Responsive portrait 9:16, touch + mouse, target 13+. |
| NG-16 | Bundle < 5MB initial, file lẻ < 512KB, load < 5s. |

### 6.1 Achievement Definitions

| ID | Name | Condition | Reward |
|----|------|-----------|--------|
| ACH-01 | "First Blood" | Score ≥ 100 | — |
| ACH-02 | "Century" | Score ≥ 1000 | Skin: Magenta Dream |
| ACH-03 | "Neon Master" | Score ≥ 10000 | — |
| ACH-04 | "Grid Legend" | Score ≥ 50000 | Skin: Golden Era |
| ACH-05 | "Clean Sweep" | Clear 3 lines in 1 move | — |
| ACH-06 | "Combo King" | Combo ×3 | Skin: Midnight |
| ACH-07 | "Perfect Clear" | All-clear (grid rỗng) | — |
| ACH-08 | "Shape Collector" | Use all 13 shapes | Skin: Rainbow |
| ACH-09 | "Line Worker" | Clear 100 lines total | Skin: Ocean Deep |
| ACH-10 | "Marathon" | Score ≥ 25000 in 1 game | — |
| ACH-11 | "Daily Player" | Complete 1 daily challenge | — |
| ACH-12 | "Week Warrior" | Complete 7 daily challenges | Skin: Retro Arcade |
| ACH-13 | "Bomb User" | Use bomb power-up 5 times | — |
| ACH-14 | "Shuffler" | Use shuffle power-up 5 times | — |
| ACH-15 | "No More Moves" | Win a game with all 3 pieces used perfectly | — |

### 6.2 Skin Definitions

| ID | Name | Unlock | Grid color | Block palette |
|----|------|--------|-----------|---------------|
| SKIN-00 | Neon Cyan | Default | Cyan #00f5ff | 7 neon colors |
| SKIN-01 | Magenta Dream | ACH-02 | Magenta #ff00ff | Pastel tint |
| SKIN-02 | Golden Era | ACH-04 | Gold #ffdd00 | Amber tones |
| SKIN-03 | Ocean Deep | ACH-09 | Deep blue #0044ff | Ocean tones |
| SKIN-04 | Retro Arcade | ACH-12 | Green #00ff44 | 8-bit palette |
| SKIN-05 | Midnight | ACH-06 | Purple #8800ff | Dark neon |
| SKIN-06 | Rainbow | ACH-08 | Spectral | Rainbow gradient |

### 6.3 Daily Challenge
- Seed = `YYYYMMDD` hash → deterministic piece sequence
- Goal: clear N lines (N = 10 + dayOfWeek, tăng dần trong tuần)
- Each day: 1 attempt free, rewarded ad → extra attempt
- Reward: skin unlock (xoay vòng, skin chưa có)

---

## 7. STATE HANDLING

| State | Cách phát hiện | Xử lý |
|-------|----------------|-------|
| Loading game | gameReady chưa fire | Spinner, fire gameReady khi sẵn sàng |
| Pre-roll ad | platform tự chạy | Không block; sau ad mới nhận tap |
| Chọn block | tap vào piece card | Highlight card, ghost preview |
| Đặt block hợp lệ | tap vào ô trống | Đặt block, kiểm tra clear |
| Clear hàng/cột | hàng/cột đầy | Animation + particle + score popup |
| Daily progress | clear lines | Update daily progress bar |
| Hết block | 3 block dùng hết | Sinh 3 block mới |
| Power-up used | tap power-up btn | Free → giảm counter. Hết → rewarded ad |
| Achievement unlock | sau game over check | Popup achievement reward |
| Daily complete | đạt mục tiêu daily | Popup daily reward |
| Kẹt (game over) | không đặt được | Modal GAME OVER + interstitial |
| Game Over | modal hiện | RETRY / MENU |
| Skin select | vào Skin screen | Highlight skin đang dùng, show lock/unlock |
| Resize | resize event | Scale.FIT auto |
| Pause/Mute | onPause/onAudioChange | Dừng + tắt âm; resume |

---

## 8. TIÊU CHÍ HOÀN THÀNH

1. Game chạy local browser: Start → PLAY → chọn block → đặt → clear → game over → RETRY.
2. Start screen có 3 nút: PLAY, DAILY, SKINS.
3. Daily Challenge: seed cố định theo ngày, progress bar, reward khi hoàn thành.
4. Achievements: 15 cái, check sau game over, popup khi unlock mới.
5. Skin Select: 7 skin, unlock đúng condition, áp dụng vào game.
6. Power-ups: Undo (free 3), Shuffle/Bomb/ExtraSlot (rewarded).
7. Board logic test (pure TS) pass: place, clear, game over, score, daily.
8. SDK: interstitial, rewarded, save/load mở rộng, gameReady.
9. UI: @game/core components hiển thị đúng.
10. Validate Playables pass (size/cấm mạng/responsive/13+).
11. QA browser + vision PASS functional + visual.
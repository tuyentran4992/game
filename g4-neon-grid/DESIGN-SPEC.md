# M4: DESIGN-SPEC — "Neon Grid" (Block Puzzle · Neon Cyberpunk)

> **Tầng 2 (per-module).** THAM CHIẾU `docs/DESIGN-SYSTEM.md` (tầng 1 chung) cho token cơ bản. File này giữ: layout màn cụ thể + art-theme Neon Cyberpunk + bố cục các màn + data-testid.
> **Kiến trúc mới:** `packages/core/src/tokens.ts` = code implementation của design system. Token mới trong `src/ui/theme.ts` override cho game.
> Cập nhật: 2026-08-26 · Art-theme: **NEON CYBERPUNK** (nền tối, khối neon phát sáng, grid cyan).

---

## 1. DESIGN TOKENS

### 1.1 Kiến trúc theme (QUAN TRỌNG — áp dụng cho M5+)
- **Interface chung:** `packages/core/src/theme.ts` → `GameTheme` — định nghĩa cấu trúc theme.
- **Mỗi game tự tạo theme riêng:** `src/ui/theme.ts` → implement `GameTheme` với màu sắc, font, gradient của game đó.
- **Component nhận theme qua parameter:** `Button`, `Panel`, `Modal`, `ScoreText` đều có `theme?: GameTheme`.
- **Fallback:** nếu không truyền `theme`, component dùng giá trị mặc định từ `@game/core/tokens`.
- **KHÔNG import** `@game/core/tokens` trong scene game — chỉ import từ game's theme riêng.

### 1.2 Tham chiếu
- **Token chung (fallback):** `packages/core/src/tokens.ts` — giá trị generic, không game-specific.
- **Theme M4:** `g4-neon-grid/src/ui/theme.ts` — implement `GameTheme` với palette neon cyan.

### 1.2 Theme override (Neon Grid)
| Token | Giá trị | Ghi chú |
|-------|---------|---------|
| `bg` | `#0a0a1a` | Deep navy-black |
| `bgCard` | `#1a1a3e` | Card surface |
| `gridBg` | `#0d0d2b` | Grid nền |
| `gridLine` | `#1a1a4e` | Grid line |
| `gridLineGlow` | `#00f5ff` | Grid border glow |
| `neonCyan` | `#00f5ff` | Primary |
| `neonMagenta` | `#ff00ff` | Secondary |
| `neonYellow` | `#ffdd00` | Accent |
| `neonGreen` | `#00ff88` | Success |
| `neonOrange` | `#ff6600` | Warning |
| `neonRed` | `#ff2244` | Error/Danger |
| `neonBlue` | `#4488ff` | Info |

### 1.3 Block colors (7 màu, index 0-6)
| Index | Màu | Hex | Glow |
|-------|-----|-----|------|
| 0 | Cyan | `#00f5ff` | `#00f5ff` |
| 1 | Magenta | `#ff00ff` | `#ff00ff` |
| 2 | Yellow | `#ffdd00` | `#ffdd00` |
| 3 | Green | `#00ff88` | `#00ff88` |
| 4 | Orange | `#ff6600` | `#ff6600` |
| 5 | Red | `#ff2244` | `#ff2244` |
| 6 | Blue | `#4488ff` | `#4488ff` |

### 1.4 Skin palettes (override)
Mỗi skin override gridColor + blockColors. Chi tiết tại `src/ui/skins.ts`.

---

## 2. LAYOUT GRID

- **Canvas:** 720×1280 (portrait 9:16), Scale.FIT, auto-center.
- **Grid:** 8×8, cell 64px, gap 4px → total grid 540×540px.
- **Grid position:** căn giữa ngang, Y=160 (cách top 160px).
- **Safe area:** margin 16px mỗi bên.
- **Piece cards:** 3 card, mỗi card 96×80px, gap 10px, căn giữa dưới grid.
- **Power-up buttons:** 3 nút dưới piece cards, 80×56px mỗi nút, gap 12px.
- **Daily progress bar:** dưới power-up, 280×24px, chỉ hiện khi daily mode.

---

## 3. COMPONENTS

### Button (@game/core/ui/Button)
- **Kích thước:** 280×64px (primary), 240×56px (secondary).
- **Radius:** md (12px).
- **Primary:** gradient cyan (#00f5ff → #0088cc), inner highlight top, drop shadow.
- **Ghost:** nền trong suốt, border cyan 2px.
- **Hover:** scale 1.05, sáng hơn.
- **Press:** scale 0.95, camera shake nhẹ.
- **Pulse:** glow animation (optional, dùng cho PLAY button).

### ScoreText (@game/core/ui/ScoreText)
- **Font:** JetBrains Mono 36px bold, white.
- **Glow layer:** cyan 8px stroke, alpha 0.3 (phía sau).
- **Animation:** scale 1.3 → 1 khi score thay đổi.

### Modal (@game/core/ui/Modal)
- **Overlay:** black 70%.
- **Panel:** 340×260-320px, gradient #1a1a3e → #12122e, border cyan glow.
- **Title:** Poppins 24px bold, white.
- **Buttons:** 240×56px, primary + ghost.

### Panel (@game/core/ui/Panel)
- **Gradient:** #1a1a3e → #12122e.
- **Border:** cyan 1px, alpha 0.2.
- **Outer glow:** cyan 0.15 alpha.

---

## 4. SCREEN-BY-SCREEN MOCKUP

### 4.1 Start Screen
```
720×1280
┌──────────────────────────────────────┐
│  (0,0)                              │
│                                      │
│            NEON GRID                 │  ← y=440, 56px, stroke 4px cyan
│          Block Puzzle                │  ← y=510, 24px, #8888bb
│                                      │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│  ← y=360, 7 block màu
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                                      │
│          ┌──────────────┐            │
│          │  ▶  PLAY     │            │  ← y=720, 280×64, primary, pulse
│          └──────────────┘            │
│                                      │
│            BEST: 4200                │  ← y=820, 22px, cyan (nếu có)
│                                      │
│         v1.0 · @game/core            │  ← y=1240, 14px, #555577
└──────────────────────────────────────┘
```

**data-testid:** `start-title`, `play-btn`, `best-score`, `version-label`

### 4.2 Gameplay Screen
```
720×1280
┌──────────────────────────────────────┐
│  NEON GRID           SCORE: 4200    │  ← HUD: y=20 title, y=60 score
│                                      │
│    ┌──────────────────────────┐      │
│    │  ██  ██  ██              │      │
│    │  ██  ██  ██  ██  ██      │      │  ← Grid 540×540, y=160
│    │      ██  ██  ██  ██      │      │
│    │  ██  ██      ██          │      │
│    │  ██  ██  ██  ██  ██      │      │
│    │      ██  ██      ██      │      │
│    │  ██  ██  ██  ██  ██      │      │
│    │  ██  ██  ██  ██  ██      │      │
│    └──────────────────────────┘      │
│                                      │
│   ┌──────┐  ┌──────┐  ┌──────┐     │  ← y=730, 3 card 96×80
│   │  ██  │  │ ████ │  │  ██  │     │
│   │  ██  │  │      │  │  ██  │     │
│   └──────┘  └──────┘  └──────┘     │
│                                      │
└──────────────────────────────────────┘
```

**data-testid:** `title-label`, `score-label`, `grid`, `piece-0`, `piece-1`, `piece-2`

### 4.3 Game Over Modal
```
720×1280
┌──────────────────────────────────────┐
│  (overlay đen 70%)                   │
│                                      │
│        ┌──────────────────┐          │  ← Panel 340×260
│        │    GAME OVER      │          │  ← title 24px
│        │                  │          │
│        │   Score: 4200    │          │  ← subtext 18px
│        │                  │          │
│        │  ┌────────────┐  │          │
│        │  │ 🔄  RETRY  │  │          │  ← Button primary 240×56
│        │  └────────────┘  │          │
│        │  ┌────────────┐  │          │
│        │  │ 🏠  MENU   │  │          │  ← Button ghost 240×56
│        │  └────────────┘  │          │
│        └──────────────────┘          │
└──────────────────────────────────────┘
```

**data-testid:** `game-over-modal`, `retry-btn`, `menu-btn`, `final-score`

### 4.4 Start Screen (v2 — có meta buttons)
```
720×1280
┌──────────────────────────────────────┐
│                                      │
│            NEON GRID                 │  ← y=380, 56px, stroke theo skin
│          Block Puzzle                │  ← y=450, 24px
│                                      │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│  ← 7 block màu
│    └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                                      │
│          ┌──────────────┐            │
│          │  ▶  PLAY     │            │  ← y=660, primary, pulse
│          └──────────────┘            │
│          ┌──────────────┐            │
│          │  📅 DAILY    │            │  ← y=740, secondary, badge "NEW"
│          └──────────────┘            │
│          ┌──────────────┐            │
│          │  🎨 SKINS    │            │  ← y=820, ghost
│          └──────────────┘            │
│                                      │
│      BEST: 4200    🏆 5/15           │  ← y=900
│                                      │
│         v1.0 · @game/core            │  ← y=1240
└──────────────────────────────────────┘
```

**data-testid:** `start-title`, `play-btn`, `daily-btn`, `skins-btn`, `best-score`, `achievement-count`

### 4.5 Gameplay Screen (v2 — có power-ups + daily bar)
```
720×1280
┌──────────────────────────────────────┐
│  NEON GRID           SCORE: 4200    │  ← HUD
│                                      │
│    ┌──────────────────────────┐      │
│    │  Grid 8×8              │      │  ← y=160
│    └──────────────────────────┘      │
│                                      │
│   ┌──────┐  ┌──────┐  ┌──────┐     │  ← y=730, piece cards
│   │  ██  │  │ ████ │  │  ██  │     │
│   └──────┘  └──────┘  └──────┘     │
│                                      │
│  [↺Undo]  [🔀Shuffle]  [💣Bomb]    │  ← y=830, power-up 80×56
│                                      │
│  Daily: 5/15 lines  ████░░░░░░       │  ← y=900, progress bar
│                                      │
└──────────────────────────────────────┘
```

**data-testid:** `score-label`, `grid`, `piece-0/1/2`, `undo-btn`, `shuffle-btn`, `bomb-btn`, `daily-progress`

### 4.6 Skin Select Screen
```
720×1280
┌──────────────────────────────────────┐
│             SKINS                    │  ← y=60, 32px
│                                      │
│  ┌────┐  ┌────┐  ┌────┐            │
│  │🌟  │  │🔒  │  │🔒  │            │  ← y=140, skin 0-6
│  │Cyan│  │Mag │  │Gold│            │  3 cột, mỗi 120×140px
│  └────┘  └────┘  └────┘            │  ● active, 🔒 locked
│  ┌────┐  ┌────┐  ┌────┐            │
│  │🔒  │  │🔒  │  │🔒  │            │
│  │Ocean│  │Arcade│  │Mid  │            │
│  └────┘  └────┘  └────┘            │
│  ┌────┐                             │
│  │🔒  │                             │
│  │Rainb│                             │
│  └────┘                             │
│                                      │
│  Current: Neon Cyan                  │  ← y=680, 18px
│  Unlock: "Clear 100 lines"          │  ← y=710, 16px, #8888bb
│                                      │
│          ┌──────────────┐            │
│          │  ← BACK      │            │  ← y=780, ghost
│          └──────────────┘            │
└──────────────────────────────────────┘
```

**data-testid:** `skins-title`, `skin-0`...`skin-6`, `skin-back-btn`, `skin-current-label`, `skin-unlock-condition`

### 4.7 Achievement Popup
```
720×1280 (overlay)
┌──────────────────────────────────────┐
│  (overlay đen 70%)                   │
│                                      │
│        ┌──────────────────┐          │  ← Panel 320×280
│        │    🏆 NEW!        │          │
│        │  Combo King       │          │  ← 28px bold
│        │                  │          │
│        │  Clear 3 lines   │          │  ← 18px
│        │  in a row        │          │
│        │                  │          │
│        │  Reward:          │          │
│        │  🌟 Magenta       │          │
│        │  Dream skin!      │          │
│        │                  │          │
│        │  ┌────────────┐  │          │
│        │  │   OK!      │  │          │  ← primary 200×56
│        │  └────────────┘  │          │
│        └──────────────────┘          │
└──────────────────────────────────────┘
```

**data-testid:** `achievement-popup`, `achievement-title`, `achievement-reward`, `achievement-ok-btn`

### 4.8 Daily Complete Popup
```
720×1280 (overlay)
┌──────────────────────────────────────┐
│  (overlay đen 70%)                   │
│                                      │
│        ┌──────────────────┐          │  ← Panel 320×280
│        │  📅 DAILY         │          │
│        │  COMPLETE!        │          │  ← 28px bold
│        │                  │          │
│        │  Lines: 15/15    │          │  ← 18px
│        │  Score: 3200     │          │
│        │                  │          │
│        │  Reward:          │          │
│        │  🌟 Ocean Deep   │          │
│        │  skin unlocked!  │          │
│        │                  │          │
│        │  ┌────────────┐  │          │
│        │  │  CLAIM!    │  │          │  ← primary 200×56
│        │  └────────────┘  │          │
│        └──────────────────┘          │
└──────────────────────────────────────┘
```

**data-testid:** `daily-complete-popup`, `daily-reward`, `daily-claim-btn`

---

## 5. ANIMATION & TRANSITION

| Hiệu ứng | Duration | Easing | Ghi chú |
|----------|----------|--------|---------|
| Start → Gameplay | 200ms fade | Power2 | Camera fadeOut |
| Block đặt | 200ms | Back.easeOut | Bounce nhẹ |
| Clear hàng/cột | 350ms | Power2 | Highlight flash + fade |
| Particle burst | 300-500ms | Power2 | 8-12 hạt, ADD blend |
| Score popup | 800ms | Power2 | Scale 1.3 → 1 |
| Button hover | 100ms | Power2 | Scale 1.05 |
| Button press | 50ms | Power2 | Scale 0.95 + shake |
| Modal show | 300ms | Back.easeOut | Scale 0.9 → 1 |
| Ghost preview | — | — | Vẽ realtime theo pointer |

---

## 6. FEEDBACK & ERROR STATES

| State | Hiển thị |
|-------|----------|
| Grid empty | Grid nền tối, line mờ, không có block |
| Block selected | Card highlight border cyan + ghost preview trên grid |
| Invalid placement | Block không đặt được → chỉ không vẽ ghost |
| Row/column clear | Flash trắng + particle burst + score popup |
| Power-up used | Button flash, counter giảm |
| Power-up exhausted | Rewarded ad prompt (nếu còn) |
| Achievement unlock | Popup "🏆 NEW!" + reward |
| Daily complete | Popup "📅 DAILY COMPLETE!" + reward |
| Game over | Modal + interstitial ad |
| Loading | Phaser auto loading (nếu có asset) |

---

## 7. UX CHECKLIST (manual review gate)

- [ ] Màn Start: title đọc rõ? 3 nút (PLAY/DAILY/SKINS) rõ ràng? badge "NEW"?
- [ ] Gameplay: grid cân? piece card dễ thấy? ghost preview rõ?
- [ ] Power-up buttons: dễ thấy, dễ hiểu chức năng?
- [ ] Daily progress bar: rõ mục tiêu, tracking đúng?
- [ ] Clear animation: có cảm giác "đã" không? particle có đẹp?
- [ ] Game Over modal: rõ ràng, nút đủ lớn?
- [ ] Achievement popup: excitement? reward rõ?
- [ ] Skin Select: preview đẹp? unlock condition rõ?
- [ ] Màu sắc: neon glow đủ nổi trên nền tối? contrast đủ?
- [ ] Touch: vùng chạm ≥44px? không bị chạm nhầm?
- [ ] Responsive: 9:16 đẹp, desktop pillarbox OK?

---

## 8. TÀI LIỆU KHÔNG THUỘC DESIGN

- Logic game, scoring, shapes: `SPEC.md` §6 + `DATA-MODEL.md`
- Unit tests: `TEST-CASES.md`
- E2E browser tests: `E2E-TESTS.md`
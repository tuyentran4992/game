# M4: DESIGN-SPEC — "Neon Grid" (Block Puzzle · Neon Cyberpunk)

> **Tầng 2 (per-module).** THAM CHIẾU `docs/DESIGN-SYSTEM.md` (tầng 1 chung) cho token cơ bản. File này giữ: layout màn cụ thể + art-theme Neon Cyberpunk + bố cục các màn + data-testid.
> **Kiến trúc mới:** `packages/core/src/tokens.ts` = code implementation của design system. Token mới trong `src/ui/theme.ts` override cho game.
> Cập nhật: 2026-08-26 · Art-theme: **NEON CYBERPUNK** (nền tối, khối neon phát sáng, grid cyan).

---

## 1. DESIGN TOKENS

### 1.1 Tham chiếu
- **Token chung:** `packages/core/src/tokens.ts` (palette, gradients, fonts, spacing, radius, shadows, animation, layout).
- **Font:** Poppins (display/heading/body) + JetBrains Mono (score) — loaded via Google Fonts.
- **Spacing:** 4px grid (xs=4, sm=8, md=16, lg=24, xl=32, xxl=48).
- **Radius:** sm=6, md=12, lg=20, xl=28, full=999.

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

---

## 2. LAYOUT GRID

- **Canvas:** 720×1280 (portrait 9:16), Scale.FIT, auto-center.
- **Grid:** 8×8, cell 64px, gap 4px → total grid 540×540px.
- **Grid position:** căn giữa ngang, Y=160 (cách top 160px).
- **Safe area:** margin 16px mỗi bên.
- **Piece cards:** 3 card, mỗi card 96×80px, gap 10px, căn giữa dưới grid.

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
| Game over | Modal + interstitial ad |
| Loading | Phaser auto loading (nếu có asset) |

---

## 7. UX CHECKLIST (manual review gate)

- [ ] Màn Start: title đọc rõ? PLAY button nổi bật? decorative block đẹp?
- [ ] Gameplay: grid cân? 3 piece card dễ thấy? ghost preview rõ?
- [ ] Clear animation: có cảm giác "đã" không? particle có đẹp?
- [ ] Game Over modal: rõ ràng, nút đủ lớn?
- [ ] Màu sắc: neon glow đủ nổi trên nền tối? contrast đủ?
- [ ] Touch: vùng chạm ≥44px? không bị chạm nhầm?
- [ ] Responsive: 9:16 đẹp, desktop pillarbox OK?

---

## 8. TÀI LIỆU KHÔNG THUỘC DESIGN

- Logic game, scoring, shapes: `SPEC.md` §6 + `DATA-MODEL.md`
- Unit tests: `TEST-CASES.md`
- E2E browser tests: `E2E-TESTS.md`
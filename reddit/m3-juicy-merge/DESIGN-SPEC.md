# M3-R: DESIGN-SPEC — "Juicy Merge" Reddit Devvit

> **Port of M3.** Giữ nguyên art-theme Trái Cây Kawaii (pastel, viền đậm chibi). Thay đổi: splash screen cho Reddit inline view + HUD cho Reddit WebView.
> **Cập nhật:** 2026-08-26

---

## 1. DESIGN TOKENS

### Splash Screen (inline view)

- **Nền:** `#FFF8E7` (kem sáng)
- **Title:** 28px bold, `#4A2C2A` (nâu socola)
- **Subtitle:** 16px, `#888`
- **Button:** `#FF6B81` (hồng dưa hấu), hover `#E8556F`, border-radius 28px, padding 14px 48px
- **Footer:** 12px, `#ccc`

### Game Screen (expanded view)

- Giữ nguyên token từ M3 DESIGN-SPEC (pastel, kawaii palette)
- **HUD:** Back button (trái) + Score (phải), font 20px

---

## 2. SCREEN-BY-SCREEN

### Splash Screen (inline)

```
┌──────────────────────────────┐
│                              │
│           🍉                 │  ← 64px
│       Juicy Merge            │  ← 28px bold
│    Drop • Merge • Grow       │  ← 16px
│                              │
│    ┌──────────────────┐      │
│    │    ▶ Play        │      │  ← 20px, hồng, pill
│    └──────────────────┘      │
│                              │
│       Play on Reddit         │  ← 12px
└──────────────────────────────┘
```

**data-testid:** `splash-title`, `splash-play-btn`

### Game Screen (expanded)

```
┌──────────────────────────────┐
│  ← Back      🍉   SCORE: 0  │  ← HUD
│                              │
│         🎯 Drop zone         │  ← tap to drop
│                              │
│    ┌──────────────────┐      │
│    │  🍒 🍓 🍇       │      │  ← Matter.js bucket
│    │   🍊 🍎 🍑      │      │
│    │     🍉           │      │
│    └──────────────────┘      │
│   ⚠️ ── Danger ──           │  ← red dashed line
│                              │
│    Next: 🍒                  │  ← preview
└──────────────────────────────┘
```

**data-testid:** `game-hud`, `drop-zone`, `bucket`, `danger-line`, `next-fruit`, `score-label`

---

## 3. ANIMATION & TRANSITION

| Hiệu ứng      | Duration   | Ghi chú            |
| ------------- | ---------- | ------------------ |
| Splash → Game | 200ms fade | Phaser camera fade |
| Drop fruit    | 300ms      | Physics fall       |
| Merge         | 200ms      | Pop + score        |
| Game over     | 500ms      | Modal + blur       |

---

## 4. UX CHECKLIST

- [ ] Splash screen: đẹp, rõ, dễ click
- [ ] Gameplay: giống M3, physics mượt
- [ ] HUD: score + back button rõ
- [ ] Leaderboard: dễ đọc
- [ ] Touch: vùng chạm ≥44px

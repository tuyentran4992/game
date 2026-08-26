# M3-R: E2E-TESTS — "Juicy Merge" Reddit Devvit

> **Dành cho Hermes QA.** Test trên Reddit Devvit playtest environment.

---

## 1. SETUP

```bash
cd /data/youtube-playables/reddit/m3-juicy-merge
npm install
npm run dev    # playtest trên Reddit
```

---

## 2. E2E TEST CASES

### E2E-01: Splash Screen

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Mở Reddit post | Splash screen hiển thị | `splash-title` |
| 2 | Check title "Juicy Merge" | Đúng font, màu | `splash-title` |
| 3 | Check button "▶ Play" | Button hồng, dễ click | `splash-play-btn` |
| 4 | Tap Play | Chuyển sang expanded view | — |

**Evidence:** screenshot `rdt-01-splash.png`

### E2E-02: Gameplay

| Bước | Mô tả | Expected | data-testid |
|------|-------|----------|-------------|
| 1 | Mở game | Game hiển thị | `game-hud` |
| 2 | Check drop zone | Có thể tap để thả trái | `drop-zone` |
| 3 | Check bucket | Physics hoạt động | `bucket` |
| 4 | Merge 2 trái | Merge thành bậc lớn, score tăng | `score-label` |
| 5 | Game over | Trái quá danger line → modal | — |

**Evidence:** screenshot `rdt-02-gameplay.png`, `rdt-03-gameover.png`

### E2E-03: Score Persistence

| Bước | Mô tả | Expected |
|------|-------|----------|
| 1 | Chơi game, đạt score 100 | — |
| 2 | Game over | Score saved |
| 3 | Refresh page | Score vẫn còn (Redis) |
| 4 | Chơi lại, score thấp hơn | High score không đổi |

### E2E-04: Responsive

| Bước | Mô tả | Expected |
|------|-------|----------|
| 1 | Reddit mobile app | Game fit, responsive |
| 2 | Reddit desktop web | Game fit, pillarbox |

---

## 3. UX CHECKLIST

- [ ] Splash screen đẹp, dễ click
- [ ] Gameplay physics mượt
- [ ] Score lưu đúng qua Redis
- [ ] Leaderboard hiển thị
- [ ] Touch responsive
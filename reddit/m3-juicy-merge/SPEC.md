# M3-R: "Juicy Merge" — Reddit Devvit Port

> **Port date:** 2026-08-26
> **Source:** M3-Juicy-Merge (physics-merge game, Phaser 3.80)
> **Platform:** Reddit Devvit Web (chạy trong WebView trên reddit.com + app mobile)
> **Contract:** `reddit/m3-juicy-merge/` — Devvit project structure (client/server split)
> **Art-theme:** Trái cây Kawaii (giữ nguyên từ M3)

---

## 1. TỔNG QUAN

### Mục tiêu
Port game M3 "Juicy Merge" (physics-merge, Suika-style) lên Reddit Devvit platform. Game chạy trong Reddit's WebView, xuất hiện dưới dạng interactive post trong feed. Tận dụng Reddit Developer Funds ($167k/game) + Reddit Gold (IAP) để kiếm tiền.

### Đối tượng
- Người chơi: 500M+ Reddit users, 13+
- Vận hành: Hermes (PM/QA) + Claude GLM-5.2 (Dev) + anh Tuyền (duyệt + account)

### IN SCOPE
- Port toàn bộ gameplay M3 (physics-merge, 15 bậc trái cây, Matter.js)
- Devvit splash screen (inline view trong feed)
- Devvit expanded view (game chính)
- Redis storage thay localStorage (score, high score)
- Devvit Payments (Reddit Gold) cho IAP
- Leaderboard (top 10 qua Redis)
- Subreddit riêng `r/JuicyMerge`

### OUT OF SCOPE
- Không port Playgama SDK (thay bằng Devvit SDK)
- Không port Mediacube SDK
- Không multiplayer (Reddit chưa hỗ trợ realtime mạnh)
- Không ads (Devvit không có ad SDK — chỉ có Gold IAP + Developer Funds)

---

## 2. MODULE DEPENDENCIES + KỸ THUẬT

- **Stack:** Phaser 3.80 (WebGL) · Devvit Web · Hono (server) · Redis · Vite · TypeScript
- **Template:** `npm create devvit@latest --template=phaser` → chuyển về Phaser 3
- **Client:** `src/client/` — Phaser game trong WebView
- **Server:** `src/server/` — Hono endpoints, Redis, Reddit API
- **Storage:** Redis (thay localStorage — localStorage clear khi app update)
- **Monetize:** Reddit Gold (IAP) + Developer Funds (engagement-based)
- **Devvit CLI:**
```bash
npm run dev      # playtest trên Reddit
npm run deploy   # upload app
npm run launch   # publish + review
```

---

## 3. USER FLOW

```
Reddit feed → thấy Juicy Merge post (splash screen với ảnh trái cây)
  → Tap "▶ Play" → expanded view (game Phaser)
  → Main Menu → PLAY → Gameplay (thả trái, merge, score)
  → Game Over → save score → Redis leaderboard
  → Retry / Menu

Reddit moderator:
  → Subreddit menu → "Play Juicy Merge" → tạo post mới
  → Post xuất hiện trong feed → member click vào chơi
```

---

## 4. NỘI DUNG & BỐ CỤC

### Splash Screen (inline view trong feed)
```
┌──────────────────────────────┐
│           🍉                 │  ← emoji 64px
│       Juicy Merge            │  ← title 28px bold
│    Drop • Merge • Grow       │  ← subtitle 16px
│                              │
│        ┌──────────┐          │
│        │  ▶ Play  │          │  ← button hồng #FF6B81
│        └──────────┘          │
│                              │
│       Play on Reddit         │  ← footer 12px
└──────────────────────────────┘
```

**data-testid:** `splash-title`, `splash-play-btn`

### Game Screen (expanded view)
```
┌──────────────────────────────┐
│  ← Back        🍉  SCORE: 0 │  ← HUD
│                              │
│         Drop zone            │  ← tap to drop fruit
│         (top area)           │
│                              │
│    ┌──────────────────┐      │
│    │   Bucket area     │      │  ← Matter.js physics
│    │  🍒 🍓 🍇        │      │
│    │     🍊 🍎         │      │
│    │       🍉          │      │
│    └──────────────────┘      │
│                              │
│  Danger line ⚠️              │  ← game over nếu trái quá vạch
│                              │
│  Next: 🍒                   │  ← preview trái kế tiếp
└──────────────────────────────┘
```

**data-testid:** `game-hud`, `drop-zone`, `bucket`, `danger-line`, `next-fruit`, `score-label`

---

## 5. TECHNICAL REQUIREMENTS

- **Phaser 3.80** (giữ nguyên version M3, không lên Phaser 4)
- **Resolution:** 720×1280 (portrait), Scale.FIT
- **Physics:** Matter.js (gravity y=1.5)
- **Storage:** Redis (`@devvit/web/server` getRedis) — save score, high score, leaderboard
- **Payments:** Reddit Gold (`@devvit/web` Payments API) — optional IAP (extra lives, skins)
- **No external requests** từ client — backend fetch allowed
- **Max request:** 30s timeout, 4MB payload, 10MB response
- **localStorage:** KHÔNG dùng (clear khi app update)

---

## 6. BUSINESS RULES

| ID | Rule |
|----|------|
| RDM-01 | Gameplay giống hệt M3: thả trái → merge 2 cùng loại → bậc lớn hơn, chain 15 bậc. |
| RDM-02 | Dùng Redis thay localStorage. Key: `score:{userId}`. |
| RDM-03 | Leaderboard: top 10 scores qua Redis. |
| RDM-04 | Reddit Gold IAP: extra life, hint (optional — feature sau). |
| RDM-05 | Developer Funds: engagement-based, auto-qualify khi game có users. |
| RDM-06 | CẤM gọi mạng ngoài từ client (CSP chặn). Backend fetch OK. |
| RDM-07 | Responsive: mobile-first (Reddit app), desktop OK. |
| RDM-08 | Target 13+, Safe for Work. |

---

## 7. STATE HANDLING

| State | Cách phát hiện | Xử lý |
|-------|----------------|-------|
| Loading | App install → splash | Hiển thị splash screen |
| Playing | User tap Play | Expanded view → Phaser game |
| Game Over | Trái quá danger line | Modal score + Redis save |
| Score saved | POST /api/score | Redis set |
| Leaderboard | GET /api/leaderboard | Redis keys + sort |
| App update | New version deploy | localStorage mất → Redis vẫn còn |

---

## 8. TIÊU CHÍ HOÀN THÀNH

1. Game chạy trong Reddit WebView: splash → expanded → gameplay → game over.
2. Redis save/load score: POST /api/score + GET /api/score/:userId.
3. Leaderboard: top 10 scores.
4. Devvit build: `npm run build` success.
5. Devvit playtest: `npm run dev` → chạy trên Reddit thật.
6. App review pass: README.md + description + subreddit.
7. QA browser + vision PASS functional + visual.
# YOUTUBE PLAYABLES GAMES — BUSINESS STATUS (cập nhật 2026-08-26)

> Tài liệu nguồn để lần sau TIẾP TỤC business này. Đọc trước, không bắt đầu lại từ đầu.
> Mỗi lần làm xong 1 game/1 bước → CẬP NHẬT file này cho session sau.

---

## 1. TÓM TẮT BUSINESS
- Mô hình: làm **casual HTML5 game** đưa lên **YouTube Playables** (chơi ngay trên app, Google host, chi phí UA ≈ 0). Google cho game CẤM tự nhét ads/IAP — tiền qua **SDK ads** (pre-roll/interstitial/rewarded) + revenue-share pilot (qua **Mediacube**), IAP mở khi 2027.
- Chiến lược **factory**: nhiều game thể loại khác nhau (đa dạng, giảm rủi ro) — KHÔNG kỳ vọng 1 game ăn ngay.
- Tech: **Phaser 3 (TS+vite)** + **pipeline Python 3.11+** (scaffold/assets/validate/package) + **AI-Box WAN 2.7** gen asset + **Claude Code GLM-5.2** viết code.
- Repo: **https://github.com/tuyentran4992/game** (private) — chứa nhiều module M1, M2...
- Thư mục local business: **/data/youtube-playables/**

## 2. KIẾN TRÚC "1 SOURCE, MULTIPLE PLATFORM" (MỚI 2026-08-26)

### Kiến trúc tổng thể
```
game-factory/
├── packages/
│   ├── core/          @game/core — UI components (Button, Modal, ScoreText, Particle)
│   ├── sdk/           @game/sdk — Universal SDK: Reddit → Playgama → ytgame → Local
│   └── pipeline/      Python pipeline (1 bản chung)
├── g4-neon-grid/      ← M4: monorepo game đầu tiên
│   ├── src/
│   │   ├── logic/     ← PURE TS, 0 Phaser dependency
│   │   ├── scenes/    ← Phaser scenes (mỏng, orchestrate)
│   │   ├── render/    ← Phaser adapter
│   │   └── ui/        ← Game theme (GameTheme interface)
│   ├── index.html     ← Standalone/local dev
│   ├── playgama.html  ← Playgama distribution (có CDN bridge)
│   ├── ytgame.html    ← YouTube Playables
│   └── vite.config.ts ← Multi-platform build
├── M3-Juicy-Merge/    ← Game cũ, standalone
├── M2-Color-Sort/     ← Game cũ, standalone
├── M1-Rescue-Dodge/   ← Game cũ, standalone
└── pnpm-workspace.yaml
```

### @game/sdk — Universal Multi-Platform SDK (v2.0.0)
**File:** `packages/sdk/src/`

| File | Chức năng |
|------|-----------|
| `index.ts` | `SDKBackend` interface + exports |
| `handler.ts` | Auto-detect: Reddit → Playgama → ytgame → Mock |
| `bridge-backend.ts` | Playgama Bridge (ads, leaderboard, storage, lifecycle) |
| `devvit-backend.ts` | Reddit Devvit (Redis, leaderboard, API) |
| `ytgame-backend.ts` | YouTube/Mediacube (ytgame SDK) |
| `instance.ts` | MockBackend (local dev) |
| `types.ts` | Shared types (LeaderboardEntry, PlatformType) |

**Platform detection priority:**
1. Reddit Devvit (`window.devvit` / `__devvit` / hostname)
2. Playgama Bridge (`window.bridge` / `window.playgamaBridge`)
3. YouTube Playables (`window.ytgame`)
4. Mock (local/standalone)

**Usage:**
```ts
import { sdk } from '@game/sdk';
await sdk.initialize();
sdk.showInterstitial();           // Ads
const ok = await sdk.showRewarded();
sdk.saveData({ score: 100 });    // Persistence
const lb = await sdk.getLeaderboardEntries();  // Leaderboard
```

### Multi-platform build (Vite)
**File:** `g4-neon-grid/vite.config.ts`

Build từ 1 source → N platform outputs:
```bash
pnpm run build              # Build ALL platforms
pnpm run build:playgama     # Chỉ Playgama
pnpm run build:standalone   # Chỉ standalone
pnpm run build:ytgame       # Chỉ YouTube
```

Output:
```
dist/
├── index.html          (standalone)
├── playgama.html       (với Playgama Bridge CDN)
├── ytgame.html         (YouTube Playables)
└── assets/
    ├── main-xxx.js     (game code, shared)
    └── phaser-xxx.js   (Phaser chunk)
```

---

## 3. HIỆN TRẠNG CÁC GAME

### M1 — "Cuu Meo" (`M1-Rescue-Dodge/`) — rescue/dodge ✅ HOÀN CHỈNH
- Gameplay: mèo né ong 3 lane; input = chạm/click; level-up đổi palette.
- Âm thanh: 8 file numpy→mp3. Sprite WAN: mèo + ong.
- Gói nộp Mediacube sẵn sàng: `build/cuu-meo.zip` + metadata.
- Test: pipeline 53 pytest · game vitest 19 · tsc 0 · build OK.

### M2 — "Neon Sort" (`M2-Color-Sort/`) — color-sort ✅ HOÀN CHỈNH
- Puzzle xếp chất lỏng ống, art Neon Galaxy.
- Logic solvable 100% (sinh ngược).
- Test: vitest **32** · tsc 0 · build OK.
- CHƯA đóng gói nộp.

### M3 — "Juicy Merge" (`M3-Juicy-Merge/`) — physics-merge ✅ CODE + Adventure Saga (anh push 27/08)
- Suika-style: thả trái → merge bậc 11-12. **Multi-platform SDK** Reddit/Playgama/ytgame/Local.
- ❌ **PLAYGAMA REJECT 27/08**: "too closely replicates already published titles" (catalog có ≥4 Suika-clone + trùng tên "Juicy Merge"). Policy #3: cấm copy 1 phần.
- **Hướng B đã chốt:** v2 **"Potion Panic"** — specs tại `M3-Juicy-Merge/specs/2-potion-panic/` (5 file). Khác biệt 4 trục: hàng đợi 3 nguyên tố chọn-được (Fire/Water/Earth ×4 bậc), hệ Heat+BREW nổ dây chuyền + Stir, Orders + campaign 30 màn goal nguyên tố, nồi cong + theme neon apothecary.
- **Trạng thái:** chờ anh duyệt SPEC → giao agent code → QA (browser+vision) → Anti-Reject Checklist §9 → nộp lại (qua support chat trước).
- Reddit Devvit port done, chưa deploy. Test cũ: vitest 109 · tsc 0 · build OK.

### M4 — "Neon Grid" (`g4-neon-grid/`) — block puzzle ✅ CODE + BUILD
- **Kiến trúc monorepo đầu tiên:** `@game/core` + `@game/sdk`.
- **Meta progression:** 15 Achievements, 7 Skins, Daily Challenge, 4 Power-ups.
- **Multi-platform build:** 3 platform outputs từ 1 source.
- **Code:** logic/ (pure TS) + scenes/ + render/ + ui/ (GameTheme).
- **Status:** typecheck ✅ · build ✅ · 1 source → 3 platforms ✅
- **Cần:** gen asset WAN thật, QA browser, đóng gói.

---

## 4. CÁCH CHẠY/TEST
```bash
# M4 dev server
cd g4-neon-grid && pnpm run dev

# M4 build tất cả platforms
cd g4-neon-grid && pnpm run build

# M4 build 1 platform
cd g4-neon-grid && pnpm run build:playgama

# M3 dev
cd M3-Juicy-Merge && npm run dev:web

# M3 Reddit
cd M3-Juicy-Merge && npm run dev:reddit
```

---

## 5. PIPELINE
```bash
python -m pipeline scaffold --config games/<name>.yaml
python -m pipeline assets   --config games/<name>.yaml --job gen
python -m pipeline validate --game-dir games/<name>
python -m pipeline package  --game-dir games/<name>
```

---

## 6. ĐỐI TÁC / NỘP
- **Mediacube** — MC Pay account "Tuyen Tran" ✅, MC Play PENDING (chờ duyệt indie).
- **Playgama** — account kotaro001 ✅, M3 submitted 2026-08-24, review 3-5 ngày.
- **CrazyGames** — chưa nộp.
- **Reddit Devvit** — M3 port done, chưa deploy.

---

## 7. CHI PHÍ (cộng dồn)
- M1: ~$6-8 · M2: ~$4-5 · M3: ~$5-7 · M4: ~$2 (chỉ SPEC + code, chưa asset)
- Mặc định dùng **GLM-5.2** (rẻ+đủ), chỉ 5.3 khi anh chỉ định.

---

## 8. PITFALLS ĐÃ HỌC (đọc lại để khỏi vấp)
- **QA = browser+vision THẬT**, không tin report agent.
- Phaser `HexStringToColor` (KHÔNG phải HexToColor); `new Phaser.Game()` đúng import.
- Layout ngang → responsive. Audio preload URL phải đúng đuôi `.mp3`.
- `.gitignore`: dùng `dist/` `node_modules/` (không leading slash).
- **Vitest có thể hang trên môi trường này** — chạy từng file test riêng lẻ.
- **Multi-platform build:** Vite build --mode <platform> để build 1 platform riêng.
- **SDK:** Handler singleton khởi tạo ngay khi import → trong test environment, detect đúng `local`.